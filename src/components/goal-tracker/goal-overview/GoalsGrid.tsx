import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faBullseye, 
  faArrowRight,
  faCheckCircle,
  faExclamationTriangle,
  faTrophy,
  faCalendarAlt,
  faDollarSign
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "@tanstack/react-router";
import { FinancialGoal } from "../types/goal-types";

interface GoalsGridProps {
  goals: FinancialGoal[];
  onGoalUpdate?: () => void;
}

export function GoalsGrid({ goals, onGoalUpdate }: GoalsGridProps) {
  const getStatusConfig = (status: string) => {
    const configs = {
      active: { 
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        icon: faCheckCircle 
      },
      paused: { 
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        icon: faExclamationTriangle 
      },
      completed: { 
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        icon: faTrophy 
      },
    };
    return configs[status as keyof typeof configs] || configs.active;
  };

  const getGoalTypeIcon = (goalType: string) => {
    const typeIcons = {
      retirement: faTrophy,
      home_buying: faBullseye,
      wealth: faDollarSign,
      investment: faCheckCircle,
      custom: faBullseye
    };
    return typeIcons[goalType as keyof typeof typeIcons] || faBullseye;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-foreground dark:text-dark-foreground">
          Your Goals
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Track your progress and manage your financial objectives
        </p>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {goals.map((goal, index) => {
            const statusConfig = getStatusConfig(goal.status);
            const goalTypeIcon = getGoalTypeIcon(goal.goal_type);
            
            return (
              <Link
                key={goal.id}
                to={`/dashboard/tracker/${goal.id}`}
                className="block p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-primary/20 dark:hover:border-primary/40 transition-all group"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <FontAwesomeIcon 
                        icon={goalTypeIcon} 
                        className="w-5 h-5 text-gray-600 dark:text-gray-400" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-foreground dark:text-dark-foreground truncate">
                        {goal.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {goal.goal_type.replace('_', ' ')} • ${goal.target_amount.toLocaleString()} target
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                      <FontAwesomeIcon icon={statusConfig.icon} className="w-3 h-3 mr-1" />
                      {goal.status}
                    </div>
                    
                    <FontAwesomeIcon 
                      icon={faArrowRight} 
                      className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" 
                    />
                  </div>
                </div>

                {/* Progress Section */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Progress
                    </span>
                    <span className="text-sm font-bold text-foreground dark:text-dark-foreground">
                      {goal.progress_percentage.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                    <motion.div 
                      className={`h-3 rounded-full ${
                        goal.is_on_track 
                          ? 'bg-green-500' 
                          : goal.progress_percentage < 25 
                            ? 'bg-red-500' 
                            : 'bg-yellow-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                    />
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <FontAwesomeIcon icon={faDollarSign} className="w-3 h-3 text-green-600" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Current
                      </span>
                    </div>
                    <p className="text-sm font-bold text-foreground dark:text-dark-foreground">
                      ${goal.current_amount.toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <FontAwesomeIcon icon={faDollarSign} className="w-3 h-3 text-blue-600" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Remaining
                      </span>
                    </div>
                    <p className="text-sm font-bold text-foreground dark:text-dark-foreground">
                      ${(goal.target_amount - goal.current_amount).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <FontAwesomeIcon icon={faCalendarAlt} className="w-3 h-3 text-purple-600" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Target
                      </span>
                    </div>
                    <p className="text-sm font-bold text-foreground dark:text-dark-foreground">
                      {new Date(goal.target_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}