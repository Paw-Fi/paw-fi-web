import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faClock } from '@fortawesome/free-solid-svg-icons';
import { Link } from '@tanstack/react-router';
import type { Activity } from '@/hooks/useUserActivities';
import { getActivityDetails, formatTimeAgo } from '@/lib/activity-helpers';

interface ActivityListProps {
  activities: Activity[];
  isLoading: boolean;
  limit?: number;
}

export function ActivityList({ activities, isLoading, limit }: ActivityListProps) {
  const displayActivities = limit ? activities.slice(0, limit) : activities;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(limit || 5)].map((_, i) => (
          <div key={i} className="flex items-start space-x-3 p-3">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return <EmptyActivityState />;
  }

  return (
    <div className="space-y-4">
      {displayActivities.map((activity, index) => {
        const details = getActivityDetails(activity);
        return (
          <Link
            key={activity.id}
            to={`/dashboard/tracker/${activity.goalId}`}
            className="block"
          >
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
            >
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon
                  icon={details.icon}
                  className={`w-3 h-3 ${details.color}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground dark:text-dark-foreground">
                    {details.title}
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {formatTimeAgo(activity.created_at)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                  {details.description}
                </p>
              </div>
              <FontAwesomeIcon
                icon={faArrowRight}
                className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0 self-center"
              />
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}

function EmptyActivityState() {
  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
        <FontAwesomeIcon icon={faClock} className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-foreground dark:text-dark-foreground mb-2">
        No Recent Activity
      </h3>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
        Start tracking your goals to see activity here
      </p>
      <Link to="/dashboard/tracker/create" className="text-xs text-primary hover:underline">
        Create Your First Goal
      </Link>
    </div>
  );
}
