'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
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
      <div className="space-y-3">
        {data.map((item, index) => (
          <div 
            key={index} 
            className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700/30 last:border-0"
          >
            <span className="text-sm text-gray-600 dark:text-gray-300">{item.label}</span>
            <span className="font-medium text-gray-800 dark:text-gray-100">
              {item.currency}{item.value}
            </span>
          </div>
        ))}
        
        {tip && (
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 italic">
            {tip}
          </div>
        )}
        
        {footerLink && (
          <a 
            href={footerLink.url} 
            className="mt-3 inline-flex items-center text-sm text-primary hover:text-primary-dark transition-colors"
          >
            <FontAwesomeIcon icon={faLink} className="h-3 w-3 mr-1" />
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
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-300">{item.label}</span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {Math.round(item.progress * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
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
  
  return (
    <Widget widget={widget}>
      <div className="flex flex-col items-center">
        <img 
          src={data.image} 
          alt="Countdown" 
          className="w-16 h-16 object-cover rounded-lg mb-3"
        />
        <div className="text-4xl font-bold text-gray-800 dark:text-white">{data.days}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">days remaining</div>
      </div>
    </Widget>
  );
}

// Tip Card Widget
export function TipCardWidget({ widget }: { widget: ITipCardWidget }) {
  const { data } = widget;
  const [currentTipIndex, setCurrentTipIndex] = useState(data.currentTipIndex);
  
  const nextTip = () => {
    setCurrentTipIndex((prevIndex) => (prevIndex + 1) % data.tips.length);
  };
  
  return (
    <Widget widget={widget}>
      <div className="flex flex-col">
        <div className="text-sm text-gray-700 dark:text-gray-300 italic mb-4">
          "{data.tips[currentTipIndex]}"
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex space-x-1">
            {data.tips.map((_, index) => (
              <div 
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentTipIndex 
                    ? 'bg-primary' 
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              ></div>
            ))}
          </div>
          
          <button 
            onClick={nextTip}
            className="text-xs text-primary hover:text-primary-dark transition-colors"
          >
            Next tip
          </button>
        </div>
      </div>
    </Widget>
  );
}
