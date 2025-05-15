'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import './mermaid-styles.css';

// Initialize mermaid globally with the most stable configuration
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'system-ui, sans-serif',
    flowchart: { useMaxWidth: false, htmlLabels: true, curve: 'basis' },
    fontSize: 14
  });
}

interface MermaidRendererProps {
  id: string;
  content: string;
  caption?: string;
}

export default function MermaidRenderer({ id, content, caption }: MermaidRendererProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Render diagram when component mounts
  useEffect(() => {
    console.log(`Rendering mermaid diagram: ${id}`);
    
    const uniqueId = `mermaid-${id}`;
    let cleanContent = content.trim();
    
    const renderDiagram = async () => {
      if (!containerRef.current) return;
      
      try {
        // Try direct rendering approach
        const { svg } = await mermaid.render(uniqueId, cleanContent);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to render diagram:', error);
        setIsLoading(false);
      }
    };
    
    renderDiagram();
    
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [id, content]);
  
  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(true);
    }, 200);
  };
  
  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovering(false);
  };

  return (
    <div className="relative">
      {/* Main diagram container */}
      <div 
        className="bg-white p-2 rounded-lg h-60 flex items-center justify-center cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-gray-500">Loading diagram...</div>
          </div>
        ) : (
          <div 
            ref={containerRef} 
            className="w-full h-full flex items-center justify-center"
          />
        )}
      </div>
      
      {/* Caption if provided */}
      {caption && (
        <div className="text-sm text-gray-600 mt-2 text-center">{caption}</div>
      )}
      
      {/* Hover modal */}
      {isHovering && (
        <div className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-4 max-w-4xl max-h-[80vh] overflow-auto">
          <div className="p-4">
            <div className="mermaid w-full">{content}</div>
          </div>
          
          {caption && (
            <div className="text-center mt-4 text-gray-700 font-medium">{caption}</div>
          )}
          
          <button 
            className="absolute top-3 right-3 p-1 rounded-full bg-white shadow-sm hover:bg-gray-100"
            onClick={() => setIsHovering(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
