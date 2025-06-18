'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faChevronRight, faChevronLeft, faLink, faLightbulb, faQuoteLeft, faQuoteRight } from '@fortawesome/free-solid-svg-icons';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  IDataListWidget, 
  IProgressBarListWidget, 
  ICountdownCardWidget,
  ITipCardWidget,
  ITipCardListItem, // Changed from ITipItem
} from '../types/dashboard-data.typings';
import { Widget } from './Widget';

// Data List Widget
export function DataListWidget({ widget }: { widget: IDataListWidget }) {
  const { data, tip, footerLink } = widget;
  if (!data || data.length === 0) {
    return <Widget widget={widget}><div className="p-4 text-center text-slate-500">No data available.</div></Widget>;
  }
  
  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="space-y-4 p-1"> {/* Adjusted base padding slightly if Widget itself has substantial padding */}
        {data.map((item, index) => (
          <div 
            key={index} 
            className="flex justify-between items-center py-3 border-b border-slate-200 dark:border-slate-700 last:border-0"
          >
            <span className="text-sm text-slate-500 dark:text-slate-400">{item.label}</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {item.currency}{item.value.toLocaleString()} {/* Added toLocaleString for better number formatting */}
            </span>
          </div>
        ))}
        
        {tip && (
          <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{tip}</p>
          </div>
        )}
        
        {footerLink && (
          <a 
            href={footerLink.url} 
            className="mt-4 inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors group"
          >
            <FontAwesomeIcon icon={faLink} className="h-4 w-4 mr-1.5 group-hover:scale-110 transition-transform" />
            {footerLink.text}
          </a>
        )}
      </div>
    </Widget>
  );
}

// Progress Bar List Widget
export function ProgressBarListWidget({ widget }: { widget: IProgressBarListWidget }) {
  const { data, showPercentages = true } = widget;
  if (!data || data.length === 0) {
    return <Widget widget={widget}><div className="p-4 text-center text-slate-500">No data available.</div></Widget>;
  }
  
  // Calculate progress percentage for each item
  const getProgressPercentage = (current: number, max: number) => {
    // Ensure both values are valid numbers
    const currentNum = Number(current) || 0;
    let maxNum = Number(max) || 0;
    
    // If max is 0, we'll treat it as 100% if current is also 0, otherwise use current as percentage
    if (maxNum <= 0) {
      return currentNum <= 0 ? 0 : 100;
    }
    
    const progress = (currentNum / maxNum) * 100;
    return Math.min(100, Math.max(0, progress)); // Clamp between 0-100
  };
  
  // Sort items based on widget settings
  const sortedItems = [...data].sort((a, b) => {
    if (widget.sortBy === 'alphabetical') {
      return a.label.localeCompare(b.label);
    } else if (widget.sortBy === 'progress') {
      return (b.current / b.max) - (a.current / a.max);
    }
    // Default to displayOrder or original order
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });
  
  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="space-y-4 p-1">
        {sortedItems.map((item, index) => {
          const progress = getProgressPercentage(item.current, item.max);
          const progressText = `${Math.round(progress)}%`;
          const valueText = `${item.current} / ${item.max}`;
          
          return (
            <div key={item.id || index} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-300">{item.label}</span>
                {showPercentages ? (
                  <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                    {progressText}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {valueText}
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: item.color || 'var(--color-primary-600)'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Widget>
  );
}

// Countdown Card Widget
export function CountdownCardWidget({ widget }: { widget: ICountdownCardWidget }) {
  const { data } = widget;

  if (!data) {
    return (
      <Widget widget={widget} className="overflow-hidden">
        <div className="flex items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 text-base">
          No countdown data available.
        </div>
      </Widget>
    );
  }

  const currentCountdownItem = data; // Data is now a single object

  const calculateDaysRemaining = (targetDateISO: string): number => {
    const target = new Date(targetDateISO);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    if (diffTime <= 0) {
      return 0; // Target date has passed or is now
    }
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  let daysRemaining = 0;
  if (currentCountdownItem.targetDate) {
    daysRemaining = calculateDaysRemaining(currentCountdownItem.targetDate);
  }

  const formattedDate = currentCountdownItem.targetDate 
    ? new Date(currentCountdownItem.targetDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : '';

  const displayTitle = currentCountdownItem.title || 'Upcoming Goal';
  
  // Determine background gradient based on days remaining
  let gradientClass = "from-blue-500 to-purple-500"; // Default
  
  if (daysRemaining <= 0) {
    gradientClass = "from-gray-500 to-gray-400"; // Expired
  } else if (daysRemaining <= 7) {
    gradientClass = "from-red-500 to-orange-400"; // Urgent (less than a week)
  } else if (daysRemaining <= 30) {
    gradientClass = "from-amber-500 to-yellow-400"; // Soon (less than a month)
  } else if (daysRemaining <= 60) {
    gradientClass = "from-teal-400 to-emerald-500"; // Approaching (2 months)
  }

  return (
    <Widget widget={widget} className="overflow-hidden" controls={widget.controls}>
      {/* Use absolute positioning to ensure no scrollbars */}
      <div className="absolute inset-0 flex items-center justify-center">       
        
        {/* Content container with responsive sizing based on widget dimensions */}
        <div className="flex flex-col items-center w-full text-center">
          {/* Image with responsive sizing */}
          {currentCountdownItem.image && (
            <div 
              className={`rounded-lg overflow-hidden shadow-md ring-1 ring-white/30 mb-2 ${(widget.columnSpan === 2 || (widget.rowSpan ?? 1) > 1) ? 'w-16 h-16' : 'w-12 h-12'}`}
            >
              <img 
                src={currentCountdownItem.image} 
                alt={displayTitle}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {/* Title with responsive sizing */}
          <h3 
            className={`font-medium text-slate-700 dark:text-slate-200 ${(widget.columnSpan === 2 || (widget.rowSpan ?? 1) > 1) ? 'text-base line-clamp-2 mb-1' : 'text-sm line-clamp-1'}`}
          >
            {displayTitle}
          </h3>
          
          {/* Days counter with responsive sizing */}
          <div className="flex flex-col items-center">
            <div 
              className={`font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-200 dark:to-white ${(widget.columnSpan === 2 || (widget.rowSpan ?? 1) > 1) ? 'text-6xl' : 'text-4xl'}`}
            >
              {currentCountdownItem.targetDate 
                ? (daysRemaining <= 0 ? '0' : daysRemaining)
                : '—'}
            </div>
            <div 
              className={`text-slate-600 dark:text-slate-300 font-medium ${(widget.columnSpan === 2 || (widget.rowSpan ?? 1) > 1) ? 'text-sm' : 'text-xs'}`}
            >
              {!currentCountdownItem.targetDate 
                ? 'No target date set'
                : daysRemaining === 0 
                  ? 'Today is the day!'
                  : daysRemaining === 1 
                    ? 'day remaining' 
                    : 'days remaining'}
            </div>
          </div>
          
          {/* Target date - only show if there's room */}
          {currentCountdownItem.targetDate && (widget.rowSpan ?? 1) > 1 && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 bg-slate-100 dark:bg-slate-800/50 py-0.5 px-2 rounded-full">
              {formattedDate}
            </div>
          )}
        </div>
      </div>
    </Widget>
  );
}

