// Direct imports of static frontend files at compile-time with stable asset names
import indexHtml from "../frontend/dist/index.html" with { type: "text" };
import faviconSvg from "../frontend/dist/favicon.svg" with { type: "text" };
import iconsSvg from "../frontend/dist/icons.svg" with { type: "text" };
import indexJs from "../frontend/dist/assets/index.js" with { type: "text" };
import indexCss from "../frontend/dist/assets/index.css" with { type: "text" };

export interface EmbeddedAsset {
  content: string | Buffer;
  contentType: string;
}

export const EMBEDDED_FRONTEND: Record<string, EmbeddedAsset> = {
  "/": { content: indexHtml, contentType: "text/html; charset=utf-8" },
  "/index.html": { content: indexHtml, contentType: "text/html; charset=utf-8" },
  "/favicon.svg": { content: faviconSvg, contentType: "image/svg+xml" },
  "/icons.svg": { content: iconsSvg, contentType: "image/svg+xml" },
  "/assets/index.js": { content: indexJs, contentType: "application/javascript; charset=utf-8" },
  "/assets/index.css": { content: indexCss, contentType: "text/css; charset=utf-8" },
};
