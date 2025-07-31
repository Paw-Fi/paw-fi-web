import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faBullseye, 
  faCalendarAlt, 
  faDollarSign,
  faArrowRight,
  faCheckCircle,
  faExclamationTriangle,
  faFlag
} from "@fortawesome/free-solid-svg-icons";
import type { IGoalProgressWidget } from "@/components/profile/types/dashboard-data.typings";
import { useAuth } from "@/contexts/auth-context";
import { useGoal } from "@/hooks/goal-tracker/use-goal";

interface GoalProgressWidgetProps {
  widget: IGoalProgressWidget;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function GoalProgressWidget({ 
  widget, 
  onEdit, 
  onDelete 
}: GoalProgressWidgetProps) {
  const { user } = useAuth();
  const { goal, milestones, isLoading } = useGoal(widget.data.goalId, user?.id);

  if (isLoading) {
    return <GoalProgressWidgetSkeleton />;
  }

  if (!goal) {
    return <GoalNotFoundWidget goalId={widget.data.goalId} />;
  }

  const upcomingMilestones = milestones
    .filter(m => m.status === 'pending' || m.status === 'in_progress')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 3);

  const statusConfig = {
    active: { 
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      icon: faCheckCircle 
    },
    paused: { 
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      icon: faExclamationTriangle 
    },
    completed: { 
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      icon: faFlag 
    },
  };

  const status = statusConfig[goal.status as keyof typeof statusConfig] || statusConfig.active;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={faBullseye} className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground dark:text-dark-foreground">
              {widget.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
              {goal.goal_type.replace('_', ' ')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
            <FontAwesomeIcon icon={status.icon} className="w-3 h-3 mr-1" />
            {goal.status}
          </div>
          {widget.controls}
        </div>
      </div>

      {/* Goal Title */}
      <h4 className="text-xl font-bold text-foreground dark:text-dark-foreground mb-4 line-clamp-2">
        {goal.title}
      </h4>

      {/* Progress Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Progress
          </span>
          <span className="text-sm font-bold text-foreground dark:text-dark-foreground">
            {goal.progress_percentage.toFixed(1)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-2">
          <motion.div 
            className={`h-3 rounded-full ${
              goal.is_on_track 
                ? 'bg-green-500' 
                : goal.progress_percentage < 25 
                  ? 'bg-red-500' 
                  : 'bg-yellow-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            ${goal.current_amount.toLocaleString()}
          </span>
          <span className="font-medium text-foreground dark:text-dark-foreground">
            ${goal.target_amount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center space-x-2 mb-1">
            <FontAwesomeIcon icon={faDollarSign} className="w-3 h-3 text-green-600" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Remaining
            </span>
          </div>
          <p className="text-sm font-bold text-foreground dark:text-dark-foreground">
            ${(goal.target_amount - goal.current_amount).toLocaleString()}
          </p>
        </div>
        
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center space-x-2 mb-1">
            <FontAwesomeIcon icon={faCalendarAlt} className="w-3 h-3 text-blue-600" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Target Date
            </span>
          </div>
          <p className="text-sm font-bold text-foreground dark:text-dark-foreground">
            {new Date(goal.target_date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* Upcoming Milestones */}
      {upcomingMilestones.length > 0 && (
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
            Upcoming Milestones
          </h5>
          <div className="space-y-2">
            {upcomingMilestones.map((milestone, index) => (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground dark:text-dark-foreground truncate">
                    {milestone.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Due {new Date(milestone.due_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                {milestone.target_amount && (
                  <span className="text-xs font-medium text-primary ml-2">
                    ${milestone.target_amount.toLocaleString()}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <motion.button
        onClick={() => window.location.href = `/dashboard/tracker/${goal.id}`}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors group"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="text-sm font-medium text-primary">View Goal Details</span>
        <FontAwesomeIcon 
          icon={faArrowRight} 
          className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" 
        />
      </motion.button>
    </div>
  );
}

function GoalProgressWidgetSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="space-y-1">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </div>
        </div>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
      </div>

      {/* Title Skeleton */}
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>

      {/* Progress Skeleton */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-2"></div>
        <div className="flex items-center justify-between">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        </div>
      </div>

      {/* Metrics Skeleton */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
          </div>
        ))}
      </div>

      {/* Button Skeleton */}
      <div className="w-full h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
    </div>
  );
}

function GoalNotFoundWidget({ goalId }: { goalId: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <FontAwesomeIcon icon={faExclamationTriangle} className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-foreground dark:text-dark-foreground mb-2">
          Goal Not Found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
          The goal with ID "{goalId}" could not be found or may have been deleted.
        </p>
        <motion.button
          onClick={() => window.location.href = '/dashboard/tracker'}
          className="text-sm text-primary hover:underline"
          whileHover={{ scale: 1.05 }}
        >
          View All Goals
        </motion.button>
      </div>
    </div>
  );
}