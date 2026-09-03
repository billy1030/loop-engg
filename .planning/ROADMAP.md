# Roadmap: Loop Engineering Chatbot with MCP

## Phases Overview

### Phase 1: Core Loop Protocol Engine & MCP Client Setup
- Set up Node.js / TypeScript project structure and configuration schemas (`config.json`, schema validation).
- Implement the Model Context Protocol (MCP) Host Client using `@modelcontextprotocol/sdk`.
- Implement OpenAI-compatible LLM client and adapter that translates MCP tools to OpenAI Tool format.
- Build the ReAct / Loop Execution Protocol orchestrator (`thought -> tool_call -> mcp_execution -> result -> iterate`).
- Configure default Internet search / Web access MCP server (e.g. Fetch / Search MCP).
- **Deliverable**: CLI test runner demonstrating autonomous web search using the loop protocol.

### Phase 2: Backend Bridge & Web Socket / Streaming Events
- Build local lightweight server (Express / Fastify or Vite backend) exposing API routes for:
  - Starting loop sessions / sending user messages.
  - Server-Sent Events (SSE) or WebSockets for streaming thought cycles, tool calls, and output.
  - Reading and updating configuration (LLM settings, MCP servers, system prompts).
- **Deliverable**: API endpoints with verified live event streaming of tool calling loops.

### Phase 3: React.js Web UI & Configuration Dashboard
- Set up React.js frontend (Vite, modern UI styling).
- Build the Chat Interface with dynamic tool call visualizer cards (collapsible parameters & JSON inspection).
- Build the Configuration & AI Skills modal (edit baseURL, apiKey, model, custom prompts, add/remove MCP servers).
- Connect React frontend to backend loop stream.
- **Deliverable**: Full working React Web UI interacting with the loop chatbot and MCP servers.

### Phase 4: Verification, Edge Cases & Protocol Polish
- Add loop guard rails (max steps, tool timeouts, graceful recovery on tool error).
- End-to-end verification of user providing custom LLM config + custom prompt/skills + internet search MCP.
- Produce documentation for extending with custom AI skills and external MCP servers.
- **Deliverable**: Complete, battle-tested prototype ready for production customization.
