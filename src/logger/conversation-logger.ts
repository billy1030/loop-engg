import fs from "node:fs";
import path from "node:path";

interface ToolExecutionLog {
  toolName: string;
  serverName?: string;
  args: any;
  result?: string;
  timestamp: number;
}

interface ConversationSession {
  userPrompt: string;
  model: string;
  iterations: number;
  toolCalls: ToolExecutionLog[];
  finalAnswer: string;
  startTime: Date;
  endTime: Date;
}

/**
 * Format a Date object into YYYY-MM-DD_HH-mm-ss
 */
function formatDateForFilename(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Saves a completed conversation session into a markdown log file
 */
export function saveConversationLog(session: ConversationSession, baseDir: string = "logs"): string {
  const logsDir = path.resolve(process.cwd(), baseDir);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const filename = `${formatDateForFilename(session.startTime)}.md`;
  const filePath = path.join(logsDir, filename);

  const durationMs = session.endTime.getTime() - session.startTime.getTime();
  const durationSec = (durationMs / 1000).toFixed(2);

  const mdContent: string[] = [
    `# Conversation Log: ${formatDateForFilename(session.startTime)}`,
    "",
    "## Metadata",
    `- **Date / Time**: ${session.startTime.toISOString()} (Local: ${session.startTime.toLocaleString()})`,
    `- **Model**: \`${session.model}\``,
    `- **Iterations**: ${session.iterations}`,
    `- **Duration**: ${durationSec}s`,
    `- **Total Tool Calls**: ${session.toolCalls.length}`,
    "",
    "---",
    "",
    "## User Prompt",
    session.userPrompt,
    "",
    "---",
    "",
    "## Autonomous Loop Tool Calls & Observations",
  ];

  if (session.toolCalls.length === 0) {
    mdContent.push("*No external tools were invoked during this session.*");
  } else {
    session.toolCalls.forEach((call, index) => {
      mdContent.push(`### [Step ${index + 1}] Tool: \`${call.toolName}\``);
      mdContent.push(`- **Owning MCP Server**: \`${call.serverName || "unknown"}\``);
      mdContent.push(`- **Timestamp**: ${new Date(call.timestamp).toISOString()}`);
      mdContent.push("");
      mdContent.push("#### Parameters");
      mdContent.push("```json");
      mdContent.push(JSON.stringify(call.args, null, 2));
      mdContent.push("```");
      mdContent.push("");
      mdContent.push("#### Observation (Result)");
      mdContent.push("```text");
      mdContent.push(call.result ? call.result.trim() : "*Awaiting result or terminated*");
      mdContent.push("```");
      mdContent.push("");
    });
  }

  mdContent.push("---");
  mdContent.push("");
  mdContent.push("## Final Synthesized Answer");
  mdContent.push("");
  mdContent.push(session.finalAnswer || "*No final response generated.*");
  mdContent.push("");

  fs.writeFileSync(filePath, mdContent.join("\n"), "utf-8");
  console.log(`[Conversation Logger] 📁 Saved conversation log to: logs/${filename}`);

  return filePath;
}

export interface ConversationSummary {
  filename: string;
  timestamp: string;
  model: string;
  iterations: number;
  toolCount: number;
  preview: string;
}

/**
 * List all saved conversation markdown files ordered by newest first
 */
export function listConversationLogs(baseDir: string = "logs"): ConversationSummary[] {
  const logsDir = path.resolve(process.cwd(), baseDir);
  if (!fs.existsSync(logsDir)) {
    return [];
  }

  const files = fs
    .readdirSync(logsDir)
    .filter((f) => f.endsWith(".md") && f !== "README.md");

  const results: ConversationSummary[] = [];

  for (const filename of files) {
    try {
      const fullPath = path.join(logsDir, filename);
      const content = fs.readFileSync(fullPath, "utf-8");

      // Extract metadata
      const modelMatch = content.match(/- \*\*Model\*\*: `([^`]+)`/);
      const iterMatch = content.match(/- \*\*Iterations\*\*: (\d+)/);
      const toolMatch = content.match(/- \*\*Total Tool Calls\*\*: (\d+)/);
      const timeMatch = content.match(/- \*\*Date \/ Time\*\*: ([^\n\r]+)/);

      // Extract user prompt
      const promptMatch = content.match(/## User Prompt\r?\n([\s\S]*?)\r?\n---/);
      const prompt = promptMatch ? promptMatch[1].trim() : "No prompt recorded";

      results.push({
        filename,
        timestamp: timeMatch ? timeMatch[1].split(" (")[0] : filename.replace(".md", ""),
        model: modelMatch ? modelMatch[1] : "Unknown",
        iterations: iterMatch ? parseInt(iterMatch[1], 10) : 1,
        toolCount: toolMatch ? parseInt(toolMatch[1], 10) : 0,
        preview: prompt.length > 80 ? prompt.slice(0, 80) + "..." : prompt,
      });
    } catch (err) {
      console.warn(`[Conversation Logger] Failed to parse summary for ${filename}`);
    }
  }

  // Sort by filename (which is timestamp YYYY-MM-DD_HH-mm-ss) descending
  return results.sort((a, b) => b.filename.localeCompare(a.filename));
}

/**
 * Parses a saved conversation markdown file back into structured messages & tool calls
 */
export function parseConversationLog(filename: string, baseDir: string = "logs") {
  const fullPath = path.resolve(process.cwd(), baseDir, filename);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Log file "${filename}" does not exist.`);
  }

  const content = fs.readFileSync(fullPath, "utf-8");

  // Extract User Prompt
  const promptMatch = content.match(/## User Prompt\r?\n([\s\S]*?)\r?\n---/);
  const userPrompt = promptMatch ? promptMatch[1].trim() : "";

  // Extract Final Answer
  const answerMatch = content.match(/## Final Synthesized Answer\r?\n\r?\n([\s\S]*)$/);
  const finalAnswer = answerMatch ? answerMatch[1].trim() : "";

  // Extract Tool Calls
  const toolCalls: Array<{
    id: string;
    toolName: string;
    serverName?: string;
    args: any;
    result?: string;
    timestamp: number;
  }> = [];

  const toolSections = content.split(/### \[Step \d+\] Tool: `([^`]+)`/g);
  // Pattern gives: [preamble, toolName1, body1, toolName2, body2, ...]
  for (let i = 1; i < toolSections.length; i += 2) {
    const toolName = toolSections[i];
    const body = toolSections[i + 1] || "";

    const serverMatch = body.match(/- \*\*Owning MCP Server\*\*: `([^`]+)`/);
    const serverName = serverMatch ? serverMatch[1] : undefined;

    const timeMatch = body.match(/- \*\*Timestamp\*\*: ([^\n\r]+)/);
    const timestamp = timeMatch ? new Date(timeMatch[1]).getTime() : Date.now();

    const argsMatch = body.match(/#### Parameters\r?\n```json\r?\n([\s\S]*?)\r?\n```/);
    let args = {};
    if (argsMatch) {
      try {
        args = JSON.parse(argsMatch[1]);
      } catch {}
    }

    const obsMatch = body.match(/#### Observation \(Result\)\r?\n```text\r?\n([\s\S]*?)\r?\n```/);
    const result = obsMatch ? obsMatch[1].trim() : undefined;

    toolCalls.push({
      id: `tool-${timestamp}-${i}`,
      toolName,
      serverName,
      args,
      result,
      timestamp,
    });
  }

  // Build reconstructed Message[]
  const messages = [
    {
      id: `user-${Date.now()}-1`,
      role: "user" as const,
      content: userPrompt,
    },
    {
      id: `assistant-${Date.now()}-2`,
      role: "assistant" as const,
      content: finalAnswer,
      toolCalls,
      iterations: toolCalls.length > 0 ? toolCalls.length : 1,
    },
  ];

  return {
    filename,
    messages,
  };
}

/**
 * Delete a saved conversation log file safely
 */
export function deleteConversationLog(filename: string, baseDir: string = "logs"): boolean {
  // Guard against directory traversal attacks
  const safeFilename = path.basename(filename);
  if (!safeFilename.endsWith(".md") || safeFilename === "README.md") {
    throw new Error("Invalid log file specified.");
  }

  const fullPath = path.resolve(process.cwd(), baseDir, safeFilename);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    console.log(`[Conversation Logger] 🗑️ Deleted conversation log: ${safeFilename}`);
    return true;
  }
  return false;
}
