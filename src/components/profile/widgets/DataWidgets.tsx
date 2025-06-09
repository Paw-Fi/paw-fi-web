'use client';

import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faChevronLeft, faLink } from '@fortawesome/free-solid-svg-icons';
import { 
  IDataListWidget, 
  IProgressBarListWidget, 
  ICountdownCardWidget,
  ITipCardWidget,
  ITipItem
} from '../types/dashboard-data.typings';
import { Widget } from './Widget';

// Data List Widget
export function DataListWidget({ widget }: { widget: IDataListWidget }) {
  const { data, tip, footerLink } = widget;
  
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
        {/* Background gradient circle - size based on widget dimensions */}
        <div 
          className={`absolute rounded-full bg-gradient-to-br ${gradientClass} opacity-10 blur-xl`}
          style={{
            width: widget.columnSpan === 2 || (widget.rowSpan ?? 1) > 1 ? '12rem' : '10rem',
            height: widget.columnSpan === 2 || (widget.rowSpan ?? 1) > 1 ? '12rem' : '10rem',
          }}
        ></div>
        
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

export function TipCardWidget({ widget }: { widget: ITipCardWidget }) {
  const { data } = widget;
  const [currentTipIndex, setCurrentTipIndex] = useState<number>(data.currentTipIndex || 0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  
  // Get the current tip to display
  const currentTip = data.tips?.[currentTipIndex] || data.tips?.[0];

  // Navigate to next tip
  const nextTip = useCallback(() => {
    if (!data.tips?.length) return;
    const nextIndex = (currentTipIndex + 1) % data.tips.length;
    setCurrentTipIndex(nextIndex);
  }, [currentTipIndex, data.tips]);

  // Navigate to previous tip
  const prevTip = useCallback(() => {
    if (!data.tips?.length) return;
    const prevIndex = (currentTipIndex - 1 + data.tips.length) % data.tips.length;
    setCurrentTipIndex(prevIndex);
  }, [currentTipIndex, data.tips]);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextTip();
      } else if (e.key === 'ArrowLeft') {
        prevTip();
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextTip, prevTip]);
  
  if (!currentTip || !data.tips?.length) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="flex items-center justify-center h-full p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">No tips available</p>
        </div>
      </Widget>
    );
  }
  
  return (
    <Widget widget={widget} controls={widget.controls}>
      <div 
        className="h-full flex flex-col"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex flex-col h-full p-4">
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative">
              <div className="flex items-center justify-center">
                <span className="absolute -left-6 -top-4 text-5xl font-serif text-primary-300 dark:text-primary-600 opacity-70">"</span>
                <p className="text-lg md:text-xl text-gray-800 dark:text-gray-100 leading-relaxed px-4 py-2">
                  {currentTip.content}
                </p>
                <span className="absolute -right-6 -bottom-4 text-5xl font-serif text-primary-300 dark:text-primary-600 opacity-70 transform rotate-180">"</span>
              </div>
            </div>
          </div>
          
          {currentTip.category && (
            <div className="mt-4 text-center">
              <span className="inline-block px-3 py-1 text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-200 rounded-full">
                {currentTip.category}
              </span>
            </div>
          )}
        </div>
        
        <div className="mt-auto pt-4">
          <div className="flex justify-between items-center px-4">
            <div className="flex space-x-2">
              {data.tips.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTipIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentTipIndex
                      ? 'bg-primary-600 scale-125'  // Active dot
                      : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500'  // Inactive dot
                  }`}
                  aria-label={`Go to tip ${index + 1}`}
                />
              ))}
            </div>           
          
          </div>
        </div>
      </div>
    </Widget>
  );
}
