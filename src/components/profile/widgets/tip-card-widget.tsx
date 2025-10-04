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
        <div className="flex flex-col items-center justify-center h-full p-6 sm:p-8 text-center">
          <div className="bg-amber-50/50 dark:bg-amber-950/30 rounded-full p-4 sm:p-5 mb-4">
            <FontAwesomeIcon icon={faLightbulb} className="text-2xl sm:text-3xl text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-mobile-sm sm:text-sm text-muted-foreground-color">No tips available</p>
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
      <div className="flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out">

        {/* Card content with animations */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTip.id}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col flex-grow bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl p-4 sm:p-6 cursor-pointer"
              onClick={() =>window.open(currentTip.link || '#', '_blank')}
            >
              {/* Tip title */}
              <h4 className="text-mobile-base sm:text-lg font-medium text-foreground mb-3">
                {currentTip.title}
              </h4>

              {/* Tip content */}
              <p className="text-mobile-sm sm:text-sm text-muted-foreground-color leading-relaxed mb-4">
                {currentTip.content}
              </p>

              {/* Spacer to push the bottom content down */}
              <div className="flex-grow"></div>

              {/* Lesson link if available */}
                <div className="mb-2 mt-2">
                  <div className="flex items-center group">
                     <p className="text-mobile-sm sm:text-sm font-medium text-primary">Start Lessons</p>
                    <FontAwesomeIcon
                      icon={faArrowRight}
                      className="h-4 w-4 text-primary ml-2 group-hover:translate-x-1 transition-transform"
                    />
                  </div>
                </div>

            </motion.div>
          </AnimatePresence>

        {/* Navigation controls */}
        {sortedTips.length > 1 && (
          <div className="flex justify-center gap-2 items-center h-12 mt-4">
              {sortedTips.map((tip, index) => (
                <button
                  key={tip.id}
                  onClick={() => setCurrentTipIndex(index)}
                  className={`size-3 rounded-full transition-all duration-300 ${index === currentTipIndex ? 'bg-primary' : 'bg-subtle-background hover:bg-muted-foreground-color/30'}`}
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
