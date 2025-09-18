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
  // Get CSS custom properties for consistent colors
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const getChartColor = (colorName: string) => {
    if (typeof document === 'undefined') return '';
    const customProp = isDark ? `--tw-color-dark-chart-${colorName}` : `--tw-color-chart-${colorName}`;
    return getComputedStyle(document.documentElement).getPropertyValue(customProp)?.trim() ||
           getComputedStyle(document.documentElement).getPropertyValue(`--tw-color-${isDark ? 'dark-' : ''}${colorName}`)?.trim();
  };

  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: [
          getChartColor('primary') || (isDark ? '#8B70FF' : '#7458FF'),
          getChartColor('success') || (isDark ? '#1FE3B8' : '#16CDA2'),
          getChartColor('warning') || (isDark ? '#FFD04A' : '#FFC219'),
          getChartColor('danger') || (isDark ? '#FF7A7A' : '#FF6060'),
          getChartColor('accent-indigo') || (isDark ? '#818CF8' : '#6366F1'),
          getChartColor('accent-pink') || (isDark ? '#F472B6' : '#EC4899')
        ].slice(0, data.length), // Only use as many colors as we have data points
        borderWidth: 0,
      },
    ],
  };

  // Get consistent text colors
  const foregroundColor = typeof document !== 'undefined' 
    ? (getComputedStyle(document.documentElement).getPropertyValue('--tw-color-foreground')?.trim() || 
       getComputedStyle(document.documentElement).getPropertyValue('--foreground')?.trim() ||
       (isDark ? '#F1F5F9' : '#1F2937'))
    : (isDark ? '#F1F5F9' : '#1F2937');

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
            color: foregroundColor,
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
