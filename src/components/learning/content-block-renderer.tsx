'use client';

import { Fragment } from 'react';
import type { ContentBlock } from '@/types/learning.types';

interface ContentBlockRendererProps {
  blocks: ContentBlock[];
  className?: string;
}

export function ContentBlockRenderer({ blocks, className = '' }: ContentBlockRendererProps) {
  return (
    <div className={`content-blocks ${className}`}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'paragraph':
            return (
              <p key={index} className="mb-3 text-gray-800">
                {block.content as string}
              </p>
            );
            
          case 'bulletList':
            return (
              <ul key={index} className="list-disc pl-5 mb-3 space-y-1">
                {(block.content as string[]).map((item, itemIndex) => (
                  <li key={itemIndex} className="text-gray-800">{item}</li>
                ))}
              </ul>
            );
            
          case 'numberedList':
            return (
              <ol key={index} className="list-decimal pl-5 mb-3 space-y-1">
                {(block.content as string[]).map((item, itemIndex) => (
                  <li key={itemIndex} className="text-gray-800">{item}</li>
                ))}
              </ol>
            );
            
          case 'scenario':
            return (
              <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                {block.content as string}
              </div>
            );
            
          default:
            return <Fragment key={index} />;
        }
      })}
    </div>
  );
}
