import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faExclamationTriangle, 
  faClock, 
  faDollarSign, 
  faFlag, 
  faEdit, 
  faCheckCircle 
} from "@fortawesome/free-solid-svg-icons";
import { motion } from "framer-motion";
import { useUserActivities } from "../../hooks/useUserActivities";

// Activity Timeline Component
export function ActivityTimelineComponent({ goalId }: { goalId: string }) {
  const { activities, isLoading, error } = useUserActivities();
  
  // Filter activities for this specific goal
  const goalActivities = activities?.filter(activity => 
    activity.metadata?.goalId === goalId ||
    activity.description?.toLowerCase().includes('goal') ||
    activity.activity_type === 'goal_progress_updated'
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <FontAwesomeIcon icon={faExclamationTriangle} className="w-8 h-8 text-red-500 mb-3" />
        <p className="text-gray-500 dark:text-gray-400">Failed to load activity</p>
      </div>
    );
  }

  if (goalActivities.length === 0) {
    return (
      <div className="text-center py-12">
        <FontAwesomeIcon icon={faClock} className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No activity yet</h3>
        <p className="text-gray-500 dark:text-gray-400">Updates and changes to your goal will appear here</p>
      </div>
    );
  }

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'goal_progress_updated':
        return faDollarSign;
      case 'goal_created':
        return faFlag;
      case 'goal_updated':
        return faEdit;
      case 'milestone_completed':
        return faCheckCircle;
      default:
        return faClock;
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'goal_progress_updated':
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      case 'goal_created':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'goal_updated':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400';
      case 'milestone_completed':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      {goalActivities.map((activity, index) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.activity_type)}`}>
            <FontAwesomeIcon 
              icon={getActivityIcon(activity.activity_type)} 
              className="w-4 h-4" 
            />
          </div>
          
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-white">
              {activity.description}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(activity.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          
          {activity.amount && (
            <div className="text-right">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                +${activity.amount.toLocaleString()}
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
