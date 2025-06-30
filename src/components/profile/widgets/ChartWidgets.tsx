'use client';

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
const getChartOptions = (title: string): ChartOptions<'bar' | 'line'> => ({
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
        color: '#6B7280',
      },
    },
    title: {
      display: false,
      text: title,
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      titleColor: '#1F2937',
      bodyColor: '#4B5563',
      borderColor: 'rgba(209, 213, 219, 0.5)',
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
        color: '#9CA3AF',
        font: {
          size: 11,
        },
      },
    },
    y: {
      grid: {
        color: 'rgba(209, 213, 219, 0.2)',
      },
      border: {
        display: false
      },
      ticks: {
        color: '#9CA3AF',
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
  const { data: chartDataDefinition, title, icon } = widget;

  if (!chartDataDefinition || !chartDataDefinition.dataPoints || chartDataDefinition.dataPoints.length === 0) {
    return (
      <Widget widget={widget}>
        <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
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

  const chartOptions = getChartOptions(title);

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="h-full w-full flex items-center justify-center">
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
  const { data: chartDataDefinition, title } = widget;

  if (!chartDataDefinition || !chartDataDefinition.dataPoints || chartDataDefinition.dataPoints.length === 0) {
    return (
      <Widget widget={widget}>
        <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
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

  const chartOptions = getChartOptions(chartDataDefinition.xAxisLabel || title);

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="h-full w-full flex items-center justify-center">
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
  const { data: chartDataDefinition, title } = widget;

  if (!chartDataDefinition || !chartDataDefinition.dataPoints || chartDataDefinition.dataPoints.length === 0) {
    return (
      <Widget widget={widget}>
        <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
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
  const getPieChartOptions = (title: string) => ({
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
          color: '#6B7280',
        },
      },
      title: {
        display: false,
        text: title,
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        titleColor: '#1F2937',
        bodyColor: '#4B5563',
        borderColor: 'rgba(209, 213, 219, 0.5)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        boxPadding: 4,
        usePointStyle: true,
      },
    },
  });
  
  const chartOptions = getPieChartOptions(title);

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="h-full w-full flex items-center justify-center">
        <div className="w-full max-w-sm">
          <Pie 
            data={chartData} 
            options={chartOptions} 
          />
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
        <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
          Cash flow data is incomplete.
        </div>
      </Widget>
    );
  }

  const totalIncome = cashFlowData.inflows.reduce((sum, item) => sum + item.value, 0);
  const totalExpenses = cashFlowData.outflows.reduce((sum, item) => sum + item.value, 0);

  const chartData = {
    labels: ['Income', 'Expenses'],
    datasets: [
      {
        label: cashFlowData.projectedPeriod ? `${cashFlowData.projectedPeriod} Amount ($)` : 'Amount ($)',
        data: [totalIncome, totalExpenses],
        backgroundColor: [
          'rgba(16, 185, 129, 0.6)', // Green for income
          'rgba(239, 68, 68, 0.6)',  // Red for expenses
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const savings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(1) : '0.0';

  const chartOptions = getChartOptions(title + (cashFlowData.projectedPeriod ? ` (${cashFlowData.projectedPeriod})` : ''));

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="flex flex-col h-full p-1"> {/* Adjusted padding slightly */} 
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-green-50 dark:bg-green-500/10 p-3 rounded-lg shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Income</div>
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">${totalIncome.toLocaleString()}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-500/10 p-3 rounded-lg shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Expenses</div>
            <div className="text-lg font-semibold text-red-600 dark:text-red-400">${totalExpenses.toLocaleString()}</div>
          </div>
        </div>
        
        <div className="flex-grow h-40"> {/* Added fixed height for chart area */} 
          <Bar 
            data={chartData} 
            options={{
              ...chartOptions,
              maintainAspectRatio: false,
              responsive: true
            }} 
          />
        </div>
      </div>
    </Widget>
  );
}
