import { BigFixStreamableHttpClient } from "./src/mcp/bigfix-client.js";

async function main() {
  const client = new BigFixStreamableHttpClient({
    url: "https://172.22.29.51:9494/mcp",
    token: "9qdVuQuIkXazX7eRa9s98LRB10VlXsze5uuYTQAAAAI",
    readOnly: true,
    disableHitl: false,
  });

  await client.connect();
  const tools = await client.listTools();
  console.log("SUCCESS! Connected to BigFix Platform MCP Server.");
  console.log("Total Discovered Tools:", tools.length);
  tools.forEach((t, i) => {
    console.log(`${i + 1}. [${t.name}]: ${t.description?.split("\n")[0]}`);
  });
}

main().catch(console.error);
