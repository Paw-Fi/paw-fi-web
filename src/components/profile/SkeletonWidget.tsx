'use client';

import React from 'react';

interface SkeletonWidgetProps {
  columnSpan?: 1 | 2;
  isExpanded?: boolean;
}

export function SkeletonWidget({ columnSpan = 1, isExpanded = false }: SkeletonWidgetProps) {
  return (
    <div 
      className={`
        ${isExpanded ? 'row-span-2' : 'row-span-1'}
        ${columnSpan === 2 ? 'col-span-2' : 'col-span-1'}
        bg-white rounded-xl shadow-lg overflow-hidden animate-pulse
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full bg-gray-200 mr-3"></div>
            <div className="h-5 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="w-8 h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {isExpanded ? (
          <>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </>
        ) : (
          <>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </>
        )}
      </div>
    </div>
  );
}
