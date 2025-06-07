'use client';

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faGripVertical, 
  faExpand, 
  faCompress, 
  faTrash, 
  faPencilAlt 
} from '@fortawesome/free-solid-svg-icons';
import { BaseWidget } from './types/dashboard-data.typings';
import { WidgetFactory } from './widgets/WidgetFactory';

interface EditableWidgetProps {
  widget: BaseWidget;
  id: string;
  isExpanded: boolean;
  onToggleHeight: (id: string) => void;
  onRemoveWidget: (id: string) => void;
  onEditWidget: (id: string) => void;
  isEditMode?: boolean;
}

export function EditableWidget({ 
  widget, 
  id, 
  isExpanded, 
  onToggleHeight, 
  onRemoveWidget,
  onEditWidget,
  isEditMode = true
}: EditableWidgetProps) {
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
        ${isEditMode ? 'border-2 border-dashed border-gray-300/50' : 'border border-gray-200 shadow-sm'}
      `}
    >
      {/* Edit mode indicator - only visible in edit mode */}
      {isEditMode && (
        <div className="absolute top-0 left-0 w-full h-full bg-gray-900/5 pointer-events-none"></div>
      )}
      
      {/* Control overlay - only visible in edit mode */}
      {isEditMode && (
        <div className="absolute top-0 right-0 z-10 flex items-center p-2">
          {/* Edit widget button */}
          <button 
            onClick={() => onEditWidget(id)}
            className="p-1 hover:bg-gray-100/70 rounded-full mr-1 bg-white/70"
            aria-label="Edit widget"
            title="Edit widget"
          >
            <FontAwesomeIcon 
              icon={faPencilAlt} 
              className="h-3 w-3 text-gray-600" 
            />
          </button>
          
          {/* Remove widget button */}
          <button 
            onClick={() => onRemoveWidget(id)}
            className="p-1 hover:bg-red-100 rounded-full mr-1 bg-white/70"
            aria-label="Remove widget"
            title="Remove widget"
          >
            <FontAwesomeIcon 
              icon={faTrash} 
              className="h-3 w-3 text-red-500" 
            />
          </button>
          
          {/* Expand/collapse button */}
          <button 
            onClick={() => onToggleHeight(id)}
            className="p-1 hover:bg-gray-100/70 rounded-full mr-1 bg-white/70"
            aria-label={isExpanded ? "Compress widget" : "Expand widget"}
            title={isExpanded ? "Compress widget" : "Expand widget"}
          >
            <FontAwesomeIcon 
              icon={isExpanded ? faCompress : faExpand} 
              className="h-3 w-3 text-gray-600" 
            />
          </button>
          
          {/* Drag handle */}
          <div 
            {...attributes} 
            {...listeners}
            className="cursor-grab p-1 hover:bg-gray-100/70 rounded-full bg-white/70"
            aria-label="Drag to reorder"
            title="Drag to reorder"
          >
            <FontAwesomeIcon icon={faGripVertical} className="h-3 w-3 text-gray-600" />
          </div>
        </div>
      )}
      
      <div className="h-full overflow-auto">
        <WidgetFactory widget={widget} />
      </div>
    </div>
  );
}
