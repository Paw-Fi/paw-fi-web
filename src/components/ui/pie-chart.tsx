import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale
);

export interface PieChartProps {
  labels: string[];
  data: number[];
  title?: string;
}

interface TooltipItem {
  label: string;
  formattedValue: string;
}

export function PieChart({ labels, data, title }: PieChartProps) {
  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#374151',
          font: { size: 14, family: 'inherit' },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem) => {
            const label = context.label || '';
            const value = context.formattedValue;
            return `${label}: ${value}`;
          },
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
  };

  return (
    <div className="w-full flex flex-col items-center" aria-label={title || 'Pie chart'} role="img">
      <span className="sr-only">
        {title ? `${title}. ` : ''}This chart shows the distribution of: {labels.join(', ')}.
      </span>
      <div className="w-full max-w-sm">
        <Pie data={chartData} options={options} />
      </div>
    </div>
  );
}
