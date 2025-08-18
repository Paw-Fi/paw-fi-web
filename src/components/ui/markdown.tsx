"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

interface MarkdownProps {
  content: string;
  components?: Record<string, React.ComponentType<any>>;
  className?: string;
}

export const Markdown: React.FC<MarkdownProps> = ({
  content,
  components = {},
  className = "",
}) => {
  return (
    <div className={className}>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};