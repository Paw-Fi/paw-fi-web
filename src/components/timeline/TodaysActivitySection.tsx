import { motion, Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDay, faPlus, faTrophy, faChartLine } from '@fortawesome/free-solid-svg-icons';
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

  return (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      className="mb-8 p-6 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 backdrop-blur-xl rounded-2xl border border-blue-200/30 dark:border-blue-700/30 shadow-lg"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
          <FontAwesomeIcon icon={faCalendarDay} className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
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
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
              <FontAwesomeIcon icon={faTrophy} className="w-3 h-3" />
              {activities.length} {activities.length === 1 ? 'activity' : 'activities'} completed
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute left-2 top-0 w-0.5 h-full bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500" />
            <div className="space-y-8">
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
          </div>
        </motion.div>
      ) : (
        <motion.div
          variants={emptyStateVariants}
          className="text-center py-12"
        >
          <motion.div
            variants={iconVariants}
            className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center shadow-lg"
          >
            <FontAwesomeIcon 
              icon={faChartLine} 
              className="w-8 h-8 text-gray-400 dark:text-gray-500" 
            />
          </motion.div>
          
          <motion.h3
            variants={iconVariants}
            className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3"
          >
            No Activity Today
          </motion.h3>
          
          <motion.p
            variants={iconVariants}
            className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto leading-relaxed"
          >
            Start your financial journey today! Set a goal, track progress, or complete a lesson to see your activity here.
          </motion.p>
          
          <motion.div
            variants={iconVariants}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link to="/dashboard/tracker/create" className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
              Set a Goal
            </Link>
            
            <Link to="/dashboard/learning" className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl border border-gray-200 dark:border-gray-600 transform hover:-translate-y-0.5">
              <FontAwesomeIcon icon={faChartLine} className="w-4 h-4" />
              Start Learning
            </Link>
          </motion.div>
          
          <motion.div
            variants={iconVariants}
            className="mt-8 grid grid-cols-3 gap-4 max-w-sm mx-auto"
          >
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <FontAwesomeIcon icon={faTrophy} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Set Goals</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <FontAwesomeIcon icon={faChartLine} className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Track Progress</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <FontAwesomeIcon icon={faCalendarDay} className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Stay Active</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
