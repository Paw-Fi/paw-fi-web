import { motion } from 'framer-motion';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { Activity } from '@/hooks/useUserActivities';
import { ActivityCard } from './ActivityCard';

interface TimelineSectionProps {
  title: string;
  activities: Activity[];
  index: number;
  defaultExpanded?: boolean;
}

export function TimelineSection({ title, activities, index, defaultExpanded = false }: TimelineSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showAll, setShowAll] = useState(false);
  
  const INITIAL_LIMIT = 3;
  const displayedActivities = showAll ? activities : activities.slice(0, INITIAL_LIMIT);
  const hasMoreActivities = activities.length > INITIAL_LIMIT;

  const sectionVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      }
    }
  };

  return (
    <motion.div 
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      className="relative mb-12"
    >
      <div className="flex items-center justify-between mb-6 sticky top-0 dark:bg-gray-900/80 backdrop-blur-sm py-2 z-20">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {title}
          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
            ({activities.length})
          </span>
        </h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <FontAwesomeIcon 
            icon={isExpanded ? faChevronUp : faChevronDown} 
            className="w-3 h-3"
          />
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      
      <motion.div 
        initial={false}
        animate={{ 
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="relative">
          <div className="absolute left-2 top-0 w-0.5 h-full bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500" />
          <div className="space-y-8">
            {displayedActivities.map((activity, activityIndex) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                index={activityIndex}
              />
            ))}
          </div>
          
          {hasMoreActivities && !showAll && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowAll(true)}
                className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
              >
                Show {activities.length - INITIAL_LIMIT} more activities
              </button>
            </div>
          )}
          
          {showAll && hasMoreActivities && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowAll(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
              >
                Show less
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}