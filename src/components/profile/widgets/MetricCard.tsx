'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';
import { IMetricCardWidget } from '../types/dashboard-data.typings';
import { Widget } from './Widget';

interface MetricCardProps {
  widget: IMetricCardWidget;
}

export function MetricCard({ widget }: MetricCardProps) {
  const { data: dataArray, displayMode } = widget;

  if (!dataArray || dataArray.length === 0) {
    return (
      <Widget widget={widget}>
        <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
          No metric data available.
        </div>
      </Widget>
    );
  }

  // For now, display the first metric. Carousel/grid can be implemented later.
  const data = dataArray[0];
  
  return (
    <Widget widget={widget}>
      <div className="flex flex-col h-full justify-between">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-gray-800">
                {data.currency}{data.value}
              </span>
            </div>
            
            {data.trend && (
              <div className="flex items-center mt-1">
                <FontAwesomeIcon 
                  icon={data.trend === 'up' ? faArrowUp : faArrowDown} 
                  className={`h-3 w-3 mr-1 ${data.trend === 'up' ? 'text-green-500' : 'text-red-500'}`} 
                />
                <span className={`text-sm ${data.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {data.trendPercentage}
                </span>
              </div>
            )}
          </div>
          
          {data.description && (
            <div className="text-sm text-gray-500 max-w-[50%]">
              {data.description}
            </div>
          )}
        </div>
        
        {data.progress !== undefined && (
          <div className="space-y-1 mt-auto pt-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full" 
                style={{ width: `${data.progress}%` }}
              ></div>
            </div>
            {data.goalLabel && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Progress</span>
                <span>{data.goalLabel}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Widget>
  );
}
