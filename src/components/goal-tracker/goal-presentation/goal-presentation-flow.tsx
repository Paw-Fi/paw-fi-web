import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GoalSummaryPage } from './goal-summary-page';
import { KeyInsightsPage } from './key-insights-page';
import { NextStepsPage } from './next-steps-page';
import { FinalCallToActionPage } from './final-call-to-action-page';
import type { GoalCreationResult } from '@/components/goal-tracker/types';
import { useLocation } from '@tanstack/react-router';

interface GoalPresentationFlowProps {
  goalData: GoalCreationResult;
  isLoggedIn: boolean;
  onComplete: () => void;
  onRegister: () => void;
}

type PresentationPage = 'summary' | 'insights' | 'next-steps' | 'final';

const FULL_PAGES: { id: PresentationPage; title: string }[] = [
  { id: 'summary', title: 'Your Plan' },
  { id: 'insights', title: 'Key Insights' },
  { id: 'next-steps', title: 'Next Steps' },
  { id: 'final', title: 'Get Started' }
];

export function GoalPresentationFlow({ 
  goalData, 
  isLoggedIn, 
  onComplete, 
  onRegister 
}: GoalPresentationFlowProps) {
  const [currentPage, setCurrentPage] = useState<PresentationPage>('summary');
  const currentPageIndex = FULL_PAGES.findIndex(page => page.id === currentPage);
  const canGoBack = currentPageIndex > 0;
  const canGoNext = currentPageIndex < FULL_PAGES.length - 1;

  const location=useLocation()
  const isOnTrackerPage=location.pathname.includes("/tracker")
  const PAGES=isOnTrackerPage?FULL_PAGES.slice(0,FULL_PAGES.length-1):FULL_PAGES
  
  // Smoothly scroll the modal's scroll container (or window) to top on page changes
  function scrollToTop() {
    if (typeof window === 'undefined') return;
    const container = document.getElementById('goal-presentation-scroll');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  useEffect(() => {
    scrollToTop();
  }, [currentPage]);

  const handleNext = () => {
    if (canGoNext) {
      const nextPage = PAGES[currentPageIndex + 1].id;
      setCurrentPage(nextPage);
    }
  };
  
  const handleBack = () => {
    if (canGoBack) {
      const prevPage = PAGES[currentPageIndex - 1].id;
      setCurrentPage(prevPage);
    }
  };
  
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'summary':
        return <GoalSummaryPage goalData={goalData} isLoggedIn={isLoggedIn} />;
      case 'insights':
        return <KeyInsightsPage 
          insights={goalData.insights || []} 
          isLoggedIn={isLoggedIn} 
          advisorMessage={goalData.advisorMessages?.insightsMessage}
        />;
      case 'next-steps':
        return <NextStepsPage 
          milestones={goalData.milestones || []} 
          strategy={goalData.strategy || ''} 
          isLoggedIn={isLoggedIn}
          advisorMessage={goalData.advisorMessages?.nextStepsMessage}
        />;
      case 'final':
        return <FinalCallToActionPage 
          isLoggedIn={isLoggedIn}
          goalId={goalData.goal?.id || ''}
          goalTitle={goalData.goal?.title || 'Your Financial Goal'}
          onComplete={onComplete}
          onRegister={onRegister}
        />;
      default:
        return <GoalSummaryPage goalData={goalData} isLoggedIn={isLoggedIn} />;
    }
  };
  
  return (
      <div className="flex-1 flex flex-col px-4 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {PAGES.map((page, index) => (
              <div key={page.id} className={`flex items-center ${index < PAGES.length - 1 ? 'flex-1' : ''}`}>
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-200
                    ${index <= currentPageIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground-color'}
                  `}
                >
                  <span className="text-xs font-semibold">{index + 1}</span>
                </div>
                <span
                  className={`ml-3 text-sm font-medium transition-colors duration-200
                    ${index <= currentPageIndex ? 'text-foreground' : 'text-muted-foreground-color'}
                  `}
                >
                  {page.title}
                </span>
                {index < PAGES.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 rounded-full transition-colors duration-200
                      ${index < currentPageIndex ? 'bg-primary' : 'bg-foreground/10'}
                    `}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Page Content */}
        <div className="flex-1 min-h-0 mb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full overflow-auto"
            >
              {renderCurrentPage()}
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button onClick={handleBack} disabled={!canGoBack} variant="outline" className="flex items-center gap-2">
            Back
          </Button>
          
          <div className="text-sm text-muted-foreground-color">
            {currentPageIndex + 1} of {PAGES.length}
          </div>
          
          {currentPageIndex !== PAGES.length - 1 ? (
            <Button onClick={handleNext} disabled={!canGoNext} className="flex items-center gap-2">
              Next
            </Button>
          ) : isOnTrackerPage ? (
            <Button onClick={onComplete} className="flex items-center gap-2">
              Finish
            </Button>
          ) : (
            <div className="w-20" />
          )}
        </div>
    </div>
  );
}