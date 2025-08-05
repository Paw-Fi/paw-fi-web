"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faComments, 
  faTimes, 
  faExpand, 
  faCompress,
  faBullseye 
} from "@fortawesome/free-solid-svg-icons";
import { GoalTrackerChatInterface } from "../chat/goal-tracker-chat-interface";

interface GoalTrackerChatWidgetProps {
  goalId?: string; // Optional - for global mode support
  goal?: any;
  onProgressUpdate?: () => void;
  onGoalUpdate?: () => void;
  className?: string;
}

export function GoalTrackerChatWidget({ 
  goalId, 
  goal, 
  onProgressUpdate, 
  onGoalUpdate,
  className = "" 
}: GoalTrackerChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className={`fixed bottom-6 right-6 z-50 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-full p-4 shadow-xl hover:shadow-2xl transition-all duration-300 ${className}`}
            title="Chat with Alex - Your Goal Tracker AI"
          >
            <div className="relative">
              <FontAwesomeIcon icon={faComments} className="w-6 h-6" />
              
              {/* Notification dot for new insights or reminders */}
              {goal && !goal.is_on_track && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              )}
              
              {/* Progress ring */}
              <svg className="absolute -inset-2 w-10 h-10 transform -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="2"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth="2"
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (1 - (goal?.progress_percentage || 0) / 100)}`}
                  className="transition-all duration-300"
                />
              </svg>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ 
              opacity: 0, 
              scale: 0.8, 
              x: 100, 
              y: 100 
            }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              x: 0, 
              y: 0 
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.8, 
              x: 100, 
              y: 100 
            }}
            transition={{ 
              type: "spring", 
              damping: 20, 
              stiffness: 300 
            }}
            className={`fixed z-50 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden ${
              isExpanded 
                ? 'inset-4 md:inset-8' 
                : 'bottom-6 right-6 w-96 h-[500px]'
            } transition-all duration-300`}
          >
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 border-b border-teal-100 dark:border-teal-800">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600">
                  <FontAwesomeIcon icon={faBullseye} className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    Alex - Goal Tracker AI
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Ready to help you succeed!
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-800 transition-colors"
                  title={isExpanded ? "Minimize" : "Expand"}
                >
                  <FontAwesomeIcon 
                    icon={isExpanded ? faCompress : faExpand} 
                    className="w-4 h-4 text-gray-500 dark:text-gray-400" 
                  />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-800 transition-colors"
                  title="Close chat"
                >
                  <FontAwesomeIcon 
                    icon={faTimes} 
                    className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-red-600" 
                  />
                </button>
              </div>
            </div>

            {/* Chat Interface */}
            <div className="flex-1 overflow-hidden">
              <GoalTrackerChatInterface
                goalId={goalId}
                goal={goal}
                onProgressUpdate={onProgressUpdate}
                onGoalUpdate={onGoalUpdate}
                isExpanded={isExpanded}
                className="h-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>
    </>
  );
}