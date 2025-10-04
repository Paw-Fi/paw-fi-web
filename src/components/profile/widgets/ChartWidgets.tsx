'use client';

import React, { useRef, useEffect } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement,
  PointElement,
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  ChartOptions
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { IBarChartWidget, ILineChartWidget, IPieChartWidget, IQuickCashFlowSummaryWidget } from '../types/dashboard-data.typings';
import { Widget } from './Widget';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Common chart options with glassmorphism styling
const getChartOptions = (title: string, isDark?: boolean): ChartOptions<'bar' | 'line'> => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        boxWidth: 12,
        usePointStyle: true,
        pointStyle: 'circle',
        font: {
          size: 12,
        },
        color: isDark ? '#9CA3AF' : '#6B7280',
      },
    },
    title: {
      display: false,
      text: title,
    },
    tooltip: {
      backgroundColor: isDark ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.8)',
      titleColor: isDark ? '#F9FAFB' : '#1F2937',
      bodyColor: isDark ? '#D1D5DB' : '#4B5563',
      borderColor: isDark ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      boxPadding: 4,
      usePointStyle: true,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      border: {
        display: false
      },
      ticks: {
        color: isDark ? '#9CA3AF' : '#6B7280',
        font: {
          size: 11,
        },
      },
    },
    y: {
      grid: {
        color: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.2)',
      },
      border: {
        display: false
      },
      ticks: {
        color: isDark ? '#9CA3AF' : '#6B7280',
        font: {
          size: 11,
        },
        padding: 8,
      },
      beginAtZero: true,
    },
  },
});

// Bar Chart Widget
export function BarChartWidget({ widget }: { widget: IBarChartWidget }) {
  const { data: chartDataDefinition } = widget;
  const { title = 'Bar Chart' } = chartDataDefinition || {};

  if (!chartDataDefinition || !chartDataDefinition.dataPoints || chartDataDefinition.dataPoints.length === 0) {
    return (
      <Widget widget={widget}>
        <div className="p-4 sm:p-6 text-mobile-sm sm:text-sm text-muted-foreground-color">
          No data available for this chart.
        </div>
      </Widget>
    );
  }

  const labels = chartDataDefinition.dataPoints.map(dp => dp.label);
  const values = chartDataDefinition.dataPoints.map(dp => dp.value);
  
  // Use specific colors from dataPoints if available, otherwise use a default palette
  const backgroundColors = chartDataDefinition.dataPoints.map(dp => dp.color || 'rgba(99, 102, 241, 0.6)');
  const borderColors = chartDataDefinition.dataPoints.map(dp => dp.color ? dp.color.replace('0.6', '1') : 'rgba(99, 102, 241, 1)');
  // A more robust color generation/cycling mechanism might be needed if dp.color is often undefined
  const defaultBackgroundColors = [
    'rgba(99, 102, 241, 0.6)', // Indigo
    'rgba(59, 130, 246, 0.6)', // Blue
    'rgba(16, 185, 129, 0.6)', // Emerald
    'rgba(239, 68, 68, 0.6)',  // Red
    'rgba(245, 158, 11, 0.6)', // Amber
    'rgba(139, 92, 246, 0.6)', // Violet
  ];
  const defaultBorderColors = defaultBackgroundColors.map(color => color.replace('0.6', '1'));

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: chartDataDefinition.yAxisLabel || title, // Use yAxisLabel from data if available
        data: values,
        backgroundColor: chartDataDefinition.dataPoints.every(dp => dp.color) ? backgroundColors : defaultBackgroundColors.slice(0, values.length),
        borderColor: chartDataDefinition.dataPoints.every(dp => dp.color) ? borderColors : defaultBorderColors.slice(0, values.length),
        borderWidth: 1,
        borderRadius: 6,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      },
    ],
  };

  const chartOptions = getChartOptions(title, document.documentElement.classList.contains('dark'));
  const { height, showLegend } = chartDataDefinition || {};
  
  // Modify options based on data properties
  if (showLegend === false) {
    chartOptions.plugins = {
      ...chartOptions.plugins,
      legend: {
        ...chartOptions.plugins?.legend,
        display: false
      }
    };
  }

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div 
        className="h-full w-full flex items-center justify-center"
        style={height ? { height: `${height}px` } : undefined}
      >
        <Bar 
          data={chartData} 
          options={{
            ...chartOptions,
            maintainAspectRatio: false,
            responsive: true
          }} 
        />
      </div>
    </Widget>
  );
}

