'use client';

import type { ReactNode } from 'react';
import { useDraggable } from '@dnd-kit/core';
import classnames from 'classnames';

interface DraggableProps {
  id: string;
  children: ReactNode;
  className?: string;
  content?: string; // Optional content for overlay representation
}

export function Draggable({ id, children, className, content }: DraggableProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: {
      content // Store content for potential use in DragOverlay
    }
  });
  
  // Style with proper TypeScript type casting for CSS properties
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.6 : 1,
    position: 'relative' as const,
    width: 'auto', // Prevent width issues
    touchAction: 'none', // Prevent touch events from causing unexpected behavior
  } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={classnames(
        'transition-all select-none touch-none', // Add Tailwind classes to prevent text selection
        {
          'shadow-md': isDragging,
          'cursor-grab': !isDragging,
          'cursor-grabbing': isDragging,
        },
        className
      )}
    >
      {children}
    </div>
  );
}
