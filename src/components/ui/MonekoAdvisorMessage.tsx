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
        return { text: '🎉 Excellent!', classes: 'bg-success/10 text-success' };
      case 'encouraging':
        return { text: '💪 Great Progress!', classes: 'bg-primary/10 text-primary' };
      case 'motivational':
        return { text: '🚀 Keep Going!', classes: 'bg-primary/10 text-primary' };
      case 'reassuring':
        return { text: '🤝 I\'m Here!', classes: 'bg-warning/10 text-warning' };
      case 'informative':
        return { text: '💡 Good to Know!', classes: 'bg-primary/10 text-primary' };
      default:
        return { text: '✨ Moneko', classes: 'bg-primary/10 text-primary' };
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
      className={`${transparentBackground ? '' : 'bg-subtle-background rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700'} ${className}`}
    >
      <div className="flex items-start gap-4">
        {/* Moneko Avatar */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-primary p-1 shadow-sm">
            <img 
              src={avatarSrc} 
              alt="Moneko AI" 
              className="w-full h-full rounded-full object-cover bg-card"
            />
          </div>
        </div>
        
        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-card rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 relative">
            {/* Speech bubble tail */}
            <div className="absolute left-0 top-4 w-0 h-0 border-r-8 border-gray-200 dark:border-gray-700  border-r-card border-t-4 border-b-4 border-t-transparent border-b-transparent -ml-2"></div>
            
            <div className="flex items-center gap-3 mb-3">
              <h4 className="font-semibold text-foreground">
                Moneko
              </h4>
              <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium ${badge.classes}`}>
                {badge.text}
              </span>
            </div>
            
         {message.message&&   <TypewriterText
              text={`${message.message}`}
              speed={typewriterSpeed}
              delay={300}
              className="text-sm leading-relaxed text-muted-foreground-color"
              showCursor={true}
              cursorClassName="animate-pulse text-primary"
              onComplete={handleTypewriterComplete}
            />}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MonekoAdvisorMessage;