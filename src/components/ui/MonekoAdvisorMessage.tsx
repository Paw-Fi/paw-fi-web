import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import TypewriterText from './TypewriterText';
 import monekoIconGif from '@/assets/images/logo/moneko-avatar.gif';

export type AdvisorTone = 'congratulatory' | 'encouraging' | 'motivational' | 'reassuring' | 'informative';

export interface AdvisorMessage {
  message: string;
  tone: AdvisorTone;
}

interface MonekoAdvisorMessageProps {
  message: AdvisorMessage;
  showMessage: boolean;
  typewriterSpeed?: number;
  className?: string;
  transparentBackground?: boolean;
}

export const MonekoAdvisorMessage: React.FC<MonekoAdvisorMessageProps> = ({
  message,
  showMessage,
  typewriterSpeed = 25,
  className = '',
  transparentBackground = false
}) => {
  const [isTypewriterActive, setIsTypewriterActive] = useState(false);
  
  if (!showMessage||!message.message) return null;

  const getToneBadge = (tone: AdvisorTone) => {
    switch (tone) {
      case 'congratulatory':
        return { text: '🎉 Excellent!', classes: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' };
      case 'encouraging':
        return { text: '💪 Great Progress!', classes: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' };
      case 'motivational':
        return { text: '🚀 Keep Going!', classes: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' };
      case 'reassuring':
        return { text: '🤝 I\'m Here!', classes: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' };
      case 'informative':
        return { text: '💡 Good to Know!', classes: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' };
      default:
        return { text: '✨ Moneko', classes: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' };
    }
  };

  const badge = getToneBadge(message.tone);

  // Handle typewriter animation state
  const handleTypewriterComplete = () => {
    setIsTypewriterActive(false);
  };

  // Start typewriter animation after the delay (300ms default delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTypewriterActive(true);
    }, 300); // This should match the delay prop passed to TypewriterText

    return () => clearTimeout(timer);
  }, [message.message]); // Reset when message changes

  // Choose avatar based on typewriter state
  const avatarSrc = monekoIconGif;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className={`${transparentBackground ? '' : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 shadow-lg border border-blue-100 dark:border-blue-800'} ${className}`}
    >
      <div className="flex items-start space-x-4">
        {/* Moneko Avatar */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 dark:from-blue-500 dark:to-indigo-600 p-1 shadow-md">
            <img 
              src={avatarSrc} 
              alt="Moneko AI" 
              className="w-full h-full rounded-full object-cover bg-white dark:bg-gray-800"
            />
          </div>
        </div>
        
        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-blue-100 dark:border-gray-700 relative">
            {/* Speech bubble tail */}
            <div className="absolute left-0 top-4 w-0 h-0 border-r-8 border-r-white dark:border-r-gray-800 border-t-4 border-b-4 border-t-transparent border-b-transparent -ml-2"></div>
            
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Moneko
              </h4>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.classes}`}>
                {badge.text}
              </span>
            </div>
            
         {message.message&&   <TypewriterText
              text={`${message.message}`}
              speed={typewriterSpeed}
              delay={300}
              className="text-sm leading-relaxed text-gray-700 dark:text-gray-300"
              showCursor={true}
              cursorClassName="animate-pulse text-blue-400 dark:text-blue-300"
              onComplete={handleTypewriterComplete}
            />}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MonekoAdvisorMessage;