"use client";

import { useState } from "react";
import classnames from "classnames";
import type { ImageChoiceQuestion as ImageChoiceQuestionType } from "@/types/learning.types";
import MermaidRenderer from "@/components/learning/MermaidRenderer";

interface ImageChoiceQuestionProps {
  question: ImageChoiceQuestionType;
  onAnswer: (answerId: string) => void;
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
    console.log(`Selected option: ${optionId} for question: ${question.id}`);
    setSelectedOption(optionId);
    // Only pass the optionId as expected by the parent component
    onAnswer(optionId);
  };

  return (
    <div className="image-choice-question ">
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
              "cursor-pointer rounded-xl transition-all border-2 flex flex-col gap-3 p-4 image-choice-question-container",
              "hover:shadow-md",
              {
                "border-primary shadow-lg": selectedOption === option.id,
                "border-transparent": selectedOption !== option.id,
              },
            )}
            onClick={() => handleOptionClick(option.id)}
          >
            <div className="font-medium">{option.content}</div>

            {option.imageUrl ? (
              <img
                src={option.imageUrl}
                alt={option.content}
                className="h-full w-full object-cover"
              />
            ) : option.imagePrompt ? (
              <div 
                className="w-full h-full flex items-center justify-center" 
                style={{ minHeight: '15rem' }}
              >
                <MermaidRenderer 
                  id={option.id} 
                  content={option.imagePrompt} 
                  caption={option.caption} 
                />
              </div>
            ) : null}

            {option.caption && !option.imagePrompt && (
              <div className="text-sm text-gray-600 mt-2">{option.caption}</div>
            )}
            </div>
        ))}
      </div>
    </div>
  );
}
