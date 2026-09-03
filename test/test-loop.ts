import { loadConfig } from "../src/config/index.js";
import { MCPClientManager } from "../src/mcp/client-manager.js";

async function runTest() {
  console.log("=== Integration Test: Config & MCP Discovery ===");

  // 1. Test Config Loading
  const config = loadConfig();
  console.log("Config loaded successfully:");
  console.log("  LLM baseUrl:", config.llm.baseUrl);
  console.log("  LLM model:", config.llm.model);
  console.log("  MCP servers count:", Object.keys(config.mcpServers).length);

  // 2. Test MCP Server Connection & Tool Discovery
  const mcpManager = new MCPClientManager();
  console.log("\nConnecting to built-in Web Search MCP server...");

  const testServers = {
    "web-search": {
      command: "npx",
      args: ["tsx", "src/mcp/servers/web-search-server.ts"],
      enabled: true,
    },
  };

  await mcpManager.initialize(testServers);
  const tools = mcpManager.getOpenAITools();
  console.log(`Discovered ${tools.length} tool(s):`);
  for (const t of tools) {
    console.log(`  * ${t.function.name} (${t.function.description})`);
  }

  if (tools.length < 2) {
    throw new Error("Expected at least 2 tools (web_search and fetch_page)");
  }

  // 3. Test Direct Tool Execution through MCP Protocol
  console.log("\nTesting MCP tool execution: 'web_search'...");
  const searchResult = await mcpManager.executeTool("web_search", {
    query: "Model Context Protocol documentation",
    maxResults: 2,
  });

  console.log("Tool execution returned result length:", searchResult.length);
  console.log("Snippet preview:\n", searchResult.slice(0, 200) + "...\n");

  await mcpManager.closeAll();
  console.log("=== ALL MCP INTEGRATION CHECKS PASSED ===");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
