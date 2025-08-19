import { motion, useSpring, useTransform } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faBullseye,
  faCalendarAlt, 
  faDollarSign,
  faFlag,
  faChartLine,
  faClock,
  faExclamationTriangle,
  faCheckCircle,
  faTrophy,
  faFireFlameCurved,
  faStar
} from "@fortawesome/free-solid-svg-icons";
import type { FinancialGoal } from "@/components/goal-tracker/types/goal-types";
import { useState, useEffect } from "react";

interface GoalHeaderProps {
  goal: FinancialGoal;
}

export function GoalHeader({ goal }: GoalHeaderProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  // Calculate derived metrics
  const progressPercentage = goal.progress_percentage || 0;
  const remainingAmount = goal.target_amount - goal.current_amount;
  const daysRemaining = Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysRemaining < 0;
  const isNearDeadline = daysRemaining <= 30 && daysRemaining > 0;
  
  // Animated progress value
  const progressSpring = useSpring(0);
  const progressDisplay = useTransform(progressSpring, [0, 100], [0, progressPercentage]);
  
  useEffect(() => {
    setIsVisible(true);
    progressSpring.set(progressPercentage);
  }, [progressPercentage, progressSpring]);

  // Dynamic status configuration
  const getStatusConfig = () => {
    if (goal.status === 'completed') {
      return {
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-500/10 dark:bg-emerald-400/20',
        borderColor: 'border-emerald-200 dark:border-emerald-500/30',
        icon: faTrophy,
        label: 'Completed',
        description: 'Congratulations! Goal achieved'
      };
    }
    
    if (goal.status === 'paused') {
      return {
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-500/10 dark:bg-amber-400/20',
        borderColor: 'border-amber-200 dark:border-amber-500/30',
        icon: faExclamationTriangle,
        label: 'Paused',
        description: 'Goal is currently on hold'
      };
    }
    
    if (isOverdue) {
      return {
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-500/10 dark:bg-red-400/20',
        borderColor: 'border-red-200 dark:border-red-500/30',
        icon: faExclamationTriangle,
        label: 'Overdue',
        description: `${Math.abs(daysRemaining)} days past deadline`
      };
    }
    
    if (isNearDeadline) {
      return {
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-500/10 dark:bg-orange-400/20',
        borderColor: 'border-orange-200 dark:border-orange-500/30',
        icon: faClock,
        label: 'Urgent',
        description: `${daysRemaining} days remaining`
      };
    }
    
    if (goal.is_on_track) {
      return {
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-500/10 dark:bg-green-400/20',
        borderColor: 'border-green-200 dark:border-green-500/30',
        icon: faCheckCircle,
        label: 'On Track',
        description: 'Making excellent progress'
      };
    }
    
    return {
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10 dark:bg-blue-400/20',
      borderColor: 'border-blue-200 dark:border-blue-500/30',
      icon: faBullseye,
      label: 'Active',
      description: 'Goal is in progress'
    };
  };

  const statusConfig = getStatusConfig();

  // Progress bar color based on performance
  const getProgressBarColor = () => {
    if (progressPercentage >= 100) return 'from-emerald-500 to-green-400';
    if (progressPercentage >= 75) return 'from-green-500 to-emerald-400';
    if (progressPercentage >= 50) return 'from-blue-500 to-cyan-400';
    if (progressPercentage >= 25) return 'from-amber-500 to-yellow-400';
    return 'from-red-500 to-orange-400';
  };

  const getGoalTypeIcon = () => {
    const typeIcons = {
      retirement: faTrophy,
      home_buying: faBullseye,
      wealth: faStar,
      investment: faChartLine,
      custom: faBullseye
    };
    return typeIcons[goal.goal_type as keyof typeof typeIcons] || faBullseye;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: isVisible ? 1 : 0, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative overflow-hidden"
    >
      {/* Main Header Card */}
      <div className="relative bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-xl shadow-black/5 dark:shadow-black/20">
        
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)]" />
        
        {/* Content */}
        <div className="relative p-8">
          {/* Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
            {/* Goal Info */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                {/* Goal Type Icon */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-primary/20 dark:border-primary/30"
                >
                  <FontAwesomeIcon
                    icon={getGoalTypeIcon()}
                    className="w-7 h-7 text-primary"
                  />
                </motion.div>

                {/* Title and Type */}
                <div className="flex-1">
                  <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 leading-tight"
                  >
                    {goal.title}
                  </motion.h1>
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-3"
                  >
                    <span className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 rounded-full capitalize">
                      {goal.goal_type.replace('_', ' ')}
                    </span>
                    
                    {progressPercentage > 75 && (
                      <motion.div
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-400/20 to-yellow-400/20 text-amber-600 dark:text-amber-400 rounded-full text-xs font-semibold border border-amber-300/30"
                      >
                        <FontAwesomeIcon icon={faFireFlameCurved} className="w-3 h-3" />
                        Hot Streak
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              </div>

              {/* Description */}
              {goal.description && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed max-w-3xl"
                >
                  {goal.description}
                </motion.p>
              )}
            </div>

            {/* Status Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className={`flex-shrink-0 px-6 py-3 rounded-2xl border ${statusConfig.bgColor} ${statusConfig.borderColor} backdrop-blur-sm`}
            >
              <div className="flex items-center gap-3">
                <FontAwesomeIcon
                  icon={statusConfig.icon}
                  className={`w-5 h-5 ${statusConfig.color}`}
                />
                <div className="text-right">
                  <div className={`font-semibold ${statusConfig.color}`}>
                    {statusConfig.label}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {statusConfig.description}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Progress Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Progress Bar */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  Progress
                </span>
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-2xl font-bold text-gray-900 dark:text-white"
                >
                  {progressPercentage.toFixed(1)}%
                </motion.span>
              </div>
              
              {/* Enhanced Progress Bar */}
              <div className="relative mb-6">
                <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
                    className={`h-full bg-gradient-to-r ${getProgressBarColor()} shadow-lg relative overflow-hidden`}
                  >
                    {/* Shimmer Effect */}
                    <motion.div
                      animate={{ x: [-100, 200] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                    />
                  </motion.div>
                </div>
                
                {/* Progress Milestones Indicators */}
                {[25, 50, 75].map((milestone) => (
                  <motion.div
                    key={milestone}
                    initial={{ scale: 0 }}
                    animate={{ scale: progressPercentage >= milestone ? 1.2 : 0.8 }}
                    transition={{ delay: 0.5 + milestone * 0.01 }}
                    className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 transition-colors ${
                      progressPercentage >= milestone
                        ? 'bg-white border-current shadow-lg'
                        : 'bg-gray-300 dark:bg-gray-600 border-gray-400'
                    }`}
                    style={{ left: `${milestone}%` }}
                  />
                ))}
              </div>

              {/* Amount Display */}
              <div className="flex justify-between items-center text-lg">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faDollarSign} className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ${goal.current_amount.toLocaleString()}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">saved</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    ${goal.target_amount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">target</div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="space-y-4">
              {/* Remaining Amount */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-800/50 border border-gray-200/50 dark:border-gray-600/50"
              >
                <div className="flex items-center gap-3 mb-2">
                  <FontAwesomeIcon icon={faBullseye} className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Remaining
                  </span>
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  ${remainingAmount.toLocaleString()}
                </div>
              </motion.div>

              {/* Target Date */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-700/50 dark:to-gray-800/50 border border-gray-200/50 dark:border-gray-600/50"
              >
                <div className="flex items-center gap-3 mb-2">
                  <FontAwesomeIcon 
                    icon={faCalendarAlt} 
                    className={`w-4 h-4 ${isOverdue ? 'text-red-600' : isNearDeadline ? 'text-orange-600' : 'text-purple-600'}`} 
                  />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {isOverdue ? 'Was Due' : 'Due Date'}
                  </span>
                </div>
                <div className={`text-lg font-bold ${isOverdue ? 'text-red-600' : isNearDeadline ? 'text-orange-600' : 'text-gray-900 dark:text-white'}`}>
                  {new Date(goal.target_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
                <div className={`text-sm ${isOverdue ? 'text-red-500' : isNearDeadline ? 'text-orange-500' : 'text-gray-500'}`}>
                  {isOverdue 
                    ? `${Math.abs(daysRemaining)} days overdue`
                    : `${daysRemaining} days remaining`
                  }
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-500/5 to-transparent rounded-full translate-y-24 -translate-x-24" />
      </div>
    </motion.div>
  );
}