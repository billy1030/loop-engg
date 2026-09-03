import React, { useMemo } from "react";
import { marked } from "marked";

// Configure marked options for clean GitHub-flavored markdown
marked.setOptions({
  gfm: true,
  breaks: true,
});

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  const htmlContent = useMemo(() => {
    if (!content) return "";
    try {
      // Clean leading/trailing markdown code fences if wrapped entirely
      let clean = content;
      if (clean.startsWith("```markdown") && clean.endsWith("```")) {
        clean = clean.slice(11, -3).trim();
      }
      return marked.parse(clean, { async: false }) as string;
    } catch (err) {
      console.error("Markdown parse error:", err);
      return content;
    }
  }, [content]);

  return (
    <div
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};