// Line Chart Widget
export function LineChartWidget({ widget }: { widget: ILineChartWidget }) {
  const { data: chartDataDefinition } = widget;
  const { title = 'Line Chart' } = chartDataDefinition || {};

  if (!chartDataDefinition || !chartDataDefinition.dataPoints || chartDataDefinition.dataPoints.length === 0) {
    return (
      <Widget widget={widget}>
        <div className="p-4 sm:p-6 text-mobile-sm sm:text-sm text-muted-foreground-color">
          No data available for this chart.
        </div>
      </Widget>
    );
  }

  const labels = chartDataDefinition.dataPoints.map(dp => dp.label);
  const values = chartDataDefinition.dataPoints.map(dp => dp.value);

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: chartDataDefinition.yAxisLabel || title,
        data: values,
        borderColor: 'rgba(79, 70, 229, 1)',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(79, 70, 229, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const chartOptions = getChartOptions(chartDataDefinition.xAxisLabel || title, document.documentElement.classList.contains('dark'));
  const { height, showLegend, showDataPoints } = chartDataDefinition || {};
  
  // Modify options based on data properties
  if (showLegend === false) {
    chartOptions.plugins = {
      ...chartOptions.plugins,
      legend: {
        ...chartOptions.plugins?.legend,
        display: false
      }
    };
  }
  
  // Modify point radius based on showDataPoints
  if (showDataPoints === false) {
    chartData.datasets = chartData.datasets.map(dataset => ({
      ...dataset,
      pointRadius: 0,
      pointHoverRadius: 3
    }));
  }

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div 
        className="h-full w-full flex items-center justify-center"
        style={height ? { height: `${height}px` } : undefined}
      >
        <Line 
          data={chartData} 
          options={{
            ...chartOptions,
            maintainAspectRatio: false,
            responsive: true
          }} 
        />
      </div>
    </Widget>
  );
}

// Pie Chart Widget
export function PieChartWidget({ widget }: { widget: IPieChartWidget }) {
  const { data: chartDataDefinition } = widget;
  const { title = 'Pie Chart', showLegend } = chartDataDefinition || {};

  if (!chartDataDefinition || !chartDataDefinition.dataPoints || chartDataDefinition.dataPoints.length === 0) {
    return (
      <Widget widget={widget}>
        <div className="p-4 sm:p-6 text-mobile-sm sm:text-sm text-muted-foreground-color">
          No data available for this chart.
        </div>
      </Widget>
    );
  }
  
  // Extract the allocation percentages for the explanation text
  const stocksData = chartDataDefinition.dataPoints.find(dp => dp.label === 'Stocks');
  const bondsData = chartDataDefinition.dataPoints.find(dp => dp.label === 'Bonds');
  
  const stocksPercentage = stocksData ? stocksData.value : 0;
  const bondsPercentage = bondsData ? bondsData.value : 0;

  const labels = chartDataDefinition.dataPoints.map(dp => dp.label);
  const values = chartDataDefinition.dataPoints.map(dp => dp.value);
  
  // Use specific colors from dataPoints if available, otherwise use a default palette
  const backgroundColors = chartDataDefinition.dataPoints.map(dp => dp.color || 'rgba(99, 102, 241, 0.6)');
  const borderColors = chartDataDefinition.dataPoints.map(dp => dp.color ? dp.color.replace('0.6', '1') : 'rgba(99, 102, 241, 1)');
  // Default colors if not specified
  const defaultBackgroundColors = [
    'rgba(255, 99, 132, 0.8)',
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(75, 192, 192, 0.8)',
    'rgba(153, 102, 255, 0.8)',
    'rgba(255, 159, 64, 0.8)',
  ];
  const defaultBorderColors = defaultBackgroundColors.map(color => color.replace('0.8', '1'));

  const chartData = {
    labels: labels,
    datasets: [
      {
        data: values,
        backgroundColor: chartDataDefinition.dataPoints.every(dp => dp.color) ? backgroundColors : defaultBackgroundColors.slice(0, values.length),
        borderColor: chartDataDefinition.dataPoints.every(dp => dp.color) ? borderColors : defaultBorderColors.slice(0, values.length),
        borderWidth: 1,
      },
    ],
  };

  // Pie chart specific options
  const getPieChartOptions = (title: string, isDark?: boolean) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 12,
          },
          color: isDark ? '#9CA3AF' : '#6B7280',
        },
      },
      title: {
        display: false,
        text: title,
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.8)',
        titleColor: isDark ? '#F9FAFB' : '#1F2937',
        bodyColor: isDark ? '#D1D5DB' : '#4B5563',
        borderColor: isDark ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        boxPadding: 4,
        usePointStyle: true,
      },
    },
  });
  
  const chartOptions = getPieChartOptions(title, document.documentElement.classList.contains('dark'));
  
  // Modify options based on data properties
  if (showLegend === false) {
    chartOptions.plugins = {
      ...chartOptions.plugins,
      legend: {
        ...chartOptions.plugins?.legend,
        display: false
      }
    };
  }

  return (
    <Widget widget={widget} controls={widget.controls} isBeta>
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
        <div className="flex-grow flex flex-col items-center justify-center">
          <div className="w-full max-w-[200px] mb-6">
            <Pie 
              data={{
                ...chartData,
                datasets: [{
                  ...chartData.datasets[0],
                  backgroundColor: [
                    '#8b5cf6', // Purple for Stocks
                    '#10b981'  // Green for Bonds
                  ],
                  borderColor: [
                    '#8b5cf6',
                    '#10b981'
                  ],
                  borderWidth: 0
                }]
              }} 
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  legend: {
                    position: 'bottom' as const,
                    labels: {
                      boxWidth: 12,
                      usePointStyle: true,
                      pointStyle: 'circle',
                      font: {
                        size: 12,
                        weight: 500
                      },
                      color: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280',
                      padding: 15
                    }
                  }
                }
              }} 
            />
          </div>
          
          {stocksPercentage > 0 && bondsPercentage > 0 && (
            <div className="text-center">
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Based on your risk score and time horizon: <strong>{stocksPercentage}%</strong> stocks / <strong>{bondsPercentage}%</strong> bonds
              </p>
            </div>
          )}
        </div>
      </div>
    </Widget>
  );
}

