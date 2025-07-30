import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faPlus, 
  faChartLine, 
  faExclamationTriangle,
  faCalendarCheck,
  faArrowRight
} from "@fortawesome/free-solid-svg-icons";
import { FinancialGoal } from "../types/goal-types";

interface QuickActionsProps {
  goals: FinancialGoal[];
}

export function QuickActions({ goals }: QuickActionsProps) {
  // Calculate quick action insights
  const overDueGoals = goals.filter(goal => {
    if (goal.status === 'completed') return false;
    return new Date(goal.target_date) < new Date() && goal.progress_percentage < 100;
  });

  const offTrackGoals = goals.filter(goal => 
    goal.status === 'active' && !goal.is_on_track
  );

  const nearingTargetGoals = goals.filter(goal => {
    const targetDate = new Date(goal.target_date);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return goal.status === 'active' && diffDays <= 30 && diffDays > 0;
  });

  const actions = [
    {
      id: 'create',
      title: 'Create New Goal',
      description: 'Set up a new financial objective with AI guidance',
      icon: faPlus,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      href: '/dashboard/tracker/create',
      show: true,
    },
    {
      id: 'review-overdue',
      title: 'Review Overdue Goals',
      description: `${overDueGoals.length} goal${overDueGoals.length !== 1 ? 's' : ''} past target date`,
      icon: faExclamationTriangle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      href: '/dashboard/tracker?filter=overdue',
      show: overDueGoals.length > 0,
      urgent: true,
    },
    {
      id: 'track-progress',
      title: 'Update Progress',
      description: `${offTrackGoals.length} goal${offTrackGoals.length !== 1 ? 's' : ''} need attention`,
      icon: faChartLine,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      href: '/dashboard/tracker?filter=off-track',
      show: offTrackGoals.length > 0,
    },
    {
      id: 'upcoming-deadlines',
      title: 'Upcoming Deadlines',
      description: `${nearingTargetGoals.length} goal${nearingTargetGoals.length !== 1 ? 's' : ''} due soon`,
      icon: faCalendarCheck,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      href: '/dashboard/tracker?filter=upcoming',
      show: nearingTargetGoals.length > 0,
    },
  ];

  const visibleActions = actions.filter(action => action.show);

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-gray-200/30 dark:border-gray-700/30 overflow-hidden">
      {/* Compact Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-700/30 dark:to-transparent border-b border-gray-200/30 dark:border-gray-700/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Quick Actions
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Take action on your goals
            </p>
          </div>
          {visibleActions.some(action => action.urgent) && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-red-600 dark:text-red-400">Urgent</span>
            </div>
          )}
        </div>
      </div>

      {/* Modern Action Items */}
      <div className="p-4">
        <div className="space-y-2">
          {visibleActions.map((action, index) => (
            <Link to={action.href} key={action.id}>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  delay: index * 0.05,
                  duration: 0.3,
                  ease: [0.4, 0, 0.2, 1]
                }}
                className={`
                  group relative flex items-center p-3 rounded-xl transition-all duration-200
                  ${action.urgent 
                    ? 'bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200/50 dark:border-red-800/50' 
                    : 'bg-gray-50/50 dark:bg-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50'
                  }
                  hover:shadow-sm cursor-pointer
                `}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {/* Icon */}
                <div className={`w-8 h-8 ${action.bgColor} rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-200`}>
                  <FontAwesomeIcon icon={action.icon} className={`w-3.5 h-3.5 ${action.color}`} />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                      {action.title}
                    </h3>
                    <FontAwesomeIcon 
                      icon={faArrowRight} 
                      className="w-3 h-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all duration-200" 
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                    {action.description}
                  </p>
                </div>

                {/* Urgent indicator */}
                {action.urgent && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></div>
                )}
              </motion.div>
            </Link>
          ))}
        </div>

        {/* Success state when only create action is visible */}
        {visibleActions.length === 1 && visibleActions[0].id === 'create' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 p-3 rounded-xl bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200/30 dark:border-green-800/30 text-center"
          >
            <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-2">
              <span className="text-white text-sm">✓</span>
            </div>
            <p className="text-xs text-green-700 dark:text-green-300 font-medium">
              Great job! Your goals are well-managed.
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Consider creating new objectives to continue growing.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}