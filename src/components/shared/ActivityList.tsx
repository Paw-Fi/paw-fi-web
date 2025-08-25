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
  goalId?: string;
}

export function ActivityList({ activities, isLoading, limit, goalId }: ActivityListProps) {
  // Filter activities by goalId if provided
  const filteredActivities = goalId 
    ? activities.filter(activity => 
        activity.goalId === goalId ||
        activity.metadata?.goalId === goalId ||
        activity.type === 'goal_progress_updated'
      )
    : activities;
    
  const displayActivities = limit ? filteredActivities.slice(0, limit) : filteredActivities;

  if (isLoading) {
    return (
      <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
        {[...Array(limit || 5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-2 sm:space-x-2.5 md:space-x-3 p-2 sm:p-2.5">
            <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gray-200 dark:bg-gray-700 rounded-md sm:rounded-lg animate-pulse"></div>
            <div className="flex-1 min-w-0">
              <div className="h-3 sm:h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse mb-1 sm:mb-1.5"></div>
              <div className="h-2 sm:h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
            </div>
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredActivities.length === 0) {
    return <EmptyActivityState />;
  }

  return (
    <div className="space-y-1.5 sm:space-y-2">
      {displayActivities.map((activity, index) => {
        const details = getActivityDetails(activity);
        return (
          <Link
            key={activity.id}
            to={`/dashboard/timeline`}
            className="block touch-manipulation"
          >
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                delay: index * 0.03,
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1]
              }}
              className="group flex items-center space-x-2 sm:space-x-2.5 md:space-x-3 p-2 sm:p-2.5 rounded-lg sm:rounded-xl hover:bg-gray-50/70 dark:hover:bg-gray-700/30 active:bg-gray-50/90 dark:active:bg-gray-700/50 transition-all duration-200"
            >
              {/* Modern Activity Icon - Mobile responsive */}
              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                <FontAwesomeIcon
                  icon={details.icon}
                  className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${details.color}`}
                />
              </div>
              
              {/* Content - Mobile optimized text sizes */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start sm:items-center justify-between mb-0.5 sm:mb-0.5 gap-2">
                  <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors leading-tight">
                    {details.title}
                  </p>
                  <span className="text-xs sm:text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {formatTimeAgo(activity.created_at)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-tight line-clamp-1">
                  {details.description}
                </p>
              </div>
              
              {/* Arrow Indicator - Hidden on mobile to save space */}
              <FontAwesomeIcon
                icon={faArrowRight}
                className="hidden sm:block w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0"
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
    <div className="text-center py-4 sm:py-5 md:py-6">
      <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4">
        <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
        No Recent Activity
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 sm:mb-4 leading-relaxed px-2">
        Start tracking your goals to see activity here
      </p>
      <Link 
        to="/dashboard/tracker/create" 
        className="inline-flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 active:text-blue-800 dark:active:text-blue-200 transition-colors touch-manipulation py-1.5 px-2 rounded-md hover:bg-blue-50/50 dark:hover:bg-blue-900/20"
      >
        Create Your First Goal
        <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5 ml-1.5" />
      </Link>
    </div>
  );
}
