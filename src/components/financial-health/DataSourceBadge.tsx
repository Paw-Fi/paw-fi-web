'use client';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPenToSquare,
  faCloud,
  faFileArrowUp,
  faRobot,
  faCircleCheck,
  faCircleXmark,
  faClock,
} from '@fortawesome/free-solid-svg-icons';

export type DataSourceType = 'manual' | 'bank_sync' | 'csv_import' | 'api' | 'calculated';

export interface DataSourceBadgeProps {
  source: DataSourceType;
  lastUpdated: Date | string;
  label?: string;
  className?: string;
  connectionStatus?: 'connected' | 'disconnected' | 'pending';
}

function getSourceConfig(source: DataSourceType): {
  icon: any;
  label: string;
  color: string;
  description: string;
} {
  switch (source) {
    case 'manual':
      return {
        icon: faPenToSquare,
        label: 'Manual Entry',
        color: 'bg-sky-50/50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        description: 'Data entered manually by you',
      };
    case 'bank_sync':
      return {
        icon: faCloud,
        label: 'Bank Sync',
        color: 'bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        description: 'Automatically synced from your financial institution',
      };
    case 'csv_import':
      return {
        icon: faFileArrowUp,
        label: 'CSV Import',
        color: 'bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        description: 'Imported from a CSV file',
      };
    case 'api':
      return {
        icon: faRobot,
        label: 'API',
        color: 'bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        description: 'Retrieved via API connection',
      };
    case 'calculated':
      return {
        icon: faRobot,
        label: 'Calculated',
        color: 'bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        description: 'Automatically calculated from your financial data',
      };
    default:
      return {
        icon: faPenToSquare,
        label: 'Unknown',
        color: 'bg-gray-50/50 dark:bg-gray-950/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800',
        description: 'Data source unknown',
      };
  }
}

function getConnectionStatusIcon(status?: 'connected' | 'disconnected' | 'pending') {
  if (!status) return null;

  switch (status) {
    case 'connected':
      return <FontAwesomeIcon icon={faCircleCheck} className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />;
    case 'disconnected':
      return <FontAwesomeIcon icon={faCircleXmark} className="h-3 w-3 text-red-600 dark:text-red-400" />;
    case 'pending':
      return <div className="h-3 w-3 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />;
    default:
      return null;
  }
}

function formatLastUpdated(lastUpdated: Date | string): string {
  const date = typeof lastUpdated === 'string' ? new Date(lastUpdated) : lastUpdated;

  // Check if date is invalid
  if (isNaN(date.getTime())) {
    return 'Unknown';
  }

  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} min ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

export function DataSourceBadge({
  source,
  lastUpdated,
  label,
  className = '',
  connectionStatus,
}: DataSourceBadgeProps) {
  const config = getSourceConfig(source);
  const formattedTime = formatLastUpdated(lastUpdated);
  const statusIcon = getConnectionStatusIcon(connectionStatus);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`inline-flex items-center gap-1.5 ${config.color} ${className} cursor-help transition-all duration-200 hover:shadow-sm`}
          >
            <FontAwesomeIcon icon={config.icon} className="h-3 w-3" />
            <span className="text-xs">{label || config.label}</span>
            {statusIcon && <span className="ml-0.5">{statusIcon}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1.5">
            <p className="font-medium text-xs">{config.description}</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground-color">
              <FontAwesomeIcon icon={faClock} className="h-3 w-3" />
              <span>Last updated: {formattedTime}</span>
            </div>
            {connectionStatus && (
              <p className="text-xs text-muted-foreground-color">
                Status: {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
