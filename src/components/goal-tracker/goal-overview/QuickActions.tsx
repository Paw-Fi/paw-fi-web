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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-foreground dark:text-dark-foreground">
          Quick Actions
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Take action on your goals
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleActions.map((action, index) => (
            <Link to={action.href} key={action.id}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                relative p-4 rounded-lg border-2 transition-all cursor-pointer group
                ${action.urgent 
                  ? 'border-red-200 dark:border-red-700 hover:border-red-300 dark:hover:border-red-600' 
                  : 'border-gray-100 dark:border-gray-700 hover:border-primary/20 dark:hover:border-primary/40'
                }
                hover:shadow-md
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {action.urgent && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              )}
              
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 ${action.bgColor} rounded-lg flex items-center justify-center`}>
                  <FontAwesomeIcon icon={action.icon} className={`w-5 h-5 ${action.color}`} />
                </div>
                
                <FontAwesomeIcon 
                  icon={faArrowRight} 
                  className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" 
                />
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-foreground dark:text-dark-foreground mb-1">
                  {action.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {action.description}
                </p>
              </div>
            </motion.div>
            </Link>
          ))}
        </div>

        {visibleActions.length === 1 && (
          <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              🎉 Great job! Your goals are well-managed. Consider creating new objectives to continue growing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}