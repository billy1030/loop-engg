import { loadConfig } from "../src/config/index.js";
import { MCPClientManager } from "../src/mcp/client-manager.js";

async function testMiniMaxMCP() {
  console.log("=== Testing MiniMax Multimodal MCP Server ===");
  const config = loadConfig();
  const mcpManager = new MCPClientManager();

  await mcpManager.initialize({
    "minimax-multimodal": {
      command: "npx",
      args: ["tsx", "src/mcp/servers/minimax-server.ts"],
      enabled: true,
    },
  });

  const tools = mcpManager.getOpenAITools();
  console.log(`Discovered ${tools.length} MiniMax tool(s):`);
  for (const t of tools) {
    console.log(` - ${t.function.name}: ${t.function.description}`);
  }

  console.log("\nInvoking 'minimax_search' through MCP protocol...");
  const searchResult = await mcpManager.executeTool("minimax_search", {
    query: "MiniMax M3 latest news",
  });

  console.log("MCP Search Result Output Length:", searchResult.length);
  console.log("Snippet:", searchResult.slice(0, 300) + "...\n");

  await mcpManager.closeAll();
  console.log("=== MiniMax Multimodal MCP Server Test PASSED! ===");
}

testMiniMaxMCP().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
