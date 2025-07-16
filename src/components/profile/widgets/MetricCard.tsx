'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUp,
  faArrowDown,
  faMinus,
  faEllipsisH,
  faInfoCircle,
  faChartLine,
  faExclamationTriangle,
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import { IMetricCardWidget, IMetricCardItem } from '../types/dashboard-data.typings';
import { Widget } from './Widget';

interface MetricCardProps {
  widget: IMetricCardWidget;
}

// Helper component for trend icon
const TrendIcon = ({ trend }: { trend: IMetricCardItem['trend'] }) => {
  if (trend === 'up') return <FontAwesomeIcon icon={faArrowUp} className="h-3 w-3 text-emerald-500" />;
  if (trend === 'down') return <FontAwesomeIcon icon={faArrowDown} className="h-3 w-3 text-red-500" />;
  if (trend === 'stable') return <FontAwesomeIcon icon={faMinus} className="h-3 w-3 text-slate-500" />;
  return <FontAwesomeIcon icon={faEllipsisH} className="h-3 w-3 text-slate-400" />;
};

// Helper function for trend color
const getTrendColor = (trend: IMetricCardItem['trend']) => {
  if (trend === 'up') return 'text-emerald-500';
  if (trend === 'down') return 'text-red-500';
  if (trend === 'stable') return 'text-slate-500';
  return 'text-slate-400';
};

// Helper function to get metric type and benchmarks
const getMetricAnalysis = (metricItem: IMetricCardItem) => {
  const numericValue = metricItem?.value ? parseFloat(metricItem.value.toString().replace(/[^0-9.-]/g, '')) : 0;
  const description = metricItem?.description?.toLowerCase() || '';
  const title = metricItem?.title?.toLowerCase() || '';
  
  // Determine metric type and provide analysis
  if (description.includes('savings') || title.includes('savings')) {
    return {
      type: 'Savings Rate',
      benchmark: '15-20%',
      status: numericValue >= 15 ? (numericValue <= 20 ? 'optimal' : 'excellent') : 'needs-improvement',
      guidance: numericValue >= 15 && numericValue <= 20 
        ? 'Your savings rate is in the optimal range for wealth building.'
        : numericValue > 20 
        ? 'Excellent savings rate! You\'re building wealth aggressively.'
        : 'Consider increasing your savings rate to 15-20% for optimal wealth building.',
      icon: faChartLine,
    };
  }
  
  if (description.includes('debt') || title.includes('debt')) {
    return {
      type: 'Debt Ratio',
      benchmark: '< 36%',
      status: numericValue <= 36 ? 'good' : 'needs-attention',
      guidance: numericValue <= 36 
        ? 'Your debt-to-income ratio is within healthy limits.'
        : 'Consider reducing debt to below 36% of your income for better financial health.',
      icon: faExclamationTriangle,
    };
  }
  
  if (description.includes('emergency') || title.includes('emergency')) {
    return {
      type: 'Emergency Fund',
      benchmark: '3-6 months',
      status: numericValue >= 3 ? (numericValue >= 6 ? 'excellent' : 'good') : 'needs-improvement',
      guidance: numericValue >= 6 
        ? 'Excellent emergency fund coverage!'
        : numericValue >= 3 
        ? 'Good emergency fund. Consider building to 6 months of expenses.'
        : 'Build your emergency fund to at least 3-6 months of expenses.',
      icon: faInfoCircle,
    };
  }
  
  if (description.includes('investment') || title.includes('investment')) {
    return {
      type: 'Investment Allocation',
      benchmark: '10-15%',
      status: numericValue >= 10 ? 'good' : 'needs-improvement',
      guidance: numericValue >= 10 
        ? 'Good investment allocation for long-term growth.'
        : 'Consider allocating 10-15% of income to investments for long-term wealth building.',
      icon: faChartLine,
    };
  }
  
  // Default analysis
  return {
    type: 'Financial Metric',
    benchmark: 'Varies',
    status: 'neutral',
    guidance: metricItem?.description || 'Monitor this metric regularly to track your financial progress.',
    icon: faInfoCircle,
  };
};

// Helper function to get status color and icon
const getStatusIndicator = (status: string) => {
  switch (status) {
    case 'excellent':
      return { color: 'text-emerald-600', bgColor: 'bg-emerald-50', icon: faCheckCircle };
    case 'optimal':
    case 'good':
      return { color: 'text-blue-600', bgColor: 'bg-blue-50', icon: faCheckCircle };
    case 'needs-improvement':
    case 'needs-attention':
      return { color: 'text-amber-600', bgColor: 'bg-amber-50', icon: faExclamationTriangle };
    default:
      return { color: 'text-slate-600', bgColor: 'bg-slate-50', icon: faInfoCircle };
  }
};

// Progress bar component for visual representation
const ProgressBar = ({ value, max, status }: { value: number; max: number; status: string }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const statusColors = {
    'excellent': 'bg-emerald-500',
    'optimal': 'bg-blue-500',
    'good': 'bg-blue-500',
    'needs-improvement': 'bg-amber-500',
    'needs-attention': 'bg-red-500',
    'neutral': 'bg-slate-500',
  };
  
  const barColor = statusColors[status as keyof typeof statusColors] || 'bg-slate-500';
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>Current: {value}%</span>
        <span>Target: {max}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
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

  // Display the first metric item
  const metricItem = data.metrics[0];
  const numericValue = metricItem?.value ? parseFloat(metricItem.value.toString().replace(/[^0-9.-]/g, '')) : 0;
  const analysis = getMetricAnalysis(metricItem);
  const statusIndicator = getStatusIndicator(analysis.status);

  const savingAmount = data.metrics[1]?.value ? parseFloat(data.metrics[1].value.toString().replace(/[^0-9.-]/g, '')) : 0;
  
  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="">       

        {/* Main Value Display */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {metricItem?.value}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Saving ${savingAmount} per month
            </span>

          {/* Status Indicator */}

            <div className={`ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusIndicator.bgColor} ${statusIndicator.color}`}>
            <FontAwesomeIcon icon={statusIndicator.icon} className="h-3 w-3" />
            <span className="capitalize">{analysis.status.replace('-', ' ')}</span>
          </div>
        </div>
          </div>
          
      

        {/* Progress Bar (for percentage-based metrics) */}
        {numericValue > 0 && metricItem?.value?.toString().includes('%') && (
          <div className="mb-4">
            <ProgressBar 
              value={numericValue} 
              max={analysis.type === 'Savings Rate' ? 20 : analysis.type === 'Debt Ratio' ? 36 : 100} 
              status={analysis.status}
            />
          </div>
        )}

        {/* Guidance Section */}
        <div className="mt-auto">          
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {analysis.guidance}
            </p>  
        </div>
    
      </div>
    </Widget>
  );
}