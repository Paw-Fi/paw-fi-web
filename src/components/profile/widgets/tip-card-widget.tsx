import { faLightbulb, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from 'framer-motion';
import { DittoMarkIcon } from '@/components/icons/DittoMarkIcon';
import { useState, useMemo, useCallback, useEffect } from "react";
import { ITipCardWidget, ITipCardListItem } from "../types/dashboard-data.typings";
import { Widget } from "./Widget";

export function TipCardWidget({ widget }: { widget: ITipCardWidget }) {
  const { data } = widget;
  const [currentTipIndex, setCurrentTipIndex] = useState<number>(data.currentTipIndex || 0);

  // Sort tips by displayOrder to ensure consistent order if not already sorted
  const sortedTips = useMemo(() => 
    [...(data.tips || [])].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)), 
    [data.tips]
  );

  const currentTip = sortedTips[currentTipIndex] as ITipCardListItem | undefined;

  const navigateTips = useCallback((direction: 'next' | 'prev') => {
    if (!sortedTips.length) return;
    setCurrentTipIndex(prevIndex => {
      if (direction === 'next') {
        return (prevIndex + 1) % sortedTips.length;
      }
      return (prevIndex - 1 + sortedTips.length) % sortedTips.length;
    });
  }, [sortedTips.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') navigateTips('next');
      else if (e.key === 'ArrowLeft') navigateTips('prev');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateTips]);

  // Auto-rotate functionality
  useEffect(() => {
    if (data.autoRotate && sortedTips.length > 1) {
      const timer = setTimeout(() => {
        navigateTips('next');
      }, 5000); // Change tip every 5 seconds
      return () => clearTimeout(timer);
    }
  }, [currentTipIndex, data.autoRotate, sortedTips.length, navigateTips]);

  if (!currentTip || !sortedTips.length) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-gray-50 dark:bg-gray-800 rounded-lg">
          <FontAwesomeIcon icon={faLightbulb} className="text-3xl text-gray-400 dark:text-gray-500 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No tips available</p>
        </div>
      </Widget>
    );
  }

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="h-full flex flex-col  overflow-hidden transition-all duration-300 ease-in-out">
        {currentTip.image && (
          <div className="w-full h-40 sm:h-48 overflow-hidden">
            <img 
              src={currentTip.image} 
              alt={currentTip.title || 'Tip image'} 
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>
        )}
        <div className="relative flex flex-col flex-grow p-5 sm:p-6">
          <DittoMarkIcon
            className="absolute -top-10 left-2"
          />
          <DittoMarkIcon
            className="absolute -bottom-10 right-2 rotate-180 "
          />
          <div className="relative z-10 flex flex-col flex-grow">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTip.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="flex-grow"
              >
                {currentTip.title && (
                  <h3 className="text-lg sm:text-xl text-center font-semibold text-slate-800 dark:text-slate-100 mb-2 leading-tight">
                    {currentTip.title}
                  </h3>
                )}
                <p className="text-sm sm:text-base text-center text-slate-600 dark:text-slate-300 leading-relaxed">
                  {currentTip.content}
                </p>
              </motion.div>
            </AnimatePresence>
            {currentTip.link && (
              <a
                href={currentTip.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 group transition-colors duration-200"
              >
                Learn More
                <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
            )}
          </div>
        </div>

        {sortedTips.length > 1 && (
          <div className="px-5 sm:px-6 py-4">
            <div className="flex justify-center items-center space-x-2.5">
              {sortedTips.map((tip: ITipCardListItem, index: number) => (
                <button
                  key={tip.id} // Use tip.id for a stable key
                  onClick={() => setCurrentTipIndex(index)}
                  className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 ${
                    index === currentTipIndex
                      ? 'bg-primary'
                      : 'bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500'
                  }`}
                  aria-label={`Go to tip ${index + 1}: ${tip.title}`}
                  aria-current={index === currentTipIndex ? 'true' : 'false'}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Widget>
  );
}
