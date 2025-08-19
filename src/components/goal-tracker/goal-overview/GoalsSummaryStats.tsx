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
import type { GoalMetrics } from "@/components/goal-tracker/types/goal-types";

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
    <div className="grid grid-cols-2 gap-4">
      {stats.map((stat, index) => {
        const trendIcon = getTrendIcon(stat.trend);
        const trendColor = getTrendColor(stat.trend);
        
        return (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: index * 0.05,
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1]
            }}
            className="group relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-5 border border-gray-200/30 dark:border-gray-700/30 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50"
          >
            {/* Background Gradient Accent */}
            <div className={`absolute inset-0 bg-gradient-to-r ${
              stat.id === 'total' ? 'from-blue-500/5 to-indigo-500/5' :
              stat.id === 'active' ? 'from-green-500/5 to-emerald-500/5' :
              stat.id === 'completed' ? 'from-purple-500/5 to-violet-500/5' :
              'from-orange-500/5 to-amber-500/5'
            } rounded-2xl `}></div>
            
            <div className="relative">
              {/* Header with Icon and Trend */}
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 ${stat.bgColor} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                  <FontAwesomeIcon icon={stat.icon} className={`w-4 h-4 ${stat.color}`} />
                </div>
                
                {trendIcon && (
                  <div className="flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <FontAwesomeIcon 
                      icon={trendIcon} 
                      className={`w-3 h-3 ${trendColor}`} 
                    />
                  </div>
                )}
              </div>
              
              {/* Value and Label */}
              <div>
                <p className="text-xl font-semibold text-gray-900 dark:text-white mb-1 tracking-tight">
                  {stat.value}
                </p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {stat.label}
                </p>
              </div>
              
              {/* Progress Bar for Progress Card */}
              {stat.id === 'progress' && metrics.activeGoals > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {metrics.goalsOnTrack} of {metrics.activeGoals} on track
                    </p>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {Math.round((metrics.goalsOnTrack / metrics.activeGoals) * 100)}%
                    </p>
                  </div>
                  <div className="w-full bg-gray-200/60 dark:bg-gray-600/60 rounded-full h-1.5">
                    <motion.div 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 rounded-full shadow-sm"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${(metrics.goalsOnTrack / metrics.activeGoals) * 100}%` 
                      }}
                      transition={{ duration: 1.2, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function GoalsSummaryStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-5 border border-gray-200/30 dark:border-gray-700/30 animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </div>
        </div>
      ))}
    </div>
  );
}