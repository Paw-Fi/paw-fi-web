import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faBullseye, 
  faPlus,
  faChartLine,
  faTrophy,
  faExclamationTriangle
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  type?: 'goals' | 'milestones' | 'progress' | 'insights' | 'error';
  title?: string;
  description?: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: any;
}

export function EmptyState({ 
  type = 'goals',
  title,
  description,
  actionText,
  actionHref,
  onAction,
  icon
}: EmptyStateProps) {
  const configs = {
    goals: {
      icon: faBullseye,
      title: 'No Goals Yet',
      description: 'Create your first financial goal to start tracking your progress towards financial success.',
      actionText: 'Create Goal',
      actionHref: '/dashboard/tracker/create',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    milestones: {
      icon: faChartLine,
      title: 'No Milestones',
      description: 'This goal doesn\'t have any milestones yet. Add milestones to track your progress step by step.',
      actionText: 'Add Milestone',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    progress: {
      icon: faTrophy,
      title: 'No Progress Updates',
      description: 'Start updating your progress to see your journey towards achieving this goal.',
      actionText: 'Update Progress',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    insights: {
      icon: faChartLine,
      title: 'No Insights Available',
      description: 'As you make progress on your goals, our AI will provide personalized insights and recommendations.',
      actionText: 'Update Progress',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
    error: {
      icon: faExclamationTriangle,
      title: 'Something went wrong',
      description: 'We encountered an error while loading your data. Please try again.',
      actionText: 'Try Again',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
  };

  const config = configs[type];
  const finalIcon = icon || config.icon;
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;
  const finalActionText = actionText || config.actionText;
  const finalActionHref = actionHref || config.actionHref;

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (finalActionHref) {
      window.location.href = finalActionHref;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <div className="max-w-md">
        {/* Icon */}
        <div className="relative mb-6">
          <div className={`w-16 h-16 mx-auto ${config.bgColor} rounded-full flex items-center justify-center`}>
            <FontAwesomeIcon 
              icon={finalIcon} 
              className={`w-8 h-8 ${config.color}`}
            />
          </div>
          {type === 'goals' && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-primary to-purple-500 rounded-full flex items-center justify-center">
              <FontAwesomeIcon 
                icon={faPlus} 
                className="w-3 h-3 text-white"
              />
            </div>
          )}
        </div>

        {/* Content */}
        <h3 className="text-xl font-semibold text-foreground dark:text-dark-foreground mb-3">
          {finalTitle}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          {finalDescription}
        </p>

        {/* Action Button */}
        {finalActionText && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={handleAction}
              className={`
                px-6 py-3 shadow-lg
                ${type === 'error' 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-primary hover:bg-primary-dark text-white'
                }
              `}
            >
              {type === 'goals' && <FontAwesomeIcon icon={faPlus} className="mr-2" />}
              {finalActionText}
            </Button>
          </motion.div>
        )}

        {/* Additional context for goals */}
        {type === 'goals' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-2">
                <FontAwesomeIcon icon={faChartLine} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">AI Strategy</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-2">
                <FontAwesomeIcon icon={faBullseye} className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Smart Milestones</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-2">
                <FontAwesomeIcon icon={faTrophy} className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Track Progress</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}