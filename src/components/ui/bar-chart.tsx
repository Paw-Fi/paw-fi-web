import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export interface BarChartDataset {
  label: string;
  data: number[];
  backgroundColor: string;
  stack?: string;
}

export interface BarChartProps {
  labels: string[];
  datasets: BarChartDataset[];
  title?: string;
  stacked?: boolean;
}

export function BarChart({ labels, datasets, title, stacked = true }: BarChartProps) {
  const data = {
    labels,
    datasets,
  };

  // Get CSS custom properties for consistent colors
  const isDark = document.documentElement.classList.contains('dark');
  const foregroundColor = getComputedStyle(document.documentElement).getPropertyValue('--tw-color-foreground')?.trim() || 
                          getComputedStyle(document.documentElement).getPropertyValue('--foreground')?.trim() ||
                          (isDark ? '#F1F5F9' : '#1F2937');
  const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--tw-color-muted-foreground')?.trim() ||
                     (isDark ? '#9CA3AF' : '#6B7280');
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--tw-color-subtle-border')?.trim() ||
                    (isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.5)');

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: foregroundColor,
          font: { size: 14, family: 'inherit' },
        },
      },
      title: title
        ? {
            display: true,
            text: title,
            color: foregroundColor,
            font: { size: 16, fontWeight: 'bold' as const, family: 'inherit' },
          }
        : undefined,
    },
    scales: stacked
      ? {
          x: { 
            stacked: true, 
            grid: { color: gridColor },
            ticks: { color: mutedColor, font: { size: 12 } }
          },
          y: { 
            stacked: true, 
            grid: { color: gridColor },
            ticks: { color: mutedColor, font: { size: 12 } }
          },
        }
      : {
          x: { 
            grid: { color: gridColor },
            ticks: { color: mutedColor, font: { size: 12 } }
          },
          y: { 
            grid: { color: gridColor },
            ticks: { color: mutedColor, font: { size: 12 } }
          },
        },
  };

  return (
    <div className="w-full flex flex-col items-center" aria-label={title || 'Bar chart'} role="img">
      <span className="sr-only">
        {title ? `${title}. ` : ''}
        This chart shows: {datasets.map((ds) => `${ds.label}`).join(', ')}.
      </span>
      <div className="w-full max-w-2xl">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
