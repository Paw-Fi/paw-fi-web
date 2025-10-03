import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { getActivityDetails, formatTimeAgo } from '@/lib/activity-helpers';
import { Activity } from '@/hooks/useUserActivities';

interface ActivityCardProps {
  activity: Activity;
  index: number;
}

export function ActivityCard({ activity, index }: ActivityCardProps) {
  const details = getActivityDetails(activity);
  const timeAgo = formatTimeAgo(activity.created_at);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20,
        delay: index * 0.1
      }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="relative pl-6 sm:pl-8"
    >
      <div className="absolute left-0 top-1 w-3 h-3 sm:w-4 sm:h-4 bg-card border-2 border-blue-500 rounded-full z-10" />
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 text-white rounded-lg shadow-lg">
          <FontAwesomeIcon 
            icon={details.icon as IconDefinition} 
            className={`text-base sm:text-xl`}
          />
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex items-start sm:items-center justify-between gap-2 flex-col sm:flex-row">
            <h3 className="font-semibold text-foreground text-mobile-sm sm:text-base">
              {details.title}
            </h3>
            <span className="text-mobile-xs sm:text-sm text-muted-foreground flex-shrink-0">
              {timeAgo}
            </span>
          </div>
          <p className="text-card-foreground mt-1 text-mobile-sm sm:text-base">
            {details.description}
          </p>
          {activity.goalTitle && (
            <p className="text-mobile-xs sm:text-sm text-muted-foreground mt-2">
              Goal: <span className="font-medium text-foreground">{activity.goalTitle}</span>
            </p>
          )}
          {activity.metadata?.newProgressPercentage !== undefined && (
            <div className="mt-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-mobile-xs sm:text-sm font-medium text-foreground">Progress</span>
                <span className="text-mobile-xs sm:text-sm font-medium text-foreground">
                  {activity.metadata.newProgressPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${activity.metadata.newProgressPercentage}%` }}
                  transition={{ 
                    duration: 1.5, 
                    delay: index * 0.1 + 0.5,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                  className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}