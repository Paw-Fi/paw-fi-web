import { motion, Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDay, faPlus, faTrophy, faChartLine, faCalendarCheck, faRocket, faDollarSign } from '@fortawesome/free-solid-svg-icons';
import { Activity } from '@/hooks/useUserActivities';
import { ActivityCard } from './ActivityCard';
import { Link } from '@tanstack/react-router';
import { Calendar, Trophy, TrendingUp, BookOpen } from 'lucide-react';

interface TodaysActivitySectionProps {
  activities: Activity[];
}

export function TodaysActivitySection({ activities }: TodaysActivitySectionProps) {
  const hasActivities = activities.length > 0;

  // Clean Apple-inspired animation variants
  const sectionVariants: Variants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.4,
        staggerChildren: 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const itemVariants: Variants = {
    initial: { opacity: 0, y: 16 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  };

  const emptyStateVariants: Variants = {
    initial: { opacity: 0, y: 12 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  return (
    <motion.div
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      className="mb-16 p-8 bg-card rounded-3xl"
    >
      {/* Clean Header */}
      <motion.div className="flex items-center gap-4 mb-8" variants={itemVariants}>
        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
          <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-3xl font-light text-foreground mb-2">
            Today's Activity
          </h2>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </motion.div>

      {hasActivities ? (
        <motion.div className="space-y-8" variants={itemVariants}>
          {/* Clean Activity Counter */}
          <div className="flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-2xl w-fit">
            <Trophy className="w-4 h-4" />
            <span className="font-medium">
              {activities.length} {activities.length === 1 ? 'activity' : 'activities'} completed
            </span>
          </div>
          
          {/* Clean Activity List */}
          <div className="space-y-6">
            {activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                variants={itemVariants}
              >
                <ActivityCard activity={activity} index={index} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          variants={emptyStateVariants}
          initial="initial"
          animate="animate"
          className="text-center py-16"
        >
          {/* Clean Empty State Icon */}
          <motion.div
            variants={itemVariants}
            className="w-20 h-20 mx-auto mb-8 bg-muted/20 rounded-3xl flex items-center justify-center"
          >
            <Calendar className="w-10 h-10 text-muted-foreground" />
          </motion.div>
          
          {/* Clean Typography */}
          <motion.h3
            variants={itemVariants}
            className="text-2xl font-light text-foreground mb-4"
          >
            No activities yet today
          </motion.h3>
          
          <motion.p
            variants={itemVariants}
            className="text-muted-foreground mb-12 max-w-md mx-auto leading-relaxed"
          >
            Start your financial journey today. Set a goal, track progress, or complete a lesson to see your activity here.
          </motion.p>
          
          {/* Clean Action Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link 
              to="/dashboard/tracker" 
              className="flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground font-medium rounded-full hover:opacity-90 transition-opacity duration-200"
            >
              <TrendingUp className="w-5 h-5" />
              View Goals
            </Link>
            <Link 
              to="/dashboard/learning" 
              className="flex items-center gap-3 px-8 py-4 border border-border bg-card hover:bg-muted/50 text-foreground font-medium rounded-full transition-colors duration-200"
            >
              <BookOpen className="w-5 h-5" />
              Start Learning
            </Link>
          </motion.div>
          
          {/* Clean Feature Icons */}
          <motion.div
            variants={itemVariants}
            className="mt-16 grid grid-cols-3 gap-8 max-w-sm mx-auto"
          >
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm text-muted-foreground">Set Goals</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-sm text-muted-foreground">Track Progress</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-muted-foreground">Stay Active</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
