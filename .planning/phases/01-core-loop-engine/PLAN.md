# Phase 1 Plan: Core Loop Protocol Engine & MCP Client Setup

## Executive Summary
Implement the modular core of the Loop Engineering Chatbot in TypeScript/Node.js, including:
1. Configuration manager for OpenAI-compatible LLM endpoints, system prompts, AI skills, and MCP server registry.
2. MCP Client Manager that manages multiple MCP servers over stdio transports, discovers tools, and translates them to OpenAI function specs.
3. OpenAI-compatible LLM client and adapter.
4. The iterative Loop Agent Orchestrator with event callbacks and guardrails.
5. A working Internet Search / Fetch MCP server implementation / config.
6. A CLI test runner demonstrating the complete loop end-to-end.

## Tasks Breakdown

### Task 1: Project Initialization & Configuration Schema
- Initialize `package.json` (ESM module), `tsconfig.json`, and dependencies (`@modelcontextprotocol/sdk`, `openai`, `zod`, `dotenv`, `chalk`).
- Implement `src/config/schema.ts` and `src/config/index.ts` to load and validate:
  - `llm`: `baseUrl`, `apiKey`, `model`, `temperature`, `maxTokens`.
  - `prompts`: `systemPrompt`, `skills` (array or markdown text for setup prompt/AI skills).
  - `mcpServers`: map of server definitions (command, args, env).
- Create a sample configuration file `loop.config.json` and `.env.example`.

### Task 2: MCP Host & Client Manager
- Create `src/mcp/client-manager.ts`:
  - Connects to one or more MCP servers using `StdioClientTransport`.
  - Aggregates tool definitions across all active MCP servers.
  - Converts MCP tool schemas (`inputSchema`) to OpenAI `tools` schema format (`type: "function"`).
  - Routes `callTool(name, arguments)` to the correct MCP server client.
  - Handles timeouts, errors, and clean shutdown.

### Task 3: OpenAI-Compatible LLM Client Adapter
- Create `src/llm/client.ts`:
  - Configures an OpenAI SDK instance pointing to the configured `baseUrl` and `apiKey`.
  - Dispatches chat completion calls with `tools` array and system prompt + user prompts.
  - Handles streaming or standard completions with tool calls parsing.

### Task 4: Autonomous Loop Orchestrator Protocol
- Create `src/engine/loop-orchestrator.ts`:
  - Implements the iterative execution loop:
    - Step 1: Format messages history (system prompt + injected AI skills + user input).
    - Step 2: Query LLM with registered tools.
    - Step 3: Check for tool calls. If none, break and return final response.
    - Step 4: For each tool call, emit `tool_call_start` event, invoke MCP client, emit `tool_call_end`.
    - Step 5: Append tool execution results with `role: "tool"` and `tool_call_id`.
    - Step 6: Verify loop guards (max iterations counter, cycle detection). Loop back to Step 2.
  - Exposes an event emitter / callback pattern for UI and CLI logging (`step`, `tool_call`, `observation`, `final_answer`, `error`).

### Task 5: Built-in Web Search / Internet MCP Server
- Create `src/mcp/servers/web-search-server.ts` (or configure a standard web fetch / duckduckgo search tool via MCP) so that out of the box, the LLM has tools to search the web and retrieve webpage content.

### Task 6: CLI Test Runner & Verification
- Create `src/cli/index.ts`:
  - Provides a CLI interface to execute a test query (e.g. "What is the latest news about OpenAI today?" or user-specified query).
  - Pretty-prints each iteration of the loop (Thought -> Action -> Observation -> Final Answer).
- Validate with automated unit/integration test scripts.

## Success Criteria
- [ ] `loop.config.json` accepts custom LLM endpoints, custom system prompts, and custom AI skills.
- [ ] MCP Client discovers tools from running MCP servers.
- [ ] LLM successfully selects MCP tools when asked a question it cannot answer without external access.
- [ ] Tool results are fed back into the loop and the LLM produces a grounded, verified answer based on internet/MCP data.
- [ ] CLI runner executes the loop smoothly with clear step logging.
