"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faCheckCircle, 
  faTimes, 
  faExclamationTriangle,
  faInfoCircle,
  faRocket,
  faChartLine
} from "@fortawesome/free-solid-svg-icons";

export interface NotificationData {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  duration?: number; // ms, default 5000
  actionLabel?: string;
  onAction?: () => void;
  goal?: {
    id: string;
    title: string;
    progress_percentage: number;
  };
}

interface GoalNotificationToastProps {
  notifications: NotificationData[];
  onDismiss: (notificationId: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function GoalNotificationToast({ 
  notifications, 
  onDismiss, 
  position = 'top-right' 
}: GoalNotificationToastProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<NotificationData[]>([]);

  useEffect(() => {
    setVisibleNotifications(notifications);

    // Auto-dismiss notifications after their duration
    notifications.forEach(notification => {
      const duration = notification.duration || 5000;
      const timeoutId = setTimeout(() => {
        onDismiss(notification.id);
      }, duration);

      return () => clearTimeout(timeoutId);
    });
  }, [notifications, onDismiss]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return faCheckCircle;
      case 'warning':
        return faExclamationTriangle;
      case 'error':
        return faExclamationTriangle;
      case 'info':
      default:
        return faInfoCircle;
    }
  };

  const getColorClasses = (type: string) => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
          icon: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40',
          title: 'text-green-800 dark:text-green-200',
          message: 'text-green-700 dark:text-green-300',
          button: 'bg-green-600 hover:bg-green-700 text-white'
        };
      case 'warning':
        return {
          container: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
          icon: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40',
          title: 'text-amber-800 dark:text-amber-200',
          message: 'text-amber-700 dark:text-amber-300',
          button: 'bg-amber-600 hover:bg-amber-700 text-white'
        };
      case 'error':
        return {
          container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
          icon: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40',
          title: 'text-red-800 dark:text-red-200',
          message: 'text-red-700 dark:text-red-300',
          button: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'info':
      default:
        return {
          container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
          icon: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40',
          title: 'text-blue-800 dark:text-blue-200',
          message: 'text-blue-700 dark:text-blue-300',
          button: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-right':
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <div className={`fixed ${getPositionClasses()} z-50 space-y-3 max-w-sm w-full`}>
      <AnimatePresence>
        {visibleNotifications.map((notification, index) => {
          const colors = getColorClasses(notification.type);
          
          return (
            <motion.div
              key={notification.id}
              initial={{ 
                opacity: 0, 
                x: position.includes('right') ? 300 : -300,
                scale: 0.8 
              }}
              animate={{ 
                opacity: 1, 
                x: 0, 
                scale: 1 
              }}
              exit={{ 
                opacity: 0, 
                x: position.includes('right') ? 300 : -300,
                scale: 0.8 
              }}
              transition={{ 
                type: "spring", 
                damping: 20, 
                stiffness: 300,
                delay: index * 0.1 
              }}
              className={`${colors.container} border rounded-xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden`}
            >
              {/* Progress bar if goal data is provided */}
              {notification.goal && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all duration-300"
                    style={{ width: `${notification.goal.progress_percentage}%` }}
                  />
                </div>
              )}

              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`w-8 h-8 rounded-full ${colors.icon} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <FontAwesomeIcon 
                    icon={getIcon(notification.type)} 
                    className="w-4 h-4" 
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className={`font-semibold text-sm ${colors.title} leading-tight`}>
                        {notification.title}
                      </h4>
                      
                      {notification.goal && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          {notification.goal.title} • {Math.round(notification.goal.progress_percentage)}%
                        </p>
                      )}
                    </div>

                    {/* Close button */}
                    <button
                      onClick={() => onDismiss(notification.id)}
                      className="ml-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                    >
                      <FontAwesomeIcon 
                        icon={faTimes} 
                        className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" 
                      />
                    </button>
                  </div>

                  <p className={`text-sm ${colors.message} mt-1 leading-relaxed`}>
                    {notification.message}
                  </p>

                  {/* Action button */}
                  {notification.actionLabel && notification.onAction && (
                    <button
                      onClick={notification.onAction}
                      className={`mt-3 px-3 py-1.5 text-xs font-medium rounded-lg ${colors.button} transition-colors`}
                    >
                      {notification.actionLabel}
                    </button>
                  )}
                </div>
              </div>

              {/* Goal progress indicators */}
              {notification.goal && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-current/10">
                  <FontAwesomeIcon 
                    icon={faChartLine} 
                    className="w-3 h-3 text-gray-500 dark:text-gray-400" 
                  />
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div 
                      className="h-1.5 bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-300"
                      style={{ width: `${notification.goal.progress_percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {Math.round(notification.goal.progress_percentage)}%
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// Hook for managing notifications
export function useGoalNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const addNotification = (notification: Omit<NotificationData, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: NotificationData = {
      ...notification,
      id
    };
    
    setNotifications(prev => [...prev, newNotification]);
    return id;
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Pre-built notification creators
  const notifyProgressUpdate = (goal: { id: string; title: string; progress_percentage: number }, amountAdded: number) => {
    return addNotification({
      type: 'success',
      title: 'Progress Updated!',
      message: `Added $${amountAdded.toLocaleString()} to your goal. You're now at ${Math.round(goal.progress_percentage)}%!`,
      goal,
      actionLabel: 'View Goal',
      duration: 6000
    });
  };

  const notifyMilestoneComplete = (goal: { id: string; title: string; progress_percentage: number }, milestoneName: string) => {
    return addNotification({
      type: 'success',
      title: '🎉 Milestone Achieved!',
      message: `Congratulations! You completed "${milestoneName}". Keep up the momentum!`,
      goal,
      actionLabel: 'Celebrate',
      duration: 8000
    });
  };

  const notifyGoalComplete = (goal: { id: string; title: string; progress_percentage: number }) => {
    return addNotification({
      type: 'success',
      title: '🚀 Goal Completed!',
      message: `Amazing! You've successfully completed "${goal.title}". What's your next financial goal?`,
      goal,
      actionLabel: 'Create New Goal',
      duration: 10000
    });
  };

  const notifyBehindSchedule = (goal: { id: string; title: string; progress_percentage: number }) => {
    return addNotification({
      type: 'warning',
      title: 'Getting Behind Schedule',
      message: `You're falling behind on "${goal.title}". Let's chat with Alex to get back on track!`,
      goal,
      actionLabel: 'Chat with Alex',
      duration: 7000
    });
  };

  const notifyCheckInReminder = (goal: { id: string; title: string; progress_percentage: number }, daysSince: number) => {
    return addNotification({
      type: 'info',
      title: 'Check-in Reminder',
      message: `It's been ${daysSince} days since your last update. Even small progress counts!`,
      goal,
      actionLabel: 'Update Now',
      duration: 6000
    });
  };

  return {
    notifications,
    addNotification,
    dismissNotification,
    clearAll,
    // Pre-built notifiers
    notifyProgressUpdate,
    notifyMilestoneComplete,
    notifyGoalComplete,
    notifyBehindSchedule,
    notifyCheckInReminder
  };
}