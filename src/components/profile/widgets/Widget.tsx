'use client';

import { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Widget as WidgetType } from '../types/dashboard-data.typings';
import { iconMap } from '../data/icon-map';
import { faChartBar } from '@fortawesome/free-solid-svg-icons';

interface WidgetProps {
  widget: WidgetType;
  children: ReactNode;
  className?: string;
  controls?: ReactNode; // Added to support control buttons from EditableWidget
}


// Sorted list of icon names for the dropdown
export const iconOptions = Object.keys(iconMap).sort();

export function Widget({ widget, children, className = '', controls }: WidgetProps) {

  // Safely handle the icon - ensure it exists in our map or use default
  const icon = widget.icon && iconMap[widget.icon as keyof typeof iconMap] ? iconMap[widget.icon as keyof typeof iconMap] : faChartBar;

  return (
    <div 
      className={`     
        h-full flex flex-col
        ${widget.columnSpan === 2 ? 'col-span-2' : 'col-span-1'}
        ${className}
      `}    
    >
      {/* Glass effect overlay */}
      <div className="absolute inset-0 pointer-events-none"></div>
      
      {/* Widget header */}
      <div className="pb-4 border-b border-purple-200/30 dark:border-slate-700/60 flex items-center flex-shrink-0">
        <div className="flex items-center space-x-3 min-w-0 flex-grow"> 
          <div className="size-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white shadow-md shadow-purple-500/40">
            <FontAwesomeIcon icon={icon} className="size-3" />
          </div>
          <h3 className="font-semibold text-base text-purple-900 dark:text-purple-200 truncate group-hover:text-purple-700 dark:group-hover:text-purple-300" title={widget.title}>
            {widget.title || 'Untitled Widget'}
          </h3>
        </div>
        
        {/* Controls from EditableWidget will be inserted here */}
        {controls && (
          <div className="flex items-center ml-auto">
            {controls}
          </div>
        )}
      </div>
      
      {/* Widget content - flex-grow allows it to fill available space */}
      <div className={`flex-grow ${className.includes('overflow-hidden') ? 'relative' : 'overflow-auto'}`}>
        <div className="h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
