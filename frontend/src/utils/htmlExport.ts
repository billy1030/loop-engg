/**
 * Generates a standalone, beautiful, self-contained HTML document
 * with offline styling, Dark/Light mode toggle, Print capability,
 * Marked parser, and enhanced Mermaid diagrams rendering with smart wrapping,
 * tall flowchart auto-scaling, tight margin fitting, and syntax guardrails.
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
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Noto+Sans+TC:wght@300;400;500;700;900&family=Roboto:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
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
      --accent2: #4f46e5;
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
      --accent2: #818cf8;
      --accent-glow: rgba(56, 189, 248, 0.15);
      --code-bg: #000000;
      --code-fg: #e2e8f0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Roboto', 'Noto Sans TC', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.75;
      padding-bottom: 5rem;
      transition: background-color 0.2s, color 0.2s;
    }
    .header-banner {
      background: var(--card);
      border-bottom: 1px solid var(--border);
      padding: 1rem 2rem;
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
      max-width: 980px;
      margin: 0 auto;
      padding: 2.5rem 2rem;
      background: var(--card);
      margin-top: 2rem;
      border-radius: 16px;
      border: 1px solid var(--border);
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    }
    .markdown-body h1 {
      font-size: 1.85rem;
      font-weight: 800;
      margin: 1.8rem 0 0.9rem;
      border-bottom: 2px solid var(--border);
      padding-bottom: 0.5rem;
      color: var(--text);
    }
    .markdown-body h2 {
      font-size: 1.4rem;
      font-weight: 700;
      margin: 1.8rem 0 0.8rem;
      color: var(--accent);
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.3rem;
    }
    .markdown-body h3 {
      font-size: 1.15rem;
      font-weight: 600;
      margin: 1.4rem 0 0.6rem;
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

    /* ==================== Mermaid Container & Viewport ==================== */
    .mermaid-wrapper {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      margin: 1.5rem 0;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.03);
    }
    .mermaid-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: #f8fafc;
      border-bottom: 1px solid var(--border);
      font-size: 0.75rem;
    }
    html.dark .mermaid-topbar { background: #0f172a; }
    .mermaid-topbar-title {
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      color: var(--accent);
    }
    .mermaid-tools-group {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .mm-btn {
      background: var(--card);
      border: 1px solid var(--border);
      padding: 0.25rem 0.55rem;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
      color: var(--text);
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-family: inherit;
    }
    .mm-btn:hover {
      background: rgba(2,132,199,0.1);
      color: var(--accent);
      border-color: var(--accent);
    }
    .mm-btn.active {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }
    .mermaid-code-panel {
      display: none;
      padding: 0.85rem;
      background: #0f172a;
      color: #e2e8f0;
      border-bottom: 1px solid #1e293b;
      font-family: monospace;
      font-size: 0.78rem;
      max-height: 250px;
      overflow-y: auto;
    }
    .mermaid-code-panel.visible { display: block; }
    .mermaid-viewport {
      width: 100%;
      min-height: auto;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      cursor: grab;
      user-select: none;
      transition: min-height 0.2s;
    }
    .mermaid-viewport.expand-43 { min-height: 420px; }
    .mermaid-viewport:active { cursor: grabbing; }

    /* SVG Sizing & Font Controls */
    .mermaid-viewport svg, .mermaid-wrapper svg {
      display: block;
      margin: 0 auto;
      max-width: 100% !important;
      max-height: 520px !important;
      width: auto !important;
      height: auto !important;
      font-size: 13.5px !important;
      transition: transform 0.12s ease-out;
      transform-origin: center center;
    }
    .mermaid-viewport svg.mermaid-tall-chart,
    .mermaid-wrapper svg.mermaid-tall-chart {
      max-height: 480px !important;
      width: auto !important;
      margin-left: auto !important;
      margin-right: auto !important;
      display: block !important;
    }
    .mermaid-viewport svg foreignObject,
    .mermaid-wrapper svg foreignObject {
      overflow: visible !important;
    }
    .mermaid-viewport svg .node foreignObject>div,
    .mermaid-viewport svg .nodeLabel,
    .mermaid-viewport svg .label,
    .mermaid-wrapper svg .node foreignObject>div,
    .mermaid-wrapper svg .nodeLabel,
    .mermaid-wrapper svg .label {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      text-align: center !important;
      line-height: 1.2 !important;
      font-size: 13.5px !important;
      font-weight: 500 !important;
      letter-spacing: 0.025em !important;
      white-space: normal !important;
      word-break: break-word !important;
      overflow-wrap: break-word !important;
      max-width: 260px !important;
      padding: 0 !important;
      margin: 0 !important;
      height: 100% !important;
      box-sizing: border-box !important;
    }
    .mermaid-viewport svg .node foreignObject p,
    .mermaid-viewport svg .node foreignObject span,
    .mermaid-wrapper svg .node foreignObject p,
    .mermaid-wrapper svg .node foreignObject span {
      margin: 0 !important;
      padding: 0 !important;
      line-height: 1.2 !important;
      font-size: 13.5px !important;
      letter-spacing: 0.025em !important;
    }
    .mermaid-viewport svg .node rect,
    .mermaid-wrapper svg .node rect {
      rx: 8px !important;
      ry: 8px !important;
    }
    .mermaid-viewport svg text,
    .mermaid-wrapper svg text {
      font-weight: 500 !important;
      font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Noto Sans TC', sans-serif !important;
      letter-spacing: 0.025em !important;
    }
    .mermaid-viewport svg .cluster rect,
    .mermaid-wrapper svg .cluster rect {
      fill: #f8fafc !important;
      stroke: #93c5fd !important;
      stroke-width: 1.5px !important;
      rx: 10px !important;
      ry: 10px !important;
    }
    html.dark .mermaid-viewport svg .cluster rect,
    html.dark .mermaid-wrapper svg .cluster rect {
      fill: #0f172a !important;
      stroke: #38bdf8 !important;
    }

    /* Fixed Bottom Toolbar */
    .toolbar {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      display: flex;
      gap: 0.5rem;
      background: var(--card);
      padding: 0.45rem 0.75rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
      z-index: 100;
    }
    .btn {
      background: none;
      border: none;
      padding: 0.45rem 0.85rem;
      border-radius: 999px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      color: var(--text);
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: inherit;
    }
    .btn:hover {
      background: var(--accent-glow);
      color: var(--accent);
    }
    .btn.primary {
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      color: #fff;
    }
    .btn.primary:hover { opacity: 0.92; }

    /* Print & PDF Rules */
    @page { size: A4; margin: 15mm 15mm; }
    @media print {
      body { background: #fff !important; color: #000 !important; font-size: 12pt; line-height: 1.5; }
      .toolbar, .header-banner, .mermaid-code-panel { display: none !important; }
      .mermaid-topbar { display: flex !important; background: #f8fafc !important; border-bottom: 1px solid #cbd5e1 !important; padding: 4px 10px !important; }
      .mermaid-topbar-title { display: flex !important; color: #0284c7 !important; font-weight: 700 !important; font-size: 0.82rem !important; }
      .mermaid-tools-group, .mm-btn { display: none !important; }
      .main { border: none; box-shadow: none; margin: 0; padding: 0; max-width: 100%; }
      .mermaid-wrapper { page-break-inside: avoid !important; break-inside: avoid !important; border: 1px solid #cbd5e1; box-shadow: none; margin: 1.5rem 0; }
      .mermaid-viewport { padding: 0.5rem; }
      .mermaid-viewport svg { max-width: 100% !important; height: auto !important; }
      .mermaid-viewport svg.mermaid-tall-chart { max-height: 480px !important; width: auto !important; margin: 0 auto !important; }
      pre, table, blockquote { page-break-inside: avoid; break-inside: avoid; border: 1px solid #e2e8f0; }
    }
  </style>
</head>
<body>

<header class="header-banner">
  <div class="brand">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    <span>MiniBot · Export Report</span>
  </div>
  <div style="font-size: 0.82rem; color: var(--muted);">
    Generated: ${new Date().toLocaleString()}
  </div>
</header>

<div class="toolbar">
  <button class="btn" onclick="toggleTheme()" title="Toggle Light / Dark Mode">🌓 Theme</button>
  <button class="btn primary" onclick="window.print()" title="Print / Save PDF">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
    <span>Print / PDF</span>
  </button>
</div>

<div class="main">
  <div class="markdown-body" id="md-content" data-markdown="${encoded}"></div>
</div>

<script>
(function() {
  var isDark = false;
  window.toggleTheme = function() {
    isDark = !isDark;
    document.documentElement.classList.toggle('dark', isDark);
    applyMermaidConfig();
    renderAllMermaids();
  };

  // 🔤 智慧文字折行：長節點文字自動在標點符號、空格或自然語意處注入 <br/>
  function smartWrapNodeText(text) {
    if (!text || text.includes('<br') || text.includes('\\n')) return text;
    var plainText = text.trim();
    if (plainText.length <= 14) return text;

    function splitLine(str) {
      if (str.length <= 16) return [str];

      // 1. 全形冒號
      var colonIdx = str.search(/[：]/);
      if (colonIdx >= 3 && colonIdx <= 14) {
        return [str.slice(0, colonIdx + 1)].concat(splitLine(str.slice(colonIdx + 1).trim()));
      }
      // 2. 半形冒號帶空格
      var halfColonIdx = str.search(/:\\s/);
      if (halfColonIdx >= 3 && halfColonIdx <= 14) {
        return [str.slice(0, halfColonIdx + 1)].concat(splitLine(str.slice(halfColonIdx + 1).trim()));
      }
      // 3. 標點符號
      var puncIdx = -1;
      for (var i = 8; i <= Math.min(16, str.length - 4); i++) {
        if ('，、；;,'.indexOf(str[i]) !== -1) { puncIdx = i; break; }
      }
      if (puncIdx !== -1) {
        return [str.slice(0, puncIdx + 1)].concat(splitLine(str.slice(puncIdx + 1).trim()));
      }
      // 4. 自然中文助詞
      var breakIdx = -1;
      for (var j = 9; j <= Math.min(15, str.length - 4); j++) {
        if ('和與或同及'.indexOf(str[j]) !== -1) { breakIdx = j; break; }
      }
      if (breakIdx !== -1) {
        return [str.slice(0, breakIdx)].concat(splitLine(str.slice(breakIdx).trim()));
      }
      // 5. 英文單詞空格
      var spaceIdx = -1;
      for (var k = Math.min(16, str.length - 3); k >= 8; k--) {
        if (str[k] === ' ') { spaceIdx = k; break; }
      }
      if (spaceIdx !== -1) {
        return [str.slice(0, spaceIdx)].concat(splitLine(str.slice(spaceIdx + 1).trim()));
      }
      // 6. 保底切分
      if (str.length > 18) {
        return [str.slice(0, 13)].concat(splitLine(str.slice(13)));
      }
      return [str];
    }

    var chunks = splitLine(plainText);
    return chunks.filter(function(c) { return c.trim().length > 0; }).join('<br/>');
  }

  // 🛡️ Mermaid Guardrail & Auto-Sanitizer
  function sanitizeMermaid(code) {
    if (!code) return '';
    var lines = code.split('\\n');
    var fixed = lines.map(function(line) {
      var l = line;
      if (/^\\s*(flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline)/i.test(l.trim())) {
        return l;
      }
      // 修復 subgraph
      if (/^\\s*subgraph\\b/i.test(l)) {
        if (/^\\s*subgraph\\s+[A-Za-z0-9_\\-]+\\s+\\["[^"\\]\\n]+"\\]\\s*$/i.test(l.trim())) return l;
        l = l.replace(/^(\\s*subgraph\\s+)([A-Za-z0-9_\\-]+)\\s*\\((?:\\'|\\")?([^\\)\\n]+?)(?:\\'|\\")?\\)\\s*$/i, function(m, p, name, t) {
          var safeId = 'sub_' + Math.random().toString(36).substring(2, 7);
          return p + safeId + ' ["' + name + ' (' + t.trim() + ')"]';
        });
        return l;
      }
      // 修復節點引號
      l = l.replace(/(\\b[A-Za-z0-9_\\u4e00-\\u9fa5]+)\\[([^"\\]\\n]*[\\(\\)\\?\\:\\/\\-\\s\\uff08\\uff09\\u3001\\uff0c\\+\\=\\#][^"\\]\\n]*)\\]/g, '$1["$2"]');
      l = l.replace(/(\\b[A-Za-z0-9_\\u4e00-\\u9fa5]+)\\{([^"\\}\\n]*[\\(\\)\\?\\:\\/\\-\\s\\uff08\\uff09\\u3001\\uff0c\\+\\=\\#][^"\\}\\n]*)\\}/g, '$1{"$2"}');

      // 對帶引號的文字執行智慧折行
      l = l.replace(/(\\b[A-Za-z0-9_\\u4e00-\\u9fa5]+\\s*\\[")([^"\\n]+)("\\s*\\])/g, function(m, p, text, s) {
        return p + smartWrapNodeText(text) + s;
      });
      l = l.replace(/(\\b[A-Za-z0-9_\\u4e00-\\u9fa5]+\\s*\\{")([^"\\n]+)("\\s*\\})/g, function(m, p, text, s) {
        return p + smartWrapNodeText(text) + s;
      });

      // 修復箭頭與連線標籤
      l = l.replace(/--\\s+([^"\\n\\-]+?[\\(\\)\\?\\:\\/\\s\\uff08\\uff09][^"\\n\\-]+?)\\s+-->/g, '-- "$1" -->');
      l = l.replace(/-->\\|([^"\\|\\n]+?[\\(\\)\\?\\:\\/\\s\\uff08\\uff09][^"\\|\\n]+?)\\|/g, '-->|"$1"|');
      l = l.replace(/(\\[[^\\]]*?)\\s*->\\s*([^\\s\\]]*.*?\\])/g, function(m, before, after) { return before.replace(/\\s+$/, '') + ' to ' + after.replace(/^\\s+/, ''); });
      l = l.replace(/(\\{[^\\}]*?)\\s*->\\s*([^\\s\\}]*.*?\\})/g, function(m, before, after) { return before.replace(/\\s+$/, '') + ' to ' + after.replace(/^\\s+/, ''); });

      return l;
    });
    return fixed.join('\\n');
  }

  function applyMermaidConfig() {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      suppressErrorRendering: true,
      theme: 'base',
      themeVariables: isDark ? {
        darkMode: true,
        background: "#020617",
        mainBkg: "#0f172a",
        primaryColor: "#1e1b4b",
        primaryTextColor: "#f8fafc",
        primaryBorderColor: "#38bdf8",
        secondaryColor: "#172554",
        secondaryTextColor: "#f1f5f9",
        secondaryBorderColor: "#60a5fa",
        tertiaryColor: "#1e1b4b",
        tertiaryTextColor: "#f1f5f9",
        tertiaryBorderColor: "#93c5fd",
        lineColor: "#38bdf8",
        textColor: "#f8fafc",
        clusterBkg: "#0f172a",
        clusterBorder: "#38bdf8",
        nodeBorder: "#38bdf8",
        defaultLinkColor: "#38bdf8",
        titleColor: "#7dd3fc",
        edgeLabelBackground: "#1e293b",
        nodeTextColor: "#f8fafc",
        fontFamily: '"Roboto", -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif'
      } : {
        darkMode: false,
        background: "#ffffff",
        mainBkg: "#f8fafc",
        primaryColor: "#f0f9ff",
        primaryTextColor: "#0f172a",
        primaryBorderColor: "#38bdf8",
        secondaryColor: "#f8fafc",
        secondaryTextColor: "#1e293b",
        secondaryBorderColor: "#cbd5e1",
        tertiaryColor: "#f1f5f9",
        tertiaryTextColor: "#1e293b",
        tertiaryBorderColor: "#94a3b8",
        lineColor: "#2563eb",
        textColor: "#0f172a",
        clusterBkg: "#f8fafc",
        clusterBorder: "#93c5fd",
        nodeBorder: "#0284c7",
        defaultLinkColor: "#2563eb",
        titleColor: "#0369a1",
        edgeLabelBackground: "#ffffff",
        nodeTextColor: "#0f172a",
        fontFamily: '"Roboto", -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif'
      },
      fontSize: 13.5,
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
        nodeSpacing: 45,
        rankSpacing: 48,
        padding: 12,
        wrappingWidth: 240
      },
      sequence: {
        diagramMarginX: 50,
        diagramMarginY: 30,
        actorFontSize: 14,
        messageFontSize: 13.5,
        noteFontSize: 13,
        width: 180,
        height: 50
      }
    });
  }

  var rawMermaidMap = {};
  var mCount = 0;

  function renderMarkdown() {
    var el = document.getElementById('md-content');
    if (!el) return;
    var raw = decodeURIComponent(el.getAttribute('data-markdown') || '');
    if (!raw) return;

    var renderer = new marked.Renderer();

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

  async function renderAllMermaids() {
    var ids = Object.keys(rawMermaidMap);
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var code = rawMermaidMap[id];
      var wrapper = document.getElementById(id);
      if (!wrapper) continue;

      var sanitized = sanitizeMermaid(code);
      var renderId = 'm_' + i + '_' + Math.random().toString(36).substring(2, 8);

      try {
        var res = await mermaid.render(renderId, sanitized);
        var svgStr = res.svg || '';

        var isDarkNow = document.documentElement.classList.contains('dark');
        var targetClusterBkg = isDarkNow ? '#0f172a' : '#f8fafc';
        svgStr = svgStr
          .replace(/#ffffde/gi, targetClusterBkg)
          .replace(/#ffffcc/gi, targetClusterBkg)
          .replace(/#ffffdf/gi, targetClusterBkg)
          .replace(/#fffbe8/gi, targetClusterBkg)
          .replace(/#fefae0/gi, targetClusterBkg)
          .replace(/#ffffe0/gi, targetClusterBkg);

        var isTall = false;
        var vbMatch = svgStr.match(/viewBox=["\']([0-9.-]+)\\s+([0-9.-]+)\\s+([0-9.-]+)\\s+([0-9.-]+)["\']/i);
        if (vbMatch) {
          var vbW = parseFloat(vbMatch[3]);
          var vbH = parseFloat(vbMatch[4]);
          if (vbW > 0 && vbH > 0 && (vbH / vbW > 1.33)) isTall = true;
        }

        if (isTall) {
          if (svgStr.includes('class="')) {
            svgStr = svgStr.replace(/class=["\']([^"\']*)["']/i, 'class="$1 mermaid-tall-chart"');
          } else {
            svgStr = svgStr.replace(/<svg\\b/i, '<svg class="mermaid-tall-chart" ');
          }
        }

        var diagramNum = (i + 1).toString().padStart(2, '0');
        wrapper.innerHTML = '<div class="mermaid-topbar" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px;">'
          + '<div class="mermaid-topbar-title" style="display:flex;align-items:center;gap:6px;font-weight:bold;color:#1e293b;">'
          + '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="shrink-0;"><rect x="9" y="3" width="6" height="6" rx="1.5"/><rect x="3" y="15" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/><path d="M12 9v3M6 15v-1a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>'
          + '<span>Diagram (' + diagramNum + ')</span>'
          + '</div>'
          + '<div class="mermaid-tools-group" style="display:flex;align-items:center;gap:8px;">'
          + '<button class="mm-btn view-btn" style="height:28px;padding:0 10px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;font-weight:bold;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;"><span style="color:#4f46e5;font-weight:bold;font-family:monospace;">&lt;&gt;</span> View Code</button>'
          + '<button class="mm-btn copy-btn" style="height:28px;padding:0 10px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;font-weight:bold;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Code</button>'
          + '<div style="display:inline-flex;align-items:center;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:0 6px;height:28px;gap:4px;">'
          + '<button class="mm-btn zoom-out" style="border:none;background:transparent;padding:1px 4px;cursor:pointer;">🔍 −</button>'
          + '<span class="reset-btn" style="padding:0 4px;font-family:monospace;font-weight:bold;font-size:12px;color:#1e293b;cursor:pointer;" title="Reset zoom to 100%">100%</span>'
          + '<button class="mm-btn zoom-in" style="border:none;background:transparent;padding:1px 4px;cursor:pointer;">+</button>'
          + '<button class="mm-btn reset-icon" style="border:none;background:transparent;padding:1px 3px;cursor:pointer;" title="Reset view">↺</button>'
          + '</div>'
          + '<div style="display:inline-flex;align-items:center;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:0 6px;height:28px;gap:4px;">'
          + '<button class="mm-btn lh-btn-dn" style="border:none;background:transparent;padding:1px 4px;font-weight:bold;font-size:12px;cursor:pointer;">↕-</button>'
          + '<span class="lh-btn" style="padding:0 4px;color:#4f46e5;font-weight:bold;font-family:monospace;font-size:12px;cursor:pointer;" title="Reset line height to 1.2">↕ 1.2</span>'
          + '<button class="mm-btn lh-btn-up" style="border:none;background:transparent;padding:1px 4px;font-weight:bold;font-size:12px;cursor:pointer;">↕+</button>'
          + '</div>'
          + '<button class="mm-btn fit-margin-btn active" style="background:#4f46e5;color:#fff;border:none;width:28px;height:28px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;padding:0;cursor:pointer;box-shadow:0 1px 2px rgba(79,70,229,0.25);" title="Fit Margin: Detect & reduce vertical margin space for current zoom"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 15 12 20 17 15"/><polyline points="7 9 12 4 17 9"/></svg></button>'
          + '<button class="mm-btn expand-btn" style="height:28px;width:28px;padding:0;border-radius:8px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;" title="4:3 Expand Frame"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg></button>'
          + '</div></div>'
          + '<div class="mermaid-code-panel"><pre><code>' + code.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</code></pre></div>'
          + '<div class="mermaid-viewport">' + svgStr + '</div>';

        setupViewportInteractivity(wrapper, isTall, code);
      } catch (err) {
        wrapper.innerHTML = '<div style="color:#ef4444;background:#fef2f2;padding:12px;border-radius:8px;font-family:monospace;font-size:12px;">'
          + 'Failed to render Mermaid diagram: ' + err.message
          + '<pre style="margin-top:8px;background:#1e293b;color:#f8fafc;padding:8px;border-radius:6px;overflow-x:auto;">' + code.replace(/</g,'&lt;') + '</pre></div>';
      }
    }
  }

  function setupViewportInteractivity(wrapper, isTallChart, originalCode) {
    var svgEl = wrapper.querySelector('svg');
    var viewport = wrapper.querySelector('.mermaid-viewport');
    var codePanel = wrapper.querySelector('.mermaid-code-panel');
    var copyBtn = wrapper.querySelector('.copy-btn');
    var viewBtn = wrapper.querySelector('.view-btn');
    var zoomOutBtn = wrapper.querySelector('.zoom-out');
    var resetBtn = wrapper.querySelector('.reset-btn');
    var zoomInBtn = wrapper.querySelector('.zoom-in');
    var lhBtn = wrapper.querySelector('.lh-btn');
    var fitMarginBtn = wrapper.querySelector('.fit-margin-btn');
    var expBtn = wrapper.querySelector('.expand-btn');

    if (!svgEl || !viewport) return;

    var currentScale = 1.0;
    var panX = 0; var panY = 0;
    var isDragging = false;
    var startX = 0; var startY = 0;
    var currentLh = 1.2;
    var isFitMargin = true;
    var isExpanded = false;
    var isCodeVisible = false;

    function applyTransform() {
      svgEl.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + currentScale + ')';
      updateSnugHeight();
    }

    function updateSnugHeight() {
      if (isFitMargin) {
        var contentH = 0;
        try {
          var bbox = svgEl.getBBox();
          if (bbox && bbox.height > 0) {
            contentH = isTallChart ? Math.min(480, bbox.height) : bbox.height;
          }
        } catch(e) {}
        if (!contentH) {
          var rect = svgEl.getBoundingClientRect();
          if (rect && rect.height > 0) contentH = rect.height / (currentScale || 1.0);
        }
        if (contentH > 0) {
          var snugH = Math.max(60, Math.round(contentH * currentScale + 16));
          viewport.style.minHeight = 'auto';
          viewport.style.height = snugH + 'px';
          viewport.style.padding = '4px 12px';
          return;
        }
      }
      viewport.style.minHeight = isExpanded ? '420px' : 'auto';
      viewport.style.height = 'auto';
      viewport.style.padding = '12px 16px';
    }

    if (copyBtn) {
      copyBtn.onclick = function() {
        navigator.clipboard.writeText(originalCode).then(function() {
          copyBtn.textContent = '✓ Copied';
          setTimeout(function() { copyBtn.textContent = '📋 Copy'; }, 1500);
        });
      };
    }

    if (viewBtn) {
      viewBtn.onclick = function() {
        isCodeVisible = !isCodeVisible;
        codePanel.classList.toggle('visible', isCodeVisible);
        viewBtn.classList.toggle('active', isCodeVisible);
      };
    }

    if (zoomInBtn) {
      zoomInBtn.onclick = function() {
        currentScale = Math.min(3.0, parseFloat((currentScale + 0.15).toFixed(2)));
        if (resetBtn) resetBtn.textContent = Math.round(currentScale * 100) + '%';
        applyTransform();
      };
    }

    if (zoomOutBtn) {
      zoomOutBtn.onclick = function() {
        currentScale = Math.max(0.3, parseFloat((currentScale - 0.15).toFixed(2)));
        if (resetBtn) resetBtn.textContent = Math.round(currentScale * 100) + '%';
        applyTransform();
      };
    }

    if (resetBtn) {
      resetBtn.onclick = function() {
        currentScale = 1.0; panX = 0; panY = 0;
        resetBtn.textContent = '100%';
        applyTransform();
      };
    }

    if (lhBtn) {
      lhBtn.onclick = function() {
        if (currentLh <= 1.05) currentLh = 1.2;
        else if (currentLh <= 1.25) currentLh = 1.4;
        else currentLh = 1.0;
        lhBtn.textContent = '↕ ' + currentLh;
        var textEls = svgEl.querySelectorAll('foreignObject div, .nodeLabel, text');
        textEls.forEach(function(el) { el.style.setProperty('line-height', currentLh.toString(), 'important'); });
        updateSnugHeight();
      };
    }

    if (fitMarginBtn) {
      fitMarginBtn.onclick = function() {
        isFitMargin = !isFitMargin;
        fitMarginBtn.classList.toggle('active', isFitMargin);
        if (isFitMargin) panY = 0;
        applyTransform();
      };
    }

    if (expBtn) {
      expBtn.onclick = function() {
        isExpanded = !isExpanded;
        viewport.classList.toggle('expand-43', isExpanded);
        expBtn.classList.toggle('active', isExpanded);
        updateSnugHeight();
      };
    }

    // Drag-to-pan
    viewport.onmousedown = function(e) {
      if (e.button !== 0) return;
      isDragging = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
    };
    window.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      applyTransform();
    });
    window.addEventListener('mouseup', function() { isDragging = false; });
    viewport.ondblclick = function() {
      currentScale = 1.0; panX = 0; panY = 0;
      if (resetBtn) resetBtn.textContent = '100%';
      applyTransform();
    };

    updateSnugHeight();
  }

  applyMermaidConfig();
  renderMarkdown();
  renderAllMermaids();
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
