# Loop Engineering Chatbot (AI 小助手) with MCP Protocol

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node](https://img.shields.io/badge/Node.js-20%2B%20%7C%2026%20ESM-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19.2-cyan.svg)](https://react.dev)
[![Port](https://img.shields.io/badge/Port-7000-orange.svg)](http://localhost:7000)
[![Protocol](https://img.shields.io/badge/Protocol-Model%20Context%20Protocol%20(MCP)-blueviolet.svg)](https://modelcontextprotocol.io)

An enterprise-grade, iterative **"Loop Engineering" Chatbot** that equips OpenAI-compatible Large Language Models (such as MiniMax-M3, DeepSeek, OpenAI, Ollama, vLLM) with autonomous reasoning, continuous tool invocation, and stateful multi-turn memory via the **Model Context Protocol (MCP)**.

When a standard LLM lacks real-time facts or external abilities, it enters an autonomous **ReAct cycle** (`Thought ➜ Tool Call ➜ Observation ➜ Reflection`), recursively looping until the task is complete.

---

## 🌟 Key Features

- **Stateful Multi-Turn Memory & Context Continuity**:
  - Automatically carries full conversational context across turns so the assistant remembers constraints, figures, and past conclusions.
  - Zero-latency runtime memory in React 19 + Node.js with asynchronous persistence.
- **Automatic Markdown Session Logging (`logs/*.md`)**:
  - Automatically saves every complete conversation as `YYYY-MM-DD_HH-mm-ss.md`.
  - Captures full metadata, iteration counts, parameters, and MCP tool observations.
- **Interactive Web UI & Session Browser (Port 7000)**:
  - Clean day-themed modern UI built with React 19, TypeScript, and Vite 8.
  - **`+ New Chat`** button to reset conversational memory at any time.
  - **`PAST SESSIONS`** sidebar drawer to reload and resume any past conversation.
  - **Collapsible Bottom Active Model Accordion**: Compact 38px footer showing the active model and tool count, expanding to reveal tool schemas on demand.
  - Live collapsible tool execution cards with real-time SSE event streaming.
- **Dynamic Model Context Protocol (MCP) Host Client**:
  - Discovers tools from local or remote servers via stdio / JSON-RPC 2.0.
  - Translates MCP schemas into OpenAI tool specifications dynamically.
- **Built-in Resilient Search MCP Server**:
  - Zero-API-key DuckDuckGo search (`web_search`) with automatic **MiniMax API fallback**.
  - Web page scraper (`fetch_page`) with **GitHub blob-to-raw URL rewriting** to bypass HTTP 429 rate limits.
- **MiniMax Multimodal MCP Server**:
  - Seamless bridge to `mmx-cli` for image generation, speech synthesis, and search.
- **Safety Guardrails**:
  - Configurable iteration limits (`maxLoopIterations`), socket timeouts, and token estimation metrics.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
cd frontend && npm install && npm run build && cd ..
```

### 2. Configure Environment & Model
Create or edit `.env` or `loop.config.json`:
```ini
LLM_BASE_URL=https://api.minimax.chat/v1
LLM_API_KEY=your-api-key-here
LLM_MODEL=MiniMax-Text-01
PORT=7000
```

### 3. Launch Web Server (Port 7000)
```bash
# Starts both Backend API and serves the React Web UI on http://localhost:7000
npx tsx src/server.ts
```
Then open your browser to **[http://localhost:7000](http://localhost:7000)**.

### 4. Interactive Terminal CLI
You can also interact directly from your terminal:
```bash
npm run cli
```
Or execute a one-shot query:
```bash
npx tsx src/cli/index.ts --query "Search for 2026 enterprise PKI migration best practices"
```

---

## 📚 Technical Documentation (`tech-docs/`)

Comprehensive architecture specifications, engineering post-mortems, and protocols are documented in the [`tech-docs/`](./tech-docs/) directory:

| Document | Description |
| :--- | :--- |
| **[01. Architecture & Loop Protocol](./tech-docs/01-architecture-and-protocol.md)** | ReAct state machine, Mermaid diagrams, SSE streaming event specifications. |
| **[02. MCP Integration & Schema Translation](./tech-docs/02-mcp-integration-guide.md)** | `@modelcontextprotocol/sdk` mechanics, tool translation, stdio IPC transport. |
| **[03. Technical Challenges & Solutions](./tech-docs/03-technical-challenges-and-solutions.md)** | Infinite loop guardrails, observation bloat, and Windows child process IPC. |
| **[04. AI Skills & Prompts Setup](./tech-docs/04-ai-skills-and-prompts-setup.md)** | System prompts and AI skill ingestion for runtime capability expansion. |
| **[05. Agentic Looping & Self-Correction Case Study](./tech-docs/discussion.md)** | Real-world autopsy of tool failure, autonomous query refinement, and multi-MCP failover. |
| **[06. Technology Stack Specification](./tech-docs/06-technology-stack.md)** | Detailed breakdown of Node 26, React 19, Vite 8, Express 5, and MCP dependencies. |
| **[07. Conversation Memory & State Continuity](./tech-docs/07-conversation-memory-and-state.md)** | In-Memory vs. File persistence trade-offs, multi-turn state continuity, and token management. |
| **[08. UI/UX & Session Management Specification](./tech-docs/08-ui-ux-and-session-management.md)** | Web UI layout, collapsible sidebar, session re-hydration, and token estimation badges. |

---

## 📂 Project Structure

```text
loop-engg/
├── .planning/                  # GSD roadmap, phase context, and execution plans
├── frontend/                   # React 19 + TypeScript + Vite 8 SPA
│   ├── src/
│   │   ├── components/         # Markdown renderer, modal inspectors
│   │   ├── App.tsx             # Main chat UI, sidebar, collapsible model panel
│   │   └── index.css           # Vanilla CSS design tokens (Day Theme)
├── logs/                       # Auto-saved Markdown conversation sessions (YYYY-MM-DD_HH-mm-ss.md)
├── src/
│   ├── cli/                    # Interactive terminal REPL
│   ├── config/                 # Zod configuration schemas & loader
│   ├── engine/                 # ReAct Loop Orchestrator with multi-turn history injection
│   ├── logger/                 # Markdown conversation persistence & session parser
│   ├── mcp/                    # MCP Client Manager & Tool registry
│   │   └── servers/            # Built-in WebSearch and MiniMax MCP servers
│   └── server.ts               # Express 5 backend with SSE streaming on Port 7000
├── tech-docs/                  # In-depth technical architecture documentation
├── loop.config.json            # Model settings, prompt configs, and active MCP servers
└── package.json
```

---

## 🧪 Running Tests
```bash
npm test
```
