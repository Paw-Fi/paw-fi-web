'use client';

import { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Widget as WidgetType } from '../types/dashboard-data.typings';
import { iconMap } from '../data/icon-map';
import { faChartBar } from '@fortawesome/free-solid-svg-icons';
import { BetaPill } from '@/components/ui/beta-pill';

interface WidgetProps {
  widget: WidgetType;
  children: ReactNode;
  className?: string;
  controls?: ReactNode; // Added to support control buttons from EditableWidget
  isBeta?: boolean;
}


// Sorted list of icon names for the dropdown
export const iconOptions = Object.keys(iconMap).sort();

export function Widget({ widget, children, className = '', controls,isBeta }: WidgetProps) {

  // Safely handle the icon - ensure it exists in our map or use default
  const icon = widget.icon && iconMap[widget.icon as keyof typeof iconMap] ? iconMap[widget.icon as keyof typeof iconMap] : faChartBar;

  return (
    <div 
      className={`     
        h-full flex flex-col
        ${widget.column_span === 2 ? 'col-span-2' : 'col-span-1'}
        ${className}
      `}    
    >      
      {/* Widget header */}
      <div className="pb-4 flex items-center flex-shrink-0">
        <div className="flex items-center space-x-3 min-w-0 flex-grow"> 
          <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200 truncate" title={widget.title}>
            {widget.title || 'Financial Widget'}
          </h3>
          {isBeta && <BetaPill/>}
        </div>
        
        {/* Controls from EditableWidget will be inserted here */}
        {controls && (
          <div className="flex items-center ml-auto">
            {controls}
          </div>
        )}
      </div>
      
      {/* Widget content - flex-grow allows it to fill available space */}
      <div className={`flex-grow ${className.includes('overflow-hidden') ? 'relative' : ''}`}>
        {children}
      </div>
    </div>
  );
}
