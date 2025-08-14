import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faArrowRight,
  faRocket,
  faUserPlus,
  faChartLine 
} from '@fortawesome/free-solid-svg-icons';
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

const FULL_PAGES: { id: PresentationPage; title: string; icon: any }[] = [
  { id: 'summary', title: 'Your Plan', icon: faChartLine },
  { id: 'insights', title: 'Key Insights', icon: faRocket },
  { id: 'next-steps', title: 'Next Steps', icon: faArrowRight },
  { id: 'final', title: 'Get Started', icon: faUserPlus }
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
        return <KeyInsightsPage insights={goalData.insights || []} isLoggedIn={isLoggedIn} />;
      case 'next-steps':
        return <NextStepsPage 
          milestones={goalData.milestones || []} 
          strategy={goalData.strategy || ''} 
          isLoggedIn={isLoggedIn}
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
      <div className="flex-1 overflow-scroll px-4 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {PAGES.map((page, index) => (
              <div 
                key={page.id}
                className={`flex items-center ${index < PAGES.length - 1 ? 'flex-1' : ''}`}
              >
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                  ${index <= currentPageIndex 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400'
                  }
                `}>
                  <FontAwesomeIcon icon={page.icon} className="w-4 h-4" />
                </div>
                <span className={`
                  ml-3 text-sm font-medium transition-colors duration-300
                  ${index <= currentPageIndex 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-500 dark:text-gray-400'
                  }
                `}>
                  {page.title}
                </span>
                {index < PAGES.length - 1 && (
                  <div className={`
                    flex-1 h-0.5 mx-4 transition-colors duration-300
                    ${index < currentPageIndex 
                      ? 'bg-blue-500' 
                      : 'bg-gray-300 dark:bg-gray-600'
                    }
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Page Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            {renderCurrentPage()}
          </motion.div>
        </AnimatePresence>
        
        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            onClick={handleBack}
            disabled={!canGoBack}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
            Back
          </Button>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {currentPageIndex + 1} of {PAGES.length}
          </div>
          
          {currentPageIndex !== PAGES.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canGoNext}
              variant="primary"
              className="flex items-center gap-2"
            >
              Next
              <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
            </Button>
          ) : isOnTrackerPage?(
            <Button
            onClick={onComplete}
            variant="primary"
            className="flex items-center gap-2"
          >
            Finish
            <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />
          </Button>
          ):(
            <div className="w-20" /> // Placeholder to maintain layout balance
          )}
        </div>
    </div>
  );
}