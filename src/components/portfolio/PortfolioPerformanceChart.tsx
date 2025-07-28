import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Chart as ChartJS, 
  CategoryScale,
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  ChartOptions,
  TooltipItem
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChartLine, 
  faArrowUp, 
  faArrowDown, 
  faMinus, 
  faInfoCircle,
  faRefresh,
  faCalendarWeek,
  faCalendar,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PerformanceData {
  id: string;
  date: string;
  portfolio_value: number;
  daily_return: number;
  contributions: number;
  withdrawals: number;
  ai_commentary?: string;
}

interface PerformanceMetrics {
  startValue: number;
  endValue: number;
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  totalContributions: number;
  totalWithdrawals: number;
  investmentGain: number;
  bestDay: {
    date: string;
    return: number;
    value: number;
  };
  worstDay: {
    date: string;
    return: number;
    value: number;
  };
  dataPoints: number;
  period: string;
}

interface PortfolioPerformanceChartProps {
  userId: string;
  goalId: string;
  goalAmount: number;
  targetAmount: number;
  className?: string;
}

type DateRange = 'week' | 'month' | '3months' | '6months' | 'year' | 'all';

const dateRangeOptions: { value: DateRange; label: string; icon: any }[] = [
  { value: 'week', label: '1W', icon: faCalendarWeek },
  { value: 'month', label: '1M', icon: faCalendar },
  { value: '3months', label: '3M', icon: faCalendar },
  { value: '6months', label: '6M', icon: faCalendar },
  { value: 'year', label: '1Y', icon: faCalendar },
  { value: 'all', label: 'All', icon: faCalendar },
];

