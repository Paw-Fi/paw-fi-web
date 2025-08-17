import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faLightbulb,
  faComments,
  faChessKnight,
  faBookOpen,
  faChevronUp,
  faChevronDown,
  faTrophy,
  faArrowRight,
  faGraduationCap,
  faHandHoldingDollar,
  faCalculator,
  faUserPlus,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/contexts/auth-context';
import { Link } from '@tanstack/react-router';
import classNames from 'classnames';
import { useLocalProgress } from '@/hooks/use-local-progress';
import { useCookie } from '@/utils/use-cookie';

interface FloatingGuideWindowProps {
  className?: string;
  onClose?: () => void;
}

export const FloatingGuideWindow: React.FC<FloatingGuideWindowProps> = ({ className, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { getCookie, setCookie } = useCookie();
  const [isHidden, setIsHidden] = useState(() => getCookie('moneko-guide-hidden') === 'true');
  const { steps, stats } = useLocalProgress();

  // Get step icons
  const getStepIcon = (stepId: string) => {
    switch (stepId) {
      case 'account':
        return faUserPlus;
      case 'profile':
        return faGraduationCap;
      case 'portfolio':
        return faHandHoldingDollar;
      case 'chat':
        return faComments;
      case 'learning':
        return faChessKnight;
      case 'essentials':
        return faBookOpen;
      case 'tracker':
        return faTrophy;
      default:
        return faLightbulb;
    }
  };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleHide = () => {
    setIsHidden(true);
    setCookie('moneko-guide-hidden', 'true', { days: 365 });
    onClose?.();
  };

  // Don't render if hidden
  if (isHidden) {
    return null;
  }

  return (
    <div className={classNames("fixed bottom-6 right-6 z-40", className)}>
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          // Collapsed State - Minimized teaser
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <motion.div
              className="bg-gradient-to-r from-primary to-purple-500 text-white p-3 rounded-xl shadow-lg cursor-pointer min-w-[200px] max-w-[240px]"
              onClick={handleToggle}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Compact progress indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                 
                  
                    <FontAwesomeIcon icon={faLightbulb} className="size-3 mr-1 text-yellow-400" />
                    <h3 className="font-semibold text-xs">Setup Guide 

                    <span className="text-xs text-white/80"> ({stats.completedSteps}/{stats.totalSteps})</span>

                    </h3>
                </div>
                <FontAwesomeIcon icon={faChevronUp} className="w-3 h-3 text-white/70" />
              </div>

              {/* Mini progress bar */}
              <div className="bg-white/20 rounded-full h-1 mt-2">
                <motion.div
                  className="bg-white rounded-full h-1"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.progressPercentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {/* Pulsing animation for incomplete steps */}
              {stats.completedSteps < stats.totalSteps && (
                <motion.div
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                />
              )}
            </motion.div>
          </motion.div>
        ) : (
          // Expanded State - Detailed progress
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-[340px] max-h-[480px] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-purple-500 text-white p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faGraduationCap} className="w-5 h-5 mr-2" />
                  <div>
                    <h3 className="font-semibold text-base">Your Financial Journey</h3>
                    <p className="text-xs text-white/80">Master your financial future</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleHide}
                    className="text-white/70 hover:text-white transition-colors"
                    title="Hide guide"
                  >
                    <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleToggle}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    <FontAwesomeIcon icon={faChevronDown} className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Progress</span>
                  <span>{stats.completedSteps}/{stats.totalSteps} completed</span>
                </div>
                <div className="bg-white/20 rounded-full h-1.5">
                  <motion.div
                    className="bg-white rounded-full h-1.5"
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.progressPercentage}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>

            {/* Steps list */}
            <div className="p-3 max-h-[300px] overflow-y-auto">
              <div className="space-y-2">
                {steps.map((step) => (
                  <Link key={step.id} to={step.path} className="block">
                    <motion.div
                      className={classNames(
                        "flex items-center p-2.5 rounded-lg border transition-all duration-200 cursor-pointer",
                        step.isCompleted
                          ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300"
                          : step.isNextStep
                          ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300 ring-1 ring-blue-100 dark:ring-blue-800"
                          : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600/50"
                      )}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-center flex-1">
                        <div
                          className={classNames(
                            "w-8 h-8 rounded-full flex items-center justify-center mr-2.5",
                            step.isCompleted
                              ? "bg-green-500 text-white"
                              : step.isNextStep
                              ? "bg-blue-500 text-white"
                              : "bg-gray-300 text-gray-600"
                          )}
                        >
                          {step.isCompleted ? (
                            <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
                          ) : (
                            <FontAwesomeIcon icon={getStepIcon(step.id)} className="w-3 h-3" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4
                            className={classNames(
                              "font-medium text-sm",
                              step.isCompleted && "line-through"
                            )}
                          >
                            {step.title}
                          </h4>
                          <p className="text-xs opacity-75 line-clamp-2">{step.description}</p>
                        </div>
                      </div>
                      {step.isNextStep && (
                        <motion.div
                          animate={{ x: [0, 3, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
                        </motion.div>
                      )}
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 border-t border-gray-200 dark:border-gray-600">
              <div className="text-center">
                {stats.isCompleted ? (
                  <span className="flex items-center justify-center text-green-600 dark:text-green-400 text-sm">
                    <FontAwesomeIcon icon={faTrophy} className="w-4 h-4 mr-1" />
                    Journey Complete! 🎉
                  </span>
                ) : (
                  <span className="text-gray-600 dark:text-gray-300 text-sm">Keep going! You're doing great!</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};