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

// Helper function to get border color based on priority using Moneko color system
const getPriorityBorderColor = (priority?: Priority): string => {
  switch (priority) {
    case 'high': return 'border-l-red-600 dark:border-l-red-400';
    case 'medium': return 'border-l-amber-600 dark:border-l-amber-400';
    case 'low': return 'border-l-emerald-600 dark:border-l-emerald-400';
    default: return 'border-l-subtle-background';
  }
};

// Helper function to get background color based on priority using Moneko color system
const getPriorityBgColor = (priority?: Priority): string => {
  switch (priority) {
    case 'high': return 'bg-red-50/50 dark:bg-red-950/30';
    case 'medium': return 'bg-amber-50/50 dark:bg-amber-950/30';
    case 'low': return 'bg-emerald-50/50 dark:bg-emerald-950/30';
    default: return 'bg-subtle-background/50';
  }
};

interface ChecklistWidgetProps {
  widget: IChecklistWidget;
}

export function ChecklistWidget({ widget }: ChecklistWidgetProps) {
  const { data } = widget;
  const { items = [], showCompleted = true, sortBy = 'custom' } = data || {};
  // `title` and `icon` from `widget` are used by the <Widget /> wrapper

  if (!items || items.length === 0) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="flex flex-col items-center justify-center h-full p-6 sm:p-8 text-center">
          <div className="bg-subtle-background/50 rounded-full p-4 sm:p-5 mb-4 sm:mb-6">
            <FontAwesomeIcon icon={faTasks} className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground-color" />
          </div>
          <h3 className="text-mobile-lg sm:text-xl font-medium text-foreground mb-2">Empty Checklist</h3>
          <p className="text-mobile-sm sm:text-sm text-muted-foreground-color">
            No tasks here yet. Add some items to get started!
          </p>
        </div>
      </Widget>
    );
  }

  const sortedData = [...items].sort((a, b) => {
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
      <ul className="space-y-3 sm:space-y-4 h-full overflow-y-auto custom-scrollbar">
        {filteredData.map((item: IChecklistItem) => (
          <li
            key={item.id}
            className={`
              flex items-start p-4 sm:p-5 rounded-2xl
              ${getPriorityBgColor(item.priority)}
              border-l-4 ${getPriorityBorderColor(item.priority)}
              ${item.isCompleted ? 'opacity-70' : ''}
              transition-all duration-300 ease-in-out
            `}
          >
            <div
              className="mr-3 sm:mr-4 mt-1 flex-shrink-0"
            >
              <FontAwesomeIcon
                icon={item.isCompleted ? faCheckSquare : faSquare}
                className={`w-5 h-5 sm:w-6 sm:h-6 ${item.isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground-color'}`}
              />
            </div>

            <div className="flex-grow">
              <p className={`font-medium text-mobile-sm sm:text-sm text-foreground ${item.isCompleted ? 'line-through text-muted-foreground-color' : ''}`}>
                {item.task}
              </p>

              {(item.priority || item.dueDate || item.category) && (
                <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                  {item.dueDate && (
                    <span className="flex items-center text-mobile-xs sm:text-xs text-muted-foreground-color">
                      <FontAwesomeIcon icon={faCalendarAlt} className="mr-1.5 w-3 h-3" />
                      {new Date(item.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {item.category && (
                    <span className="flex items-center bg-sky-50/50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 px-2.5 py-1 rounded-full text-mobile-xs sm:text-xs font-medium">
                      <FontAwesomeIcon icon={faTag} className="mr-1.5 w-3 h-3" />
                      {item.category}
                    </span>
                  )}
                </div>
              )}

              {item.notes && (
                 <div className="mt-3 text-mobile-xs sm:text-xs text-muted-foreground-color p-3 bg-subtle-background/50 rounded-xl">
                   <FontAwesomeIcon icon={faStickyNote} className="mr-2 w-3.5 h-3.5 inline-block align-text-top" />
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

