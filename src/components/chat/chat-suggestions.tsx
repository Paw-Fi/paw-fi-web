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
    <div className="flex gap-2 sm:gap-3 overflow-x-auto overscroll-x-contain pb-1 -webkit-overflow-scrolling-touch">
      {suggestions.map((suggestion, index) => (
        <button
          key={`suggestion-${index}`}        
          onClick={() => onSuggestionClick(suggestion)}
          className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium bg-white hover:bg-white text-slate-700 hover:text-slate-900 rounded-xl border border-slate-200/60 hover:border-slate-300/60 shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 dark:bg-slate-700/80 dark:hover:bg-slate-600/80 dark:text-slate-200 dark:hover:text-white dark:border-slate-600/60 dark:hover:border-slate-500/60 whitespace-nowrap touch-manipulation active:scale-95"
          disabled={isSendingMessage}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
