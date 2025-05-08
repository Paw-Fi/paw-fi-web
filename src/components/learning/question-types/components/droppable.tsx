'use client';

import type { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import classnames from 'classnames';

interface DroppableProps {
  id: string;
  children: ReactNode;
  className?: string;
  isCategory?: boolean;
  dragging?: boolean;
}

export function Droppable({ id, children, className, isCategory = false, dragging = false }: DroppableProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      isCategory
    }
  });
  
  return (
    <div 
      ref={setNodeRef} 
      className={classnames(
        'transition-all',
        {
          'ring-2 ring-primary ring-opacity-70': isOver,
          'ring-1 ring-blue-200 ring-opacity-50': dragging && !isOver && isCategory
        },
        className
      )}
    >
      {children}
    </div>
  );
}
