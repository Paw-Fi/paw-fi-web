'use client';

import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import type { UniqueIdentifier } from '@dnd-kit/core';
import classNames from 'classnames';

interface DroppableProps {
  id: UniqueIdentifier;
  children: ReactNode;
  dragging?: boolean;
  className?: string;
}

export function Droppable({ id, children, dragging = false, className }: DroppableProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={classNames(
        'transition-all min-h-[100px]',
        {
          'ring-2 ring-primary ring-opacity-70': isOver,
          'ring-1 ring-blue-200 ring-opacity-50': dragging && !isOver,
        },
        className
      )}
      aria-label="Droppable region"
    >
      {children}
    </div>
  );
}
