import readline from "node:readline";
import chalk from "chalk";
import { loadConfig } from "../config/index.js";
import { MCPServerDef } from "../config/schema.js";
import { MCPClientManager } from "../mcp/client-manager.js";
import { LoopOrchestrator } from "../engine/loop-orchestrator.js";
import { saveConversationLog } from "../logger/conversation-logger.js";

async function main() {
  console.log(chalk.bold.cyan("\n=============================================="));
  console.log(chalk.bold.cyan("   Loop Engineering Chatbot with MCP Protocol"));
  console.log(chalk.bold.cyan("==============================================\n"));

  const config = loadConfig();
  console.log(chalk.gray(`LLM Base URL: ${config.llm.baseUrl}`));
  console.log(chalk.gray(`LLM Model:    ${config.llm.model}`));
  console.log(chalk.gray(`Configured MCP Servers: ${Object.keys(config.mcpServers).join(", ") || "None"}\n`));

  console.log(chalk.yellow("Connecting to MCP servers and discovering tools..."));
  const mcpManager = new MCPClientManager();

  // Handle typescript execution path if running via tsx
  const servers: Record<string, MCPServerDef> = {};
  for (const [key, def] of Object.entries(config.mcpServers)) {
    if (def.args?.[0]?.endsWith(".js")) {
      // If we are in development tsx environment, convert .js to .ts if needed
      const tsPath = def.args[0].replace(/^dist\//, "src/").replace(/\.js$/, ".ts");
      servers[key] = {
        ...def,
        command: "npx",
        args: ["tsx", tsPath],
      };
    } else {
      servers[key] = { ...def };
    }
  }

  await mcpManager.initialize(servers);

  const tools = mcpManager.getOpenAITools();
  console.log(chalk.green(`✓ Discovered ${tools.length} tool(s) from MCP server(s):`));
  for (const t of tools) {
    console.log(chalk.dim(`  - ${chalk.bold(t.function.name)}: ${t.function.description}`));
  }
  console.log("");

  const orchestrator = new LoopOrchestrator(config, mcpManager);

  // Check if CLI query provided as CLI arguments
  const args = process.argv.slice(2);
  let query = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--query" || args[i] === "-q") {
      query = args[i + 1] || "";
      break;
    }
  }

  const runQuery = async (userPrompt: string) => {
    console.log(chalk.blueBright(`\n[User]: ${userPrompt}\n`));
    console.log(chalk.yellow("Starting autonomous loop iterations...\n"));

    const startTime = new Date();
    const sessionToolCalls: Array<{
      toolName: string;
      serverName?: string;
      args: any;
      result?: string;
      timestamp: number;
    }> = [];

    await orchestrator.run(userPrompt, {
      onStepStart: (iter) => {
        console.log(chalk.magenta(`--- Iteration ${iter} ---`));
      },
      onToolCall: (toolName, toolArgs, serverName) => {
        sessionToolCalls.push({
          toolName,
          serverName,
          args: toolArgs,
          timestamp: Date.now(),
        });
        console.log(chalk.yellow(`[Tool Call ⚡] -> ${chalk.bold(toolName)} ${serverName ? chalk.dim(`[${serverName}]`) : ""}`));
        console.log(chalk.dim(`  Arguments: ${JSON.stringify(toolArgs, null, 2)}`));
      },
      onToolResult: (toolName, result, serverName) => {
        const existing = sessionToolCalls.find((t) => t.toolName === toolName && !t.result);
        if (existing) {
          existing.result = result;
          if (serverName) existing.serverName = serverName;
        }
        const preview = result.length > 300 ? result.slice(0, 300) + "... (truncated)" : result;
        console.log(chalk.cyan(`[MCP Observation 🔍] <- ${toolName}:`));
        console.log(chalk.dim(`  ${preview.replace(/\n/g, "\n  ")}\n`));
      },
      onComplete: (answer, iterations) => {
        console.log(chalk.bold.green(`\n[Final Answer (after ${iterations} iteration(s))]:`));
        console.log(chalk.white(answer));
        console.log(chalk.dim("\n----------------------------------------------\n"));

        try {
          const logFile = saveConversationLog({
            userPrompt,
            model: config.llm.model,
            iterations,
            toolCalls: sessionToolCalls,
            finalAnswer: answer,
            startTime,
            endTime: new Date(),
          });
          console.log(chalk.dim(`✓ Conversation logged to: ${logFile}\n`));
        } catch (logErr: any) {
          console.error(chalk.red(`Failed to save conversation log: ${logErr.message}`));
        }
      },
      onError: (err) => {
        console.log(chalk.red(`[Error in loop]: ${err.message}`));
      },
    });
  };

  if (query) {
    await runQuery(query);
    await mcpManager.closeAll();
    process.exit(0);
  }

  // Interactive REPL
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const promptUser = () => {
    rl.question(chalk.bold.blue("You > "), async (input) => {
      const trimmed = input.trim();
      if (!trimmed || trimmed === "exit" || trimmed === "quit") {
        console.log("Shutting down MCP clients...");
        await mcpManager.closeAll();
        rl.close();
        process.exit(0);
      }

      try {
        await runQuery(trimmed);
      } catch (err: any) {
        console.error("Execution failed:", err.message);
      }

      promptUser();
    });
  };

  promptUser();
}

main().catch((err) => {
  console.error("Fatal CLI Error:", err);
  process.exit(1);
});
