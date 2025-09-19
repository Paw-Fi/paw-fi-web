import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faTrophy,
  faCheckCircle,
  faExclamationTriangle,
  faPause
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "@tanstack/react-router";
import { FinancialGoal } from "../types/goal-types";

interface GoalCardProps {
  goal: FinancialGoal;
  index?: number;
  onGoalUpdate?: () => void;
}

export function GoalCard({ goal, index = 0, onGoalUpdate }: GoalCardProps) {
  const getGoalTypeConfig = (goalType: string) => {
    const configs = {
      retirement: { 
        label: 'Retirement',
        gradient: 'from-amber-500 to-orange-500'
      },
      home_buying: { 
        label: 'Home Purchase',
        gradient: 'from-blue-500 to-cyan-500'
      },
      wealth: { 
        label: 'Wealth Building',
        gradient: 'from-green-500 to-emerald-500'
      },
      investment: { 
        label: 'Investment',
        gradient: 'from-purple-500 to-violet-500'
      },
      custom: { 
        label: 'Custom Goal',
        gradient: 'from-gray-500 to-slate-500'
      }
    };
    return configs[goalType as keyof typeof configs] || configs.custom;
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      active: { 
        icon: faCheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        label: 'Active'
      },
      paused: { 
        icon: faPause,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        label: 'Paused'
      },
      completed: { 
        icon: faTrophy,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        label: 'Completed'
      },
    };
    return configs[status as keyof typeof configs] || configs.active;
  };

  const goalTypeConfig = getGoalTypeConfig(goal.goal_type);
  const statusConfig = getStatusConfig(goal.status);
  const progressPercentage = Math.min(goal.progress_percentage, 100);
  const circumference = 2 * Math.PI * 45; // radius of 45
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <Link
      to={`/dashboard/tracker/${goal.id}` as any}
      className="block"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          delay: index * 0.03,
          duration: 0.4,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
        className="group relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-5 border border-gray-200/20 dark:border-gray-700/20 hover:bg-white/95 dark:hover:bg-gray-900/95 hover:border-gray-300/30 dark:hover:border-gray-600/30 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 overflow-hidden"
      >
        {/* Gradient Top Border */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${goalTypeConfig.gradient}`}></div>
        
        {/* Header Row - Title and Status */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors line-clamp-2">
              {goal.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {goalTypeConfig.label}
            </p>
          </div>
          <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color} border border-current/10`}>
            <FontAwesomeIcon icon={statusConfig.icon} className="w-2.5 h-2.5 mr-1" />
            {statusConfig.label}
          </div>
        </div>

        {/* Main Content Row - Progress and Financial Data */}
        <div className="flex items-center space-x-5 mb-4">
          {/* Compact Circular Progress */}
          <div className="relative w-20 h-20 flex-shrink-0">
            {/* Background Circle */}
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Progress Circle */}
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                stroke="url(#progressGradient)"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ 
                  duration: 1.2, 
                  delay: index * 0.05 + 0.2,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                className="drop-shadow-sm"
              />
              {/* Gradient Definition */}
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" className={`text-${goalTypeConfig.gradient.split('-')[1]}-500`} stopColor="currentColor" />
                  <stop offset="100%" className={`text-${goalTypeConfig.gradient.split('-')[3]}-500`} stopColor="currentColor" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Center Percentage */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.span 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 + 0.4 }}
                className="text-lg font-bold text-gray-900 dark:text-white"
              >
                {progressPercentage.toFixed(0)}%
              </motion.span>
            </div>
          </div>

          {/* Financial Data - Two Columns */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Target
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                ${goal.target_amount.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Current
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                ${goal.current_amount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Row - Target Date and Status */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1.5">
            <FontAwesomeIcon icon={faCheckCircle} className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Target date: {new Date(goal.target_date).toLocaleDateString('en-US', { 
                month: 'short', 
                year: 'numeric'
              })}
            </span>
          </div>
          <div className={`flex items-center space-x-1.5 ${
            goal.is_on_track 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-amber-600 dark:text-amber-400'
          }`}>
            <FontAwesomeIcon 
              icon={goal.is_on_track ? faCheckCircle : faExclamationTriangle} 
              className="w-3.5 h-3.5" 
            />
            <span className="text-xs font-medium">
              {goal.is_on_track ? 'On track' : 'Behind'}
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}