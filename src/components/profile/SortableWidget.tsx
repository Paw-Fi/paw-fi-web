'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faExpand, faCompress } from '@fortawesome/free-solid-svg-icons';
import { IBaseWidget } from './types/dashboard-data.typings';
import { WidgetFactory } from './widgets/WidgetFactory';

interface SortableWidgetProps {
  widget: IBaseWidget; // BaseWidget should include rowSpan and columnSpan
  id: string;
  // isExpanded is derived from widget.rowSpan
  onToggleRowSpan: (id: string) => void; // Renamed from onToggleHeight
  onToggleChecklistItem?: (widgetId: string, itemId: string, isCompleted: boolean) => void; // Added prop
  isEditMode?: boolean;
}

export function SortableWidget({ widget, id, onToggleRowSpan, onToggleChecklistItem, isEditMode = false }: SortableWidgetProps) {
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
        dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50 rounded-lg
      `} // Added common styling for consistency with EditableWidget non-edit mode
    >
      {/* Control overlay - only visible on hover and in edit mode */}
      {isEditMode && (
        <div className="absolute top-0 right-0 z-10 flex items-center opacity-0 group-hover:opacity-100 transition-opacity p-2">
          {/* Expand/collapse button */}
          <button 
            onClick={() => onToggleRowSpan(id)} // Use onToggleRowSpan
            className="p-1 hover:bg-gray-100/70 dark:hover:bg-gray-700/70 rounded-full mr-1 bg-white/70 dark:bg-slate-800/70"
            aria-label={widget.rowSpan === 2 ? "Compress to 1 row" : "Expand to 2 rows"} // Use widget.rowSpan
            title={widget.rowSpan === 2 ? "Compress to 1 row" : "Expand to 2 rows"} // Use widget.rowSpan
          >
            <FontAwesomeIcon 
              icon={widget.rowSpan === 2 ? faCompress : faExpand} // Use widget.rowSpan
              className="h-3 w-3 text-gray-600 dark:text-gray-300" 
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
        <WidgetFactory widget={widget} onToggleChecklistItem={onToggleChecklistItem} />
      </div>
    </div>
  );
}
