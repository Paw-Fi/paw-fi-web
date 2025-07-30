import { motion } from 'framer-motion';
import { Activity } from '@/hooks/useUserActivities';
import { ActivityCard } from './ActivityCard';

interface TimelineSectionProps {
  title: string;
  activities: Activity[];
  index: number;
}

export function TimelineSection({ title, activities, index }: TimelineSectionProps) {
  const sectionVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1],
        staggerChildren: 0.1
      }
    }
  };

  const timelineDotVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15
      }
    }
  };

  return (
    <motion.div 
      variants={sectionVariants}
      className="mb-10 relative"
    >
      {/* Section Header */}
      <div className="flex items-center mb-6">
        <motion.div 
          className="
            inline-block px-3 py-1 rounded-full text-xs font-semibold
            bg-blue-600 dark:bg-gradient-to-r dark:from-indigo-600 dark:to-indigo-700 
            text-white
          "
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          {title}
        </motion.div>
        <div className="h-px bg-gray-300 dark:bg-white/10 flex-grow ml-4" />
      </div>

      {/* Timeline Structure */}
      <div className="flex">
        {/* Timeline Indicator */}
        <div className="relative flex flex-col items-center mr-6 flex-shrink-0">
          <motion.div 
            variants={timelineDotVariants}
            className="
              w-3 h-3 rounded-full 
              bg-blue-600 dark:bg-indigo-600 
              border-2 border-white dark:border-slate-100
              shadow-lg dark:shadow-[0_0_0_4px_rgba(99,102,241,0.3)] 
              z-10
            "
          />
          <div className="
            w-0.5 h-full 
            bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 
            dark:from-indigo-500 dark:via-purple-500 dark:to-pink-500
            mt-2 opacity-60
          " />
        </div>

        {/* Activities Grid */}
        <div className="flex-1">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.05
                }
              }
            }}
          >
            {activities.map((activity, activityIndex) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                index={activityIndex}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}