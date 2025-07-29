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

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#374151',
          font: { size: 14, family: 'inherit' },
        },
      },
      title: title
        ? {
            display: true,
            text: title,
            color: '#111827',
            font: { size: 16, fontWeight: 'bold' as const, family: 'inherit' },
          }
        : undefined,
    },
    scales: stacked
      ? {
          x: { stacked: true, grid: { color: '#E5E7EB' } },
          y: { stacked: true, grid: { color: '#E5E7EB' } },
        }
      : {
          x: { grid: { color: '#E5E7EB' } },
          y: { grid: { color: '#E5E7EB' } },
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
