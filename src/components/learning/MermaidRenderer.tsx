'use client';

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import './mermaid-styles.css';

// Initialize mermaid with stable configuration
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'system-ui, sans-serif',
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
    pie: {
      useWidth: 800,
      textPosition: 0.5
    },
    fontSize: 14
  });
}

interface MermaidRendererProps {
  id: string;
  content: string;
  caption?: string;
}

export default function MermaidRenderer({ id, content, caption }: MermaidRendererProps) {
  const diagramRef = useRef<HTMLDivElement>(null);

  // Render the mermaid diagram
  const renderMermaid = async (source: string, elementId: string) => {
    try {
      // Check if syntax is valid
      const parseResult = await mermaid.parse(source, { suppressErrors: true });
      if (!parseResult) {
        // Try with trimmed content
        const lines = source.split('\n');
        if (lines.length > 2) {
          const trimmedSource = lines.slice(0, -2).join('\n');
          const parseResult2 = await mermaid.parse(trimmedSource, { suppressErrors: true });
          if (parseResult2) {
            return await mermaid.render(elementId, trimmedSource);
          }
        }
        throw new Error('Invalid mermaid syntax');
      }
      return await mermaid.render(elementId, source);
    } catch (error) {
      console.error('Mermaid rendering error:', error);
      throw error;
    }
  };
  
  // Helper function to make SVG fit the container
  const makeSvgResponsive = (container: HTMLDivElement) => {
    const svg = container.querySelector('svg');
    if (svg) {
      // Add responsive attributes
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      
      // Apply styles directly for better fit
      svg.style.display = 'block';
      svg.style.maxWidth = '100%';
      svg.style.maxHeight = '100%';
      svg.style.margin = '0 auto';
      
      // Special handling for pie charts
      if (container.innerHTML.includes('title') && container.innerHTML.includes('%')) {
        // Likely a pie chart - ensure the viewBox is set properly
        const pieGroup = svg.querySelector('g.pieChart');
        if (pieGroup) {
          // Adjust sizing to ensure full pie is visible
          svg.setAttribute('viewBox', '-10 -10 420 420');
          
          // Ensure text is properly positioned and visible
          const textElements = svg.querySelectorAll('text');
          textElements.forEach(text => {
            text.style.fontWeight = 'bold';
            text.style.fontSize = '1.1em';
          });
        }
      } else {
        // Ensure viewBox for scaling for other diagram types
        const viewBox = svg.getAttribute('viewBox');
        if (!viewBox) {
          const width = parseInt(svg.getAttribute('width') || '1000');
          const height = parseInt(svg.getAttribute('height') || '600');
          svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }
        
        // Scale down text if diagram is complex
        const nodes = svg.querySelectorAll('.node');
        if (nodes.length > 10) {
          const textElements = svg.querySelectorAll('text');
          textElements.forEach(text => {
            text.style.fontSize = '0.9em';
          });
        }
      }
    }
  };

  // Render main diagram when component mounts or content changes
  useEffect(() => {
    if (!diagramRef.current) return;

    const diagramId = `mermaid-${id}-${Math.random().toString(36).substring(2, 9)}`;

    const renderDiagram = async () => {
      if (!diagramRef.current) return;

      try {
        // Clear previous content
        diagramRef.current.innerHTML = '';

        // Render new diagram
        const { svg, bindFunctions } = await renderMermaid(content, diagramId);

        if (diagramRef.current) {
          diagramRef.current.innerHTML = svg;
          bindFunctions?.(diagramRef.current);
          // Make the SVG responsive to fit the container
          makeSvgResponsive(diagramRef.current);
        }
      } catch (error) {
        if (diagramRef.current) {
          diagramRef.current.innerHTML = '<div class="text-red-500">Failed to render diagram</div>';
        }
      }
    };

    renderDiagram();

    return () => {
      if (diagramRef.current) {
        diagramRef.current.innerHTML = '';
      }
    };
  }, [id, content]);

  // No hover handlers or modal functionality

  // Detect if this is likely a pie chart based on content
  const isPieChart = content.includes('pie title') || content.includes('pie ') || content.includes(' : '); 
  
  return (
    <div className="relative">
      {/* Main diagram container */}
      <div className="bg-white p-2 rounded-lg overflow-hidden shadow-sm mermaid-diagram">
        <div 
          ref={diagramRef} 
          className={`w-full flex items-center justify-center overflow-hidden ${isPieChart ? 'min-h-72 md:min-h-80' : 'min-h-56 md:min-h-64'}`}
        />
      </div>
      
      {/* Caption if provided */}
      {caption && (
        <div className="text-sm text-gray-600 mt-2 text-center">{caption}</div>
      )}
    </div>
  );
}
