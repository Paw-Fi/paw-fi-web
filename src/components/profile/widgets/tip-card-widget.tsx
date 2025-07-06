import { faLightbulb, faArrowRight, faChevronLeft, faChevronRight, faBookOpen, faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion, Variant } from 'framer-motion';
import { useState, useMemo, useCallback, useEffect } from "react";
import { ITipCardWidget, ITipCardListItem } from "../types/dashboard-data.typings";
import { Widget } from "./Widget";

export function TipCardWidget({ widget }: { widget: ITipCardWidget }) {
  const { data } = widget;
  const [currentTipIndex, setCurrentTipIndex] = useState<number>(data.currentTipIndex || 0);

  // Sort tips by displayOrder to ensure consistent order
  const sortedTips = useMemo(() => 
    [...(data.tips || [])].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)), 
    [data.tips]
  );

  const currentTip = sortedTips[currentTipIndex] as ITipCardListItem | undefined;

  // Navigation function for tips
  const navigateTips = useCallback((direction: 'next' | 'prev') => {
    if (!sortedTips.length) return;
    
    setCurrentTipIndex(prevIndex => {
      if (direction === 'next') {
        return (prevIndex + 1) % sortedTips.length;
      }
      return (prevIndex - 1 + sortedTips.length) % sortedTips.length;
    });
  }, [sortedTips.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') navigateTips('next');
      else if (e.key === 'ArrowLeft') navigateTips('prev');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateTips]);

  // Auto-rotate functionality with a longer time for reading
  useEffect(() => {
    if (data.autoRotate && sortedTips.length > 1) {
      const timer = setTimeout(() => {
        navigateTips('next');
      }, 8000); // Change tip every 8 seconds to give more time to read
      return () => clearTimeout(timer);
    }
  }, [currentTipIndex, data.autoRotate, sortedTips.length, navigateTips]);

  if (!currentTip || !sortedTips.length) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm">
          <FontAwesomeIcon icon={faLightbulb} className="text-3xl text-gray-400 dark:text-gray-500 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No tips available</p>
        </div>
      </Widget>
    );
  }

  // Animation variants for the card content
  const cardVariants = {
    hidden: { opacity: 0, y: 20 } as Variant,
    visible: { 
      opacity: 1, 
      x: 0, 
      transition: { duration: 0.4, ease: "easeOut" }
    } as Variant,
    exit: { 
      opacity: 0, 
      x: -20, 
      transition: { duration: 0.3, ease: "easeIn" }
    } as Variant
  };

  // Format the lesson details for display
  const hasLessonDetails = currentTip.lessonDetails && currentTip.link;

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="h-full flex flex-col  overflow-hidden transition-all duration-300 ease-in-out">
      
        {/* Card content with animations */}
        <div className="flex-grow flex flex-col relative flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTip.id}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col flex-grow"
            >
              {/* Tip title */}
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                {currentTip.title}
              </h4>
              
              {/* Tip content */}
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                {currentTip.content}
              </p>

              {/* Spacer to push the bottom content down */}
              <div className="flex-grow"></div>
              
              {/* Lesson link if available */}
              {hasLessonDetails && (
                <div className="mb-2 mt-2">
                  <a
                    href={currentTip.link || '#'}
                    className="inline-flex items-center justify-between w-full p-3 text-sm font-medium text-left text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors duration-200 group"
                  >
                    <div>
                      <div className="font-medium">Learn more in:</div>
                      <div className="text-gray-700 dark:text-gray-300">
                        {currentTip.lessonDetails?.title}
                      </div>
                    </div>
                    <FontAwesomeIcon 
                      icon={faExternalLinkAlt} 
                      className="h-4 w-4 ml-2 transform transition-transform duration-200 group-hover:translate-x-0.5" 
                    />
                  </a>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation controls */}
        {sortedTips.length > 1 && (
          <div className="flex justify-center gap-2 items-center h-10 mt-4">
        
            
              {sortedTips.map((tip, index) => (
                <button
                  key={tip.id}
                  onClick={() => setCurrentTipIndex(index)}
                  className={`size-3 rounded-full transition-all duration-300 ${index === currentTipIndex ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'}`}
                  aria-label={`Go to tip ${index + 1}`}
                  aria-current={index === currentTipIndex ? 'true' : 'false'}
                />
              ))}
            
          
          </div>
        )}
      </div>
    </Widget>
  );
}