// Cash Flow Summary Widget
export function CashFlowWidget({ widget }: { widget: IQuickCashFlowSummaryWidget }) {
  const { data: cashFlowData, title } = widget;

  if (!cashFlowData || !cashFlowData.inflows || !cashFlowData.outflows) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="p-4 sm:p-6 text-mobile-sm sm:text-sm text-muted-foreground-color">
          Cash flow data is incomplete.
        </div>
      </Widget>
    );
  }

  const totalIncome = cashFlowData.inflows.reduce((sum, item) => sum + item.value, 0);
  const totalExpenses = cashFlowData.outflows.reduce((sum, item) => sum + item.value, 0);
  const savings = totalIncome - totalExpenses;

  // More encouraging color scheme
  const getSavingsColor = (savings: number) => {
    if (savings >= 0) {
      return {
        background: 'rgba(16, 185, 129, 0.7)', // Green for positive savings
        border: 'rgba(16, 185, 129, 1)',
      };
    } else {
      return {
        background: 'rgba(168, 85, 247, 0.7)', // Purple instead of red for negative
        border: 'rgba(168, 85, 247, 1)',
      };
    }
  };

  const savingsColor = getSavingsColor(savings);

  const chartData = {
    labels: ['Income', 'Savings', 'Expenses'],
    datasets: [
      {
        label: cashFlowData.projectedPeriod ? `${cashFlowData.projectedPeriod} Amount ($)` : 'Amount ($)',
        data: [totalIncome, Math.abs(savings), totalExpenses], // Show absolute value for negative savings
        backgroundColor: [
          'rgba(16, 185, 129, 0.7)', // Green for income
          savingsColor.background,
          'rgba(251, 146, 60, 0.7)',  // Orange instead of red for expenses
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          savingsColor.border,
          'rgba(251, 146, 60, 1)',
        ],
        borderWidth: 1,
        borderRadius: 8,
        barThickness: 40,
      },
    ],
  };

  const isDark = document.documentElement.classList.contains('dark');
  const chartOptions = {
    ...getChartOptions(title + (cashFlowData.projectedPeriod ? ` (${cashFlowData.projectedPeriod})` : ''), isDark),
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: isDark ? 'rgba(75, 85, 99, 0.2)' : 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: isDark ? '#9CA3AF' : '#6B7280',
          callback: (value: any) => `${value}`
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: isDark ? '#9CA3AF' : '#6B7280'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `$${context.raw.toLocaleString()}`;
          }
        }
      }
    }
  };

  // Define a resize observer reference for responsive handling
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);


  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
        <div 
          ref={chartContainerRef}
          className="flex-grow w-full flex items-center justify-center relative" 
          style={{ minHeight: '200px' }}
        > 
          <Bar 
            ref={(ref) => {
              if (ref) {
                chartInstanceRef.current = ref;
              }
            }}
            data={{
              ...chartData,
              datasets: [{
                ...chartData.datasets[0],
                backgroundColor: [
                  '#10b981', // Green for income
                  '#f59e0b', // Orange for savings 
                  '#8b5cf6'  // Purple for expenses
                ],
                borderColor: [
                  '#10b981',
                  '#f59e0b', 
                  '#8b5cf6'
                ],
                borderWidth: 0,
                borderRadius: 8,
                barThickness: 60,
              }]
            }} 
            options={{
              ...chartOptions,
              maintainAspectRatio: false,
              responsive: true,
              plugins: {
                ...chartOptions.plugins,
                legend: {
                  display: false
                }
              },
              scales: {
                ...chartOptions.scales,
                y: {
                  ...chartOptions.scales?.y,
                  display: false,
                  grid: {
                    display: false
                  }
                },
                x: {
                  ...chartOptions.scales?.x,
                  grid: {
                    display: false
                  },
                  ticks: {
                    color: isDark ? '#9CA3AF' : '#6B7280',
                    font: {
                      size: 12,
                      weight: 500
                    }
                  }
                }
              }
            }} 
          />
        </div>
      </div>
    </Widget>
  );
}
