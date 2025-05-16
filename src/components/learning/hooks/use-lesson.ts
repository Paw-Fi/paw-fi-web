"use client";

import { useState, useEffect } from "react";
import type { Question } from "@/types/learning.types";
import { areAllAnswersCorrect, isAnswerCorrect, isCurrentQuestionAnswered } from "@/components/learning/lesson-utils";
import { useNavigate } from "@tanstack/react-router";

interface UseLessonProps {
  lessonId: string;
  questions: Question[];
  unlocked: boolean;
  xp: number;
}

export function useLesson({ lessonId, questions, unlocked, xp }: UseLessonProps) {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [isSuccess, setIsSuccess] = useState(true);
  const [earnedXp, setEarnedXp] = useState(0);
  const [currentAnswerCorrect, setCurrentAnswerCorrect] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Handle redirection if lesson is not unlocked
  useEffect(() => {
    if (!unlocked) {
      navigate({ to: "/learning" });
    }
  }, [navigate, unlocked]);

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
    const answer = answers[currentQuestion.id];
    
    // Check if the current answer is correct
    const isCorrect = isAnswerCorrect(currentQuestion, answer);
    setCurrentAnswerCorrect(isCorrect);
    
    if (isCorrect) {
      // Show explanation for correct answer
      setShowExplanation(true);
    } else {
      // Incorrect answer - set countdown timer
      setCountdownSeconds(5);
      
      // Start countdown
      const interval = setInterval(() => {
        setCountdownSeconds(prev => {
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
  
  // Move to the next question
  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      // Move to the next question
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      // Reset all UI states when moving to a new question
      resetQuestionStates();
    } else {
      // We've reached the end of the lesson
      const allCorrect = areAllAnswersCorrect(questions, answers);
      setIsSuccess(allCorrect);

      // Set XP earned based on correct answers
      if (allCorrect) {
        setEarnedXp(xp);
      } else {
        // Partial XP based on number of correct answers
        const correctCount = questions.filter((q) => 
          isAnswerCorrect(q, answers[q.id])
        ).length;
        setEarnedXp(Math.floor((correctCount / questions.length) * xp));
      }

      setIsComplete(true);
    }
  };

  // Go back to previous question or to learning page
  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      navigate({ to: "/learning" });
    }
  };

  // Record an answer
  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
    
    // Reset UI states when a new answer is submitted
    // If the countdown timer is active, we still want to allow the user to select
    // a different answer, but not reset the countdown timer
    if (countdownSeconds === 0) {
      // Only reset these specific states to avoid infinite update loops
      setShowExplanation(false);
      setCurrentAnswerCorrect(false);
      setShowFeedback(false);
      // Don't call resetQuestionStates() as it triggers an update loop
    } else {
      // Just reset the feedback states but keep the countdown
      setCurrentAnswerCorrect(false);
      setShowExplanation(false);
    }
  };

  // Check if current question is answered
  const isQuestionAnswered = isCurrentQuestionAnswered(currentQuestion, answers[currentQuestion.id]);

  return {
    currentQuestionIndex,
    currentQuestion,
    answers,
    isComplete,
    showFeedback,
    isSuccess,
    earnedXp,
    currentAnswerCorrect,
    countdownSeconds,
    showExplanation,
    progressPercentage,
    isQuestionAnswered,
    handleRetry,
    handleCheckAnswer,
    handleNext,
    handleBack,
    handleAnswer
  };
}
