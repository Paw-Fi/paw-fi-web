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
  ChartOptions
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { IBarChartWidget, ILineChartWidget, IQuickCashFlowSummaryWidget } from '../types/dashboard-data.typings';
import { Widget } from './Widget';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
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
  const { data, title } = widget;
  
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: title,
        data: data.values,
        backgroundColor: [
          'rgba(99, 102, 241, 0.6)',
          'rgba(79, 70, 229, 0.6)',
          'rgba(67, 56, 202, 0.6)',
          'rgba(55, 48, 163, 0.6)',
          'rgba(49, 46, 129, 0.6)',
        ],
        borderColor: [
          'rgba(99, 102, 241, 1)',
          'rgba(79, 70, 229, 1)',
          'rgba(67, 56, 202, 1)',
          'rgba(55, 48, 163, 1)',
          'rgba(49, 46, 129, 1)',
        ],
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = getChartOptions(title);

  return (
    <Widget widget={widget}>
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
  const { data, title } = widget;
  
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: title,
        data: data.values,
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

  const chartOptions = getChartOptions(title);

  return (
    <Widget widget={widget}>
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

// Cash Flow Summary Widget
export function CashFlowWidget({ widget }: { widget: IQuickCashFlowSummaryWidget }) {
  const { data, title } = widget;
  
  const chartData = {
    labels: ['Income', 'Expenses'],
    datasets: [
      {
        label: 'Amount ($)',
        data: [data.income, data.expenses],
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

  const savings = data.income - data.expenses;
  const savingsRate = ((savings / data.income) * 100).toFixed(1);

  const chartOptions = getChartOptions(title);

  return (
    <Widget widget={widget}>
      <div className="flex flex-col h-full">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">Income</div>
            <div className="text-xl font-semibold text-green-600">${data.income}</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">Expenses</div>
            <div className="text-xl font-semibold text-red-600">${data.expenses}</div>
          </div>
        </div>
        
        <div className="flex-grow">
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
