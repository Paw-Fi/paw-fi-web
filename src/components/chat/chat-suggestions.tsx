"use client";

interface ChatSuggestionsProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
  isSendingMessage: boolean;
}

export function ChatSuggestions({
  suggestions,
  onSuggestionClick,
  isSendingMessage,
}: ChatSuggestionsProps) {
  if (suggestions.length === 0 || isSendingMessage) return null;

  return (
    <div className="flex gap-2 sm:gap-3 overflow-x-auto overscroll-x-contain pb-1 -webkit-overflow-scrolling-touch sm:scrollbar-auto [&::-webkit-scrollbar]:sm:block [&]:sm:scrollbar-width-thin">
      {suggestions.map((suggestion, index) => (
        <button
          key={`suggestion-${index}`}
          onClick={() => onSuggestionClick(suggestion)}
          className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 text-mobile-sm sm:text-sm font-medium bg-card text-foreground rounded-xl border hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 whitespace-nowrap touch-manipulation active:scale-95"
          disabled={isSendingMessage}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
