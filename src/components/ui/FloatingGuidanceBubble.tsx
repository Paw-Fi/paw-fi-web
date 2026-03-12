import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle } from "lucide-react";
import TypewriterText from "./TypewriterText";
import { AI_ID } from "@/contexts/ai-chat-context";
import monekoAvatar from "@/assets/images/logo/moneko.png";
import finniAvatar from "@/assets/images/logo/finni.png";
import { Button } from "./button";
import { Link } from "@tanstack/react-router";

interface FloatingGuidanceBubbleProps {
  agentId: AI_ID;
  message: string;
  isVisible: boolean;
  onClose?: () => void;
  onClick?: () => void;
  position?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  autoHideDelay?: number; // Auto-hide after X milliseconds (0 = no auto-hide)
  isMobile?: boolean; // Flag to enable mobile positioning
  actionButton?: { text: string; link: string }; // Custom action button
}

export const FloatingGuidanceBubble: React.FC<FloatingGuidanceBubbleProps> = ({
  agentId,
  message,
  isVisible,
  onClose,
  onClick,
  position = { bottom: "100px", right: "20px" },
  autoHideDelay = 10000, // 10 seconds default
  isMobile = false,
  actionButton,
}) => {
  const [isTypewriterComplete, setIsTypewriterComplete] = useState(false);
  const [shouldAutoHide, setShouldAutoHide] = useState(false);

  // Auto-hide timer
  useEffect(() => {
    if (isVisible && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        setShouldAutoHide(true);
        setTimeout(() => onClose?.(), 300); // Small delay for animation
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHideDelay, onClose]);

  // Reset state when visibility changes
  useEffect(() => {
    if (isVisible) {
      setIsTypewriterComplete(false);
      setShouldAutoHide(false);
    }
  }, [isVisible, message]);

  const handleTypewriterComplete = () => {
    setIsTypewriterComplete(true);
  };

  const getAgentInfo = (id: AI_ID) => {
    switch (id) {
      case "advisor":
        return {
          name: "Moneko",
          avatar: monekoAvatar,
          color: "from-blue-500 to-indigo-600",
          bgColor: "bg-white/20 dark:bg-gray-900/30",
          borderColor: "border-white/30 dark:border-gray-700/30",
          bubbleColor:
            "bg-white/80 dark:bg-gray-800/80 border-white/40 dark:border-gray-700/40",
        };
      case "educator":
        return {
          name: "Finni",
          avatar: finniAvatar,
          color: "from-purple-500 to-pink-600",
          bgColor: "bg-white/20 dark:bg-gray-900/30",
          borderColor: "border-white/30 dark:border-gray-700/30",
          bubbleColor:
            "bg-white/80 dark:bg-gray-800/80 border-white/40 dark:border-gray-700/40",
        };
      default:
        return {
          name: "Moneko",
          avatar: monekoAvatar,
          color: "from-blue-500 to-indigo-600",
          bgColor: "bg-white/20 dark:bg-gray-900/30",
          borderColor: "border-white/30 dark:border-gray-700/30",
          bubbleColor:
            "bg-white/80 dark:bg-gray-800/80 border-white/40 dark:border-gray-700/40",
        };
    }
  };

  const agentInfo = getAgentInfo(agentId);

  if (!message || !isVisible) return null;

  // Mobile-responsive positioning
  const positionStyles = isMobile
    ? {
        position: "fixed" as const,
        zIndex: 1000,
        bottom: "120px", // Above FAB buttons
        left: "16px",
        right: "80px", // Leave space for FABs
      }
    : {
        position: "fixed" as const,
        zIndex: 1000,
        ...position,
      };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          style={positionStyles}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{
            opacity: shouldAutoHide ? 0 : 1,
            scale: shouldAutoHide ? 0.9 : 1,
            y: shouldAutoHide ? 10 : 0,
          }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{
            duration: 0.3,
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          className={isMobile ? "w-full max-w-xs" : "max-w-sm"}
        >
          {/* Main bubble container */}
          <motion.div
            className={`${agentInfo.bgColor} rounded-xl border p-3 shadow-xl sm:p-4 ${agentInfo.borderColor} backdrop-blur-lg backdrop-saturate-150 ${isMobile ? "w-full min-w-0" : "min-w-[20rem] sm:min-w-[25rem]"}`}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start space-x-3">
              {/* Agent Avatar */}
              <div className="flex-shrink-0">
                <motion.div
                  className={`h-10 w-10 rounded-full bg-gradient-to-br ${agentInfo.color} cursor-pointer p-0.5 shadow-md`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClick}
                >
                  <img
                    src={agentInfo.avatar}
                    alt={`${agentInfo.name} AI`}
                    className="h-full w-full rounded-full bg-white object-cover dark:bg-gray-800"
                  />
                </motion.div>
              </div>

              {/* Message Content */}
              <div className="min-w-0 flex-1">
                <div
                  className={`${agentInfo.bubbleColor} relative rounded-lg border p-3 shadow-lg backdrop-blur-md backdrop-saturate-150`}
                >
                  {/* Speech bubble tail */}
                  <div className="absolute top-3 left-0 -ml-1.5 h-0 w-0 border-t-3 border-r-6 border-b-3 border-t-transparent border-r-white/80 border-b-transparent dark:border-r-gray-800/80"></div>

                  {/* Agent name and close button */}
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        {agentInfo.name}
                      </h4>
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400"></div>
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">
                          Guidance
                        </span>
                      </div>
                    </div>

                    {onClose && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {/* Typewriter message */}
                  <div className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                    <TypewriterText
                      text={message}
                      speed={40} // Faster for guidance messages
                      delay={200}
                      showCursor={true}
                      cursorClassName="animate-pulse text-blue-400 dark:text-blue-300"
                      onComplete={handleTypewriterComplete}
                    />
                  </div>

                  {/* Action button or click to chat hint */}
                  {isTypewriterComplete && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.3 }}
                      className="mt-3 border-t border-gray-100 pt-2 dark:border-gray-700"
                    >
                      {actionButton ? (
                        <Link to={actionButton.link} onClick={onClose}>
                          <div className="flex cursor-pointer items-center gap-2 text-xs text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                            <MessageCircle className="h-3 w-3" />
                            <span>{actionButton.text}</span>
                          </div>
                        </Link>
                      ) : onClick ? (
                        <div
                          className="flex cursor-pointer items-center gap-2 text-xs text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClick();
                          }}
                        >
                          <MessageCircle className="h-3 w-3" />
                          <span>Click to chat with {agentInfo.name}</span>
                        </div>
                      ) : null}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Auto-hide progress indicator */}
            {autoHideDelay > 0 && !shouldAutoHide && (
              <motion.div
                className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-white/20 backdrop-blur-sm dark:bg-gray-600/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{
                    duration: autoHideDelay / 1000,
                    ease: "linear",
                    delay: 1,
                  }}
                />
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
