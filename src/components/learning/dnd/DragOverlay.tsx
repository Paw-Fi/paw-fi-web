'use client';

import { createPortal } from 'react-dom';
import { DragOverlay as DndKitDragOverlay, useDndContext } from '@dnd-kit/core';
import type { DropAnimation } from '@dnd-kit/core';
import type { ReactNode } from 'react';

interface DragOverlayProps {
  children?: ReactNode;
  adjustScale?: boolean;
  zIndex?: number;
}

// An enhanced wrapper component for drag overlay functionality
export function DragOverlay({ 
  children, 
  adjustScale = false,
  zIndex = 999 
}: DragOverlayProps) {
  const { active } = useDndContext();
  
  // No animations for simple and clean dragging experience
  const dropAnimation: DropAnimation | null = null;

  // Only render drag overlay when there's an active dragging item
  if (!active?.id) return null;

  return createPortal(
    <DndKitDragOverlay 
      dropAnimation={dropAnimation} 
      adjustScale={adjustScale}
      zIndex={zIndex}
    >
      {children || (
        <div className="p-3 bg-white border border-gray-200 select-none rounded-lg" style={{ boxShadow: 'none' }}>
          {typeof active.data.current?.content === 'string' ? (
            <span className="text-gray-900">{active.data.current.content}</span>
          ) : (
            // Fallback if no content is provided
            <span className="text-gray-900">Dragging item {String(active.id)}</span>
          )}
        </div>
      )}
    </DndKitDragOverlay>,
    document.body
  );
}
