'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUp,
  faArrowDown,
  faMinus,
  faEllipsisH, // Default/unknown trend
} from '@fortawesome/free-solid-svg-icons';
import { IMetricCardWidget, IMetricCardItem } from '../types/dashboard-data.typings';
import { Widget } from './Widget';

interface MetricCardProps {
  widget: IMetricCardWidget;
}

// Helper component for trend icon, kept for robustness if trend type expands
const TrendIcon = ({ trend }: { trend: IMetricCardItem['trend'] }) => {
  if (trend === 'up') return <FontAwesomeIcon icon={faArrowUp} className="h-3 w-3 text-emerald-500" />;
  if (trend === 'down') return <FontAwesomeIcon icon={faArrowDown} className="h-3 w-3 text-red-500" />;
  // 'stable' is not in IMetricCardItem['trend'] but handled defensively
  if (trend === 'stable') return <FontAwesomeIcon icon={faMinus} className="h-3 w-3 text-slate-500" />;
  return <FontAwesomeIcon icon={faEllipsisH} className="h-3 w-3 text-slate-400" />;
};

// Helper function for trend color, kept for robustness
const getTrendColor = (trend: IMetricCardItem['trend']) => {
  if (trend === 'up') return 'text-emerald-500';
  if (trend === 'down') return 'text-red-500';
  if (trend === 'stable') return 'text-slate-500';
  return 'text-slate-400';
};

export function MetricCard({ widget }: MetricCardProps) {
  const { data } = widget;

  if (!data || !data.metrics || data.metrics.length === 0) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="flex items-center justify-center h-full p-6 text-sm text-slate-500 dark:text-slate-400">
          No metric data available.
        </div>
      </Widget>
    );
  }

  // Assuming we display the first metric item for now.
  const metricItem = data.metrics[0];

  // Calculate progress percentage (progress is 0.0 to 1.0)
  const progressPercentage = metricItem?.progress ? metricItem.progress * 100 : 0;

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="p-5 flex flex-col h-full justify-between antialiased">
        {/* Top section: Metric Value and Description/Trend */} 
        <div>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              {metricItem?.currency}{metricItem?.value}
            </span>
          </div>

          {metricItem?.trend && metricItem?.trendPercentage && (
            <div className={`mt-2 flex items-center text-sm ${getTrendColor(metricItem.trend)}`}>
              <TrendIcon trend={metricItem.trend} />
              <span className="ml-1.5 font-medium">
                {metricItem.trendPercentage} vs last period
              </span>
            </div>
          )}
          
          {/* metricItem.description is used here as the primary textual content for the metric item itself */} 
          {metricItem?.description && (
             <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
              {metricItem.description}
            </p>
          )}
        </div>

        {/* Bottom section: Progress Bar and Goal */} 
        {metricItem?.progress && (
          <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-700/60">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>Progress</span> {/* Static label "Progress" */} 
              {metricItem?.goalLabel && <span>Target: {metricItem.goalLabel}</span>}
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }} // Use calculated progressPercentage
              ></div>
            </div>
            {/* Removed data.progressText as it does not exist on IMetricCardItem */} 
          </div>
        )}
      </div>
    </Widget>
  );
}
