'use client';

import React from 'react';

interface SkeletonWidgetProps {
  column_span?: 1 | 2;
  isExpanded?: boolean;
}

export function SkeletonWidget({ column_span = 1, isExpanded = false }: SkeletonWidgetProps) {
  return (
    <div 
      className={`
        ${isExpanded ? 'row-span-2' : 'row-span-1'}
        ${column_span === 2 ? 'col-span-2' : 'col-span-1'}
       overflow-hidden animate-pulse
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-muted mr-3"></div>
            <div className="h-5 bg-muted rounded w-32"></div>
          </div>
          <div className="w-8 h-4 bg-muted rounded"></div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {isExpanded ? (
          <>
            <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
            <div className="h-32 bg-muted rounded mb-4"></div>
            <div className="h-4 bg-muted rounded w-2/3 mb-4"></div>
            <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
            <div className="h-32 bg-muted rounded"></div>
          </>
        ) : (
          <>
            <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
            <div className="h-24 bg-muted rounded"></div>
          </>
        )}
      </div>
    </div>
  );
}
