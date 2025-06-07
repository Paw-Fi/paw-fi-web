'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faExpand, faCompress } from '@fortawesome/free-solid-svg-icons';
import { BaseWidget } from './types/dashboard-data.typings';
import { WidgetFactory } from './widgets/WidgetFactory';

interface SortableWidgetProps {
  widget: BaseWidget;
  id: string;
  isExpanded: boolean;
  onToggleHeight: (id: string) => void;
  isEditMode?: boolean;
}

export function SortableWidget({ widget, id, isExpanded, onToggleHeight, isEditMode = false }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      data-id={id}
      className={`
        ${isExpanded ? 'row-span-2' : 'row-span-1'}
        ${widget.columnSpan === 2 ? 'col-span-2' : 'col-span-1'}
        relative group
        transition-all duration-300 ease-in-out
      `}
    >
      {/* Control overlay - only visible on hover and in edit mode */}
      {isEditMode && (
        <div className="absolute top-0 right-0 z-10 flex items-center opacity-0 group-hover:opacity-100 transition-opacity p-2">
          {/* Expand/collapse button */}
          <button 
            onClick={() => onToggleHeight(id)}
            className="p-1 hover:bg-gray-100/50 rounded-full mr-1"
            aria-label={isExpanded ? "Compress widget" : "Expand widget"}
            title={isExpanded ? "Compress widget" : "Expand widget"}
          >
            <FontAwesomeIcon 
              icon={isExpanded ? faCompress : faExpand} 
              className="h-3 w-3 text-gray-400" 
            />
          </button>
          
          {/* Drag handle */}
          <div 
            {...attributes} 
            {...listeners}
            className="cursor-grab p-1 hover:bg-gray-100/50 rounded-full"
            aria-label="Drag to reorder"
            title="Drag to reorder"
          >
            <FontAwesomeIcon icon={faGripVertical} className="h-3 w-3 text-gray-400" />
          </div>
        </div>
      )}
      
      <div className="h-full overflow-auto">
        <WidgetFactory widget={widget} />
      </div>
    </div>
  );
}
