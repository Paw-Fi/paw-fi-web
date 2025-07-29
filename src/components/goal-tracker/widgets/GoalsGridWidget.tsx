import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faBullseye, 
  faArrowRight,
  faCheckCircle,
  faExclamationTriangle,
  faFlag,
  faPlus,
  faTrophy
} from "@fortawesome/free-solid-svg-icons";
import type { IGoalsGridWidget } from "@/components/profile/types/dashboard-data.typings";
import { useAuth } from "@/contexts/auth-context";
import { useGoals } from "@/hooks/goal-tracker/use-goals";

interface GoalsGridWidgetProps {
  widget: IGoalsGridWidget;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function GoalsGridWidget({ 
  widget, 
  onEdit, 
  onDelete 
}: GoalsGridWidgetProps) {
  const { user } = useAuth();
  const { goals, isLoading } = useGoals(user?.id);

  if (isLoading) {
    return <GoalsGridWidgetSkeleton />;
  }

  if (!goals || goals.length === 0) {
    return <EmptyGoalsGridWidget />;
  }

  // Filter and sort goals based on widget data preferences
  let filteredGoals = goals.filter(goal => {
    if (!widget.data.showCompleted && goal.status === 'completed') {
      return false;
    }
    return true;
  });

  // Sort goals
  switch (widget.data.sortBy) {
    case 'progress':
      filteredGoals = filteredGoals.sort((a, b) => b.progress_percentage - a.progress_percentage);
      break;
    case 'target_date':
      filteredGoals = filteredGoals.sort((a, b) => 
        new Date(a.target_date).getTime() - new Date(b.target_date).getTime()
      );
      break;
    case 'created_at':
      filteredGoals = filteredGoals.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      break;
  }

  // Limit displayed items
  const displayedGoals = filteredGoals.slice(0, widget.data.maxDisplayItems);

  const getStatusConfig = (status: string) => {
    const configs = {
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
        icon: faTrophy 
      },
    };
    return configs[status as keyof typeof configs] || configs.active;
  };

  const getGoalTypeIcon = (goalType: string) => {
    const typeIcons = {
      retirement: faTrophy,
      home_buying: faBullseye,
      wealth: faFlag,
      investment: faCheckCircle,
      custom: faBullseye
    };
    return typeIcons[goalType as keyof typeof typeIcons] || faBullseye;
  };

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

      {/* Goals Grid */}
      <div className="grid gap-4 mb-4">
        {displayedGoals.map((goal, index) => {
          const statusConfig = getStatusConfig(goal.status);
          const goalTypeIcon = getGoalTypeIcon(goal.goal_type);
          
          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-primary/20 dark:hover:border-primary/40 transition-all cursor-pointer group"
              onClick={() => window.location.href = `/dashboard/tracker/${goal.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon 
                      icon={goalTypeIcon} 
                      className="w-4 h-4 text-gray-600 dark:text-gray-400" 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground dark:text-dark-foreground truncate">
                      {goal.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                      {goal.goal_type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                  <FontAwesomeIcon icon={statusConfig.icon} className="w-3 h-3 mr-1" />
                  {goal.status}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Progress
                  </span>
                  <span className="text-xs font-bold text-foreground dark:text-dark-foreground">
                    {goal.progress_percentage.toFixed(1)}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <motion.div 
                    className={`h-2 rounded-full ${
                      goal.is_on_track 
                        ? 'bg-green-500' 
                        : goal.progress_percentage < 25 
                          ? 'bg-red-500' 
                          : 'bg-yellow-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                  />
                </div>
              </div>

              {/* Amount Display */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">
                  ${goal.current_amount.toLocaleString()}
                </span>
                <span className="font-medium text-foreground dark:text-dark-foreground">
                  ${goal.target_amount.toLocaleString()}
                </span>
              </div>

              {/* Target Date */}
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                Target: {new Date(goal.target_date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>

              {/* Hover Indicator */}
              <div className="flex items-center justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <FontAwesomeIcon 
                  icon={faArrowRight} 
                  className="w-3 h-3 text-primary group-hover:translate-x-1 transition-transform" 
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
        <span className="text-xs text-gray-600 dark:text-gray-400">
          Showing {displayedGoals.length} of {filteredGoals.length} goals
        </span>
        
        <motion.button
          onClick={() => window.location.href = '/dashboard/tracker'}
          className="flex items-center space-x-2 text-xs text-primary hover:underline"
          whileHover={{ scale: 1.05 }}
        >
          <span>View All</span>
          <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
        </motion.button>
      </div>
    </div>
  );
}

function GoalsGridWidgetSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      {/* Header Skeleton */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
      </div>

      {/* Goals Grid Skeleton */}
      <div className="grid gap-4 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="space-y-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
              </div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            </div>
            
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-10"></div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2"></div>
            </div>
            
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </div>
            
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
        ))}
      </div>

      {/* Footer Skeleton */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
      </div>
    </div>
  );
}

function EmptyGoalsGridWidget() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
          <FontAwesomeIcon icon={faBullseye} className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-foreground dark:text-dark-foreground mb-2">
          No Goals Found
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