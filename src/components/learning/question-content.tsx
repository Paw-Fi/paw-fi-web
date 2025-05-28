"use client";

import SortQuestion from "@/components/learning/question-types/sort-question";
import SortCategoriesQuestion from "@/components/learning/question-types/sort-categories-question";
import ChoiceQuestion from "@/components/learning/question-types/choice-question";
import MatchQuestion from "@/components/learning/question-types/match-question";
import MatrixRatingQuestion from "@/components/learning/question-types/matrix-rating-question";
import TextInputQuestion from "@/components/learning/question-types/text-input-question";
import { ImageChoiceQuestion } from "@/components/learning/question-types/image-choice-question";
import type { Question } from "@/types/learning.types";

interface QuestionContentProps {
  question: Question;
  countdownSeconds: number;
  onAnswer: (questionId: string, answer: any) => void;
  value: any;
}

export function QuestionContent({
  question,
  countdownSeconds,
  onAnswer,
  value
}: QuestionContentProps) {
  return (
    <div className={countdownSeconds > 0 ? "pointer-events-none opacity-70" : ""} aria-disabled={countdownSeconds > 0}>
      {question.type === "sort-order" && (
        <SortQuestion
          key={question.id}
          question={question}
          onAnswer={(answer) =>
            countdownSeconds === 0 && onAnswer(question.id, answer)
          }
          value={value}
        />
      )}

      {question.type === "sort-categories" && (
        <SortCategoriesQuestion
          key={question.id}
          question={question}
          onAnswer={(answer) =>
            countdownSeconds === 0 && onAnswer(question.id, answer)
          }
          value={value}
        />
      )}

      {(question.type === "mcq" ||
        question.type === "scq") && (
        <ChoiceQuestion
          key={question.id}
          question={question}
          onAnswer={(answer) =>
            countdownSeconds === 0 && onAnswer(question.id, answer)
          }
          value={value}
        />
      )}

      {question.type === "match" && (
        <MatchQuestion
          key={question.id}
          question={question}
          onAnswer={(answer) =>
            countdownSeconds === 0 && onAnswer(question.id, answer)
          }
          value={value}
        />
      )}

      {question.type === "matrix-rating" && (
        <MatrixRatingQuestion
          key={question.id}
          question={question}
          onAnswer={(answer) =>
            countdownSeconds === 0 && onAnswer(question.id, answer)
          }
          value={value}
        />
      )}

      {question.type === "text-input" && (
        <TextInputQuestion
          key={question.id}
          question={question}
          onAnswer={(value: string) =>
            countdownSeconds === 0 && onAnswer(question.id, value)
          }
          value={value}
        />
      )}

      {question.type === "image-choice" && (
        <ImageChoiceQuestion
          key={question.id}
          question={question}
          onAnswer={(value: string) =>
            countdownSeconds === 0 && onAnswer(question.id, value)
          }
          value={value}
        />
      )}
    </div>
  );
}
