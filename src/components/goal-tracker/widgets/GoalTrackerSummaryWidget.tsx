import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faBullseye, 
  faChartLine, 
  faTrophy, 
  faCalendarCheck,
  faArrowRight,
  faPlus
} from "@fortawesome/free-solid-svg-icons";
import type { IGoalTrackerSummaryWidget } from "@/components/profile/types/dashboard-data.typings";
import { useAuth } from "@/contexts/auth-context";
import { useGoals } from "@/hooks/goal-tracker/use-goals";

interface GoalTrackerSummaryWidgetProps {
  widget: IGoalTrackerSummaryWidget;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function GoalTrackerSummaryWidget({ 
  widget, 
  onEdit, 
  onDelete 
}: GoalTrackerSummaryWidgetProps) {
  const { user } = useAuth();
  const { goals, metrics, isLoading } = useGoals(user?.id);

  if (isLoading) {
    return <GoalTrackerSummaryWidgetSkeleton />;
  }

  if (!metrics || metrics.totalGoals === 0) {
    return <EmptyGoalTrackerWidget />;
  }

  const stats = [
    {
      id: 'total',
      label: 'Total Goals',
      value: metrics.totalGoals,
      icon: faBullseye,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      id: 'active',
      label: 'Active Goals',
      value: metrics.activeGoals,
      icon: faChartLine,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      id: 'completed',
      label: 'Completed Goals',
      value: metrics.completedGoals,
      icon: faTrophy,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      id: 'progress',
      label: 'Overall Progress',
      value: `${metrics.overallProgress.toFixed(1)}%`,
      icon: faCalendarCheck,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={faBullseye} className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground dark:text-dark-foreground">
            {widget.title}
          </h3>
        </div>
        
        {widget.controls}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50"
          >
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <FontAwesomeIcon icon={stat.icon} className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.label}
                </p>
                <p className="text-lg font-bold text-foreground dark:text-dark-foreground">
                  {stat.value}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Goals On Track
          </span>
          <span className="text-sm font-bold text-foreground dark:text-dark-foreground">
            {metrics.goalsOnTrack} of {metrics.activeGoals}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
          <motion.div 
            className="bg-green-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ 
              width: metrics.activeGoals > 0 
                ? `${(metrics.goalsOnTrack / metrics.activeGoals) * 100}%` 
                : '0%' 
            }}
            transition={{ duration: 1, delay: 0.5 }}
          />
        </div>
      </div>

      {/* Action Button */}
      <motion.button
        onClick={() => window.location.href = '/dashboard/tracker'}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors group"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="text-sm font-medium text-primary">View All Goals</span>
        <FontAwesomeIcon 
          icon={faArrowRight} 
          className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" 
        />
      </motion.button>
    </div>
  );
}

function GoalTrackerSummaryWidgetSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      {/* Header Skeleton */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="space-y-1">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar Skeleton */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2"></div>
      </div>

      {/* Button Skeleton */}
      <div className="w-full h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
    </div>
  );
}

function EmptyGoalTrackerWidget() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
          <FontAwesomeIcon icon={faBullseye} className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-foreground dark:text-dark-foreground mb-2">
          No Goals Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
          Create your first financial goal to start tracking your progress.
        </p>
        <motion.button
          onClick={() => window.location.href = '/dashboard/tracker/create'}
          className="flex items-center justify-center space-x-2 w-full p-3 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
          <span className="text-sm font-medium">Create Goal</span>
        </motion.button>
      </div>
    </div>
  );
}