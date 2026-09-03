import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { loadConfig } from "./config/index.js";
import { LoopConfig, MCPServerDef } from "./config/schema.js";
import { MCPClientManager } from "./mcp/client-manager.js";
import { LoopOrchestrator } from "./engine/loop-orchestrator.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 7000;

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files if built
const clientDistPath = path.resolve(process.cwd(), "frontend/dist");
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

let config: LoopConfig = loadConfig();
let mcpManager = new MCPClientManager();
let isInitialized = false;

async function initMCP() {
  const servers: Record<string, MCPServerDef> = {};
  for (const [key, def] of Object.entries(config.mcpServers)) {
    if (def.args?.[0]?.endsWith(".js")) {
      const tsPath = def.args[0].replace(/^dist\//, "src/").replace(/\.js$/, ".ts");
      servers[key] = {
        ...def,
        command: "npx",
        args: ["tsx", tsPath],
      };
    } else {
      servers[key] = { ...def };
    }
  }
  await mcpManager.initialize(servers);
  isInitialized = true;
}

// 1. Get Configuration & Status
app.get("/api/config", (req, res) => {
  const safeConfig = {
    ...config,
    llm: {
      ...config.llm,
      apiKey: config.llm.apiKey ? `${config.llm.apiKey.slice(0, 8)}...***` : "",
    },
    tools: mcpManager.getOpenAITools(),
  };
  res.json(safeConfig);
});

// 2. Update Configuration
app.post("/api/config", async (req, res) => {
  try {
    const updates = req.body;
    if (updates.llm) {
      config.llm = { ...config.llm, ...updates.llm };
    }
    if (updates.prompts) {
      config.prompts = { ...config.prompts, ...updates.prompts };
    }
    if (updates.maxLoopIterations) {
      config.maxLoopIterations = updates.maxLoopIterations;
    }
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 3. List Discovered MCP Tools
app.get("/api/tools", (req, res) => {
  const tools = mcpManager.getOpenAITools();
  res.json({ tools });
});

// 4. Chat with Streaming Events (SSE)
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  // Setup Server-Sent Events headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const orchestrator = new LoopOrchestrator(config, mcpManager);

    await orchestrator.run(message, {
      onStepStart: (iteration) => {
        sendEvent("step_start", { iteration });
      },
      onToolCall: (toolName, toolArgs) => {
        sendEvent("tool_call", { toolName, args: toolArgs, timestamp: Date.now() });
      },
      onToolResult: (toolName, result) => {
        sendEvent("tool_result", { toolName, result, timestamp: Date.now() });
      },
      onComplete: (answer, iterations) => {
        sendEvent("complete", { answer, iterations });
        res.write("event: end\ndata: {}\n\n");
        res.end();
      },
      onError: (err) => {
        sendEvent("error", { message: err.message });
        res.end();
      },
    });
  } catch (err: any) {
    sendEvent("error", { message: err.message });
    res.end();
  }
});

// Fallback to frontend SPA index.html or welcome banner
app.use((req, res) => {
  const indexPath = path.resolve(process.cwd(), "frontend/dist/index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <div style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h2>Loop Engineering Chatbot API Server is running on port ${PORT}</h2>
        <p>Frontend is currently building or running via Vite.</p>
        <p>Try querying <code>/api/config</code> or <code>/api/tools</code>.</p>
      </div>
    `);
  }
});

async function start() {
  await initMCP();
  app.listen(PORT, () => {
    console.log(`\n🚀 Server listening on http://localhost:${PORT}`);
    console.log(`⚡ Testing Port: ${PORT}`);
    console.log(`🔌 MCP Tools active: ${mcpManager.getOpenAITools().length}\n`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
