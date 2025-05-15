'use client';

import { forwardRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { DraggableSyntheticListeners } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import classNames from 'classnames';

interface DraggableProps {
  id: string;
  children?: ReactNode;
  dragging?: boolean;
  dragOverlay?: boolean;
  handle?: boolean;
  listeners?: DraggableSyntheticListeners;
  style?: CSSProperties;
}

export const Draggable = forwardRef<HTMLDivElement, DraggableProps>(
  function Draggable(
    {
      id,
      children,
      dragging,
      dragOverlay,
      handle,
      listeners,
      style,
      ...props
    },
    ref
  ) {
    // If not using the hook externally, use it here
    const { attributes, listeners: hookListeners, setNodeRef, isDragging } = useDraggable({
      id: id,
    });

    // Use provided listeners or ones from the hook
    const dragListeners = listeners || hookListeners;
    const isDraggingState = dragging !== undefined ? dragging : isDragging;

    return (
      <div
        ref={setNodeRef || ref}
        {...(handle ? {} : dragListeners)}
        {...attributes}
        style={style}
        className={classNames(
          'transition-all select-none touch-none',
          {
            'opacity-70 z-10': isDraggingState && !dragOverlay,
            'cursor-grab': !isDraggingState,
            'cursor-grabbing': isDraggingState,
            'shadow-md': dragOverlay,
            'ring-2 ring-primary': dragOverlay,
          }
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

export function DraggableItem({ id, children, className }: { id: string; children?: ReactNode,className?:string }) {
  // Simplified content extraction that's more type-safe
  const extractContent = () => {
    // Simply use the ID as the content for the drag overlay
    // This avoids complex React element traversal that can cause type issues
    return String(id);
  };
  
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: {
      content: extractContent()
    }
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={classNames(
        'p-3 rounded-2xl border-4 border-gray-300 bg-white  select-none touch-none flex items-center',
        {
          'opacity-60 cursor-grabbing': isDragging,
          'cursor-grab': !isDragging,
        },
        className
      )}
    >
      {children}
    </div>
  );
}
