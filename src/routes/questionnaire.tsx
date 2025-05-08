"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import catIcon from "@/assets/images/cat.gif";
import { useEffect } from "react";

// Import question components from learning folder
import ChoiceQuestion from "@/components/learning/question-types/choice-question";
import SortCategoriesQuestion from "@/components/learning/question-types/sort-categories-question";
import MatchQuestion from "@/components/learning/question-types/match-question";
import MatrixRatingQuestion from "@/components/learning/question-types/matrix-rating-question";
import TextInputQuestion from "@/components/learning/question-types/text-input-question";

// Import context and types
import { useQuestionnaire } from "@/contexts/questionnaire-context";
import type {
  ChoiceQuestion as ChoiceQuestionType,
  SortCategoriesQuestion as SortCategoriesQuestionType,
  MatrixRatingQuestion as MatrixRatingQuestionType,
  TextInputQuestion as TextInputQuestionType,
} from "@/types/learning.types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/questionnaire")({
  component: Questionnaire,
});

function Questionnaire() {
  // Initialize navigation
  const navigate = useNavigate();
  
  // Use the questionnaire context
  const { state, nextStep, prevStep, setAnswer } = useQuestionnaire();
  const { currentStep, answers } = state;

  // Get questions from context and get the current question
  const { questions } = useQuestionnaire();
  const currentQuestion = questions[currentStep];

  // Determine if questionnaire is complete (currentStep is past the end of questions)
  const isComplete = currentStep >= questions.length;
  
  // Redirect to results page when questionnaire is complete
  useEffect(() => {
    if (isComplete) {
      navigate({ to: "/results" });
    }
  }, [isComplete, navigate]);

  // Handle answers using the context
  const handleAnswer = (questionId: string, answer: any) => {
    // Type assertion to ensure compatibility with different question types
    setAnswer(
      questionId,
      answer as string | string[] | number | Record<string, string>,
    );
  };

  const renderQuestion = () => {
    if (!currentQuestion) return <div>Loading questions...</div>;

    // Handle each question type
    switch (currentQuestion.type) {
      case "scq":
      case "mcq":
        return (
          <ChoiceQuestion
            question={currentQuestion as ChoiceQuestionType}
            onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
            value={answers[currentQuestion.id] as string | undefined}
          />
        );

      case "sort-categories":
        return (
          <SortCategoriesQuestion
            question={currentQuestion as SortCategoriesQuestionType}
            onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
            value={
              answers[currentQuestion.id] as Record<string, string> | undefined
            }
          />
        );

      case "matrix-rating":
        return (
          <MatrixRatingQuestion
            question={currentQuestion as MatrixRatingQuestionType}
            onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
            value={
              answers[currentQuestion.id] as Record<string, string> | undefined
            }
          />
        );

      case "match":
        return (
          <MatchQuestion
            question={currentQuestion}
            onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
            value={
              answers[currentQuestion.id] as Record<string, string> | undefined
            }
          />
        );

      case "text-input":
        return (
          <TextInputQuestion
            question={currentQuestion as TextInputQuestionType}
            onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
            value={answers[currentQuestion.id] as string | undefined}
          />
        );

      // If we add new question types to learning.ts, we can handle them here

      default:
        return <div>Unknown question type: {currentQuestion.type}</div>;
    }
  };

  const handleBack = () => {
    prevStep();
  };

  const handleNext = () => {
    nextStep();
  };

  // Check if current question has been answered
  const isCurrentQuestionAnswered = () => {
    // Don't enable the button if we're already complete
    if (isComplete) return false;

    // If no answer yet, question is not answered
    if (!answers[currentQuestion.id]) return false;

    // For matrix rating questions, all items must be rated
    if (currentQuestion.type === "matrix-rating") {
      const matrixAnswer = answers[currentQuestion.id] as Record<
        string,
        string
      >;
      return currentQuestion.items.every((item) => !!matrixAnswer[item.id]);
    }

    // For text-input questions, ensure there's a non-empty value
    if (currentQuestion.type === "text-input") {
      const textAnswer = answers[currentQuestion.id] as string;
      return !!textAnswer && textAnswer.trim() !== "";
    }

    // For other question types, just check if there's any answer
    return !!answers[currentQuestion.id];
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Back button - positioned outside the container in the top left */}
      <button
        onClick={handleBack}
        disabled={currentStep === 0}
        className="absolute top-4 left-4 flex items-center font-medium"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mr-1"
        >
          <path
            d="M10 4L6 8L10 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back
      </button>

      <div className="flex flex-grow items-center justify-center">
        <div className="my-8 w-[35rem] overflow-hidden rounded-3xl bg-white p-6 shadow-lg">
          {/* Progress indicator */}
          <div className="mb-6 flex justify-center">
            <img src={catIcon} alt="PawFi Cat" className="h-16 w-16" />
          </div>

          {/* Loading state shown briefly during redirect */}
          {isComplete ? (
            <div className="flex items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
            </div>
          ) : (
            // Show current question
            <>
              {/* Display the current question number and title */}
              <div className="mb-4 text-center">
                <h2 className="text-primary-600 text-lg font-medium">
                  Question {currentStep + 1} of {questions.length}
                </h2>
                <h1 className="mt-2 text-2xl font-bold text-gray-900">
                  {currentQuestion.question}
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  {currentQuestion.explanation}
                </p>
              </div>

              {/* Dynamic question content */}
              {renderQuestion()}

              {/* Next button */}
              <Button
                onClick={handleNext}
                variant="dark"
                disabled={!isCurrentQuestionAnswered()}
                className={`mt-6 w-full rounded-lg px-6 py-3 transition-colors ${isCurrentQuestionAnswered()}`}
              >
                {currentStep < questions.length - 1 ? "Next" : "Finish"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
