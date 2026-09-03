/**
 * Generates a standalone, beautiful, self-contained HTML document
 * with offline styling, Dark/Light mode toggle, Print capability,
 * Marked parser, and Mermaid diagrams rendering.
 */
export function generateStandaloneExportHtml(markdownContent: string, title: string = "Mini Chat Bot Export"): string {
  const encoded = encodeURIComponent(markdownContent);

  return `<!DOCTYPE html>
<html lang="zh-HK" class="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Noto+Sans+TC:wght@300;400;500;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>
  <style>
    :root {
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
      --accent: #0284c7;
      --accent-glow: rgba(2, 132, 199, 0.12);
      --code-bg: #0f172a;
      --code-fg: #f8fafc;
    }
    html.dark {
      --bg: #020617;
      --card: #0f172a;
      --text: #f8fafc;
      --muted: #94a3b8;
      --border: #334155;
      --accent: #38bdf8;
      --accent-glow: rgba(56, 189, 248, 0.15);
      --code-bg: #000000;
      --code-fg: #e2e8f0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', 'Noto Sans TC', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.75;
      padding-bottom: 5rem;
      transition: background-color 0.2s, color 0.2s;
    }
    .header-banner {
      background: var(--card);
      border-bottom: 1px solid var(--border);
      padding: 1.25rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(12px);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
      font-size: 1.1rem;
      color: var(--accent);
    }
    .main {
      max-width: 960px;
      margin: 0 auto;
      padding: 3rem 2rem;
      background: var(--card);
      margin-top: 2rem;
      border-radius: 16px;
      border: 1px solid var(--border);
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    }
    .markdown-body h1 {
      font-size: 2rem;
      font-weight: 900;
      margin: 2rem 0 1rem;
      border-bottom: 2px solid var(--border);
      padding-bottom: 0.5rem;
      color: var(--text);
    }
    .markdown-body h2 {
      font-size: 1.5rem;
      font-weight: 800;
      margin: 2rem 0 0.8rem;
      color: var(--accent);
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.3rem;
    }
    .markdown-body h3 {
      font-size: 1.2rem;
      font-weight: 700;
      margin: 1.5rem 0 0.6rem;
    }
    .markdown-body p { margin-bottom: 1rem; }
    .markdown-body ul, .markdown-body ol {
      padding-left: 1.5rem;
      margin-bottom: 1rem;
    }
    .markdown-body li { margin-bottom: 0.35rem; }
    .markdown-body blockquote {
      border-left: 4px solid var(--accent);
      padding: 0.8rem 1.2rem;
      background: var(--accent-glow);
      border-radius: 0 8px 8px 0;
      margin: 1.2rem 0;
      color: var(--text);
    }
    .markdown-body code {
      font-family: 'Fira Code', monospace;
      font-size: 0.87em;
      background: var(--accent-glow);
      color: var(--accent);
      padding: 0.15em 0.4em;
      border-radius: 4px;
    }
    .markdown-body pre {
      background: var(--code-bg);
      color: var(--code-fg);
      padding: 1.2rem;
      border-radius: 10px;
      margin: 1.5rem 0;
      overflow-x: auto;
    }
    .markdown-body pre code {
      background: none;
      color: inherit;
      padding: 0;
      font-size: 0.88rem;
      line-height: 1.6;
    }
    .markdown-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      font-size: 0.9rem;
    }
    .markdown-body th, .markdown-body td {
      border: 1px solid var(--border);
      padding: 0.65rem 1rem;
      text-align: left;
    }
    .markdown-body th {
      background: var(--bg);
      font-weight: 700;
    }
    .markdown-body tr:nth-child(even) {
      background: var(--accent-glow);
    }
    .mermaid-wrapper {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin: 2rem 0;
      display: flex;
      justify-content: center;
      overflow-x: auto;
    }
    .mermaid-wrapper svg { max-width: 100%; height: auto; }
    .toolbar {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      display: flex;
      gap: 0.5rem;
      background: var(--card);
      padding: 0.5rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
      z-index: 100;
    }
    .btn {
      background: none;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      color: var(--text);
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn:hover {
      background: var(--accent-glow);
      color: var(--accent);
    }
    .btn.primary {
      background: linear-gradient(135deg, #0284c7, #4f46e5);
      color: #fff;
    }
    .btn.primary:hover {
      opacity: 0.9;
    }
    @media print {
      .toolbar, .header-banner { display: none !important; }
      .main { border: none; box-shadow: none; margin: 0; padding: 0; max-width: 100%; }
      body { background: #fff; color: #000; }
    }
  </style>
</head>
<body>

<header class="header-banner">
  <div class="brand">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    <span>Mini Chat Bot · Export Report</span>
  </div>
  <div style="font-size: 0.82rem; color: var(--muted);">
    Generated: ${new Date().toLocaleString()}
  </div>
</header>

<div class="toolbar">
  <button class="btn" onclick="document.documentElement.classList.toggle('dark')">🌓 Theme</button>
  <button class="btn primary" onclick="window.print()">🖨️ Print / Save PDF</button>
</div>

<div class="main">
  <div class="markdown-body" id="md-content" data-markdown="${encoded}"></div>
</div>

<script>
(function() {
  // Step 1: Initialize Mermaid
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    suppressErrorRendering: true,
    fontFamily: '"Plus Jakarta Sans", "Noto Sans TC", sans-serif',
    flowchart: { htmlLabels: true, curve: 'basis' }
  });

  var rawMermaidMap = {};

  // Step 2: Render Markdown with custom Mermaid interceptor
  function renderMarkdown() {
    var el = document.getElementById('md-content');
    if (!el) return;
    var raw = decodeURIComponent(el.getAttribute('data-markdown') || '');
    if (!raw) return;

    var renderer = new marked.Renderer();
    var mCount = 0;

    renderer.code = function(code, lang) {
      if (typeof code === 'object' && code !== null) {
        lang = code.lang;
        code = code.text;
      }
      code = code || '';
      lang = lang || '';

      if (lang === 'mermaid') {
        var id = 'mermaid-render-' + (++mCount) + '-' + Date.now();
        rawMermaidMap[id] = code.trim();
        return '<div class="mermaid-wrapper" id="' + id + '"></div>';
      }
      var escaped = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      return '<pre><code class="language-' + lang + '">' + escaped + '</code></pre>';
    };

    el.innerHTML = marked.parse(raw, { renderer: renderer });
  }

  // Step 3: Async Render all collected Mermaid Diagrams
  async function renderMermaid() {
    var ids = Object.keys(rawMermaidMap);
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var code = rawMermaidMap[id];
      var container = document.getElementById(id);
      if (!container) continue;

      try {
        var res = await mermaid.render(id + '-svg', code);
        container.innerHTML = res.svg;
      } catch (err) {
        container.innerHTML = '<div style="color:#ef4444;background:#fef2f2;padding:12px;border-radius:6px;font-family:monospace;font-size:12px;">Failed to render Mermaid diagram: ' + err.message + '<pre style="margin-top:8px;">' + code + '</pre></div>';
      }
    }
  }

  renderMarkdown();
  renderMermaid();
})();
</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Triggers browser download of generated HTML file
 */
export function downloadHtmlFile(content: string, filename: string = "export.html") {
  const blob = new Blob([content], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
