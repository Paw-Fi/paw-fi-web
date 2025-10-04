'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faChevronRight, faChevronLeft, faLink, faLightbulb, faQuoteLeft, faQuoteRight } from '@fortawesome/free-solid-svg-icons';
import { AnimatePresence, motion } from 'framer-motion';
import { OptimizedImage } from "@/components/seo/optimized-image";
import { 
  IDataListWidget, 
  IProgressBarListWidget, 
  ICountdownCardWidget,
  ITipCardWidget,
  ITipCardListItem, 
  IProgressBarListItem
} from '../types/dashboard-data.typings';
import { Widget } from './Widget';

// Data List Widget
export function DataListWidget({ widget }: { widget: IDataListWidget }) {
  const { data } = widget;
  
  if (!data || !data.items || data.items.length === 0) {
    return <Widget widget={widget}><div className="p-4 sm:p-6 text-center text-mobile-sm sm:text-sm text-muted-foreground-color">No data available.</div></Widget>;
  }
  
  const { items, tip, footerLink, groupByCategory, showTotals } = data;
  
  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="space-y-3 sm:space-y-4">
        {items.map((item, index) => (
          <div 
            key={item.id || index} 
            className="flex justify-between items-center py-3 sm:py-4"
          >
            <span className="text-mobile-sm sm:text-sm text-muted-foreground-color">{item.label}</span>
            <span className="text-mobile-base sm:text-base font-medium text-foreground">
              {item.currency}{item.value.toLocaleString()}
            </span>
          </div>
        ))}
        
        {tip && (
          <div className="mt-4 sm:mt-6 p-4 sm:p-5 bg-subtle-background/50 rounded-2xl">
            <p className="text-mobile-xs sm:text-xs text-muted-foreground-color leading-relaxed">{tip}</p>
          </div>
        )}
        
        {footerLink && (
          <a 
            href={footerLink.url} 
            className="mt-4 sm:mt-6 inline-flex items-center text-mobile-sm sm:text-sm font-medium text-primary hover:text-primary/80 transition-colors group"
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
  const { data } = widget;
  const { items = [], showPercentages = true, sortBy = 'custom' } = data;
  if (!items || items.length === 0) {
    return <Widget widget={widget}><div className="p-4 sm:p-6 text-center text-mobile-sm sm:text-sm text-muted-foreground-color">No data available.</div></Widget>;
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

  // Calculate status based on progress percentage - more encouraging
  const getStatusText = (progress: number): string => {
    if (progress >= 80) return "🎯 On Track";
    if (progress >= 50) return "📈 Building Momentum";
    if (progress >= 25) return "🌱 Getting Started";
    return "💪 Let's Begin";
  };

  // Generate explanation text based on progress - encouraging approach
  const generateExplanationText = (item: IProgressBarListItem, progress: number): string => {
    // Use item's explanation text if provided
    if (item.explanationText) return item.explanationText;

    // Otherwise, generate encouraging text based on the progress
    if (progress >= 80) {
      return `Excellent work! You're on track to meet your ${item.label.toLowerCase()} goal with your current progress.`;
    } else if (progress >= 50) {
      return `Great momentum! You're making solid progress toward your ${item.label.toLowerCase()} goal. Small increases can help you reach it faster.`;
    } else if (progress >= 25) {
      return `You've started your journey to ${item.label.toLowerCase()}! Every contribution brings you closer to your goal.`;
    } else {
      return `Starting your ${item.label.toLowerCase()} journey is the hardest part - you've got this! Begin with small, consistent steps.`;
    }
  };
  
  // Sort items based on widget settings
  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === 'alphabetical') {
      return a.label.localeCompare(b.label);
    } else if (sortBy === 'progress') {
      return (b.current / b.max) - (a.current / a.max);
    }
    // Default to displayOrder or original order
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });
  
  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="space-y-4 sm:space-y-6">
        {sortedItems.map((item, index) => {
          const progress = getProgressPercentage(item.current, item.max);
          const progressText = `${Math.round(progress)}%`;
          const statusText = getStatusText(progress);
          const explanationText = generateExplanationText(item, progress);
          
          return (
            <div key={item.id || index} className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-mobile-base sm:text-lg font-medium text-foreground">{statusText}</span>
                {showPercentages ? (
                  <span className="text-mobile-base sm:text-lg font-medium text-primary">
                    {progressText}
                  </span>
                ) : null}
              </div>
              
              <div className="w-full bg-subtle-background rounded-full h-2 sm:h-3">
                <div 
                  className="h-2 sm:h-3 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: item.color || 'var(--color-primary)'
                  }}
                />
              </div>
              
              <p className="text-mobile-sm sm:text-sm text-muted-foreground-color">
                {explanationText}
              </p>
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
        <div className="flex items-center justify-center h-full text-center text-mobile-sm sm:text-sm text-muted-foreground-color">
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
  
  // Determine semantic colors based on days remaining
  let bgColorClass = "bg-sky-50/50 dark:bg-sky-950/30"; // Default
  let textColorClass = "text-sky-600 dark:text-sky-400"; // Default
  
  if (daysRemaining <= 0) {
    bgColorClass = "bg-slate-50/50 dark:bg-slate-950/30"; // Expired
    textColorClass = "text-muted-foreground-color";
  } else if (daysRemaining <= 7) {
    bgColorClass = "bg-red-50/50 dark:bg-red-950/30"; // Urgent (less than a week)
    textColorClass = "text-red-600 dark:text-red-400";
  } else if (daysRemaining <= 30) {
    bgColorClass = "bg-amber-50/50 dark:bg-amber-950/30"; // Soon (less than a month)
    textColorClass = "text-amber-600 dark:text-amber-400";
  } else if (daysRemaining <= 60) {
    bgColorClass = "bg-emerald-50/50 dark:bg-emerald-950/30"; // Approaching (2 months)
    textColorClass = "text-emerald-600 dark:text-emerald-400";
  }

  return (
    <Widget widget={widget} className="overflow-hidden" controls={widget.controls}>
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <div className="flex flex-col items-center w-full text-center space-y-3 sm:space-y-4">
          {/* Image with responsive sizing */}
          {currentCountdownItem.image && (
            <div 
              className={`rounded-2xl overflow-hidden shadow-sm ${(widget.column_span === 2 || (widget.row_span ?? 1) > 1) ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12 sm:w-14 sm:h-14'}`}
            >
              <OptimizedImage 
                src={currentCountdownItem.image} 
                alt={displayTitle}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {/* Title with mobile typography */}
          <h3 
            className={`font-medium text-foreground ${(widget.column_span === 2 || (widget.row_span ?? 1) > 1) ? 'text-mobile-base sm:text-base line-clamp-2' : 'text-mobile-sm sm:text-sm line-clamp-1'}`}
          >
            {displayTitle}
          </h3>
          
          {/* Days counter with semantic color background */}
          <div className={`${bgColorClass} rounded-3xl px-6 py-4 sm:px-8 sm:py-5`}>
            <div 
              className={`font-light ${textColorClass} ${(widget.column_span === 2 || (widget.row_span ?? 1) > 1) ? 'text-5xl sm:text-6xl' : 'text-3xl sm:text-4xl'}`}
            >
              {currentCountdownItem.targetDate 
                ? (daysRemaining <= 0 ? '0' : daysRemaining)
                : '—'}
            </div>
            <div 
              className={`text-muted-foreground-color font-medium ${(widget.column_span === 2 || (widget.row_span ?? 1) > 1) ? 'text-mobile-sm sm:text-sm mt-2' : 'text-mobile-xs sm:text-xs mt-1'}`}
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
          {currentCountdownItem.targetDate && (widget.row_span ?? 1) > 1 && (
            <div className="text-mobile-xs sm:text-xs text-muted-foreground-color bg-subtle-background/50 py-1.5 px-3 rounded-full">
              {formattedDate}
            </div>
          )}
        </div>
      </div>
    </Widget>
  );
}

