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
  faPencilAlt,
  faExpandAlt,      // For expanding width
  faCompressAlt     // For compressing width
} from '@fortawesome/free-solid-svg-icons';
import { IBaseWidget } from './types/dashboard-data.typings';
import { WidgetFactory } from './widgets/WidgetFactory';

interface EditableWidgetProps {
  widget: IBaseWidget;
  id: string;
  // isExpanded is derived from widget.rowSpan, so it's removed
  onToggleRowSpan: (id: string) => void; // Renamed from onToggleHeight
  onRemoveWidget: (id: string) => void;
  onEditWidget: (id: string) => void;
  onToggleColumnSpan: (id: string) => void;
  onToggleChecklistItem?: (widgetId: string, itemId: string, isCompleted: boolean) => void; // Added prop
  isEditMode?: boolean;
}

export function EditableWidget({ 
  widget, 
  id, 
  // isExpanded is removed
  onToggleRowSpan, // Renamed from onToggleHeight
  onRemoveWidget,
  onEditWidget,
  onToggleColumnSpan,
  onToggleChecklistItem, // Destructure added prop
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
        ${widget.rowSpan === 2 ? 'row-span-2' : 'row-span-1'} // Use widget.rowSpan
        ${widget.columnSpan === 2 ? 'col-span-2' : 'col-span-1'}
        relative group
        transition-all duration-300 ease-in-out
        ${isEditMode ? 'border-2 border-dashed border-gray-300/50 dark:border-gray-700/50' : 'border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-slate-700'}
      `}
    >
      {/* Edit mode indicator - only visible in edit mode */}
      {isEditMode && (
        <div className="absolute top-0 left-0 w-full h-full bg-gray-900/5 pointer-events-none"></div>
      )}
      
      {/* Control buttons will be passed to Widget through controls prop */}
      
      {/* Create widget with controls in header instead of overlay */}
      <div className="h-full">
        <WidgetFactory 
          widget={widget} 
          onToggleChecklistItem={onToggleChecklistItem}
          controls={isEditMode ? (
            <div className="flex items-center">
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
              
              {/* Expand/collapse height button */}
              <button 
                onClick={() => onToggleRowSpan(id)}
                className="p-1 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded-full mr-1 bg-white/70 dark:bg-slate-800/70"
                aria-label={widget.rowSpan === 2 ? "Compress to 1 row" : "Expand to 2 rows"}
                title={widget.rowSpan === 2 ? "Compress to 1 row" : "Expand to 2 rows"}
              >
                <FontAwesomeIcon 
                  icon={widget.rowSpan === 2 ? faCompress : faExpand}
                  className="h-3 w-3 text-gray-600 dark:text-gray-300" 
                />
              </button>

              {/* Toggle column span button */}
              <button 
                onClick={() => onToggleColumnSpan(id)}
                className="p-1 hover:bg-gray-100/70 rounded-full mr-1 bg-white/70"
                aria-label={widget.columnSpan === 2 ? "Set to 1 column width" : "Set to 2 columns width"}
                title={widget.columnSpan === 2 ? "Set to 1 column width" : "Set to 2 columns width"}
              >
                <FontAwesomeIcon 
                  icon={widget.columnSpan === 2 ? faCompressAlt : faExpandAlt} 
                  className="h-3 w-3 text-gray-600" 
                />
              </button>
              
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
          ) : undefined}
        />
      </div>
    </div>
  );
}
