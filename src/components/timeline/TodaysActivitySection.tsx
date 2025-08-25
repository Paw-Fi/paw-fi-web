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
      className="mb-3 sm:mb-4 md:mb-6 lg:mb-8 p-3 sm:p-4 md:p-5 lg:p-6 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 backdrop-blur-xl rounded-lg sm:rounded-xl md:rounded-2xl border border-blue-200/30 dark:border-blue-700/30 shadow-md sm:shadow-lg"
    >
      <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 mb-3 sm:mb-4 md:mb-5 lg:mb-6">
        <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg sm:rounded-xl shadow-md sm:shadow-lg">
          <FontAwesomeIcon icon={faCalendarDay} className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
            Today's Activity
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-tight">
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
        <motion.div className="space-y-3 sm:space-y-4 md:space-y-6">
          <div className="flex items-center gap-2 mb-2 sm:mb-3 md:mb-4">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs sm:text-sm font-medium">
              <FontAwesomeIcon icon={faTrophy} className="w-3 h-3" />
              {activities.length} {activities.length === 1 ? 'activity' : 'activities'} completed
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute left-1.5 sm:left-2 top-0 w-0.5 h-full bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500" />
            <div className="space-y-4 sm:space-y-6 md:space-y-8">
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
          className="text-center py-4 sm:py-6 md:py-8 lg:py-12"
        >
          <motion.div
            variants={iconVariants}
            className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto mb-3 sm:mb-4 md:mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center shadow-md sm:shadow-lg"
          >
            <FontAwesomeIcon 
              icon={faChartLine} 
              className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-gray-400 dark:text-gray-500" 
            />
          </motion.div>
          
          <motion.h3
            variants={iconVariants}
            className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 sm:mb-3"
          >
            No Activity Today
          </motion.h3>
          
          <motion.p
            variants={iconVariants}
            className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-5 md:mb-6 max-w-sm sm:max-w-md mx-auto leading-relaxed px-2"
          >
            Start your financial journey today! Set a goal, track progress, or complete a lesson to see your activity here.
          </motion.p>
          
          <motion.div
            variants={iconVariants}
            className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center px-2"
          >
            <Link to="/dashboard/tracker/create" className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 active:from-blue-700 active:to-purple-800 text-white font-medium rounded-lg transition-all duration-200 shadow-md sm:shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 touch-manipulation">
              <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-sm sm:text-base">Set a Goal</span>
            </Link>
            
            <Link to="/dashboard/learning" className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-all duration-200 shadow-md sm:shadow-lg hover:shadow-xl border border-gray-200 dark:border-gray-600 transform hover:-translate-y-0.5 touch-manipulation">
              <FontAwesomeIcon icon={faChartLine} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-sm sm:text-base">Start Learning</span>
            </Link>
          </motion.div>
          
          <motion.div
            variants={iconVariants}
            className="mt-4 sm:mt-6 md:mt-8 grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 max-w-xs sm:max-w-sm mx-auto px-2"
          >
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-1.5 sm:mb-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <FontAwesomeIcon icon={faTrophy} className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Set Goals</p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-1.5 sm:mb-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <FontAwesomeIcon icon={faChartLine} className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Track Progress</p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-1.5 sm:mb-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <FontAwesomeIcon icon={faCalendarDay} className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Stay Active</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
