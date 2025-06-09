'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { 
  IDataListWidget, 
  IProgressBarListWidget, 
  ICountdownCardWidget,
  ITipCardWidget
} from '../types/dashboard-data.typings';
import { Widget } from './Widget';
import { useState } from 'react';

// Data List Widget
export function DataListWidget({ widget }: { widget: IDataListWidget }) {
  const { data, tip, footerLink } = widget;
  
  return (
    <Widget widget={widget}>
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
  const { data } = widget;
  
  return (
    <Widget widget={widget}>
      <div className="space-y-5 p-1"> {/* Adjusted base padding slightly */}
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm text-slate-600 dark:text-slate-300">{item.label}</span>
              <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                {Math.round(item.progress * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-md h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-md transition-all duration-500 ease-out"
                style={{ width: `${item.progress * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </Widget>
  );
}

// Countdown Card Widget
export function CountdownCardWidget({ widget }: { widget: ICountdownCardWidget }) {
  const { data } = widget;

  if (!data || data.length === 0) {
    return (
      <Widget widget={widget}>
        <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-base">No countdown data available.</div>
      </Widget>
    );
  }

  const currentCountdownItem = data[0]; // Display the first countdown item

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

  const displayTitle = currentCountdownItem.title || 'Upcoming Goal';

  return (
    <Widget widget={widget}>
      <div className="flex flex-col items-center p-4 text-center"> {/* Added text-center */}
        {currentCountdownItem.image && (
          <img 
            src={currentCountdownItem.image} 
            alt={displayTitle}
            className="w-20 h-20 object-cover rounded-xl mb-4 shadow-md"
          />
        )}
        <div className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-1">
          {displayTitle}
        </div>
        <div className="text-5xl font-bold text-slate-800 dark:text-slate-100">
          {currentCountdownItem.targetDate ? daysRemaining : '—'}
        </div>
        <div className="text-base text-slate-500 dark:text-slate-400 mt-0.5">
          {currentCountdownItem.targetDate 
            ? (daysRemaining === 1 ? 'day remaining' : 'days remaining') 
            : 'No target date set'}
        </div>
      </div>
    </Widget>
  );
}

// Tip Card Widget
export function TipCardWidget({ widget }: { widget: ITipCardWidget }) {
  const { data } = widget;
  const [currentTipIndex, setCurrentTipIndex] = useState(data.currentTipIndex || 0);
  
  const nextTip = () => {
    setCurrentTipIndex((prevIndex) => (prevIndex + 1) % data.tips.length);
  };
  
  return (
    <Widget widget={widget}>
      <div className="flex flex-col justify-between h-full p-4"> {/* Added p-4 and h-full */}
        <div className="text-base text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
          <span className="text-2xl font-serif text-primary-500 mr-1 relative -top-1">“</span>
          {data.tips[currentTipIndex].content}
          <span className="text-2xl font-serif text-primary-500 ml-1 relative -top-1">”</span>
        </div>
        
        <div className="flex justify-between items-center mt-auto"> {/* Added mt-auto to push to bottom */}
          <div className="flex space-x-1.5">
            {data.tips.map((_, index) => (
              <div 
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${ // Added transition
                  index === currentTipIndex 
                    ? 'bg-primary scale-110'  // Slightly scale active dot
                    : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500' // Hover effect for inactive
                }`}
              ></div>
            ))}
          </div>
          
          <button 
            onClick={nextTip}
            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-md transition-colors flex items-center shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
            aria-label="Next tip"
          >
            Next <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 h-3 w-3" />
          </button>
        </div>
      </div>
    </Widget>
  );
}
