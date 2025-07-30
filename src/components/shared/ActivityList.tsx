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
      <div className="space-y-3">
        {[...Array(limit || 5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-2.5">
            <div className="w-7 h-7 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="flex-1 min-w-0">
              <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse mb-1.5"></div>
              <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
            </div>
            <div className="w-2.5 h-2.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return <EmptyActivityState />;
  }

  return (
    <div className="space-y-2">
      {displayActivities.map((activity, index) => {
        const details = getActivityDetails(activity);
        return (
          <Link
            key={activity.id}
            to={`/dashboard/timeline`}
            className="block"
          >
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                delay: index * 0.03,
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1]
              }}
              className="group flex items-center space-x-3 p-2.5 rounded-xl hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-all duration-200"
            >
              {/* Modern Activity Icon */}
              <div className="w-7 h-7 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                <FontAwesomeIcon
                  icon={details.icon}
                  className={`w-3 h-3 ${details.color}`}
                />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                    {details.title}
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                    {formatTimeAgo(activity.created_at)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-tight">
                  {details.description}
                </p>
              </div>
              
              {/* Arrow Indicator */}
              <FontAwesomeIcon
                icon={faArrowRight}
                className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0"
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
    <div className="text-center py-6">
      <div className="w-10 h-10 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl flex items-center justify-center mb-4">
        <FontAwesomeIcon icon={faClock} className="w-4 h-4 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
        No Recent Activity
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
        Start tracking your goals to see activity here
      </p>
      <Link to="/dashboard/tracker/create" className="inline-flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
        Create Your First Goal
        <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5 ml-1" />
      </Link>
    </div>
  );
}
