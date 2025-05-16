"use client";

import classnames from "classnames";
import type { ChoiceQuestion as ChoiceQuestionType } from "@/types/learning.types";
import { ContentBlockRenderer } from "@/components/learning/content-block-renderer";
import MermaidRenderer from "../MermaidRenderer";

interface ChoiceQuestionProps {
  question: ChoiceQuestionType;
  onAnswer: (answer: any) => void;
  value?: string | string[];
}

function ChoiceQuestion({ question, onAnswer, value }: ChoiceQuestionProps) {
  // Determine which options are selected based on the value prop
  const isOptionSelected = (optionId: string): boolean => {
    if (!value) return false;

    if (question.type === "mcq") {
      return Array.isArray(value) && value.includes(optionId);
    } else {
      return value === optionId;
    }
  };

  // Handle option selection without using local state
  const handleOptionSelect = (optionId: string) => {
    if (question.type === "mcq") {
      // For multiple choice, toggle the selection
      const currentValue = Array.isArray(value) ? value : [];
      const newValue = currentValue.includes(optionId)
        ? currentValue.filter((id) => id !== optionId)
        : [...currentValue, optionId];

      onAnswer(newValue);
    } else {
      // For single choice, just use the option id
      onAnswer(optionId);
    }
  };

  // Determine if options should be displayed in a grid layout
  const useGridLayout = question.itemsPerRow === 2;

  return (
    <div className="choice-question">
      {/* Render content blocks if available */}
      {question.contentBlocks && question.contentBlocks.length > 0 && (
        <div className="mb-4">
          <ContentBlockRenderer blocks={question.contentBlocks} />
        </div>
      )}
      <div
        className={classnames(
          // For single item per row, use vertical spacing
          {
            "space-y-3": !useGridLayout,
            // For two items per row, use grid
            "grid grid-cols-1 gap-3 sm:grid-cols-2": useGridLayout,
          },
        )}
      >
        {question.imagePrompt && (
          <MermaidRenderer
            id={question.id}
            content={question.imagePrompt}
            caption={question.caption}
          />
        )}
        {question.options.map((option) => (
          <div
            key={option.id}
            onClick={() => handleOptionSelect(option.id)}
            className={classnames(
              "cursor-pointer rounded-lg border p-4 transition-all",
              {
                "border-primary bg-purple-50": isOptionSelected(option.id),
                "border-gray-200 hover:border-gray-300": !isOptionSelected(
                  option.id,
                ),
              },
            )}
          >
            <div className="flex items-start">
              <div className="mt-0.5 mr-3">
                {question.type === "mcq" ? (
                  <div
                    className={classnames(
                      "flex h-5 w-5 items-center justify-center rounded border",
                      {
                        "border-primary bg-primary text-white":
                          isOptionSelected(option.id),
                        "border-gray-300": !isOptionSelected(option.id),
                      },
                    )}
                  >
                    {isOptionSelected(option.id) && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 6L9 17L4 12"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                ) : (
                  <div
                    className={classnames(
                      "flex h-5 w-5 items-center justify-center rounded-full border",
                      {
                        "border-primary": isOptionSelected(option.id),
                        "border-gray-300": !isOptionSelected(option.id),
                      },
                    )}
                  >
                    {isOptionSelected(option.id) && (
                      <div className="bg-primary h-3 w-3 rounded-full"></div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">
                  {option.content}
                </span>
                {option.description && (
                  <span className="text-sm text-gray-600">
                    {option.description}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChoiceQuestion;
