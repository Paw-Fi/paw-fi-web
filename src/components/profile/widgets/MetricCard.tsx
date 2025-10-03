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
  if (trend === 'up') return <FontAwesomeIcon icon={faArrowUp} className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />;
  if (trend === 'down') return <FontAwesomeIcon icon={faArrowDown} className="h-3 w-3 text-red-500 dark:text-red-400" />;
  if (trend === 'stable') return <FontAwesomeIcon icon={faMinus} className="h-3 w-3 text-slate-500 dark:text-slate-400" />;
  return <FontAwesomeIcon icon={faEllipsisH} className="h-3 w-3 text-slate-400 dark:text-slate-500" />;
};

// Helper function for trend color
const getTrendColor = (trend: IMetricCardItem['trend']) => {
  if (trend === 'up') return 'text-emerald-500 dark:text-emerald-400';
  if (trend === 'down') return 'text-red-500 dark:text-red-400';
  if (trend === 'stable') return 'text-slate-500 dark:text-slate-400';
  return 'text-slate-400 dark:text-slate-500';
};

// Helper function to get metric type and benchmarks - enhanced for confidence building
const getMetricAnalysis = (metricItem: IMetricCardItem) => {
  const numericValue = metricItem?.value ? parseFloat(metricItem.value.toString().replace(/[^0-9.-]/g, '')) : 0;
  const description = metricItem?.description?.toLowerCase() || '';
  const title = metricItem?.title?.toLowerCase() || '';
  
  // Determine metric type and provide analysis
  if (description.includes('savings') || title.includes('savings')) {
    return {
      type: 'Savings Rate',
      benchmark: '15-20%',
      status: numericValue >= 15 ? (numericValue <= 20 ? 'optimal' : 'excellent') : numericValue >= 5 ? 'building' : 'starting',
      guidance: numericValue >= 15 && numericValue <= 20 
        ? 'Your savings rate is in the optimal range for wealth building.'
        : numericValue > 20 
        ? 'Excellent savings rate! You\'re building wealth aggressively.'
        : numericValue >= 5
        ? `Great start! You're saving ${numericValue}%. Try increasing by just 1% each month to reach 15-20%.`
        : numericValue > 0
        ? `Every dollar saved is progress! You're building the habit. Next goal: reach 5% savings rate.`
        : 'Starting your savings journey is the hardest step - you\'ve got this! Even $1 a day makes a difference.',
      icon: faChartLine,
    };
  }
  
  if (description.includes('debt') || title.includes('debt')) {
    return {
      type: 'Debt Ratio',
      benchmark: '< 36%',
      status: numericValue <= 36 ? 'good' : numericValue <= 50 ? 'manageable' : 'focus-area',
      guidance: numericValue <= 36 
        ? 'Your debt-to-income ratio is within healthy limits.'
        : numericValue <= 50
        ? `Your debt ratio is manageable at ${numericValue}%. Focus on small wins - pay an extra $25/month on highest interest debt.`
        : `You're working with a ${numericValue}% debt ratio. Every payment brings you closer to freedom. Consider the debt snowball method.`,
      icon: faInfoCircle, // Changed from warning to info icon
    };
  }
  
  if (description.includes('emergency') || title.includes('emergency')) {
    return {
      type: 'Emergency Fund',
      benchmark: '3-6 months',
      status: numericValue >= 3 ? (numericValue >= 6 ? 'excellent' : 'good') : numericValue >= 1 ? 'building' : 'starting',
      guidance: numericValue >= 6 
        ? 'Excellent emergency fund coverage! You\'re financially resilient.'
        : numericValue >= 3 
        ? 'Solid emergency fund! You\'re building financial security. Consider expanding to 6 months.'
        : numericValue >= 1
        ? `You have ${numericValue} month(s) covered - great foundation! Add $50/month to reach 3 months.`
        : numericValue > 0
        ? 'You\'ve started your emergency fund - that\'s the hardest part! Keep building momentum.'
        : 'Start with just $100 as your emergency fund foundation. You can do this!',
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

// Helper function to get status color and icon - more encouraging approach
const getStatusIndicator = (status: string) => {
  switch (status) {
    case 'excellent':
      return { color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', icon: faCheckCircle };
    case 'optimal':
    case 'good':
      return { color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20', icon: faCheckCircle };
    case 'building':
    case 'manageable':
      return { color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20', icon: faChartLine };
    case 'starting':
    case 'focus-area':
      return { color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20', icon: faInfoCircle };
    case 'needs-improvement':
    case 'needs-attention':
      return { color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/20', icon: faInfoCircle };
    default:
      return { color: 'text-slate-600 dark:text-slate-400', bgColor: 'bg-slate-50 dark:bg-slate-800', icon: faInfoCircle };
  }
};

// Progress bar component for visual representation - encouraging design
const ProgressBar = ({ value, max, status }: { value: number; max: number; status: string }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const statusColors = {
    'excellent': 'bg-emerald-500 dark:bg-emerald-400',
    'optimal': 'bg-blue-500 dark:bg-blue-400',
    'good': 'bg-blue-500 dark:bg-blue-400',
    'building': 'bg-purple-500 dark:bg-purple-400',
    'manageable': 'bg-purple-500 dark:bg-purple-400',
    'starting': 'bg-amber-500 dark:bg-amber-400',
    'focus-area': 'bg-amber-500 dark:bg-amber-400',
    'needs-improvement': 'bg-orange-400 dark:bg-orange-300',
    'needs-attention': 'bg-orange-400 dark:bg-orange-300',
    'neutral': 'bg-slate-500 dark:bg-slate-400',
  };
  
  const barColor = statusColors[status as keyof typeof statusColors] || 'bg-slate-500';
  
  // Show growth mindset messaging
  const progressText = percentage < 25 ? '🌱 Growing' : percentage < 50 ? '📈 Building' : percentage < 75 ? '🎯 Progressing' : '🏆 Excelling';
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-mobile-xs sm:text-xs text-slate-500 dark:text-slate-400 mb-1">
        <span>{progressText}: {value}%</span>
        <span>Target: {max}%</span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
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
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
        {/* Status Badge */}
        <div className="mb-3 sm:mb-4">
          <div className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-mobile-sm sm:text-sm font-medium ${statusIndicator.bgColor} ${statusIndicator.color}`}>
            <span className="capitalize">{analysis.status.replace('-', ' ')}</span>
          </div>
        </div>

        {/* Main Value Display */}
        <div className="mb-4 sm:mb-6">
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {metricItem?.value}
          </div>
          {savingAmount > 0 && (
            <div className="text-mobile-sm sm:text-sm text-emerald-600 dark:text-emerald-400 mb-2">
              💚 Saving ${savingAmount} per month
            </div>
          )}
        </div>

        {/* Progress Bar (for percentage-based metrics) */}
        {numericValue > 0 && metricItem?.value?.toString().includes('%') && (
          <div className="mb-3 sm:mb-4">
            <ProgressBar
              value={numericValue}
              max={analysis.type === 'Savings Rate' ? 20 : analysis.type === 'Debt Ratio' ? 36 : 100}
              status={analysis.status}
            />
          </div>
        )}

        {/* Description Section */}
        <div className="mt-auto">
          <p className="text-mobile-sm sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {analysis.guidance}
          </p>
        </div>
      </div>
    </Widget>
  );
}