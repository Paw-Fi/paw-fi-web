"use client";

import { useState } from "react";
import classnames from "classnames";
import type { ImageChoiceQuestion as ImageChoiceQuestionType } from "@/types/learning.types";
import { OptimizedImage } from "@/components/seo/optimized-image";
import MermaidRenderer from "@/components/learning/MermaidRenderer";

interface ImageChoiceQuestionProps {
  question: ImageChoiceQuestionType;
  onAnswer: (answerId: string) => void;
  value?: string;
}

export function ImageChoiceQuestion({ question, onAnswer, value }: ImageChoiceQuestionProps) {
  const options=question.options  || question.image_options
  if (!options || !Array.isArray(options)) {
    return <div className="text-red-500">No image options available.</div>;
  }

  const [selectedOption, setSelectedOption] = useState<string | null>(
    value || null,
  );
  const itemsPerRow = question.itemsPerRow || 2;

  const handleOptionClick = (optionId: string) => {
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
        {options.map((option) => (
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
              <OptimizedImage
                src={option.imageUrl}
                alt={option.content}
                className="h-full w-full object-cover"
              />
            ) : option.imagePrompt ? (
              <div 
                className="w-full h-full flex items-center justify-center" 
                style={{ height: '30rem' }}
              >
                <MermaidRenderer 
                  id={question.id} 
                  content={option.imagePrompt} 
                  caption={option.caption}
                  imageOptionId={option.id}
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
