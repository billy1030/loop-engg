# Requirements: Loop Engineering Chatbot with MCP

## Functional Requirements

### 1. LLM & Provider Configuration (REQ-CFG)
- **REQ-CFG-01**: Support any OpenAI-compatible endpoint (baseURL, apiKey, model name, temperature, maxTokens).
- **REQ-CFG-02**: Support custom System Prompts and Skill injection prompts.
- **REQ-CFG-03**: Securely manage local environment variables and persistent configuration files (`config.json` / `.env`).

### 2. Model Context Protocol (MCP) Host Client (REQ-MCP)
- **REQ-MCP-01**: Connect to standard MCP servers via `stdio` transport (e.g., node, python, npx commands) and optionally SSE/HTTP.
- **REQ-MCP-02**: Perform tool discovery (`listTools`) and automatically translate MCP tool schemas into OpenAI Function Calling / Tool specifications.
- **REQ-MCP-03**: Execute MCP tool calls (`callTool`) with argument validation and format the result back to the conversation thread.
- **REQ-MCP-04**: Support at least one standard Internet Search / Web Fetch MCP server out of the box (e.g., DuckDuckGo, Brave Search, or Fetch MCP) to satisfy the internet access requirement.

### 3. Engineering Loop Protocol (REQ-LOOP)
- **REQ-LOOP-01**: Implement iterative autonomous loop:
  - Step 1: Send conversation history + tool definitions to LLM.
  - Step 2: If LLM returns tool call(s), invoke MCP client.
  - Step 3: Append tool results to message chain as `role: "tool"`.
  - Step 4: Re-query LLM with updated context.
  - Step 5: Stop when LLM produces final response or max iterations reached.
- **REQ-LOOP-02**: Provide safety guards (max step counter, error recovery if tool fails, context truncation or token budget handling).
- **REQ-LOOP-03**: Stream/emit granular event logs (`thought`, `tool_call`, `tool_result`, `final_answer`).

### 4. Interfaces (REQ-UI & REQ-CLI)
- **REQ-CLI-01**: Headless CLI runner command to run single prompts or interactive terminal REPL with live tool trace.
- **REQ-UI-01**: React.js Web UI providing:
  - Clean chat layout with message history.
  - Accordion / expandable tool execution inspection (input JSON and tool response).
  - Settings modal / drawer to update LLM configuration, system prompt, and active MCP servers.
- **REQ-UI-02**: Local backend API server (Express/Fastify or Vite dev server proxy) to bridge the Web UI with the local Node.js MCP processes.
