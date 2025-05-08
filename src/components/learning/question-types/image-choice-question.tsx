"use client";

import { useState } from "react";
import classnames from "classnames";
import type { ImageChoiceQuestion as ImageChoiceQuestionType } from "@/types/learning.types";

interface ImageChoiceQuestionProps {
  question: ImageChoiceQuestionType;
  onAnswer: (questionId: string, answerId: string) => void;
  value?: string;
}

export function ImageChoiceQuestion({
  question,
  onAnswer,
  value,
}: ImageChoiceQuestionProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(
    value || null,
  );
  const itemsPerRow = question.itemsPerRow || 1;

  const handleOptionClick = (optionId: string) => {
    setSelectedOption(optionId);
    onAnswer(question.id, optionId);
  };

  return (
    <div className="image-choice-question">
      <div
        className={classnames("mt-4 grid gap-4", {
          "grid-cols-1 md:grid-cols-1": itemsPerRow === 1,
          "grid-cols-1 md:grid-cols-2": itemsPerRow === 2,
        })}
      >
        {question.options.map((option) => (
          <div
            key={option.id}
            className={classnames(
              "cursor-pointer overflow-hidden rounded-xl transition-all border-2 flex flex-col gap-3 p-4",
              "hover:shadow-md",
              {
                "border-primary shadow-lg": selectedOption === option.id,
                "border-transparent": selectedOption !== option.id,
              },
            )}
            onClick={() => handleOptionClick(option.id)}
          >
            <div className="font-medium">{option.content}</div>

              <img
                src={option.imageUrl}
                alt={option.content}
                className="h-full w-full object-cover"
              />
            </div>
        ))}
      </div>
    </div>
  );
}
