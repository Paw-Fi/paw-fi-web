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
  const createdAt = new Date(activity.created_at);

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20
      }
    }
  };

  const getActivityTypeInfo = () => {
    switch (activity.action) {
      case 'goal_created':
        return { type: 'Goal', bgColor: 'bg-blue-500' };
      case 'goal_progress_updated':
        return { type: 'Progress', bgColor: 'bg-green-500' };
      case 'goal_completed':
        return { type: 'Achievement', bgColor: 'bg-purple-500' };
      case 'milestone_completed':
        return { type: 'Milestone', bgColor: 'bg-yellow-500' };
      default:
        return { type: 'Activity', bgColor: 'bg-gray-500' };
    }
  };

  const typeInfo = getActivityTypeInfo();

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ 
        y: -5,
        transition: { duration: 0.2 }
      }}
      className="
        backdrop-blur-xl 
        bg-white/80 dark:bg-gradient-to-br dark:from-white/10 dark:to-white/5 
        border border-gray-200 dark:border-white/20 
        rounded-xl p-5
        shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]
        hover:shadow-xl dark:hover:shadow-[0_12px_40px_rgba(99,102,241,0.2)]
        hover:border-blue-300 dark:hover:border-indigo-500/30
        transition-all duration-400
        transform-gpu
      "
    >
      {/* Card Header */}
      <div className="flex justify-between items-start mb-3">
        <motion.div 
          className="
            w-10 h-10 rounded-xl flex items-center justify-center
            bg-gray-100 dark:bg-white/10 backdrop-blur-sm
          "
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ duration: 0.2 }}
        >
          <FontAwesomeIcon 
            icon={details.icon as IconDefinition} 
            className={`text-lg ${details.color}`}
          />
        </motion.div>
        
        <div className="text-right">
          <span className="text-xs text-gray-500 dark:text-slate-400 block">
            {createdAt.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })}
          </span>
          <span className="text-xs text-gray-400 dark:text-slate-500 block mt-1">
            {timeAgo}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="mb-3">
        <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-1 leading-tight">
          {details.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-3 leading-relaxed">
          {details.description}
        </p>
        {activity.goalTitle && (
          <p className="text-xs text-gray-500 dark:text-slate-500 mb-2">
            Goal: {activity.goalTitle}
          </p>
        )}
      </div>

      {/* Progress Bar (if applicable) */}
      {activity.metadata?.newProgressPercentage !== undefined && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-500 dark:text-slate-400">Progress</span>
            <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
              {activity.metadata.newProgressPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${activity.metadata.newProgressPercentage}%` }}
              transition={{ 
                duration: 1.5, 
                delay: index * 0.1 + 0.5,
                ease: [0.4, 0, 0.2, 1]
              }}
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 dark:from-indigo-500 dark:to-purple-500 rounded-full"
            />
          </div>
        </div>
      )}

      {/* Card Footer */}
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <div className={`w-6 h-6 rounded-full ${typeInfo.bgColor} flex items-center justify-center`}>
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              {activity.action === 'goal_created' && (
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              )}
              {activity.action === 'goal_progress_updated' && (
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              )}
              {activity.action === 'goal_completed' && (
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              )}
              {activity.action === 'milestone_completed' && (
                <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 2H21l-3 6 3 6h-8.5l-1-2H5a2 2 0 00-2 2zm9-13.5V9" />
              )}
            </svg>
          </div>
          <span className="text-xs ml-2 text-gray-500 dark:text-slate-400">{typeInfo.type}</span>
        </div>
        
      </div>

      {/* Amount Change Badge */}
      {activity.metadata?.amountChange && (
        <div className="absolute -top-2 -right-2">
          <span className={`
            inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
            ${activity.metadata.amountChange > 0 
              ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/30' 
              : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30'
            }
          `}>
            {activity.metadata.amountChange > 0 ? '+' : ''}
            ${Math.abs(activity.metadata.amountChange).toLocaleString()}
          </span>
        </div>
      )}
    </motion.div>
  );
}