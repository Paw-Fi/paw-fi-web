"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { YouTubeEmbed } from "./youtube-embed";

interface MarkdownProps {
  content: string;
  components?: Record<string, React.ComponentType<any>>;
  className?: string;
}

// Default styled components for markdown content
const defaultComponents = {
  p: ({ node, ...props }: any) => (
    <p
      className="mb-4 leading-relaxed whitespace-pre-line text-[var(--lesson-content-text)]"
      {...props}
    />
  ),
  h1: ({ node, ...props }: any) => (
    <h1
      className="mt-6 mb-4 text-3xl font-bold text-[var(--lesson-title-text)]"
      {...props}
    />
  ),
  h2: ({ node, ...props }: any) => (
    <h2
      className="mt-5 mb-3 text-2xl font-semibold text-[var(--lesson-title-text)]"
      {...props}
    />
  ),
  h3: ({ node, ...props }: any) => (
    <h3
      className="mt-4 mb-2 text-xl font-semibold text-[var(--lesson-title-text)]"
      {...props}
    />
  ),
  h4: ({ node, ...props }: any) => (
    <h4
      className="mt-3 mb-2 text-lg font-semibold text-[var(--lesson-title-text)]"
      {...props}
    />
  ),
  strong: ({ node, ...props }: any) => (
    <strong className="font-bold text-[var(--lesson-title-text)]" {...props} />
  ),
  em: ({ node, ...props }: any) => (
    <em className="text-[var(--lesson-keypoint-text)] italic" {...props} />
  ),
  ul: ({ node, ...props }: any) => (
    <ul className="mb-4 ml-4 list-inside list-disc space-y-2" {...props} />
  ),
  ol: ({ node, ...props }: any) => (
    <ol className="mb-4 ml-4 list-inside list-decimal space-y-2" {...props} />
  ),
  li: ({ node, ...props }: any) => (
    <li className="text-[var(--lesson-keypoint-text)]" {...props} />
  ),
  a: ({ node, ...props }: any) => (
    <a className="text-primary font-medium hover:underline" {...props} />
  ),
  blockquote: ({ node, ...props }: any) => (
    <blockquote
      className="border-primary bg-primary/5 my-4 rounded-r border-l-4 py-2 pl-4 text-[var(--lesson-keypoint-text)] italic"
      {...props}
    />
  ),
  code: ({ node, inline, ...props }: any) =>
    inline ? (
      <code
        className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm text-[var(--lesson-title-text)]"
        {...props}
      />
    ) : (
      <code
        className="bg-muted my-4 block overflow-x-auto rounded-lg p-4 font-mono text-sm text-[var(--lesson-title-text)]"
        {...props}
      />
    ),
  pre: ({ node, ...props }: any) => (
    <pre className="bg-muted my-4 overflow-x-auto rounded-lg p-4" {...props} />
  ),
  hr: ({ node, ...props }: any) => (
    <hr
      className="my-6 border-t border-[var(--lesson-title-border)]"
      {...props}
    />
  ),
  table: ({ node, ...props }: any) => (
    <table className="my-4 w-full border-collapse" {...props} />
  ),
  thead: ({ node, ...props }: any) => <thead className="bg-muted" {...props} />,
  tbody: ({ node, ...props }: any) => <tbody {...props} />,
  tr: ({ node, ...props }: any) => (
    <tr className="border-b border-[var(--lesson-title-border)]" {...props} />
  ),
  th: ({ node, ...props }: any) => (
    <th
      className="p-2 text-left font-semibold text-[var(--lesson-title-text)]"
      {...props}
    />
  ),
  td: ({ node, ...props }: any) => (
    <td className="p-2 text-[var(--lesson-content-text)]" {...props} />
  ),
  "youtube-embed": ({ node, ...props }: any) => {
    const properties = node?.properties || {};
    const videoId =
      properties.videoId ||
      properties["video-id"] ||
      props.videoId ||
      props["video-id"];
    const title = properties.title || props.title;

    return videoId ? (
      <YouTubeEmbed
        videoId={String(videoId)}
        title={title ? String(title) : undefined}
      />
    ) : null;
  },
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
          [
            rehypeRaw,
            {
              passThrough: [
                "course-card",
                "ai-button",
                "confirm-button",
                "quick-save",
                "financial-action",
                "goal-action",
                "update-data",
                "amount-select",
                "priority-select",
                "response-style",
                "habit-track",
                "risk-select",
                "timeline-select",
                "confidence-track",
                "commitment-level",
                "questionnaire-button",
                "update-profile-button",
                "goal-template",
                "view-details-button",
                "tip-component",
                "youtube-embed",
              ],
            },
          ],
        ]}
        components={mergedComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
