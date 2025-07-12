import React, { useState, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useNavigate } from '@tanstack/react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb, faPaperPlane, faLock } from '@fortawesome/free-solid-svg-icons';
import { fadeInUp } from '@/lib/motion-variants';

interface AISearchInputProps {
  placeholder?: string;
  suggestions?: string[];
  className?: string;
  showSuggestions?: boolean;
  variant?: 'default' | 'compact';
}

export function AISearchInput({
  placeholder = "Ask Moneko to create personalized financial journey for my...",
  suggestions = [
    "Help me set up a budget",
    "How do I start investing?",
    "Tell me about retirement planning",
    "What's an emergency fund?",
    "Explain compound interest",
    "Tips for saving money",
  ],
  className = "",
  showSuggestions = true,
  variant = 'default'
}: AISearchInputProps) {
  const navigate = useNavigate();
  const [chatQuery, setChatQuery] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showSuggestionPills, setShowSuggestionPills] = useState(showSuggestions);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);

  // Animation controls
  const inputControls = useAnimation();
  const textControls = useAnimation();
  const iconControls = useAnimation();
  const placeholderControls = useAnimation();
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Handle Enter key press
  const handleKeyDown = (
    event: React.KeyboardEvent,
    queryOverride?: string,
  ) => {
    const query = queryOverride ?? chatQuery;
    if (event.key === "Enter" && query.trim() && !isTransitioning) {
      event.preventDefault();
      setShowSuggestionPills(false);
      startTransitionAnimation(query);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    if (isTransitioning) return;
    setChatQuery(suggestion);
    handleKeyDown(
      { key: "Enter", preventDefault: () => {} } as React.KeyboardEvent,
      suggestion,
    );
  };

  // Start the enhanced transition animation
  const startTransitionAnimation = async (query: string) => {
    if (!query.trim() || isTransitioning) return;

    setIsTransitioning(true);
    setIsAnimating(true);
    inputRef.current?.blur();

    // Animate placeholder text to transform with smoother fade
    placeholderControls.start({
      opacity: [0, 1],
      y: [10, 0],
      transition: { duration: 0.5, delay: 0.2, ease: "easeOut" },
    });

    // Animate text to shrink and fade with improved timing
    textControls.start({
      scale: [1, 0.92],
      opacity: [1, 0.7],
      transition: { duration: 0.5, ease: "easeInOut" },
    });

    // Animate icons with slight delay between them for staggered effect
    iconControls.start({
      scale: [1, 1.2, 0.8],
      opacity: [1, 0.9, 0],
      transition: { duration: 0.6, ease: "easeInOut", staggerChildren: 0.08 },
    });

    // Enhanced input container animation sequence
    await inputControls.start({
      scale: [1, 1.03, 1.05, 1.08],
      y: [0, -8, -20, -30],
      boxShadow: [
        "0 4px 6px rgba(120, 78, 198, 0.1)",
        "0 10px 20px rgba(120, 78, 198, 0.2)",
        "0 15px 30px rgba(120, 78, 198, 0.3)",
        "0 20px 40px rgba(120, 78, 198, 0.4)",
      ],
      borderRadius: ["9999px", "30px", "25px", "20px"],
      backgroundColor: [
        "rgba(255,255,255,0.6)",
        "rgba(250,245,255,0.7)",
        "rgba(245,240,255,0.75)",
        "rgba(240,235,255,0.8)",
      ],
      backdropFilter: ["blur(8px)", "blur(10px)", "blur(12px)", "blur(15px)"],
      transition: { duration: 0.8, ease: [0.19, 1, 0.22, 1] },
    });

    setTimeout(() => {
      setAnimationComplete(true);
    }, 150);

    setTimeout(() => {
      navigate({ to: "/dashboard/chat", search: { q: query } });
    }, 500);
  };

  const containerClasses = variant === 'compact' 
    ? "mx-auto max-w-2xl" 
    : "mx-auto max-w-3xl";

  return (
    <motion.div
      className={`${containerClasses} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      viewport={{ once: true }}
    >
      <motion.div
        variants={fadeInUp}
        animate={inputControls}
        initial={{
          scale: 1,
          y: 0,
          opacity: 1,
          boxShadow: "0 4px 6px rgba(120, 78, 198, 0.1)",
        }}
        className={`relative mx-auto flex w-full items-center rounded-full p-1 transition-all duration-500 ${
          isAnimating 
            ? "bg-gradient-to-r from-purple-50/90 to-indigo-50/90 backdrop-blur-lg" 
            : "border border-white/20 bg-white/60 backdrop-blur-md shadow-lg shadow-purple-500/10"
        }`}
        style={{
          opacity: animationComplete ? 0 : 1,
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* Enhanced Input field with animation */}
        <motion.div className="relative z-10 flex-grow">
          <input
            type="text"
            value={chatQuery}
            onChange={(e) => setChatQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full border-none bg-transparent px-6 py-3 text-gray-700 placeholder-gray-400 outline-none ring-0 transition-all duration-300 ease-in-out placeholder:pl-2 focus:shadow-none focus:outline-none focus:ring-0"
            aria-label="Ask a financial question"
            ref={inputRef}
            disabled={isTransitioning}
          />

          {/* Animated placeholder that appears during transition */}
          {isAnimating && (
            <motion.div
              className="pointer-events-none absolute bottom-0 left-0 right-0 top-0 flex items-center px-4"
              animate={placeholderControls}
              initial={{ opacity: 0, y: 10 }}
            >
              <div className="flex items-center">
                <span className="mr-2 text-purple-600">Creating</span>
                <motion.div
                  animate={{
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    repeatType: "loop",
                    times: [0, 0.5, 1],
                  }}
                >
                  <FontAwesomeIcon
                    icon={faLightbulb}
                    className="h-4 w-4 text-amber-500"
                  />
                </motion.div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Private badge */}
        <motion.div
          className="z-10 mr-2 flex-shrink-0"
          animate={iconControls}
        >
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faLock}
              className="h-4 w-4 text-gray-400"
            />
            <span className="text-sm text-gray-400">Private</span>
          </div>
        </motion.div>

        {/* Send button */}
        <motion.button
          onClick={() => {
            if (chatQuery.trim() && !isTransitioning) {
              handleKeyDown({
                key: "Enter",
                preventDefault: () => {},
              } as React.KeyboardEvent);
            }
          }}
          className="mr-1 flex size-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-purple-400 to-indigo-600 p-2 text-white shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105"
          aria-label="Send message"
          animate={iconControls}
          ref={sendButtonRef}
        >
          <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4" />
        </motion.button>
      </motion.div>

      {/* Suggestion pills */}
      {showSuggestionPills && showSuggestions && (
        <motion.div
          className="mx-auto mt-4 max-w-3xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
        >
          <div className="mb-2 flex items-center gap-2 px-2">
            <FontAwesomeIcon
              icon={faLightbulb}
              className="text-amber-500"
            />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Popular questions to get started
            </span>
          </div>
          <div className="flex flex-wrap gap-2 px-1">
            {suggestions.map((suggestion, index) => (
              <motion.button
                key={`suggestion-${index}`}
                onClick={() => handleSuggestionClick(suggestion)}
                className="rounded-full border border-purple-200/60 bg-white/70 px-3.5 py-1.5 text-sm text-gray-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-purple-300 hover:bg-white/90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                disabled={isTransitioning}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                whileHover={{ y: -2, scale: 1.02 }}
              >
                {suggestion}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}