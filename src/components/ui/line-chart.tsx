import { Chart as ChartJS, ArcElement, LineElement, BarElement, PointElement, LinearScale, CategoryScale, RadialLinearScale, LogarithmicScale, TimeScale, TimeSeriesScale, Decimation, Filler, Legend, Title, Tooltip, SubTitle } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  RadialLinearScale,
  LogarithmicScale,
  TimeScale,
  TimeSeriesScale,
  Decimation,
  Filler,
  Legend,
  Title,
  Tooltip,
  SubTitle
);

export interface LineChartDataset {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  fill?: boolean;
}

export interface LineChartProps {
  labels: string[];
  datasets: LineChartDataset[];
  title?: string;
}

export function LineChart({ labels, datasets, title }: LineChartProps) {
  const chartData = {
    labels,
    datasets: datasets.map((ds) => ({
      ...ds,
      tension: 0.3,
      pointRadius: 2,
      pointHoverRadius: 5,
    })),
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
        position: 'bottom' as const,
        labels: {
          color: foregroundColor,
          font: { size: 14, family: 'inherit' },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: $${value.toLocaleString()}`;
          },
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
    scales: {
      x: {
        ticks: { 
          color: mutedColor, 
          font: { size: 12 } 
        },
        grid: { 
          color: gridColor 
        },
      },
      y: {
        ticks: {
          color: mutedColor,
          font: { size: 12 },
          callback: (v: number | string) => `$${Number(v) / 1000}k`,
        },
        grid: { 
          color: gridColor 
        },
      },
    },
  };

  return (
    <div className="w-full flex flex-col items-center" aria-label={title || 'Line chart'} role="img">
      <span className="sr-only">
        {title ? `${title}. ` : ''}
        This chart shows trends over time: {datasets.map((ds) => `${ds.label}`).join(', ')}.
      </span>
      <div className="w-full max-w-2xl">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
