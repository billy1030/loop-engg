# Loop Engineering Technical Documentation Index

Welcome to the **Loop Engineering Chatbot Protocol** technical documentation. This directory provides in-depth technical documentation covering system architecture, design decisions, challenges tackled, protocols, and integration guides.

## Documentation Index

| Document | Topic & Focus |
|---|---|
| [01. Architecture & Protocol Specification](./01-architecture-and-protocol.md) | High-level system design, ReAct cycle state machine, Mermaid diagrams, SSE streaming contracts. |
| [02. MCP Integration & Schema Translation](./02-mcp-integration-guide.md) | Model Context Protocol (`@modelcontextprotocol/sdk`) mechanics, dynamic schema mapping to OpenAI tools, stdio transport. |
| [03. Technical Challenges & Solutions](./03-technical-challenges-and-solutions.md) | Engineering post-mortems: infinite tool loops, observation bloat, Windows stdio IPC, real-time UI streaming. |
| [04. AI Skills & Prompts Setup](./04-ai-skills-and-prompts-setup.md) | How system prompts and skills instructions are ingested, dynamic behavior configuration, MiniMax multimodal toolkit mapping. |
| [05. Agentic Looping & Self-Correction Case Study](./discussion.md) | Real-world autopsy of tool failure (`fetch failed`), autonomous query reformulating, and multi-MCP resilience in ADCS HSM migration. |
| [06. Technology Stack Specification](./06-technology-stack.md) | Comprehensive stack breakdown: Node.js 26 ESM, Express 5, React 19, Vite 8, MCP SDK, MiniMax-M3 integration, and SSE streaming. |
| [07. Conversation Memory & State Continuity](./07-conversation-memory-and-state.md) | In-Memory vs. File-Based architectural trade-offs, multi-turn state continuity, hybrid design, sliding window context governance. |
| [08. UI/UX & Session Management Specification](./08-ui-ux-and-session-management.md) | Web UI design tokens, collapsible bottom Active Model accordion, session re-hydration sequence, and token badges. |

---

## Quick Reference Commands
- **Start Backend & Web Server (Port 7000)**: `npm run dev` or `npx tsx src/server.ts`
- **Start Interactive Terminal CLI REPL**: `npm run cli`
- **Execute Single Test Query**: `npx tsx src/cli/index.ts --query "Search the internet for..."`
- **Run Integration Tests**: `npm test`
