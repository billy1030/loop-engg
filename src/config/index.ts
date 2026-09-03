import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { LoopConfig, LoopConfigSchema } from "./schema.js";

dotenv.config();

export function loadConfig(configPath?: string): LoopConfig {
  const defaultPath = path.resolve(process.cwd(), "loop.config.json");
  const targetPath = configPath ? path.resolve(configPath) : defaultPath;

  let fileContent: any = {};
  if (fs.existsSync(targetPath)) {
    try {
      const raw = fs.readFileSync(targetPath, "utf-8");
      fileContent = JSON.parse(raw);
    } catch (err) {
      console.warn(`[Config] Failed to parse ${targetPath}, falling back to defaults:`, err);
    }
  }

  // Merge with environment variables if available
  const merged = {
    llm: {
      baseUrl: process.env.LLM_BASE_URL || (fileContent.llm?.baseUrl && !fileContent.llm.baseUrl.startsWith("${") ? fileContent.llm.baseUrl : "https://api.minimaxi.com/v1"),
      apiKey: process.env.LLM_API_KEY || process.env.MINIMAX_API_KEY || process.env.OPENAI_API_KEY || (fileContent.llm?.apiKey && !fileContent.llm.apiKey.startsWith("${") ? fileContent.llm.apiKey : ""),
      model: process.env.LLM_MODEL || fileContent.llm?.model || "MiniMax-M3",
      temperature: fileContent.llm?.temperature ?? 0.7,
      maxTokens: fileContent.llm?.maxTokens ?? 4096,
    },
    prompts: {
      systemPrompt: process.env.SYSTEM_PROMPT || fileContent.prompts?.systemPrompt,
      skillsPrompt: process.env.SKILLS_PROMPT || fileContent.prompts?.skillsPrompt,
    },
    mcpServers: fileContent.mcpServers || {},
    maxLoopIterations: fileContent.maxLoopIterations ?? 10,
  };

  return LoopConfigSchema.parse(merged);
}
