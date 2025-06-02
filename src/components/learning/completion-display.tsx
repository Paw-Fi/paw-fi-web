"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { motion, useAnimation, AnimatePresence } from "framer-motion";

// Import the unlockNextLesson function - we'll use this directly in the component
import { unlockNextLesson } from './hooks/unlock-next-lesson';

interface CompletionDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string; // Optional as we'll construct it with reward info
  description: string;
  lessonTitle?: string; // The completed lesson title
  lessonId?: string; // Added explicit lessonId prop for direct access
  courseId?: string; // <-- add courseId as a prop
  reward?: {
    amount: number;
    unit: string;
  };
  rewardsProgress?: number; // Progress value between 0-100
  nextSteps?: {
    challenges?: {
      title: string;
      description: string;
    };
    badges?: {
      title: string;
      description: string;
    };
  };
  actionText: string;
  emoji?: string;
  onCustomAction?: () => void; // Added to support custom actions like retry
  isSuccess: boolean;
}

export function CompletionDisplay({
  isOpen,
  onClose,
  title = "Success!",
  description,
  lessonTitle,
  lessonId, // Add the direct lessonId parameter
  courseId, // Add courseId as a prop
  reward,
  rewardsProgress,
  nextSteps,
  actionText = "Continue",
  emoji = "🎉",
  isSuccess,
  onCustomAction,
}: CompletionDisplayProps) {
  // Animation controls for staggered animations
  const controls = useAnimation();
  
  // Define animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 15 } }
  };
  
  const fadeInScale = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 400, damping: 15 } }
  };
  
  const bounceAnimation = {
    hidden: { scale: 1 },
    visible: { scale: 1, y: 0 },
    bounce: { 
      y: [-15, 0], 
      transition: { 
        repeat: 1, 
        repeatType: "mirror" as const, 
        duration: 0.5, 
        ease: "easeOut" 
      } 
    }
  };
  
  // Confetti animation variants
  const confettiAnimation = {
    hidden: { opacity: 0, y: -10 },
    visible: (i: number) => ({
      opacity: 1,
      y: window.innerHeight,
      x: (Math.random() - 0.5) * 200,
      rotate: Math.random() * 360,
      transition: {
        duration: Math.random() * 3 + 2,
        repeat: Infinity,
        delay: Math.random() * 2,
        ease: "linear"
      }
    })
  };
  
  // Start animations when modal is opened
  useEffect(() => {
    if (isOpen) {
      controls.start("visible");
      
      // Trigger bounce animation after a short delay
      setTimeout(() => {
        controls.start("bounce");
      }, 300);
    } else {
      controls.start("hidden");
    }
  }, [isOpen, controls]);
  
  // Generate confetti colors
  const confettiColors = ["#7458FF", "#9181FF", "#16CDA2", "#FFD166", "#FF6B6B"];
  
  // Generate confetti pieces
  const confettiPieces = Array.from({ length: 50 }).map((_, i) => {
    const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
    const size = Math.random() * 10 + 5;
    const isCircle = Math.random() > 0.5;
    const left = `${Math.random() * 100}%`;
    
    return { color, size, isCircle, left, id: i };
  });


  // Create title based on available information
  const generatedTitle =
    title ||
    (reward
      ? `Success! +${reward.amount} ${reward.unit} earned!`
      : "Lesson Complete!");

  return (
    <Modal
      isOpen={isOpen}
      disableOverlayClick
      onClose={onClose}
      contentClassName="modal-content mx-auto max-w-[90vw] lg:max-w-lg flex flex-col rounded-3xl bg-white p-8 text-center relative overflow-hidden"
    >
      {/* Animated confetti particles - only show for success */}
      {isSuccess && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Animated confetti */}
          {confettiPieces.map((confetti) => (
            <motion.div
              key={confetti.id}
              className="absolute"
              style={{
                width: `${confetti.size}px`,
                height: `${confetti.size}px`,
                borderRadius: confetti.isCircle ? '50%' : '0',
                backgroundColor: confetti.color,
                top: '-10px',
                left: confetti.left,
                position: 'absolute'
              }}
              initial="hidden"
              animate="visible"
              variants={confettiAnimation}
              custom={confetti.id}
            />
          ))}
          <div className="absolute top-[10%] left-[15%] h-5 w-2 rotate-[-30deg] rounded-sm bg-purple-400"></div>
          <div className="absolute top-[15%] left-[20%] h-4 w-4 rotate-12 rounded-sm bg-purple-500"></div>
          <div className="absolute right-[10%] bottom-[15%] h-6 w-2 rotate-45 bg-purple-300"></div>
          <div className="absolute top-[80%] right-[15%] h-4 w-4 rotate-12 rounded-full bg-purple-400"></div>

          {/* Green particles */}
          <div className="absolute bottom-[30%] left-[10%] h-5 w-5 rounded-full bg-green-400"></div>
          <div className="absolute right-[20%] bottom-[45%] h-3 w-6 rotate-[-15deg] bg-teal-400"></div>

          {/* Red/orange particles */}
          <div className="absolute top-[30%] right-[5%] h-4 w-3 rotate-12 rounded-sm bg-red-300"></div>
          <div className="absolute top-[45%] left-[10%] h-3 w-3 rotate-12 rounded-full bg-orange-300"></div>

          {/* Yellow particles */}
          <div className="absolute bottom-[10%] left-[30%] h-4 w-4 rotate-45 rounded-sm bg-yellow-300"></div>
          <div className="absolute top-[60%] right-[40%] h-2 w-5 rotate-[-20deg] bg-yellow-400"></div>
        </div>
      )}

      {/* Title and description */}
      <div className="mt-2 flex flex-col items-center justify-center pb-6">
        <motion.div 
          className="mb-4 flex items-center justify-center"
          initial="hidden"
          animate={controls}
          variants={fadeInScale}
        >
          {isSuccess ? (
            <div className="mb-1 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <svg
                className="h-10 w-10 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          ) : (
            <div className="mb-1 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <svg
                className="h-10 w-10 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          )}
        </motion.div>

        {/* Title with XP */}
        <motion.h2 
          className="mb-2 text-3xl font-bold"
          initial="hidden"
          animate={controls}
          variants={fadeInUp}
          custom={0.1}
        >
          <motion.span
            initial="hidden"
            animate={controls}
            variants={bounceAnimation}
          >
            {emoji}
          </motion.span>{" "}
          {generatedTitle}
        </motion.h2>

        {/* Completed lesson description */}
        <motion.p 
          className="mb-8 text-xl text-gray-700"
          initial="hidden"
          animate={controls}
          variants={fadeInUp}
          custom={0.2}
        >
          {lessonTitle ? `You've completed ${lessonTitle}.` : description}
        </motion.p>
      </div>

      {/* View rewards section - only show for success */}
      {isSuccess && (
        <motion.div
          className="mb-8 w-full rounded-xl border border-gray-200 p-6"
          initial="hidden"
          animate={controls}
          variants={fadeInScale}
          custom={0.3}
        >
          <div className="mb-4 flex items-center">
            <div className="mr-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
              <svg
                className="h-8 w-8 text-purple-500"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 15.0006L8.42003 16.6006C7.59003 17.0006 6.60003 16.2506 6.80003 15.3406L7.60003 11.4006L4.69003 8.69058C4.00003 8.05058 4.39003 6.91058 5.32003 6.81058L9.32003 6.36058L11.05 2.72058C11.46 1.90058 12.56 1.90058 12.97 2.72058L14.7 6.36058L18.7 6.81058C19.63 6.91058 20.02 8.05058 19.33 8.69058L16.42 11.4006L17.22 15.3406C17.42 16.2506 16.43 17.0006 15.6 16.6006L12 15.0006Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-xl font-bold">View Rewards</div>
              <div className="flex items-center text-base text-gray-500">
                Add photo and personal details
                <svg
                  className="ml-1 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-green-400"
              style={{ width: `${rewardsProgress || 10}%` }}
            />
          </div>
        </motion.div>
      )}

      {/* Next steps section - only show for success */}
      {isSuccess && nextSteps && (
        <motion.div 
          className="mb-8 w-full"
          initial="hidden"
          animate={controls}
          variants={fadeInUp}
          custom={0.4}
        >
          <motion.h3 className="mb-4 text-left text-lg font-bold">Next for you:</motion.h3>
          <motion.div className="grid grid-cols-2 gap-4">
            {nextSteps?.challenges && (
              <div className="rounded-xl bg-blue-50 p-5">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-400">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 16H9.01M9 9H15V15H9V9Z"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h4 className="text-left text-lg font-bold">
                  {nextSteps.challenges.title}
                </h4>
                <p className="text-left text-gray-600">
                  {nextSteps.challenges.description}
                </p>
              </div>
            )}
            {nextSteps?.badges && (
              <div className="rounded-xl bg-purple-50 p-5">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 15C15.866 15 19 11.866 19 8C19 4.13401 15.866 1 12 1C8.13401 1 5 4.13401 5 8C5 11.866 8.13401 15 12 15Z"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.21 13.89L7 23L12 20L17 23L15.79 13.88"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h4 className="text-left text-lg font-bold">
                  {nextSteps.badges.title}
                </h4>
                <p className="text-left text-gray-600">
                  {nextSteps.badges.description}
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Action buttons */}
      <motion.div 
        className="flex flex-col space-y-4"
        initial="hidden"
        animate={controls}
        variants={fadeInUp}
        custom={0.5}
      >
        {!isSuccess && onCustomAction ? (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCustomAction}
              className="w-full py-4 text-lg font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Try Again
            </motion.button>
            <motion.p 
              className="text-center text-sm text-gray-500 underline cursor-pointer" 
              onClick={onClose}
              whileHover={{ scale: 1.05 }}
            >
              {actionText}
            </motion.p>
          </>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              // If this is a success completion and we have the lessonId, unlock next lesson
              if (isSuccess && lessonId) {
                console.log('Attempting to unlock next lesson with ID:', lessonId);
                const unlocked = unlockNextLesson(lessonId, courseId);
                if (unlocked) {
                  console.log('Successfully unlocked next lesson');
                } else {
                  console.warn('Failed to unlock next lesson - no matching lesson found or already unlocked');
                }
              } else {
                console.warn('Missing lessonId or not a success case - cannot unlock next lesson');
              }
              
              // Use immediate navigation to avoid background help tips interference
              if (actionText === "Continue Learning" && courseId) {
                window.location.href = `/learning/${courseId}`;
              } else {
                onClose();
              }
            }}
            className="w-full py-4 text-lg font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            {actionText}
          </motion.button>
        )}
      </motion.div>
    </Modal>
  );
}
