import OpenAI from "openai";
import { LoopConfig } from "../config/schema.js";
import { LLMClient } from "../llm/client.js";
import { MCPClientManager } from "../mcp/client-manager.js";

export interface LoopEventCallbacks {
  onStepStart?: (iteration: number) => void;
  onLLMResponse?: (response: OpenAI.Chat.Completions.ChatCompletion) => void;
  onToolCall?: (toolName: string, args: any) => void;
  onToolResult?: (toolName: string, result: string) => void;
  onComplete?: (finalAnswer: string, iterations: number) => void;
  onError?: (error: Error) => void;
}

export class LoopOrchestrator {
  private config: LoopConfig;
  private llmClient: LLMClient;
  private mcpManager: MCPClientManager;

  constructor(config: LoopConfig, mcpManager: MCPClientManager) {
    this.config = config;
    this.mcpManager = mcpManager;
    this.llmClient = new LLMClient(config.llm);
  }

  /**
   * Run the Loop Engineering protocol on a user query
   */
  async run(
    userPrompt: string,
    callbacks?: LoopEventCallbacks
  ): Promise<{ answer: string; iterations: number; history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] }> {
    // 1. Build initial system message combining system prompt and AI skills
    const fullSystemPrompt = [
      this.config.prompts.systemPrompt,
      "\n--- Active AI Skills & Instructions ---\n",
      this.config.prompts.skillsPrompt,
    ].join("\n");

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: fullSystemPrompt },
      { role: "user", content: userPrompt },
    ];

    const tools = this.mcpManager.getOpenAITools() as OpenAI.Chat.Completions.ChatCompletionTool[];

    let iteration = 0;
    const maxIterations = this.config.maxLoopIterations;

    while (iteration < maxIterations) {
      iteration++;
      callbacks?.onStepStart?.(iteration);

      try {
        const completion = await this.llmClient.createChatCompletion(messages, tools);
        callbacks?.onLLMResponse?.(completion);

        const choice = completion.choices[0];
        if (!choice) {
          throw new Error("No completion choice returned by LLM.");
        }

        const message = choice.message;
        messages.push(message);

        // Check if LLM decided to call any tools
        if (message.tool_calls && message.tool_calls.length > 0) {
          for (const toolCall of message.tool_calls) {
            // Function call checking
            if (toolCall.type !== "function") continue;

            const toolName = toolCall.function.name;
            let parsedArgs: any = {};
            try {
              parsedArgs = JSON.parse(toolCall.function.arguments || "{}");
            } catch (parseErr) {
              console.warn(`[Loop] Failed to parse JSON arguments for tool ${toolName}`);
            }

            callbacks?.onToolCall?.(toolName, parsedArgs);

            // Execute via MCP
            let toolOutput = "";
            try {
              toolOutput = await this.mcpManager.executeTool(toolName, parsedArgs);
            } catch (execErr: any) {
              toolOutput = `[Tool Execution Error]: ${execErr.message}`;
            }

            callbacks?.onToolResult?.(toolName, toolOutput);

            // Append tool response to message history
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: toolOutput,
            });
          }
          // Loop continues to next iteration to let LLM read tool output
          continue;
        }

        // If no tool call, this is the final answer
        const finalAnswer = message.content || "(No response content)";
        callbacks?.onComplete?.(finalAnswer, iteration);
        return { answer: finalAnswer, iterations: iteration, history: messages };
      } catch (err: any) {
        callbacks?.onError?.(err);
        throw err;
      }
    }

    const fallbackMsg = `[Guardrail]: Loop reached maximum iterations limit (${maxIterations}).`;
    callbacks?.onComplete?.(fallbackMsg, iteration);
    return { answer: fallbackMsg, iterations: iteration, history: messages };
  }
}
