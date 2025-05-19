"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import gsap from "gsap";

// Import the unlockNextLesson function - we'll use this directly in the component
import { unlockNextLesson } from './hooks/unlock-next-lesson';

interface CompletionDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string; // Optional as we'll construct it with reward info
  description: string;
  lessonTitle?: string; // The completed lesson title
  lessonId?: string; // Added explicit lessonId prop for direct access
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
  reward,
  rewardsProgress,
  nextSteps,
  actionText = "Continue",
  emoji = "🎉",
  isSuccess,
  onCustomAction,
}: CompletionDisplayProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const rewardRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Animation for the content when modal is opened
  useEffect(() => {
    if (
      !isOpen ||
      !titleRef.current ||
      !descriptionRef.current ||
      !emojiRef.current ||
      !buttonRef.current
    )
      return;

    const tl = gsap.timeline({ defaults: { ease: "back.out(1.7)" } });

    // Create and animate confetti elements
    const modalContent = document.querySelector(".modal-content");
    if (!modalContent) return;

    // Clear any existing confetti container
    const existingContainer = modalContent.querySelector(".confetti-container");
    if (existingContainer) existingContainer.remove();

    const confettiContainer = document.createElement("div");
    confettiContainer.className = "confetti-container";
    modalContent.appendChild(confettiContainer);

    // Create confetti pieces
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement("div");
      confetti.className = "confetti";
      confetti.style.backgroundColor = [
        "#7458FF",
        "#9181FF",
        "#16CDA2",
        "#FFD166",
        "#FF6B6B",
      ][Math.floor(Math.random() * 5)];
      confetti.style.width = `${Math.random() * 10 + 5}px`;
      confetti.style.height = `${Math.random() * 10 + 5}px`;
      confetti.style.borderRadius = Math.random() > 0.5 ? "50%" : "0";
      confetti.style.position = "absolute";
      confetti.style.top = "-10px";
      confetti.style.left = `${Math.random() * 100}%`;

      confettiContainer.appendChild(confetti);

      gsap.to(confetti, {
        y: window.innerHeight,
        x: `${(Math.random() - 0.5) * 200}`,
        rotation: Math.random() * 360,
        duration: Math.random() * 3 + 2,
        ease: "none",
        repeat: -1,
        delay: Math.random() * 2,
      });
    }

    // Make sure all elements are visible before animating
    gsap.set([titleRef.current, descriptionRef.current, buttonRef.current], {
      visibility: "visible",
      opacity: 0,
    });

    // Special handling for emoji which can sometimes not display properly with certain animations
    if (emojiRef.current) {
      gsap.set(emojiRef.current, {
        visibility: "visible",
        opacity: 1,
        scale: 1,
        rotation: 0,
      });

      // Add a bounce animation
      gsap.to(emojiRef.current, {
        y: -15,
        duration: 0.5,
        repeat: 1,
        yoyo: true,
        ease: "power2.out",
        delay: 0.3,
      });
    }

    if (rewardRef.current) {
      gsap.set(rewardRef.current, { visibility: "visible", opacity: 0 });
    }

    tl.from(
      titleRef.current,
      {
        y: 30,
        opacity: 0,
        duration: 0.4,
      },
      "-=0.3",
    );

    tl.to(titleRef.current, { opacity: 1, duration: 0.3 }, "-=0.2");

    tl.from(
      descriptionRef.current,
      {
        y: 30,
        opacity: 0,
        duration: 0.4,
      },
      "-=0.2",
    );

    tl.to(descriptionRef.current, { opacity: 1, duration: 0.3 }, "-=0.2");

    if (rewardRef.current) {
      tl.from(
        rewardRef.current,
        {
          scale: 0.8,
          opacity: 0,
          duration: 0.4,
        },
        "-=0.2",
      );

      tl.to(rewardRef.current, { opacity: 1, duration: 0.3 }, "-=0.2");
    }

    tl.from(
      buttonRef.current,
      {
        y: 30,
        opacity: 0,
        duration: 0.4,
      },
      "-=0.2",
    );

    tl.to(buttonRef.current, { y: 0, opacity: 1, duration: 0.3 }, "-=0.2");

    return () => {
      // Clean up confetti and kill animation timeline
      if (confettiContainer.parentNode) {
        confettiContainer.remove();
      }
      tl.kill();
    };
  }, [isOpen]);

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
      {/* Static confetti particles - only show for success */}
      {isSuccess && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Purple particles */}
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
        <div className="mb-4 flex items-center justify-center">
          {isSuccess ? (
            <div className="mb-1 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <svg
                className="h-10 w-10 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
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
        </div>

        {/* Title with XP */}
        <h2 ref={titleRef} className="mb-2 text-3xl font-bold">
          {emoji} {generatedTitle}
        </h2>

        {/* Completed lesson description */}
        <p ref={descriptionRef} className="mb-8 text-xl text-gray-700">
          {lessonTitle ? `You've completed ${lessonTitle}.` : description}
        </p>
      </div>

      {/* View rewards section - only show for success */}
      {isSuccess && (
        <div
          ref={rewardRef}
          className="mb-8 w-full rounded-xl border border-gray-200 p-6"
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
        </div>
      )}

      {/* Next steps section - only show for success */}
      {isSuccess && nextSteps && (
        <div className="mb-8 w-full">
          <h3 className="mb-4 text-left text-lg font-bold">Next for you:</h3>
          <div className="grid grid-cols-2 gap-4">
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
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div ref={buttonRef} className="flex flex-col space-y-4">
        {!isSuccess && onCustomAction ? (
          <>
            <Button
              onClick={onCustomAction}
              variant="primary"
              className="w-full py-4 text-lg font-medium"
            >
              Try Again
            </Button>
            <p className="text-center text-sm text-gray-500 underline cursor-pointer" onClick={onClose}>{actionText}</p>
          </>
        
        ) : (
          <Button
            onClick={(e) => {
              // Prevent event propagation
              e.stopPropagation();
              e.preventDefault();
              
              // If this is a success completion and we have the lessonId, unlock next lesson
              if (isSuccess && lessonId) {
                // Use our extracted unlockNextLesson function with the direct lessonId
                console.log('Attempting to unlock next lesson with ID:', lessonId);
                const unlocked = unlockNextLesson(lessonId);
                if (unlocked) {
                  console.log('Successfully unlocked next lesson');
                } else {
                  console.warn('Failed to unlock next lesson - no matching lesson found or already unlocked');
                }
              } else {
                console.warn('Missing lessonId or not a success case - cannot unlock next lesson');
              }
              
              // Use immediate navigation to avoid background help tips interference
              if (actionText === "Continue Learning") {
                window.location.href = "/learning";
              } else {
                // Use normal onClose for other action texts
                onClose();
              }
            }}
            variant="primary"
            className="w-full py-4 text-lg font-medium"
          >
            {actionText}
          </Button>
        )}
      </div>
    </Modal>
  );
}
