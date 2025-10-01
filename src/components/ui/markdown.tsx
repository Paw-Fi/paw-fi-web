"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface MarkdownProps {
  content: string;
  components?: Record<string, React.ComponentType<any>>;
  className?: string;
}

// Default styled components for markdown content
const defaultComponents = {
  p: ({node, ...props}: any) => <p className="text-[var(--lesson-content-text)] mb-4 leading-relaxed" {...props} />,
  h1: ({node, ...props}: any) => <h1 className="text-[var(--lesson-title-text)] text-3xl font-bold mb-4 mt-6" {...props} />,
  h2: ({node, ...props}: any) => <h2 className="text-[var(--lesson-title-text)] text-2xl font-semibold mb-3 mt-5" {...props} />,
  h3: ({node, ...props}: any) => <h3 className="text-[var(--lesson-title-text)] text-xl font-semibold mb-2 mt-4" {...props} />,
  h4: ({node, ...props}: any) => <h4 className="text-[var(--lesson-title-text)] text-lg font-semibold mb-2 mt-3" {...props} />,
  strong: ({node, ...props}: any) => <strong className="text-[var(--lesson-title-text)] font-bold" {...props} />,
  em: ({node, ...props}: any) => <em className="text-[var(--lesson-keypoint-text)] italic" {...props} />,
  ul: ({node, ...props}: any) => <ul className="list-disc list-inside space-y-2 mb-4 ml-4" {...props} />,
  ol: ({node, ...props}: any) => <ol className="list-decimal list-inside space-y-2 mb-4 ml-4" {...props} />,
  li: ({node, ...props}: any) => <li className="text-[var(--lesson-keypoint-text)]" {...props} />,
  a: ({node, ...props}: any) => <a className="text-primary hover:underline font-medium" {...props} />,
  blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-primary pl-4 italic text-[var(--lesson-keypoint-text)] my-4 bg-primary/5 py-2 rounded-r" {...props} />,
  code: ({node, inline, ...props}: any) =>
    inline
      ? <code className="bg-muted text-[var(--lesson-title-text)] px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
      : <code className="block bg-muted text-[var(--lesson-title-text)] p-4 rounded-lg text-sm font-mono overflow-x-auto my-4" {...props} />,
  pre: ({node, ...props}: any) => <pre className="bg-muted rounded-lg p-4 overflow-x-auto my-4" {...props} />,
  hr: ({node, ...props}: any) => <hr className="border-t border-[var(--lesson-title-border)] my-6" {...props} />,
  table: ({node, ...props}: any) => <table className="w-full border-collapse my-4" {...props} />,
  thead: ({node, ...props}: any) => <thead className="bg-muted" {...props} />,
  tbody: ({node, ...props}: any) => <tbody {...props} />,
  tr: ({node, ...props}: any) => <tr className="border-b border-[var(--lesson-title-border)]" {...props} />,
  th: ({node, ...props}: any) => <th className="text-[var(--lesson-title-text)] font-semibold p-2 text-left" {...props} />,
  td: ({node, ...props}: any) => <td className="text-[var(--lesson-content-text)] p-2" {...props} />,
};

export const Markdown: React.FC<MarkdownProps> = ({
  content,
  components = {},
  className = "",
}) => {
  // Merge default components with custom components (custom overrides defaults)
  const mergedComponents = { ...defaultComponents, ...components };

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeRaw, {
            passThrough: [
              'course-card', 'ai-button', 'confirm-button', 'quick-save',
              'financial-action', 'goal-action', 'update-data', 'amount-select',
              'priority-select', 'response-style', 'habit-track', 'risk-select',
              'timeline-select', 'confidence-track', 'commitment-level',
              'questionnaire-button', 'update-profile-button', 'goal-template',
              'view-details-button', 'tip-component'
            ]
          }]
        ]}
        components={mergedComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};