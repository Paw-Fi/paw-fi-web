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
      // Explicitly set showExplanation to false for incorrect answers
      // to ensure correct feedback isn't shown
      setShowExplanation(false);
      
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
  // Helper function to unlock the next lesson in sequence
  const unlockNextLesson = (): boolean => {
    // Using only paw-fi-course for consistency
    const COURSE_STORAGE_KEY = 'paw-fi-course';
    
    try {
      // Get course data from localStorage
      const courseData = localStorage.getItem(COURSE_STORAGE_KEY);
      if (!courseData) return false;
      
      const course = JSON.parse(courseData);
      
      if (course && course.lessons && Array.isArray(course.lessons)) {
        // Find the current lesson's index
        const currentLessonIndex = course.lessons.findIndex((lesson: any) => lesson.id === lessonId);
        
        // If there's a next lesson, unlock it
        if (currentLessonIndex !== -1 && currentLessonIndex < course.lessons.length - 1) {
          course.lessons[currentLessonIndex + 1].unlocked = true;
          
          // Save updated course data
          localStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(course));
          console.log(`Unlocked next lesson: ${course.lessons[currentLessonIndex + 1].title}`);
          return true;
        }
      }
      
      return false;
      
      return false;
    } catch (error) {
      console.error('Error unlocking next lesson:', error);
      return false;
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
      const allCorrect = areAllAnswersCorrect(questions, answers);
      setIsSuccess(allCorrect);

      // Set XP earned based on correct answers
      if (allCorrect) {
        setEarnedXp(xp);
        // If all answers are correct, unlock the next lesson
        unlockNextLesson();
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
    // For sort questions, we need to check if the answer is actually different
    // to prevent infinite loops with the drag-and-drop component
    const prevAnswer = answers[questionId];
    
    // Check if this is the same answer as before (deep comparison for arrays)
    const isSameAnswer = Array.isArray(answer) && Array.isArray(prevAnswer) &&
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
