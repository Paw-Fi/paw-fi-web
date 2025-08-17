import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TypewriterTextProps {
  text: string;
  speed?: number; // Characters per second
  delay?: number; // Initial delay before starting
  className?: string;
  onComplete?: () => void;
  showCursor?: boolean;
  cursorClassName?: string;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 30, // Default 30 characters per second
  delay = 0,
  className = '',
  onComplete,
  showCursor = true,
  cursorClassName = 'animate-pulse text-gray-400 dark:text-gray-500'
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    // Reset all state
    setDisplayedText('');
    setIsComplete(false);
    setHasStarted(false);

    const timeout = setTimeout(() => {
      setHasStarted(true);
      let currentIndex = 0;
      
      const interval = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          setIsComplete(true);
          clearInterval(interval);
          // Call onComplete after a brief delay to ensure state is updated
          setTimeout(() => onComplete?.(), 0);
        }
      }, 1000 / speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timeout);
  }, [text, speed, delay]); // Removed onComplete from dependencies to prevent unnecessary re-renders

  return (
    <span className={className}>
      {displayedText}
      {showCursor && hasStarted && !isComplete && (
        <motion.span
          className={cursorClassName}
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        >
          |
        </motion.span>
      )}
    </span>
  );
};

export default TypewriterText;