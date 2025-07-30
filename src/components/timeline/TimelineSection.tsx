import { motion } from 'framer-motion';
import { Activity } from '@/hooks/useUserActivities';
import { ActivityCard } from './ActivityCard';

interface TimelineSectionProps {
  title: string;
  activities: Activity[];
  index: number;
}

export function TimelineSection({ title, activities }: TimelineSectionProps) {
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
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 sticky top-0  dark:bg-gray-900/80 backdrop-blur-sm py-2 z-20">
        {title}
      </h2>
      <div className="relative">
        <div className="absolute left-2 top-0 w-0.5 h-full bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500" />
        <div className="space-y-8">
          {activities.map((activity, activityIndex) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              index={activityIndex}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}