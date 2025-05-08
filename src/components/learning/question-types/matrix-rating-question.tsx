"use client";

import { useState } from "react";
import classNames from "classnames";
import type { MatrixRatingQuestion as MatrixRatingQuestionType } from "@/types/learning";

interface MatrixRatingQuestionProps {
  question: MatrixRatingQuestionType;
  onAnswer: (answer: Record<string, string>) => void;
  value?: Record<string, string>;
}

// Component for matrix-based rating questions (e.g., risk assessment)
function MatrixRatingQuestion({
  question,
  onAnswer,
  value = {},
}: MatrixRatingQuestionProps) {
  const [selectedRatings, setSelectedRatings] =
    useState<Record<string, string>>(value);

  // Get appropriate color class based on option position
  const getRatingColorClass = (optionId: string, isSelected: boolean) => {
    if (!isSelected)
      return "border-gray-200 bg-white hover:border-gray-300 text-gray-700";

    // Find the index of this option in the ratingOptions array
    const optionIndex = question.ratingOptions.findIndex(
      (opt: { id: string }) => opt.id === optionId,
    );

    // Fixed colors based on position (green, yellow, red)
    const colorClasses = [
      "bg-success-light border-success text-success", // First option (low)
      "bg-warning-light border-warning text-warning", // Second option (medium)
      "bg-danger-light border-danger text-danger", // Third option (high)
    ];

    return (
      colorClasses[optionIndex] || "bg-gray-100 border-gray-500 text-gray-700"
    );
  };

  // Handle selecting a rating for an item
  const handleSelectRating = (itemId: string, ratingId: string) => {
    const newRatings = {
      ...selectedRatings,
      [itemId]: ratingId,
    };

    setSelectedRatings(newRatings);
    onAnswer(newRatings);
  };

  // Check if a specific rating is selected for an item
  const isSelected = (itemId: string, ratingId: string) => {
    return selectedRatings[itemId] === ratingId;
  };

  // Get appropriate icon based on option position
  const getRatingIcon = (index: number) => {
    // Fixed icons based on position
    const icons = ["🟢", "🟡", "🔴"];
    return icons[index] || icons[icons.length - 1];
  };

  return (
    <div className="matrix-rating-question">
      <div className="space-y-6">
        {/* Rows for each item */}
        {question.items.map((item) => (
          <>
            <div className="px-3 font-medium text-gray-800">{item.content}</div>

            <div key={item.id} className="flex items-center gap-4">
              {/* Rating options for this item */}
              {question.ratingOptions.map(
                (option: { id: string; content: string }, index) => (
                  <button
                    type="button"
                    key={`${item.id}-${option.id}`}
                    onClick={() => handleSelectRating(item.id, option.id)}
                    className={classNames(
                      "flex w-full flex-1 cursor-pointer items-center justify-center rounded-xl border-2 px-3 py-3 transition-all",
                      getRatingColorClass(
                        option.id,
                        isSelected(item.id, option.id),
                      ),
                    )}
                    aria-label={`Rate ${item.content} as ${option.content}`}
                  >
                    <span className="mr-1">{getRatingIcon(index)}</span>
                    <span>{option.content}</span>
                  </button>
                ),
              )}
            </div>
          </>
        ))}
      </div>
    </div>
  );
}

export default MatrixRatingQuestion;
