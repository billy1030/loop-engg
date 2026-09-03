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
