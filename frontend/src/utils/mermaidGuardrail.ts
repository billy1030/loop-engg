/**
 * 🔤 智慧文字折行：長節點文字自動在標點符號（：、，、；）、自然語意或單詞空格處注入 <br/>
 * 讓 Dagre 排版引擎精準繪製出尺寸適中的四方框，徹底杜絕單行橫向爆框
 */
export function smartWrapNodeText(text: string): string {
  if (!text || text.includes('<br') || text.includes('\\n')) return text;
  const plainText = text.trim();
  if (plainText.length <= 14) return text;

  const splitLine = (str: string): string[] => {
    if (str.length <= 16) return [str];

    // 1. 優先全形冒號 '：'（例如 "全球和平轉化："）
    const colonIdx = str.search(/[：]/);
    if (colonIdx >= 3 && colonIdx <= 14) {
      const head = str.slice(0, colonIdx + 1);
      const rest = str.slice(colonIdx + 1).trimStart();
      return [head, ...splitLine(rest)];
    }

    // 2. 半形冒號帶空格 ': '
    const halfColonIdx = str.search(/:\s/);
    if (halfColonIdx >= 3 && halfColonIdx <= 14) {
      const head = str.slice(0, halfColonIdx + 1);
      const rest = str.slice(halfColonIdx + 1).trimStart();
      return [head, ...splitLine(rest)];
    }

    // 3. 標點符號（，、；;,）切分
    let puncIdx = -1;
    for (let i = 8; i <= Math.min(16, str.length - 4); i++) {
      if ('，、；;,'.includes(str[i])) {
        puncIdx = i;
        break;
      }
    }
    if (puncIdx === -1) {
      for (let i = 7; i >= 5; i--) {
        if ('，、；;,'.includes(str[i])) {
          puncIdx = i;
          break;
        }
      }
    }

    if (puncIdx !== -1) {
      const head = str.slice(0, puncIdx + 1);
      const rest = str.slice(puncIdx + 1).trimStart();
      return [head, ...splitLine(rest)];
    }

    // 4. 自然中文助詞/連詞（和、與、或、同、及）切分
    let breakIdx = -1;
    for (let i = 9; i <= Math.min(15, str.length - 4); i++) {
      if ('和與或同及'.includes(str[i])) {
        breakIdx = i;
        break;
      }
    }
    if (breakIdx !== -1) {
      const head = str.slice(0, breakIdx);
      const rest = str.slice(breakIdx).trimStart();
      return [head, ...splitLine(rest)];
    }

    // 5. 英文單詞空格切分（在 10 ~ 18 字元範圍內尋找最近的空格，避免將英文單詞截斷）
    let spaceIdx = -1;
    for (let i = Math.min(16, str.length - 3); i >= 8; i--) {
      if (str[i] === ' ') {
        spaceIdx = i;
        break;
      }
    }
    if (spaceIdx !== -1) {
      const head = str.slice(0, spaceIdx);
      const rest = str.slice(spaceIdx + 1).trimStart();
      return [head, ...splitLine(rest)];
    }

    // 6. 超長無標點字串保底折行（13 字處）
    if (str.length > 18) {
      const splitAt = 13;
      return [str.slice(0, splitAt), ...splitLine(str.slice(splitAt))];
    }

    return [str];
  };

  const chunks = splitLine(plainText);
  return chunks.filter(c => c.trim().length > 0).join('<br/>');
}

/**
 * 🛡️ Mermaid Guardrail & Auto-Sanitizer
 * 自動防護與修復任何非法/不相容的 Mermaid 語法
 */
