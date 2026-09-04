import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { loadConfig } from "./config/index.js";
import { LoopConfig, MCPServerDef } from "./config/schema.js";
import { MCPClientManager } from "./mcp/client-manager.js";
import { LoopOrchestrator } from "./engine/loop-orchestrator.js";
import {
  saveConversationLog,
  listConversationLogs,
  parseConversationLog,
  renameConversationLog,
  deleteConversationLog,
  cloneConversationTurn,
  listWorkspaces,
  createWorkspace,
  deleteWorkspace,
  renameWorkspace,
} from "./logger/conversation-logger.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 7000;

const app = express();
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

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
    tools: mcpManager.getOpenAITools(),
    discoveredTools: mcpManager.getDiscoveredTools(),
  };
  res.json(safeConfig);
});

// 2. Update Configuration & Hot-Reload MCP Servers
app.post("/api/config", async (req, res) => {
  try {
    const updates = req.body;
    if (updates.llm) {
      // Don't overwrite with masked key
      const newApiKey = updates.llm.apiKey?.includes("...***")
        ? config.llm.apiKey
        : updates.llm.apiKey;

      config.llm = {
        ...config.llm,
        ...updates.llm,
        apiKey: newApiKey || config.llm.apiKey,
      };
    }
    if (updates.prompts) {
      config.prompts = { ...config.prompts, ...updates.prompts };
    }
    if (updates.maxLoopIterations) {
      config.maxLoopIterations = updates.maxLoopIterations;
    }
    if (updates.mcpServers) {
      config.mcpServers = updates.mcpServers;
      // Hot-reload MCP servers
      await initMCP();
    }
    res.json({
      success: true,
      config: {
        ...config,
        tools: mcpManager.getOpenAITools(),
        discoveredTools: mcpManager.getDiscoveredTools(),
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 3. List Discovered MCP Tools
app.get("/api/tools", (req, res) => {
  const tools = mcpManager.getOpenAITools();
  const discoveredTools = mcpManager.getDiscoveredTools();
  res.json({ tools, discoveredTools });
});

import { documentManager } from "./documents/document-manager.js";

// 4. Chat with Streaming Events (SSE) and Multi-Turn History, Document Attachment & Workspace Support
app.post("/api/chat", async (req, res) => {
  const { message, history, attachedDocHashes, sessionFile, workspace } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  // Setup Server-Sent Events headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (event: string, data: any) => {
    if (!res.writableEnded) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  const startTime = new Date();
  const sessionToolCalls: Array<{
    toolName: string;
    serverName?: string;
    args: any;
    result?: string;
    timestamp: number;
  }> = [];

  try {
    const orchestrator = new LoopOrchestrator(config, mcpManager);

    // Retrieve preprocessed document context if hashes provided
    const docContextResult = documentManager.getPreprocessedContext(attachedDocHashes || []);
    const attachedContext = docContextResult.context;

    await orchestrator.run(
      message,
      {
        onStepStart: (iteration) => {
          sendEvent("step_start", { iteration });
        },
        onToolCall: (toolName, toolArgs, serverName) => {
          console.log(`[Loop Server] 🛠️ Tool invoked: "${toolName}" via MCP Server: [${serverName}]`);
          sessionToolCalls.push({
            toolName,
            serverName: serverName || "unknown",
            args: toolArgs,
            timestamp: Date.now(),
          });
          sendEvent("tool_call", {
            toolName,
            serverName: serverName || "unknown",
            args: toolArgs,
            timestamp: Date.now(),
          });
        },
        onToolResult: (toolName, result, serverName) => {
          console.log(`[Loop Server] ✅ Tool completed: "${toolName}" [${serverName}] (${result.length} chars)`);
          const existing = sessionToolCalls.find((t) => t.toolName === toolName && !t.result);
          if (existing) {
            existing.result = result;
            if (serverName) existing.serverName = serverName;
          }
          sendEvent("tool_result", {
            toolName,
            serverName: serverName || "unknown",
            result,
            timestamp: Date.now(),
          });
        },
        onComplete: (answer, iterations) => {
          let savedFile = sessionFile;
          // Save conversation log in markdown format with multi-turn and workspace support
          try {
            savedFile = saveConversationLog({
              sessionFile,
              workspace: workspace || "default",
              userPrompt: message,
              model: config.llm.model,
              iterations,
              toolCalls: sessionToolCalls,
              finalAnswer: answer,
              startTime,
              endTime: new Date(),
              attachedDocHashes: attachedDocHashes || [],
            });
          } catch (logErr: any) {
            console.error(`[Conversation Logger] Failed to save log: ${logErr.message}`);
          }

          sendEvent("complete", { answer, iterations, sessionFile: savedFile, workspace: workspace || "default" });
          if (!res.writableEnded) {
            res.write("event: end\ndata: {}\n\n");
            res.end();
          }
        },
        onError: (err) => {
          sendEvent("error", { message: err.message });
          if (!res.writableEnded) {
            res.end();
          }
        },
      },
      history,
      attachedContext
    );
  } catch (err: any) {
    sendEvent("error", { message: err.message });
    if (!res.writableEnded) {
      res.end();
    }
  }
});

// 5. Document Attachments & Session Scoped Endpoints (CAS)
app.post("/api/documents/upload", async (req, res) => {
  try {
    const { fileName, fileBase64 } = req.body;
    if (!fileName || !fileBase64) {
      return res.status(400).json({ success: false, error: "Missing fileName or fileBase64" });
    }
    const result = await documentManager.ingestDocument(fileName, fileBase64);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Query documents specifically for an array of session hashes (strict session scoping)
app.post("/api/documents/by-hashes", (req, res) => {
  try {
    const { hashes } = req.body;
    const documents = documentManager.getDocumentsByHashes(hashes || []);
    res.json({ success: true, documents });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/documents", (req, res) => {
  try {
    const documents = documentManager.listDocuments();
    res.json({ success: true, documents });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/documents/context", (req, res) => {
  try {
    const { docHashes } = req.body;
    const result = documentManager.getPreprocessedContext(docHashes || []);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/documents/:hash", (req, res) => {
  try {
    const { hash } = req.params;
    const deleted = documentManager.deleteDocument(hash);
    if (deleted) {
      res.json({ success: true, message: `Deleted document ${hash}` });
    } else {
      res.status(404).json({ success: false, error: "Document not found." });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Workspaces Management Endpoints
app.get("/api/workspaces", (req, res) => {
  try {
    const workspaces = listWorkspaces();
    res.json({ success: true, workspaces });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/workspaces", (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, error: "Workspace name is required." });
    }
    const createdName = createWorkspace(name);
    res.json({ success: true, name: createdName });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/workspaces/:name/rename", (req, res) => {
  try {
    const { name } = req.params;
    const { newName } = req.body;
    if (!newName || typeof newName !== "string" || !newName.trim()) {
      return res.status(400).json({ success: false, error: "New workspace name is required." });
    }
    const renamedName = renameWorkspace(name, newName);
    res.json({ success: true, name: renamedName });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete("/api/workspaces/:name", (req, res) => {
  try {
    const { name } = req.params;
    const deleted = deleteWorkspace(name);
    if (deleted) {
      res.json({ success: true, message: `Deleted workspace ${name}` });
    } else {
      res.status(404).json({ success: false, error: "Workspace not found." });
    }
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 7. List Saved Conversation Logs within a Workspace
app.get("/api/logs", (req, res) => {
  try {
    const workspace = (req.query.workspace as string) || "default";
    const logs = listConversationLogs(workspace);
    res.json({ logs, workspace });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Get Parsed Conversation Log to Reload into UI
app.get("/api/logs/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const workspace = (req.query.workspace as string) || "default";
    const session = parseConversationLog(filename, workspace);
    res.json(session);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// 9. Rename Conversation Session Title
app.post("/api/logs/:filename/rename", (req, res) => {
  try {
    const filename = req.params.filename;
    const { newTitle, workspace } = req.body;
    if (!newTitle || typeof newTitle !== "string" || !newTitle.trim()) {
      return res.status(400).json({ error: "newTitle is required." });
    }
    const renamed = renameConversationLog(filename, newTitle, workspace || "default");
    if (renamed) {
      res.json({ success: true, message: `Renamed ${filename} to ${newTitle}` });
    } else {
      res.status(404).json({ error: "File not found." });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 10. Clone a Specific Sub-Conversation (Turn) to a New Independent Session
app.post("/api/logs/:filename/clone-turn", (req, res) => {
  try {
    const filename = req.params.filename;
    const { turnIndex, mode, workspace, targetWorkspace, customDocHashes } = req.body; // mode: "single" | "up_to"
    if (turnIndex === undefined || turnIndex === null) {
      return res.status(400).json({ error: "turnIndex is required." });
    }
    const result = cloneConversationTurn(
      filename,
      Number(turnIndex),
      mode || "up_to",
      workspace || "default",
      targetWorkspace,
      customDocHashes
    );
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 11. Delete Conversation Log File
app.delete("/api/logs/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const workspace = (req.query.workspace as string) || "default";
    const deleted = deleteConversationLog(filename, workspace);
    if (deleted) {
      res.json({ success: true, message: `Deleted ${filename}` });
    } else {
      res.status(404).json({ error: "File not found." });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
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
        <h2>Mini Chat Bot API Server is running on port ${PORT}</h2>
        <p>Frontend is currently building or running via Vite.</p>
        <p>Try querying <code>/api/config</code> or <code>/api/tools</code>.</p>
      </div>
    `);
  }
});

async function start() {
  await initMCP();
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Server listening on http://localhost:${PORT}`);
    console.log(`⚡ Testing Port: ${PORT}`);
    console.log(`🔌 MCP Tools active: ${mcpManager.getOpenAITools().length}\n`);
  });

  server.on("error", (err: any) => {
    console.error(`[Server Error] Could not start server on port ${PORT}:`, err.message);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
