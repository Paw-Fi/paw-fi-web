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
  
  // Get the numeric value (remove any non-numeric characters except decimal point)
  const numericValue = metricItem?.value ? parseFloat(metricItem.value.toString().replace(/[^0-9.]/g, '')) : 0;
  
  // Generate appropriate guidance text based on the value
  // This logic can be customized based on specific metrics
  const getGuidanceText = () => {
    // Example for savings rate - check the description field
    if (metricItem?.description?.toLowerCase().includes('savings')) {
      if (numericValue >= 15 && numericValue <= 20) {
        return "Aim for 15-20% savings rate for optimal wealth building.";
      } else if (numericValue > 20) {
        return "Excellent savings rate! You're on track for strong wealth building.";
      } else {
        return "Consider increasing your savings rate to 15-20% for optimal wealth building.";
      }
    }
    
    // Default text from the data if available
    return metricItem?.description || '';
  };
  
  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="p-8 flex flex-col h-full">
        {/* Metric Value - Large and Prominent */}
        <h3 className="text-xl md:text-2xl font-bold text-slate-700 dark:text-slate-200 tracking-tight mb-4">
          {metricItem?.value}
        </h3>
        
        {/* Dynamic Guidance Text */}
        <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
          {getGuidanceText()}
        </p>
      </div>
    </Widget>
  );
}
