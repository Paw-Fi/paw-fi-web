"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faBell, 
  faTimes, 
  faCheckCircle, 
  faCalendarAlt,
  faDownLong,
  faRocket,
  faClock
} from "@fortawesome/free-solid-svg-icons";

interface ReminderNotification {
  id: string;
  type: 'missed_checkin' | 'milestone_approaching' | 'progress_stall' | 'celebration' | 'weekly_checkin';
  title: string;
  message: string;
  goalId: string;
  goalTitle: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  createdAt: Date;
  scheduledFor?: Date;
}

interface ProactiveRemindersProps {
  goals: any[];
  onReminderAction?: (reminderId: string, action: 'dismiss' | 'complete' | 'snooze') => void;
  onOpenGoalChat?: (goalId: string) => void;
}

export function ProactiveReminders({ 
  goals, 
  onReminderAction, 
  onOpenGoalChat 
}: ProactiveRemindersProps) {
  const [reminders, setReminders] = useState<ReminderNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generate proactive reminders based on goal data
  useEffect(() => {
    const generateReminders = () => {
      const newReminders: ReminderNotification[] = [];
      const now = new Date();
      
      goals.forEach(goal => {
        // Check for missed check-ins (no activity in 7 days)
        // Use updated_at as proxy for last activity, fallback to created_at
        const lastActivity = goal.updated_at ? new Date(goal.updated_at) : new Date(goal.created_at);
        const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceActivity >= 7 && goal.status !== 'completed') {
          newReminders.push({
            id: `missed-checkin-${goal.id}`,
            type: 'missed_checkin',
            title: 'Missing Your Check-in',
            message: `It's been ${daysSinceActivity} days since your last update on "${goal.title}". Even small progress counts!`,
            goalId: goal.id,
            goalTitle: goal.title,
            priority: daysSinceActivity >= 14 ? 'high' : 'medium',
            actionable: true,
            createdAt: now
          });
        }

        // Check for approaching milestones
        if (goal.milestones) {
          goal.milestones.forEach((milestone: any) => {
            if (milestone.status !== 'completed' && milestone.due_date) {
              const dueDate = new Date(milestone.due_date);
              const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysUntilDue <= 7 && daysUntilDue >= 0) {
                newReminders.push({
                  id: `milestone-due-${milestone.id}`,
                  type: 'milestone_approaching',
                  title: 'Milestone Due Soon',
                  message: `Your "${milestone.title}" milestone for ${goal.title} is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}!`,
                  goalId: goal.id,
                  goalTitle: goal.title,
                  priority: daysUntilDue <= 3 ? 'high' : 'medium',
                  actionable: true,
                  createdAt: now,
                  scheduledFor: dueDate
                });
              }
            }
          });
        }

        // Check for progress stalls (behind schedule)
        if (!goal.is_on_track && goal.status !== 'completed') {
          const progressPercent = goal.progress_percentage || 0;
          const timeElapsed = goal.start_date ? 
            (now.getTime() - new Date(goal.start_date).getTime()) / (1000 * 60 * 60 * 24) : 0;
          const totalDays = goal.target_date ? 
            (new Date(goal.target_date).getTime() - new Date(goal.start_date).getTime()) / (1000 * 60 * 60 * 24) : 1;
          const expectedProgress = (timeElapsed / totalDays) * 100;
          
          if (progressPercent < expectedProgress * 0.7) { // 30% behind expected
            newReminders.push({
              id: `progress-stall-${goal.id}`,
              type: 'progress_stall',
              title: 'Getting Behind Schedule',
              message: `You're ${Math.round(expectedProgress - progressPercent)}% behind on "${goal.title}". Let's get back on track!`,
              goalId: goal.id,
              goalTitle: goal.title,
              priority: 'high',
              actionable: true,
              createdAt: now
            });
          }
        }

        // Check for celebrations (recent milestones completed)
        if (goal.milestones) {
          goal.milestones.forEach((milestone: any) => {
            if (milestone.status === 'completed' && milestone.completed_date) {
              const completedDate = new Date(milestone.completed_date);
              const daysSinceCompletion = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysSinceCompletion <= 1) { // Completed within last day
                newReminders.push({
                  id: `celebration-${milestone.id}`,
                  type: 'celebration',
                  title: '🎉 Milestone Achieved!',
                  message: `Congratulations! You completed "${milestone.title}" for ${goal.title}. Keep up the momentum!`,
                  goalId: goal.id,
                  goalTitle: goal.title,
                  priority: 'medium',
                  actionable: false,
                  createdAt: now
                });
              }
            }
          });
        }

        // Weekly check-in reminder for active goals
        if (goal.status !== 'completed' && daysSinceActivity >= 6) {
          newReminders.push({
            id: `weekly-checkin-${goal.id}`,
            type: 'weekly_checkin',
            title: 'Weekly Check-in Time',
            message: `How did this week go with "${goal.title}"? Share your progress, even if it's small!`,
            goalId: goal.id,
            goalTitle: goal.title,
            priority: 'low',
            actionable: true,
            createdAt: now
          });
        }
      });

      // Sort by priority and date
      newReminders.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      setReminders(newReminders.slice(0, 5)); // Limit to 5 most important
      setIsLoading(false);
    };

    if (goals.length > 0) {
      generateReminders();
    } else {
      setIsLoading(false);
    }
  }, [goals]);

  const handleReminderAction = (reminderId: string, action: 'dismiss' | 'complete' | 'snooze') => {
    // Remove reminder from list
    setReminders(prev => prev.filter(r => r.id !== reminderId));
    
    // Call parent callback
    if (onReminderAction) {
      onReminderAction(reminderId, action);
    }
  };

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'missed_checkin':
        return faClock;
      case 'milestone_approaching':
        return faCalendarAlt;
      case 'progress_stall':
        return faDownLong;
      case 'celebration':
        return faRocket;
      case 'weekly_checkin':
        return faBell;
      default:
        return faBell;
    }
  };

  const getReminderColor = (type: string, priority: string) => {
    if (type === 'celebration') return 'from-green-400 to-green-600';
    if (priority === 'high') return 'from-red-400 to-red-600';
    if (priority === 'medium') return 'from-amber-400 to-amber-600';
    return 'from-blue-400 to-blue-600';
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <FontAwesomeIcon icon={faCheckCircle} className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          All Caught Up!
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          No reminders right now. Keep up the great work on your goals!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {reminders.map((reminder) => (
          <motion.div
            key={reminder.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getReminderColor(reminder.type, reminder.priority)} flex items-center justify-center flex-shrink-0`}>
                <FontAwesomeIcon 
                  icon={getReminderIcon(reminder.type)} 
                  className="w-5 h-5 text-white" 
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {reminder.title}
                  </h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    reminder.priority === 'high' 
                      ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                      : reminder.priority === 'medium'
                      ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200'
                      : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                  }`}>
                    {reminder.priority}
                  </span>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                  {reminder.message}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {reminder.actionable && onOpenGoalChat && (
                    <button
                      onClick={() => onOpenGoalChat(reminder.goalId)}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Chat with Alex
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleReminderAction(reminder.id, 'dismiss')}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    Dismiss
                  </button>
                  
                  {reminder.type !== 'celebration' && (
                    <button
                      onClick={() => handleReminderAction(reminder.id, 'snooze')}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title="Remind me later"
                    >
                      <FontAwesomeIcon icon={faClock} className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => handleReminderAction(reminder.id, 'dismiss')}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
              >
                <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}