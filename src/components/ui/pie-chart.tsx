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
        backgroundColor: document.documentElement.classList.contains('dark') ? [
          '#8B70FF', // dark-primary
          '#16CDA2', // dark-success
          '#FFCD29', // dark-warning
          '#FF6B6B', // dark-danger
          '#1DD1F3', // dark-info
          '#9333EA', // dark-accent-purple
        ] : [
          '#7458FF', // primary
          '#10B981', // success
          '#F59E0B', // warning
          '#EF4444', // danger
          '#06B6D4', // info
          '#8B5CF6', // accent-purple
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
          color: getComputedStyle(document.documentElement).getPropertyValue('--foreground') || (document.documentElement.classList.contains('dark') ? '#F1F5F9' : '#1F2937'),
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
            color: getComputedStyle(document.documentElement).getPropertyValue('--foreground') || (document.documentElement.classList.contains('dark') ? '#F1F5F9' : '#1F2937'),
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
