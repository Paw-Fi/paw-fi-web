import { motion, Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDay, faPlus, faTrophy, faChartLine, faCalendarCheck, faRocket, faDollarSign } from '@fortawesome/free-solid-svg-icons';
import { Activity } from '@/hooks/useUserActivities';
import { ActivityCard } from './ActivityCard';
import { Link } from '@tanstack/react-router';

interface TodaysActivitySectionProps {
  activities: Activity[];
}

export function TodaysActivitySection({ activities }: TodaysActivitySectionProps) {
  const hasActivities = activities.length > 0;

  const sectionVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const emptyStateVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: 0.1,
      },
    },
  };

  const iconVariants: Variants = {
    hidden: { opacity: 0, rotate: -10 },
    visible: {
      opacity: 1,
      rotate: 0,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const textVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const buttonVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      className="mb-8 p-8 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-3xl"
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-xl">
          <FontAwesomeIcon icon={faCalendarDay} className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Today's Activity
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {hasActivities ? (
        <motion.div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-2xl text-sm font-medium">
              <FontAwesomeIcon icon={faTrophy} className="w-3 h-3" />
              {activities.length} {activities.length === 1 ? 'activity' : 'activities'} completed
            </div>
          </div>
          
          <div className="space-y-6">
            {activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                variants={cardVariants}
                className="transform"
              >
                <ActivityCard activity={activity} index={index} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          variants={emptyStateVariants}
          className="text-center py-12"
        >
          <motion.div
            variants={iconVariants}
            className="w-16 h-16 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center"
          >
            <FontAwesomeIcon 
              icon={faCalendarCheck} 
              className="w-8 h-8 text-gray-400 dark:text-gray-500" 
            />
          </motion.div>
          <motion.h3
            variants={textVariants}
            className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2"
          >
            No activities yet today
          </motion.h3>
          <motion.p
            variants={textVariants}
            className="text-gray-500 dark:text-gray-400 mb-8"
          >
            Start your day by completing a goal milestone or making progress
          </motion.p>
          <motion.div
            variants={buttonVariants}
            className="flex flex-col sm:flex-row gap-3 justify-center items-center"
          >
            <Link 
              to="/dashboard/tracker" 
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-2xl transition-all duration-200 hover:shadow-sm"
            >
              <FontAwesomeIcon icon={faRocket} className="w-4 h-4 mr-2" />
              View Goals
            </Link>
            <Link 
              to="/dashboard/income-builder" 
              className="px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-2xl border border-gray-200 dark:border-gray-600 transition-all duration-200 hover:shadow-sm"
            >
              <FontAwesomeIcon icon={faDollarSign} className="w-4 h-4 mr-2" />
              Build Income
            </Link>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
