'use client';

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  id: string;
  content: string;
  caption?: string;
}

// This component follows the exact approach from the example code
export default function MermaidDiagram({ id, content, caption }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  
  // Initialize once on component mount
  useEffect(() => {
    // Using the same initialization pattern as your example
    mermaid.initialize({
      startOnLoad: true, 
      securityLevel: 'loose',
      theme: 'default',
      logLevel: 5 // For debugging
    });
  }, []);
  
  // Render whenever content changes - matching the example pattern
  useEffect(() => {
    if (ref.current && content) {
      console.log(`Rendering diagram for id: ${id}`);
      
      // Clear the container first
      ref.current.innerHTML = '';
      
      try {
        // Using the exact pattern from your example
        // @ts-ignore - ignoring TS type issues with mermaid
        mermaid.mermaidAPI.render(`diagram-${id}`, content, result => {
          if (ref.current) {
            ref.current.innerHTML = result;
            console.log('Diagram rendered successfully');
          }
        });
      } catch (error) {
        console.error('Failed to render diagram:', error);
        if (ref.current) {
          ref.current.innerHTML = `<div class="text-red-500 p-2">Error rendering diagram</div>`;
        }
      }
    }
  }, [id, content]);
  
  return (
    <div className="diagram-container">
      <div className="bg-white p-4 rounded-lg h-60 flex items-center justify-center overflow-hidden">
        {/* Empty div that will contain the rendered diagram */}
        <div 
          ref={ref} 
          className="w-full h-full"
        />
      </div>
      
      {caption && (
        <div className="text-sm text-gray-600 mt-2 text-center">{caption}</div>
      )}
    </div>
  );
}
