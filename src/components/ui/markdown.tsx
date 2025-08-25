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

export const Markdown: React.FC<MarkdownProps> = ({
  content,
  components = {},
  className = "",
}) => {
  console.log('📄 Markdown: Received content:', content.slice(0, 200));
  console.log('📄 Markdown: Available components:', Object.keys(components));
  console.log('📄 Markdown: Has course-card component?', components.hasOwnProperty('course-card'));
  
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
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};