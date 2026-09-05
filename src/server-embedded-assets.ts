// Static frontend files loader compatible with both Node.js (tsx) and Bun
import fs from "node:fs";
import path from "node:path";

export interface EmbeddedAsset {
  content: string | Buffer;
  contentType: string;
}

function safeRead(relPath: string): string {
  try {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, "utf-8");
    }
  } catch {
    // Ignore read errors in environments where dist is packaged elsewhere
  }
  return "";
}

export const EMBEDDED_FRONTEND: Record<string, EmbeddedAsset> = {
  "/": { content: safeRead("frontend/dist/index.html"), contentType: "text/html; charset=utf-8" },
  "/index.html": { content: safeRead("frontend/dist/index.html"), contentType: "text/html; charset=utf-8" },
  "/favicon.svg": { content: safeRead("frontend/dist/favicon.svg"), contentType: "image/svg+xml" },
  "/icons.svg": { content: safeRead("frontend/dist/icons.svg"), contentType: "image/svg+xml" },
  "/assets/index.js": { content: safeRead("frontend/dist/assets/index.js"), contentType: "application/javascript; charset=utf-8" },
  "/assets/index.css": { content: safeRead("frontend/dist/assets/index.css"), contentType: "text/css; charset=utf-8" },
};

