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
    <div className={classNames(
      "fixed z-40",
      // Mobile positioning - avoid FAB overlap by adding more bottom spacing
      "bottom-5 left-4 right-20 lg:bottom-8 lg:right-6 lg:left-auto lg:max-w-[340px]",
      // Ensure it doesn't overlap with the expandable FAB on mobile
      "lg:right-6",
      className
    )}>
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
              className="bg-card shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer w-full min-w-[200px] max-w-[280px] mx-auto lg:mx-0 lg:max-w-[240px] rounded-2xl p-4"
              onClick={handleToggle}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Compact progress indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                 
                  
                    <FontAwesomeIcon icon={faLightbulb} className="size-3 mr-2 text-[var(--guide-warning-icon)]" />
                    <h3 className="font-medium text-sm text-foreground">Setup Guide 
                    <span className="text-xs text-muted-foreground"> ({stats.completedSteps}/{stats.totalSteps})</span>
                    </h3>
                </div>
                <FontAwesomeIcon icon={faChevronUp} className="w-3 h-3 text-muted-foreground" />
              </div>

              {/* Mini progress bar */}
              <div className="bg-muted rounded-full h-2 mt-3">
                <motion.div
                  className="bg-primary rounded-full h-2"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.progressPercentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {/* Pulsing animation for incomplete steps */}
              {stats.completedSteps < stats.totalSteps && (
                <motion.div
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[var(--guide-warning-icon)] rounded-full"
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
            className="bg-moneko-background rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 w-full max-w-[340px] mx-auto lg:mx-0 lg:max-h-[65vh] sm:max-h-[480px] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-card p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faGraduationCap} className="w-5 h-5 mr-3 text-primary" />
                  <div>
                    <h3 className="font-medium text-lg text-foreground">Your Financial Journey</h3>
                    <p className="text-sm text-muted-foreground">Master your financial future</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleHide}
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200 p-1"
                    title="Hide guide"
                  >
                    <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleToggle}
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200 p-1"
                  >
                    <FontAwesomeIcon icon={faChevronDown} className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="text-foreground font-medium">{stats.completedSteps}/{stats.totalSteps} completed</span>
                </div>
                <div className="bg-muted rounded-full h-2">
                  <motion.div
                    className="bg-primary rounded-full h-2"
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.progressPercentage}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>

            {/* Steps list */}
            <div className="p-6 max-h-[300px] sm:max-h-[350px] overflow-y-auto">
              <div className="space-y-3">
                {steps.map((step) => (
                  <Link key={step.id} to={step.path} className="block">
                    <motion.div
                      className={classNames(
                        "flex items-center p-4 rounded-2xl transition-all duration-200 cursor-pointer",
                        step.isCompleted
                          ? "bg-[var(--guide-completed-bg)] text-[var(--guide-completed-text)] shadow-sm"
                          : step.isNextStep
                          ? "bg-[var(--guide-next-bg)] text-[var(--guide-next-text)] shadow-sm ring-1 ring-[var(--guide-next-ring)]"
                          : "bg-subtle-background text-muted-foreground hover:bg-muted/50 hover:shadow-sm"
                      )}
                      whileHover={{ scale: 1.01, x: 4 }}
                      whileTap={{ scale: 0.99 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center flex-1">
                        <div
                          className={classNames(
                            "w-10 h-10 rounded-full flex items-center justify-center mr-4",
                            step.isCompleted
                              ? "bg-[var(--guide-completed-icon)] text-white"
                              : step.isNextStep
                              ? "bg-[var(--guide-next-icon)] text-white"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {step.isCompleted ? (
                            <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                          ) : (
                            <FontAwesomeIcon icon={getStepIcon(step.id)} className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4
                            className={classNames(
                              "font-medium text-sm",
                              step.isCompleted && "line-through opacity-75"
                            )}
                          >
                            {step.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{step.description}</p>
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
            <div className="bg-subtle-background p-6">
              <div className="text-center">
                {stats.isCompleted ? (
                  <span className="flex items-center justify-center text-[var(--guide-success-icon)] text-sm font-medium">
                    <FontAwesomeIcon icon={faTrophy} className="w-4 h-4 mr-2" />
                    Journey Complete!
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">Keep going! You're doing great!</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};