export function sanitizeMermaidCode(code: string): string {
  if (!code) return '';
  const lines = code.split('\n');
  const fixedLines = lines.map(line => {
    let l = line;
    // 如果是開頭宣告行 (flowchart, sequenceDiagram 等)，不做節點修復
    if (/^\s*(flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline)/i.test(l.trim())) {
      return l;
    }

    // 1. 修復 subgraph：嚴格防止重複包裝已帶雙引號或已合法格式的 subgraph
    if (/^\s*subgraph\b/i.test(l)) {
      if (/^\s*subgraph\s+[A-Za-z0-9_\-]+\s+\["[^"\]\n]+"\]\s*$/i.test(l.trim())) {
        return l;
      }
      l = l.replace(/^(\s*subgraph\s+)([A-Za-z0-9_\-]+)\s*\[\s*(?:"|')\s*\[\s*(?:'|")([^'"\]\n]+)(?:'|")\s*\]\s*(?:"|')\s*\]\s*$/i, '$1$2 ["$3"]');
      l = l.replace(/^(\s*subgraph\s+)([A-Za-z0-9_\-]+)\s*\[\s*"([A-Za-z0-9_\-]+)\s*\[(?:'|")([^'"\]\n]+)(?:'|")\]"\s*\]\s*$/i, '$1$2 ["$4"]');
      l = l.replace(/^(\s*subgraph\s+)([A-Za-z0-9_\-]+)\s*\[(?:'|")([^'"\]\n]+)(?:'|")\]\s*$/i, '$1$2 ["$3"]');
      l = l.replace(/^(\s*subgraph\s+)([A-Za-z0-9_\-]+)\s*\((?:\'|\")?([^\)\n]+?)(?:\\'|\\")?\)\s*$/i, (_match, prefix, name, title) => {
        const safeId = 'sub_' + Math.random().toString(36).substring(2, 7);
        return `${prefix}${safeId} ["${name} (${title.trim()})"]`;
      });
      return l;
    }

    // 2. 修復節點方括號 A[文字 (帶括號或特殊字)] -> A["文字 (帶括號或特殊字)"]
    l = l.replace(/(\b[A-Za-z0-9_\u4e00-\u9fa5]+)\[([^"\]\n]*[\(\)\?\:\/\-\s\uff08\uff09\u3001\uff0c\+\=\#][^"\]\n]*)\]/g, '$1["$2"]');

    // 3. 修復判定大括號 B{文字 (帶問號或括號)} -> B{"文字 (帶問號或括號)"}
    l = l.replace(/(\b[A-Za-z0-9_\u4e00-\u9fa5]+)\{([^"\}\n]*[\(\)\?\:\/\-\s\uff08\uff09\u3001\uff0c\+\=\#][^"\}\n]*)\}/g, '$1{"$2"}');

    // 4. 對已帶雙引號的長節點文字執行智慧語意折行 (方括號與大括號節點)
    l = l.replace(/(\b[A-Za-z0-9_\u4e00-\u9fa5]+\s*\[")([^"\n]+)("\s*\])/g, (_match, prefix, text, suffix) => {
      return `${prefix}${smartWrapNodeText(text)}${suffix}`;
    });
    l = l.replace(/(\b[A-Za-z0-9_\u4e00-\u9fa5]+\s*\{")([^"\n]+)("\s*\})/g, (_match, prefix, text, suffix) => {
      return `${prefix}${smartWrapNodeText(text)}${suffix}`;
    });

    // 5. 修復連線條件標籤 -- 標籤文字 (帶括號) -->
    l = l.replace(/--\s+([^"\n\-]+?[\(\)\?\:\/\s\uff08\uff09][^"\n\-]+?)\s+-->/g, '-- "$1" -->');
    l = l.replace(/-->\|([^"\|\n]+?[\(\)\?\:\/\s\uff08\uff09][^"\|\n]+?)\|/g, '-->|"$1"|');

    // 6. Replace arrow symbols inside node labels to prevent syntax breaking
    l = l.replace(/(\[[^\]]*?)\s*->\s*([^\]]*?\])/g, (_m, before, after) => `${before.trimEnd()} to ${after.trimStart()}`);
    l = l.replace(/(\{[^}]*?)\s*->\s*([^}]*?\})/g, (_m, before, after) => `${before.trimEnd()} to ${after.trimStart()}`);

    return l;
  });

  return fixedLines.join('\n');
}

/**
 * 處理整篇 Markdown 文檔，自動清洗文檔內所有 ```mermaid 區塊
 */
export function sanitizeMarkdownMermaid(content: string): string {
  if (!content) return '';
  return content.replace(/```mermaid([\s\S]*?)```/g, (_match, mermaidCode) => {
    const fixed = sanitizeMermaidCode(mermaidCode);
    return '```mermaid' + fixed + '```';
  });
}
