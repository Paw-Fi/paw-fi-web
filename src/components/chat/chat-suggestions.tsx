"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLightbulb } from "@fortawesome/free-solid-svg-icons";
import { motion } from "framer-motion";

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
    <div className="flex flex-wrap gap-2 sm:gap-3">
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={`suggestion-${index}`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.2 }}
          onClick={() => onSuggestionClick(suggestion)}
          className="px-4 py-2.5 text-sm font-medium bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 rounded-xl border border-slate-200/60 hover:border-slate-300/60 shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-transparent dark:bg-slate-700/80 dark:hover:bg-slate-600/80 dark:text-slate-200 dark:hover:text-white dark:border-slate-600/60 dark:hover:border-slate-500/60 backdrop-blur-sm"
          disabled={isSendingMessage}
        >
          {suggestion}
        </motion.button>
      ))}
    </div>
  );
}
