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
            <div className="w-6 h-6 sm:w-7 sm:h-7 bg-muted rounded-2xl animate-pulse"></div>
            <div className="flex-1 min-w-0">
              <div className="h-3 sm:h-3.5 bg-muted rounded-full w-3/4 animate-pulse mb-1 sm:mb-1.5"></div>
              <div className="h-2 sm:h-2.5 bg-muted rounded-full w-1/2 animate-pulse"></div>
            </div>
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-muted rounded-full animate-pulse"></div>
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
            to={`/dashboard`}
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
              className="group flex items-center space-x-2 sm:space-x-2.5 md:space-x-3 p-2 sm:p-2.5 rounded-2xl hover:bg-muted/50 active:bg-muted/70 transition-all duration-200"
            >
              {/* Modern Activity Icon - Mobile responsive */}
              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-muted rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                <FontAwesomeIcon
                  icon={details.icon}
                  className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${details.color}`}
                />
              </div>
              
              {/* Content - Mobile optimized text sizes */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start sm:items-center justify-between mb-0.5 sm:mb-0.5 gap-2">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate group-hover:text-foreground/80 transition-colors leading-tight">
                    {details.title}
                  </p>
                  <span className="text-xs sm:text-xs text-muted-foreground flex-shrink-0">
                    {formatTimeAgo(activity.created_at)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate leading-tight line-clamp-1">
                  {details.description}
                </p>
              </div>
              
              {/* Arrow Indicator - Hidden on mobile to save space */}
              <FontAwesomeIcon
                icon={faArrowRight}
                className="hidden sm:block w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0"
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
      <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 mx-auto bg-muted rounded-3xl flex items-center justify-center mb-3 sm:mb-4 shadow-sm">
        <FontAwesomeIcon icon={faClock} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1">
        No Recent Activity
      </h3>
      <p className="text-xs text-muted-foreground mb-3 sm:mb-4 leading-relaxed px-2">
        Start tracking your goals to see activity here
      </p>
      <Link 
        to="/dashboard/tracker/create" 
        className="inline-flex items-center text-xs font-medium text-primary hover:text-primary/80 active:text-primary/60 transition-all duration-200 touch-manipulation py-2 px-3 rounded-full hover:bg-primary/10 hover:scale-105"
      >
        Create Your First Goal
        <FontAwesomeIcon icon={faArrowRight} className="w-2.5 h-2.5 ml-1.5" />
      </Link>
    </div>
  );
}
