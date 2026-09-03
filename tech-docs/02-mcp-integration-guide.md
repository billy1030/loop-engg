# MCP Integration & Schema Translation Guide

## 1. Background on Model Context Protocol (MCP)
The **Model Context Protocol** is an open standard created to decouple tools and resources from specific LLM providers. By treating tool providers as standalone servers (running over `stdio` or HTTP/SSE), host applications can connect arbitrary capabilities without rewriting internal agent logic.

## 2. Server Configuration Schema
In `loop.config.json`, servers are declared as follows:
```json
{
  "mcpServers": {
    "web-search": {
      "command": "node",
      "args": ["dist/mcp/servers/web-search-server.js"],
      "enabled": true,
      "description": "Provides internet web search and page content fetching capabilities"
    }
  }
}
```

### Supported Transports
- **Stdio Transport**: Launches local sub-processes (`node`, `python`, `npx`, `docker`) communicating over standard input and output.
- **Environment Variable Passing**: Propagates host environment variables (`process.env`) combined with server-specific overrides (`env`).

---

## 3. Schema Transformation Pipeline

### MCP Tool Schema -> OpenAI Tool Definition
When the MCP host executes `client.listTools()`, each tool returns an MCP schema:
```typescript
interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, any>;
    required?: string[];
  };
}
```

The `MCPClientManager` automatically normalizes this into the OpenAI standard function calling payload:
```typescript
{
  type: "function",
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema
  }
}
```

### Observation Feedback Mapping
When a tool finishes running, MCP provides structured text/image content blocks:
```typescript
interface CallToolResult {
  content: Array<{ type: "text"; text: string } | { type: "image"; data: string }>;
  isError?: boolean;
}
```

The orchestrator extracts plain text content and packs it into the standard OpenAI Tool completion schema:
```json
{
  "role": "tool",
  "tool_call_id": "call_123456",
  "content": "Resulting text / observation string"
}
```

---

## 4. Built-in Web Search & Fetch Server Details
Implemented in `src/mcp/servers/web-search-server.ts`.

### Available Tools
1. **`web_search`**:
   - Accepts `{ query: string, maxResults?: number }`.
   - Sends HTTP requests with browser headers to search engines.
   - Extracts title, clean target URLs, and result snippets.
2. **`fetch_page`**:
   - Accepts `{ url: string }`.
   - Strips `<script>`, `<style>`, and raw HTML tags.
   - Truncates content to 4,000 characters to prevent context window saturation while preserving article substance.
