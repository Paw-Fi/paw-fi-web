"use client";

import { useState, useEffect } from "react";
import type { Course, Lesson, Question } from "@/types/learning.types";
import {
  areAllAnswersCorrect,
  isAnswerCorrect,
  isCurrentQuestionAnswered,
} from "@/components/learning/lesson-utils";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { unlockNextLesson } from "./unlock-next-lesson";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "react-toastify";

interface UseLessonProps {
  lesson: Lesson | undefined;
  courseId: string;
}

export function useLesson({ lesson, courseId }: UseLessonProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const { user } = useAuth();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  const [currentAnswerCorrect, setCurrentAnswerCorrect] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const questions = lesson?.questions || [];
  const lessonId = lesson?.lesson_id;

  // Handle redirection if lesson is not unlocked
  useEffect(() => {
    if (lesson && !lesson?.unlocked) {
      navigate({ to: "/dashboard/learning" });
    }
  }, [navigate, lesson]);

  // Get current question
  const currentQuestion = questions[currentQuestionIndex];

  // Calculate progress percentage
  const progressPercentage = isComplete
    ? 100
    : (currentQuestionIndex / questions.length) * 100;

  // Handle retry (restart lesson)
  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setIsComplete(false);
    resetQuestionStates();
  };

  // Reset UI states when moving between questions or when timer ends
  const resetQuestionStates = () => {
    setShowExplanation(false);
    setCurrentAnswerCorrect(false);
    setCountdownSeconds(0);
    setShowFeedback(false);
  };

  // Check the current answer correctness
  const handleCheckAnswer = () => {
    setShowFeedback(true);
    const answer = answers[currentQuestion?.question_id];

    // Check if the current answer is correct
    const isCorrect = isAnswerCorrect(currentQuestion, answer);
    setCurrentAnswerCorrect(isCorrect);

    if (isCorrect) {
      // Show explanation for correct answer
      setShowExplanation(true);
    } else {
      // Explicitly set showExplanation to false for incorrect answers
      // to ensure correct feedback isn't shown
      setShowExplanation(false);

      // Incorrect answer - set countdown timer
      setCountdownSeconds(5);

      // Start countdown
      const interval = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            // When timer reaches zero, we should allow the user to try again
            // but keep the feedback visible
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      // Move to the next question
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      // Reset all UI states when moving to a new question
      resetQuestionStates();
    } else {
      // We've reached the end of the lesson
      setEarnedXp(lesson?.xp || 0);
      // If all answers are correct, unlock the next lesson
      if (user?.id && lessonId) {
        unlockNextLesson(lessonId, courseId, user.id)
          .then((success) => {
            if (success) {
              setIsComplete(true);
            } else {
              toast.error("Failed to unlock next lesson");
            }
          })
          .catch((error) => {
            toast.error("Error unlocking next lesson:", error);
          });
      } else {
        toast.warn("Cannot unlock next lesson: missing user ID or lesson ID");
      }
    }
  };

  // Go back to previous question or to learning page
  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      router.history.back();
    }
  };

  // Record an answer
  const handleAnswer = (questionId: string, answer: any) => {
    // For sort questions, we need to check if the answer is actually different
    // to prevent infinite loops with the drag-and-drop component
    const prevAnswer = answers[questionId];

    // Check if this is the same answer as before (deep comparison for arrays)
    const isSameAnswer =
      Array.isArray(answer) &&
      Array.isArray(prevAnswer) &&
      answer.length === prevAnswer.length &&
      answer.every((item, index) => {
        return item.id === prevAnswer[index]?.id;
      });

    // Only update if the answer is different
    if (!isSameAnswer) {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: answer,
      }));

      // Reset UI states when a new answer is submitted, but only if the answer changed
      if (countdownSeconds === 0) {
        // Only reset these specific states to avoid infinite update loops
        setShowExplanation(false);
        setCurrentAnswerCorrect(false);
        setShowFeedback(false);
      } else {
        // Just reset the feedback states but keep the countdown
        setCurrentAnswerCorrect(false);
        setShowExplanation(false);
      }
    }
  };

  // Check if current question is answered
  const isQuestionAnswered = isCurrentQuestionAnswered(
    currentQuestion,
    answers[currentQuestion?.question_id],
  );

  return {
    currentQuestionIndex,
    currentQuestion,
    answers,
    isComplete,
    setIsComplete,
    showFeedback,
    setShowFeedback,
    earnedXp,
    setEarnedXp,
    currentAnswerCorrect,
    setCurrentAnswerCorrect,
    countdownSeconds,
    setCountdownSeconds,
    showExplanation,
    setShowExplanation,
    progressPercentage,
    isQuestionAnswered,
    handleRetry,
    handleCheckAnswer,
    handleNext,
    handleBack,
    handleAnswer,
    resetQuestionStates,
  };
}
