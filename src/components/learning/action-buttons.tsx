"use client";

import { Button } from "@/components/ui/button";

interface ActionButtonsProps {
  currentAnswerCorrect: boolean | null;
  isCurrentQuestionAnswered: boolean;
  countdownSeconds: number;
  handleCheckAnswer: () => void;
  handleNext: () => void;
  isLastQuestion: boolean;
}

export function ActionButtons({
  currentAnswerCorrect,
  isCurrentQuestionAnswered,
  countdownSeconds,
  handleCheckAnswer,
  handleNext,
  isLastQuestion,
}: ActionButtonsProps) {
  return (
    <div className="mt-8">
      {/* Show "Check Answer" button when answer is incorrect or not checked yet */}
      {!currentAnswerCorrect ? (
        <Button
          onClick={handleCheckAnswer}
          disabled={!isCurrentQuestionAnswered || countdownSeconds > 0}
          variant="primary"
          size="lg"
          fullWidth
        >
          Check Answer
        </Button>
      ) : (
        /* Show "Next Question" button only when answer is correct */
        <Button
          onClick={handleNext}
          variant="primary"
          size="lg"
          fullWidth
        >
          {!isLastQuestion ? "Next Question" : "Complete Lesson"}
        </Button>
      )}
    </div>
  );
}
