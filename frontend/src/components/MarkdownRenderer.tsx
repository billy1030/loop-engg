import React, { useMemo } from "react";
import { marked } from "marked";
import { MermaidDiagram } from "./MermaidDiagram";

// Configure marked options for clean GitHub-flavored markdown
marked.setOptions({
  gfm: true,
  breaks: true,
});

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

interface ContentSegment {
  type: 'markdown' | 'mermaid';
  content: string;
  html?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  const segments = useMemo<ContentSegment[]>(() => {
    if (!content) return [];

    let clean = content;
    // Clean outer markdown fence wrapper if message wrapped completely
    if (clean.startsWith("```markdown") && clean.endsWith("```")) {
      clean = clean.slice(11, -3).trim();
    }

    const MERMAID_REGEX = /```mermaid\s*([\s\S]*?)```/g;
    const result: ContentSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = MERMAID_REGEX.exec(clean)) !== null) {
      // Push preceding markdown segment
      if (match.index > lastIndex) {
        const md = clean.slice(lastIndex, match.index);
        if (md.trim()) {
          try {
            result.push({
              type: 'markdown',
              content: md,
              html: marked.parse(md, { async: false }) as string,
            });
          } catch {
            result.push({ type: 'markdown', content: md, html: md });
          }
        }
      }

      // Push mermaid segment
      result.push({
        type: 'mermaid',
        content: match[1].trim(),
      });

      lastIndex = match.index + match[0].length;
    }

    // Push trailing markdown segment
    if (lastIndex < clean.length) {
      const remaining = clean.slice(lastIndex);
      if (remaining.trim()) {
        try {
          result.push({
            type: 'markdown',
            content: remaining,
            html: marked.parse(remaining, { async: false }) as string,
          });
        } catch {
          result.push({ type: 'markdown', content: remaining, html: remaining });
        }
      }
    }

    // Fallback: If no segments were extracted (e.g. whitespace or no mermaid)
    if (result.length === 0 && clean) {
      try {
        result.push({
          type: 'markdown',
          content: clean,
          html: marked.parse(clean, { async: false }) as string,
        });
      } catch {
        result.push({ type: 'markdown', content: clean, html: clean });
      }
    }

    return result;
  }, [content]);

  // If no mermaid blocks found, render single standard container
  const hasMermaid = segments.some(s => s.type === 'mermaid');

  if (!hasMermaid) {
    const singleHtml = segments.map(s => s.html || s.content).join('');
    return (
      <div
        className={`markdown-body ${className}`}
        dangerouslySetInnerHTML={{ __html: singleHtml }}
      />
    );
  }

  return (
    <div className={`markdown-container flex flex-col ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'mermaid') {
          return (
            <MermaidDiagram
              key={`mermaid-${idx}`}
              code={seg.content}
              index={idx}
            />
          );
        }
        return (
          <div
            key={`md-${idx}`}
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: seg.html || '' }}
          />
        );
      })}
    </div>
  );
};