export function PortfolioPerformanceChart({ 
  userId, 
  goalId, 
  goalAmount, 
  targetAmount,
  className = "" 
}: PortfolioPerformanceChartProps) {
  const [selectedRange, setSelectedRange] = useState<DateRange>('3months');
  const [showMetrics, setShowMetrics] = useState(true);

  // Fetch performance data
  const { data: performanceResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['portfolio-performance', goalId, selectedRange],
    queryFn: async () => {
      const { data, error: functionError } = await supabase.functions.invoke('portfolio-performance-tracker', {
        body: {
          userId,
          goalId,
          action: 'fetch',
          dateRange: selectedRange
        }
      });
      
      if (functionError) {
        throw new Error(functionError.message || 'Failed to fetch performance data');
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Performance data fetch failed');
      }
      
      return data;
    },
    enabled: !!userId && !!goalId,
    retry: 2,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const performanceData: PerformanceData[] = performanceResponse?.data || [];
  const metrics: PerformanceMetrics | null = performanceResponse?.metrics || null;
  const isSimulated = performanceResponse?.isSimulated || false;

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!performanceData.length) return null;

    const labels = performanceData.map(item => {
      const date = new Date(item.date);
      if (selectedRange === 'week') {
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      } else if (selectedRange === 'month') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
    });

    const portfolioValues = performanceData.map(item => item.portfolio_value);
    const contributions = performanceData.map(item => item.contributions || 0);
    
    // Calculate goal progress line
    const goalProgressLine = performanceData.map(() => targetAmount);

    return {
      labels,
      datasets: [
        {
          label: 'Portfolio Value',
          data: portfolioValues,
          borderColor: 'rgb(147, 51, 234)',
          backgroundColor: 'rgba(147, 51, 234, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(147, 51, 234)',
          pointBorderColor: 'white',
          pointBorderWidth: 2,
          pointRadius: selectedRange === 'week' ? 6 : selectedRange === 'month' ? 4 : 3,
          pointHoverRadius: 8,
        },
        {
          label: 'Goal Target',
          data: goalProgressLine,
          borderColor: 'rgba(34, 197, 94, 0.8)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
        },
        ...(contributions.some(c => c > 0) ? [{
          label: 'Contributions',
          data: contributions,
          borderColor: 'rgba(59, 130, 246, 0.8)',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderWidth: 2,
          fill: false,
          pointRadius: 2,
          pointHoverRadius: 4,
          yAxisID: 'y1',
        }] : [])
      ],
    };
  }, [performanceData, targetAmount, selectedRange]);

  // Chart options
  const chartOptions: ChartOptions<'line'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.2)',
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          font: {
            size: 12,
          },
        },
      },
      y: {
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(156, 163, 175, 0.2)',
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          font: {
            size: 12,
          },
          callback: function(value: any) {
            return '$' + Number(value).toLocaleString();
          },
        },
      },
      y1: {
        type: 'linear' as const,
        display: false,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          color: 'rgb(107, 114, 128)',
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(147, 51, 234, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          title: function(context: TooltipItem<'line'>[]) {
            const date = new Date(performanceData[context[0].dataIndex].date);
            return date.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
          },
          afterLabel: function(context: TooltipItem<'line'>) {
            if (context.datasetIndex === 0) {
              const dataPoint = performanceData[context.dataIndex];
              const dailyReturn = dataPoint.daily_return;
              if (dailyReturn !== null && dailyReturn !== 0) {
                const returnText = dailyReturn > 0 ? `+${dailyReturn.toFixed(2)}%` : `${dailyReturn.toFixed(2)}%`;
                return `Daily Return: ${returnText}`;
              }
            }
            return '';
          },
        },
      },
    },
  }), [performanceData]);

  const handleRefresh = () => {
    refetch();
    toast.success('Performance data refreshed!');
  };

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faChartLine} className="w-5 h-5" />
            Performance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <FontAwesomeIcon icon={faInfoCircle} className="w-8 h-8 text-red-400 mb-2" />
              <p className="text-red-600 font-medium">Failed to load performance data</p>
              <p className="text-red-500 text-sm">{error.message}</p>
              <Button 
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                <FontAwesomeIcon icon={faRefresh} className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faChartLine} className="w-5 h-5" />
            Performance History
            {isSimulated && (
              <Badge variant="outline" className="ml-2">
                Demo Data
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              disabled={isLoading}
            >
              <FontAwesomeIcon 
                icon={faRefresh} 
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
              />
            </Button>
          </div>
        </div>
        
        {/* Date Range Selector */}
        <div className="flex items-center gap-2 mt-4">
          {dateRangeOptions.map((option) => (
            <Button
              key={option.value}
              variant={selectedRange === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRange(option.value)}
              className="text-xs px-3 py-1"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <FontAwesomeIcon icon={faSpinner} className="w-8 h-8 text-purple-500 animate-spin mb-2" />
              <p className="text-gray-600">Loading performance data...</p>
            </div>
          </div>
        ) : performanceData.length === 0 ? (
          <div className="h-64 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-200">
            <div className="text-center">
              <FontAwesomeIcon icon={faChartLine} className="w-8 h-8 text-blue-400 mb-2" />
              <p className="text-blue-600 font-medium">Start tracking your progress</p>
              <p className="text-blue-500 text-sm">Make your first contribution to see performance data</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Performance Metrics */}
            <AnimatePresence>
              {showMetrics && metrics && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg"
                >
                  <div className="text-center">
                    <div className={`flex items-center justify-center gap-1 text-sm font-medium ${
                      metrics.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <FontAwesomeIcon 
                        icon={metrics.totalReturn >= 0 ? faArrowUp : faArrowDown} 
                        className="w-3 h-3" 
                      />
                      {Math.abs(metrics.totalReturn).toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-600">Total Return</div>
                  </div>
                  
                  <div className="text-center">
                    <div className={`text-sm font-medium ${
                      metrics.annualizedReturn >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metrics.annualizedReturn.toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-600">Annualized</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm font-medium text-blue-600">
                      ${metrics.investmentGain.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600">Gain/Loss</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm font-medium text-purple-600">
                      {metrics.volatility.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600">Volatility</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chart */}
            {chartData && (
              <div className="h-80">
                <Line data={chartData} options={chartOptions} />
              </div>
            )}

            {/* Best/Worst Day Info */}
            {metrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                    <FontAwesomeIcon icon={faArrowUp} className="w-3 h-3" />
                    Best Day
                  </div>
                  <div className="text-green-600">
                    +{metrics.bestDay.return.toFixed(2)}% on {new Date(metrics.bestDay.date).toLocaleDateString()}
                  </div>
                  <div className="text-green-500 text-xs">
                    Portfolio value: ${metrics.bestDay.value.toLocaleString()}
                  </div>
                </div>
                
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 text-red-700 font-medium mb-1">
                    <FontAwesomeIcon icon={faArrowDown} className="w-3 h-3" />
                    Worst Day
                  </div>
                  <div className="text-red-600">
                    {metrics.worstDay.return.toFixed(2)}% on {new Date(metrics.worstDay.date).toLocaleDateString()}
                  </div>
                  <div className="text-red-500 text-xs">
                    Portfolio value: ${metrics.worstDay.value.toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Toggle Metrics Button */}
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMetrics(!showMetrics)}
                className="text-xs"
              >
                <FontAwesomeIcon icon={faInfoCircle} className="w-3 h-3 mr-2" />
                {showMetrics ? 'Hide' : 'Show'} Details
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}