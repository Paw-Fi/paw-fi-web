'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { supabase } from '@/lib/supabase';
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

// Track fix attempts per content to prevent infinite loops
const fixAttempts = new Map<string, boolean>();

export default function MermaidRenderer({ id, content, caption }: MermaidRendererProps) {
  const questionId = id;
  const diagramRef = useRef<HTMLDivElement>(null);
  const [renderState, setRenderState] = useState<'idle' | 'rendering' | 'fixing' | 'error'>('idle');
  const [displayContent, setDisplayContent] = useState(content);
  const [isRendered, setIsRendered] = useState(false);
  const fixingRef = useRef(false);
  const contentHashRef = useRef<string>('');

  // Create a simple hash of content for tracking
  const getContentHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  };

  // Reset when props content changes
  useEffect(() => {
    const newHash = getContentHash(content);
    if (contentHashRef.current !== newHash) {
      contentHashRef.current = newHash;
      setDisplayContent(content);
      setRenderState('idle');
      setIsRendered(false);
      fixingRef.current = false;
    }
  }, [content]);

  // Helper function to make SVG fit the container
  const makeSvgResponsive = useCallback((container: HTMLDivElement) => {
    const svg = container.querySelector('svg');
    if (svg) {
      // Add responsive attributes
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      
      // Apply styles directly for better fit
      svg.style.display = 'block';
      svg.style.maxWidth = '100%';
      svg.style.maxHeight = '30rem';
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
  }, []);

  // Function to fix malformed mermaid code
  const fixMalformedCode = useCallback(async (malformedCode: string) => {
    const contentKey = getContentHash(malformedCode);
    
    // Check if we already tried to fix this content
    if (fixAttempts.has(contentKey)) {
      console.log('Already attempted to fix this content, skipping...');
      setRenderState('error');
      return;
    }

    // Mark this content as being fixed
    fixAttempts.set(contentKey, true);
    
    try {
      console.log('Fixing malformed mermaid code...');
      setRenderState('fixing');
      
      const { data, error } = await supabase.functions.invoke('fix-mermaid-code', {
        body: { 
          mermaidCode: malformedCode,
          questionId: questionId
        }
      });

      if (error) {
        console.error('Error fixing mermaid code:', error);
        setRenderState('error');
        return;
      }

      if (data?.success && data?.fixedCode) {
        console.log('Successfully fixed mermaid code');
        // Update content and reset state for re-render
        setDisplayContent(data.fixedCode);
        setRenderState('idle');
        setIsRendered(false);
      } else {
        setRenderState('error');
      }
    } catch (error) {
      console.error('Error in fixMalformedCode:', error);
      setRenderState('error');
    } finally {
      fixingRef.current = false;
    }
  }, [questionId]);

  // Render the mermaid diagram
  const renderDiagram = useCallback(async () => {
    if (!diagramRef.current || renderState === 'fixing') return;
    
    const diagramId = `mermaid-${id}-${Math.random().toString(36).substring(2, 9)}`;
    
    try {
      setRenderState('rendering');
      
      // Clear any existing content
      diagramRef.current.innerHTML = '';
      
      // First, validate the syntax
      const parseResult = await mermaid.parse(displayContent, { suppressErrors: true });
      
      if (!parseResult) {
        // Try with trimmed content
        const lines = displayContent.split('\n');
        if (lines.length > 2) {
          const trimmedContent = lines.slice(0, -2).join('\n');
          const parseResult2 = await mermaid.parse(trimmedContent, { suppressErrors: true });
          if (parseResult2) {
            // Use trimmed content if it's valid
            const { svg, bindFunctions } = await mermaid.render(diagramId, trimmedContent);
            if (diagramRef.current) {
              diagramRef.current.innerHTML = svg;
              bindFunctions?.(diagramRef.current);
              makeSvgResponsive(diagramRef.current);
              setRenderState('idle');
              setIsRendered(true);
              return;
            }
          }
        }
        
        // If parsing failed and we haven't tried fixing yet
        if (questionId && !fixingRef.current) {
          fixingRef.current = true;
          await fixMalformedCode(displayContent);
          return;
        }
        
        throw new Error('Invalid mermaid syntax');
      }
      
      // Render the diagram
      const { svg, bindFunctions } = await mermaid.render(diagramId, displayContent);
      
      if (diagramRef.current) {
        diagramRef.current.innerHTML = svg;
        bindFunctions?.(diagramRef.current);
        makeSvgResponsive(diagramRef.current);
        setRenderState('idle');
        setIsRendered(true);
      }
    } catch (error) {
      console.error('Mermaid rendering error:', error);
      
      // If we haven't tried fixing and have a questionId
      if (questionId && !fixingRef.current && renderState !== 'error') {
        fixingRef.current = true;
        await fixMalformedCode(displayContent);
      } else {
        setRenderState('error');
      }
    }
  }, [displayContent, id, questionId, makeSvgResponsive, fixMalformedCode]);

  // Main effect to trigger rendering
  useEffect(() => {
    if (renderState === 'idle' && !isRendered) {
      renderDiagram();
    }
  }, [renderState, isRendered, renderDiagram]);

  // Clean up fix attempts on unmount
  useEffect(() => {
    return () => {
      const contentKey = getContentHash(content);
      fixAttempts.delete(contentKey);
    };
  }, [content]);

  // Detect if this is likely a pie chart based on content
  const isPieChart = displayContent.includes('pie title') || displayContent.includes('pie ') || displayContent.includes(' : ');
  
  // Render appropriate UI based on state
  const renderContent = () => {
    switch (renderState) {
      case 'fixing':
        return (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        );
      case 'error':
        return (
          <div className="text-red-500 text-center p-4">Failed to render diagram</div>
        );
      default:
        return (
          <div 
            ref={diagramRef} 
            className={`w-full flex items-center justify-center overflow-hidden ${isPieChart ? 'min-h-48 md:min-h-56' : 'min-h-32 md:min-h-40'}`}
          />
        );
    }
  };
  
  return (
    <div className="relative">
      {/* Main diagram container */}
      <div className="bg-white p-2 rounded-lg overflow-hidden shadow-sm mermaid-diagram">
        {renderContent()}
      </div>
      
      {/* Caption if provided */}
      {caption && (
        <div className="text-sm text-gray-600 mt-2 text-center">{caption}</div>
      )}
    </div>
  );
}