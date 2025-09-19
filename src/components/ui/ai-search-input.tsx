import React, { useState, useRef } from 'react';
import { useAnimation } from 'framer-motion';
import { useNavigate } from '@tanstack/react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb, faPaperPlane, faLock } from '@fortawesome/free-solid-svg-icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
      navigate({ to: "/onboarding", search: { q: query } });
    }, 500);
  };

  return (
    <div
      className={`${className}`}
    >
      <div
        className={`relative mx-auto flex w-full items-center rounded-xl sm:rounded-2xl transition-all duration-500 ${
          isAnimating 
            ? "bg-muted" 
            : "bg-background shadow-sm hover:shadow-md"
        }`}
        style={{
          opacity: animationComplete ? 0 : 1,
        }}
      >
        {/* Input field */}
        <div className="relative z-10 flex-grow">
          <Input
            type="text"
            value={chatQuery}
            onChange={(e) => setChatQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full h-16 border-0 !border-none bg-transparent px-4 sm:px-6 py-6 sm:py-4 text-foreground placeholder:text-muted-foreground text-sm sm:text-base focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none !shadow-none touch-manipulation"
            aria-label="Ask a financial question"
            ref={inputRef}
            disabled={isTransitioning}
          />

          {/* Loading indicator during transition */}
          {isAnimating && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center px-4 sm:px-6"
            >
              <div className="flex items-center text-primary">
                <span className="mr-1.5 sm:mr-2 font-medium text-sm sm:text-base">Creating your plan</span>
                <div
                
                >
                  <FontAwesomeIcon
                    icon={faLightbulb}
                    className="h-3 w-3 sm:h-4 sm:w-4"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Private indicator */}
        <div
          className="z-10 mr-2 sm:mr-3 flex-shrink-0"
        >
          <div className="flex items-center px-2 sm:px-3 py-1 bg-muted rounded-md sm:rounded-lg">
            <FontAwesomeIcon
              icon={faLock}
              className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 sm:mr-2 text-muted-foreground"
            />
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
              Private
            </span>
          </div>
        </div>

        {/* Send button */}
        <Button
          onClick={() => {
            if (chatQuery.trim() && !isTransitioning) {
              handleKeyDown({
                key: "Enter",
                preventDefault: () => {},
              } as React.KeyboardEvent);
            }
          }}
          className="mr-1.5 sm:mr-2 h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 rounded-lg sm:rounded-xl touch-manipulation active:scale-95"
          aria-label="Send message"
          ref={sendButtonRef}
          asChild
        >
          <button>
            <FontAwesomeIcon icon={faPaperPlane} className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        </Button>
      </div>

      {/* Suggestion chips */}
      {showSuggestionPills && showSuggestions && (
        <div
          className="mx-auto mt-4 sm:mt-6"
        >
          <div className="mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
            <FontAwesomeIcon
              icon={faLightbulb}
              className="text-warning h-3 w-3 sm:h-4 sm:w-4"
            />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground dark:text-moneko-foreground">
              Popular questions to get started
            </span>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {suggestions.map((suggestion, index) => (
              <Button
                key={`suggestion-${index}`}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion)}
                className="rounded-full text-xs sm:text-sm hover:border-primary/30 hover:bg-primary/5 transition-colors duration-200 touch-manipulation active:scale-95"
                disabled={isTransitioning}
                asChild
              >
                <button
                 
                >
                  {suggestion}
                </button>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}