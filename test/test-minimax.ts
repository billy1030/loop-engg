import { loadConfig } from "../src/config/index.js";
import { LLMClient } from "../src/llm/client.js";

async function testMiniMax() {
  console.log("Testing MiniMax LLM API connection...");
  const config = loadConfig();
  console.log("Config loaded:");
  console.log("  BaseURL:", config.llm.baseUrl);
  console.log("  Model:  ", config.llm.model);
  console.log("  Key:    ", config.llm.apiKey ? config.llm.apiKey.slice(0, 10) + "..." : "NONE");

  const client = new LLMClient(config.llm);
  const response = await client.createChatCompletion([
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Reply with 'MiniMax API is working!'" },
  ]);

  console.log("\nResponse from MiniMax:");
  console.log("Content:", response.choices[0]?.message?.content);
  console.log("Status: OK!");
}

testMiniMax().catch((err) => {
  console.error("MiniMax test failed:", err);
  process.exit(1);
});
