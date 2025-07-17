"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLightbulb } from "@fortawesome/free-solid-svg-icons";

interface ChatSuggestionsProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
  isLoading: boolean;
  isSendingMessage: boolean;
}

export function ChatSuggestions({
  suggestions,
  onSuggestionClick,
  isLoading,
  isSendingMessage,
}: ChatSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={`suggestion-${index}`}
            onClick={() => onSuggestionClick(suggestion)}
            className="px-3 py-1.5 text-sm bg-white hover:bg-gray-50 text-gray-700 rounded-full border border-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:border-gray-600"
            disabled={isSendingMessage || isLoading}
          >
            {suggestion}
          </button>
        ))}
    </div>
  );
}
