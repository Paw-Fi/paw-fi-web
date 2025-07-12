import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect, useId } from 'react';

interface SwitchProps {
  id?: string;
  labelLeft: string;
  labelRight: string;
  onToggle: (isToggled: boolean) => void;
  initialToggled?: boolean;
  srText?: string; // Screen reader text for the switch itself
  className?: string;
}

export function Switch({
  id,
  labelLeft,
  labelRight,
  onToggle,
  initialToggled = false,
  srText = 'Toggle',
  className = '',
}: SwitchProps) {
  const [isToggled, setIsToggled] = useState(initialToggled);
  const generatedId = useId();
  const switchId = id || generatedId;

  useEffect(() => {
    setIsToggled(initialToggled);
  }, [initialToggled]);

  const handleToggle = () => {
    const newState = !isToggled;
    setIsToggled(newState);
    onToggle(newState);
  };

  const spring = {
    type: 'spring' as const, // Explicitly cast to literal type 'spring'
    stiffness: 700,
    damping: 35,
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <label 
        htmlFor={`${switchId}-label-left`}
        className={`text-sm font-medium cursor-pointer transition-colors duration-200 ${!isToggled ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
        onClick={() => { if(isToggled) handleToggle(); }}
        id={`${switchId}-label-left`}
      >
        {labelLeft}
      </label>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={isToggled}
        aria-labelledby={`${switchId}-label-left ${switchId}-label-right`}
        onClick={handleToggle}
        className={`relative inline-flex items-center h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-opacity-75 dark:focus-visible:ring-purple-400
          ${isToggled ? 'bg-purple-600 dark:bg-purple-500' : 'bg-[#e1e0f6] dark:bg-gray-600'}`}
      >
        <span className="sr-only">{srText}</span>
        <motion.span
          aria-hidden="true"
          layout
          transition={spring}
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-200 shadow-lg ring-0 transition-transform duration-200 ease-in-out
            ${isToggled ? 'translate-x-7' : 'translate-x-1'}`}
        />
      </button>
      <label 
        htmlFor={`${switchId}-label-right`}
        className={`text-sm font-medium cursor-pointer transition-colors duration-200 ${isToggled ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
        onClick={() => { if(!isToggled) handleToggle(); }}
        id={`${switchId}-label-right`}
      >
        {labelRight}
      </label>
    </div>
  );
}
