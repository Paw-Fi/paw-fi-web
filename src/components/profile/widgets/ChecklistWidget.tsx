'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckSquare,
  faSquare,
  faExclamationCircle,
  faCalendarAlt,
  faTag,
  faStickyNote,
  faTasks, // Added for empty state
} from '@fortawesome/free-solid-svg-icons';
import type { IChecklistWidget, IChecklistItem, Priority } from '../types/dashboard-data.typings';
import { Widget } from './Widget';

// Helper for priority text (can be extended or moved to a constants file)
const priorityText: { [key in Priority]: string } = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

// Helper function to get border color based on priority
const getPriorityBorderColor = (priority?: Priority): string => {
  switch (priority) {
    case 'high': return 'border-red-500 dark:border-red-400';
    case 'medium': return 'border-yellow-500 dark:border-yellow-400';
    case 'low': return 'border-green-500 dark:border-green-400';
    default: return 'border-slate-300 dark:border-slate-700';
  }
};

interface ChecklistWidgetProps {
  widget: IChecklistWidget;
  onToggleItem?: (itemId: string, isCompleted: boolean) => void;
}

export function ChecklistWidget({ widget, onToggleItem }: ChecklistWidgetProps) {
  const { data, showCompleted = true, sortBy = 'custom' } = widget; // onToggleItem is now a direct prop
  // `title` and `icon` from `widget` are used by the <Widget /> wrapper

  if (!data || data.length === 0) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <FontAwesomeIcon icon={faTasks} className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-6" />
          <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">Empty Checklist</h3>
          <p className="text-slate-500 dark:text-slate-400">
            No tasks here yet. Add some items to get started!
          </p>
        </div>
      </Widget>
    );
  }

  const sortedData = [...data].sort((a, b) => {
    if (sortBy === 'dueDate' && a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    } else if (sortBy === 'priority') {
      const pOrder: { [key in Priority]: number } = { high: 1, medium: 2, low: 3 };
      return (pOrder[a.priority || 'low'] || 4) - (pOrder[b.priority || 'low'] || 4);
    }
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });

  const filteredData = showCompleted ? sortedData : sortedData.filter(item => !item.isCompleted);

  return (
    <Widget widget={widget} controls={widget.controls}>
      <ul className="space-y-4 text-base h-full overflow-y-auto custom-scrollbar">
        {filteredData.map((item: IChecklistItem) => (
          <li 
            key={item.id} 
            className={`
              flex items-start p-4 rounded-lg 
              bg-white dark:bg-slate-800 
              shadow-md hover:shadow-lg transition-all duration-300 ease-in-out
              border-l-4 ${getPriorityBorderColor(item.priority)}
              ${item.isCompleted ? 'opacity-70' : ''}
            `}
          >
            <div 
              onClick={() => onToggleItem && onToggleItem(item.id, !item.isCompleted)} 
              className="cursor-pointer mr-4 mt-1 flex-shrink-0"
              aria-label={item.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onToggleItem && onToggleItem(item.id, !item.isCompleted);
                }
              }}
            >
              <FontAwesomeIcon 
                icon={item.isCompleted ? faCheckSquare : faSquare} 
                className={`w-6 h-6 ${item.isCompleted ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors'}`}
              />
            </div>

            <div className="flex-grow">
              <p className={`font-semibold text-sm text-slate-800 dark:text-slate-100 ${item.isCompleted ? 'line-through text-slate-500 dark:text-slate-400' : ''}`}>
                {item.task}
              </p>

              {(item.priority || item.dueDate || item.category) && (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                  {/* {item.priority && (
                    <span className={`flex items-center px-2.5 py-1 rounded-full font-medium ${getPriorityTagClasses(item.priority)}`}>
                      <FontAwesomeIcon icon={faExclamationCircle} className="mr-1.5 w-3 h-3" /> 
                      {priorityText[item.priority]}
                    </span>
                  )} */}
                  {item.dueDate && (
                    <span className="flex items-center text-slate-500 dark:text-slate-400">
                      <FontAwesomeIcon icon={faCalendarAlt} className="mr-1.5 w-3 h-3" />
                      {new Date(item.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {item.category && (
                    <span className="flex items-center bg-sky-100 dark:bg-sky-700/50 text-sky-700 dark:text-sky-300 px-2.5 py-1 rounded-full font-medium">
                      <FontAwesomeIcon icon={faTag} className="mr-1.5 w-3 h-3" />
                      {item.category}
                    </span>
                  )}
                </div>
              )}

              {item.notes && (
                 <div className="mt-3 text-sm text-slate-600 dark:text-slate-300 p-3 bg-slate-50 dark:bg-slate-700/60 rounded-md border border-slate-200 dark:border-slate-600">
                   <FontAwesomeIcon icon={faStickyNote} className="mr-2 w-3.5 h-3.5 inline-block align-text-top text-slate-400 dark:text-slate-500" /> 
                   {item.notes}
                 </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Widget>
  );
}

