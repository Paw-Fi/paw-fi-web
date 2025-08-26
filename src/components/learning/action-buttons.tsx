"use client";

import { Button } from "@components/ui/button";

interface ActionButtonsProps {
  currentAnswerCorrect: boolean | null;
  isCurrentQuestionAnswered: boolean;
  countdownSeconds: number;
  handleCheckAnswer: () => void;
  handleNext: () => void;
  isLastQuestion: boolean;
  isLoading?: boolean;
}

export function ActionButtons({
  currentAnswerCorrect,
  isCurrentQuestionAnswered,
  countdownSeconds,
  handleCheckAnswer,
  handleNext,
  isLastQuestion,
  isLoading = false,
}: ActionButtonsProps) {
  return (
    <div className="mt-8 flex justify-center">
      {/* Show "Check Answer" button when answer is incorrect or not checked yet */}
      {!currentAnswerCorrect ? (
        <Button
          onClick={handleCheckAnswer}
          disabled={!isCurrentQuestionAnswered || countdownSeconds > 0}
          size="xl"
        >
          Check Answer
        </Button>
      ) : (
        /* Show "Next Question" button only when answer is correct */
        <Button
          onClick={handleNext}
          size="xl"
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : (!isLastQuestion ? "Next Question" : "Complete Lesson")}
        </Button>
      )}
    </div>
  );
}
