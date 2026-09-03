# Loop Engineering Chatbot with MCP

An iterative "Loop Engineering" Chatbot prototype that bridges OpenAI-compatible LLMs with external capabilities via the **Model Context Protocol (MCP)**.

When a standard LLM lacks real-time facts or external data (e.g. internet search), it autonomously invokes tools via MCP servers, reflects on observations, and loops until completing its task.

## Key Features
- **Configurable OpenAI-Compatible LLM**: Works with vLLM, Ollama, DeepSeek, OpenAI, Groq, and local endpoints.
- **MCP Client Host**: Connects to any standard MCP server via stdio using `@modelcontextprotocol/sdk`.
- **Built-in Internet Search & Fetch MCP Server**: Zero-API-key web search (`web_search`) and page scraper (`fetch_page`).
- **Prompt & AI Skill Ingestion**: Easily configure system prompts and domain-specific AI skills.
- **Multi-Interface**: Modular core with an interactive CLI test runner & upcoming React.js Web UI.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Settings
Copy `.env.example` to `.env` or edit `loop.config.json`:
```json
{
  "llm": {
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "your-api-key",
    "model": "gpt-4o"
  }
}
```

### 3. Run the Interactive CLI
```bash
npm run cli
```

Or execute a single test query:
```bash
npx tsx src/cli/index.ts --query "Search for the latest updates on Model Context Protocol"
```

## Running Tests
```bash
npm test
```
