import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faBullseye, 
  faChartLine, 
  faTrophy, 
  faCalendarCheck,
  faArrowUp,
  faArrowDown,
  faMinus
} from "@fortawesome/free-solid-svg-icons";
import type { GoalMetrics } from "@/components/goal-tracker/types";

interface GoalsSummaryStatsProps {
  metrics?: GoalMetrics;
}

export function GoalsSummaryStats({ metrics }: GoalsSummaryStatsProps) {
  if (!metrics) {
    return <GoalsSummaryStatsSkeleton />;
  }

  const stats = [
    {
      id: 'total',
      label: 'Total Goals',
      value: metrics.totalGoals,
      icon: faBullseye,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      trend: null,
    },
    {
      id: 'active',
      label: 'Active Goals',
      value: metrics.activeGoals,
      icon: faChartLine,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      trend: null,
    },
    {
      id: 'completed',
      label: 'Completed Goals',
      value: metrics.completedGoals,
      icon: faTrophy,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      trend: null,
    },
    {
      id: 'progress',
      label: 'Overall Progress',
      value: `${metrics.overallProgress.toFixed(1)}%`,
      icon: faCalendarCheck,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      trend: metrics.overallProgress > 50 ? 'up' : metrics.overallProgress < 25 ? 'down' : 'stable',
    },
  ];

  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case 'up':
        return faArrowUp;
      case 'down':
        return faArrowDown;
      case 'stable':
        return faMinus;
      default:
        return null;
    }
  };

  const getTrendColor = (trend: string | null) => {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      case 'stable':
        return 'text-yellow-500';
      default:
        return '';
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const trendIcon = getTrendIcon(stat.trend);
        const trendColor = getTrendColor(stat.trend);
        
        return (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <FontAwesomeIcon icon={stat.icon} className={`w-5 h-5 ${stat.color}`} />
              </div>
              
              {trendIcon && (
                <div className="flex items-center space-x-1">
                  <FontAwesomeIcon 
                    icon={trendIcon} 
                    className={`w-3 h-3 ${trendColor}`} 
                  />
                </div>
              )}
            </div>
            
            <div>
              <p className="text-2xl font-bold text-foreground dark:text-dark-foreground mb-1">
                {stat.value}
              </p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {stat.label}
              </p>
            </div>
            
            {/* Additional context for progress */}
            {stat.id === 'progress' && metrics.activeGoals > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {metrics.goalsOnTrack} of {metrics.activeGoals} goals on track
                </p>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1 mt-1">
                  <motion.div 
                    className="bg-green-500 h-1 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${(metrics.goalsOnTrack / metrics.activeGoals) * 100}%` 
                    }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function GoalsSummaryStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-1"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
        </div>
      ))}
    </div>
  );
}