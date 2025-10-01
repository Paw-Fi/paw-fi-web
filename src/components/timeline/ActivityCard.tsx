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
      className="relative pl-8"
    >
      <div className="absolute left-0 top-1 w-4 h-4 bg-card border-2 border-blue-500 rounded-full z-10" />
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 text-white rounded-lg shadow-lg">
          <FontAwesomeIcon 
            icon={details.icon as IconDefinition} 
            className={`text-xl`}
          />
        </div>
        <div className="flex-grow">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">
              {details.title}
            </h3>
            <span className="text-sm text-muted-foreground">
              {timeAgo}
            </span>
          </div>
          <p className="text-card-foreground mt-1">
            {details.description}
          </p>
          {activity.goalTitle && (
            <p className="text-sm text-muted-foreground mt-2">
              Goal: <span className="font-medium text-foreground">{activity.goalTitle}</span>
            </p>
          )}
          {activity.metadata?.newProgressPercentage !== undefined && (
            <div className="mt-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-foreground">Progress</span>
                <span className="text-sm font-medium text-foreground">
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