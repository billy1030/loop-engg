# Loop Engineering Chatbot Protocol (with MCP Integration)

## 1. Project Vision & Goals
Build a robust, extensible prototype and execution protocol for an iterative "Loop Engineering Chatbot" capable of autonomous tool-use and continuous iteration using the **Model Context Protocol (MCP)**. 

### Core Scenario
- Standard LLMs cannot directly search the internet or access external environments.
- With an MCP client/server setup (e.g. Brave Search, DuckDuckGo, fetch/curl, local system tools), the LLM dynamically requests tools via the loop protocol, receives structured tool execution responses from MCP servers, reflects on the results, and continues until completion or final answer.
- User can configure any OpenAI-compatible provider (Ollama, vLLM, DeepSeek, OpenAI, Groq, local endpoint) and any MCP server (command, args, env, skills/prompts).

## 2. Architecture & Tech Stack
- **Architecture**: Modular Core Protocol + CLI Test Runner + React.js Web Interface.
- **Core Loop Engine (Node/TypeScript/ESM)**:
  - Loop Agent Orchestrator: Thought -> Action (Tool Call) -> Observation (MCP response) -> Reflection / Next Step -> Answer.
  - LLM Adapter: OpenAI-compatible format (`/v1/chat/completions`) with tool calling / function calling JSON schema support.
  - MCP Host / Client Manager: Connects via stdio/SSE to MCP servers using `@modelcontextprotocol/sdk`. Discovers MCP tools and maps them to OpenAI function specs.
  - Prompt & AI Skill Ingestion: Dynamically injects system prompts, AI skill descriptions, and MCP server instructions.
  - Config Manager: Loads and validates JSON / YAML / `.env` configurations for LLM endpoints, credentials, models, and MCP server registries.
- **Frontend (React.js + Vite)**:
  - Interactive chat interface displaying live thought processes, MCP tool calls, parameters, tool output inspection, and final responses.
  - Configuration panel for editing LLM endpoints, API keys, Model name, system prompts, AI skills, and active MCP servers.
- **CLI Runner**:
  - Direct terminal runner for testing loop iterations, tool invocation verification, and headless execution.

## 3. Key Differentiators & Protocol Design
- **Loop Termination Guard**: Iteration limits, cycle detection, timeout handling, and graceful fallback.
- **Configurable Tool Skills**: Flexible injection of user-defined MCP servers and custom prompt-driven AI skills.
- **Inspectability**: Transparent step-by-step trace showing tool arguments and execution output.
