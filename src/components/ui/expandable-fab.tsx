import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faLightbulb } from '@fortawesome/free-solid-svg-icons';
import monekoLogo from '@/assets/images/logo/moneko.png';
import finniLogo from '@/assets/images/logo/finni.png';
import { useLocalStorageBoolean } from '@/utils/use-localstorage';

interface FABOption {
  id: string;
  label: string;
  icon: string | typeof faLightbulb;
  gradient: string;
  onClick: () => void;
}

interface ExpandableFABProps {
  options: FABOption[];
  className?: string;
}

export const ExpandableFAB: React.FC<ExpandableFABProps> = ({ options, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { value: hasSeenTooltip, setTrue: markTooltipSeen } = useLocalStorageBoolean('moneko-fab-tooltip-seen', false);

  // Handle option click - directly execute action
  const handleOptionClick = (option: FABOption) => {
    option.onClick();
    setIsExpanded(false);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    // Mark tooltip as seen when user interacts with FAB
    if (!hasSeenTooltip) {
      markTooltipSeen();
    }
  };

  // Calculate positions for circular layout - moderate spread with Moneko at 9-10 o'clock
  const getOptionPosition = (index: number) => {
    const radius = 100; // Keep original radius distance from center
    
    // Clock positions with moderate spacing - Moneko at 9.5 o'clock
    // 9.5, 11, 12.5 o'clock positions: 165°, 135°, 105°
    const clockPositions = [175, 135, 90]; // More moderate 30° spacing
    
    // Use the appropriate clock position for each index
    const angle = clockPositions[index] || 180; // Default to 9 o'clock if index out of bounds
    const radians = (angle * Math.PI) / 180;
    
    return {
      x: radius * Math.cos(radians),
      y: -radius * Math.sin(radians) // Negate Y to flip coordinate system (CSS Y increases downward)
    };
  };

  return (
    <div className={`fixed bottom-4 right-4 z-30 ${className}`}>
      {/* Overlay to close when clicking outside */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Option Buttons - Positioned in circular pattern */}
      <AnimatePresence>
        {isExpanded && options.map((option, index) => {
          const position = getOptionPosition(index);
          return (
            <div
              key={option.id}
              className="relative"
              style={{
                position: 'absolute',
                right: '6px',
                bottom: '6px',
              }}
            >
              <motion.button
                className={`w-12 h-12 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 active:scale-95 overflow-hidden ${
                  typeof option.icon === 'string' 
                    ? 'bg-transparent p-0' // No background for logo images 
                    : `${option.gradient} text-white` // Keep gradient for icon buttons
                }`}
                initial={{ 
                  opacity: 0, 
                  scale: 0.3,
                  x: 0,
                  y: 0
                }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  x: position.x,
                  y: position.y
                }}
                exit={{ 
                  opacity: 0, 
                  scale: 0.3,
                  x: 0,
                  y: 0
                }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 400,
                  damping: 25
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleOptionClick(option)}
                aria-label={option.label}
              >
                {typeof option.icon === 'string' ? (
                  <img src={option.icon} alt={option.label} className="w-12 h-12 rounded-full" />
                ) : (
                  <FontAwesomeIcon icon={option.icon} className="w-4 h-4" />
                )}
              </motion.button>

              {/* Custom tooltip span - positioned to the left of each icon */}
             {option.label&& <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="absolute bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-3 py-2 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap pointer-events-none z-[60]"
                style={{
                  left: `${position.x - 160}px`,
                  bottom: `${-position.y + 6}px`,
                  transform: `translate(0, 0)`
                }}
              >
                {option.label}
                {/* Tooltip arrow pointing right to the icon */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-800 dark:border-l-gray-200"></div>
              </motion.div>}
            </div>
          );
        })}
      </AnimatePresence>

      {/* Main FAB Button */}
      <motion.button
        className={`w-14 h-14 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 relative overflow-hidden p-0 ${
          isExpanded 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-transparent hover:bg-white/10'
        }`}
        onClick={toggleExpand}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        animate={{ 
          rotate: isExpanded ? 180 : 0 
        }}
        transition={{
          duration: 0.3,
          type: "spring",
          stiffness: 400,
          damping: 25
        }}
        aria-label={isExpanded ? "Close options" : "Open AI options"}
      >
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              key="close"
              initial={{ opacity: 0, rotate: -180 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 180 }}
              transition={{ duration: 0.2 }}
            >
              <FontAwesomeIcon icon={faTimes} className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="main"
              initial={{ opacity: 0, rotate: 180 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -180 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              {/* Main button shows Moneko logo without background */}
              <img src={monekoLogo} alt="AI Assistant" className="w-14 h-14 rounded-full" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ripple effect on expand */}
        {isExpanded && (
          <motion.div
            className="absolute inset-0 bg-white/20 rounded-full"
            initial={{ scale: 0, opacity: 0.7 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </motion.button>


    </div>
  );
};