'use client';

import { useEffect, useRef } from 'react';
import classnames from 'classnames';
import { useRouter } from '@tanstack/react-router';
import RadioQuestion from './radio-question';
import CheckboxQuestion from './checkbox-question';
import NumberQuestion from './number-question';
import SortableQuestion from './sortable-question';
import { questions } from '@/types/questions';
import { useQuestionnaire } from '@/contexts/questionnaire-context';
import ProgressDots from '@/components/ui/progress-dots';
import { Button } from '@/components/ui/button';
import catIcon from '@/assets/images/icon.svg'

function QuestionContainer() {
  const router = useRouter();
  const { state, nextStep, prevStep, isComplete } = useQuestionnaire();
  const { currentStep } = state;
  
  // Use a more reliable navigation pattern with a ref to track if we've already navigated
  const hasNavigatedRef = useRef(false);
  
  // Only navigate to results once when questionnaire is complete
  useEffect(() => {
    if (isComplete && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      // Use replace to avoid adding to history stack
      router.navigate({ to: '/results', replace: true });
    }
  }, [isComplete, router]);

  // Get current question
  const currentQuestion = questions[currentStep];
  
  // Handle the case when there's no current question
  if (currentStep >= questions.length) return null;

  const renderQuestion = () => {
    switch (currentQuestion.type) {
      case 'radio':
        return <RadioQuestion question={currentQuestion} />;
      case 'checkbox':
        return <CheckboxQuestion question={currentQuestion} />;
      case 'number':
        return <NumberQuestion question={currentQuestion} />;
      case 'sortable':
        return <SortableQuestion question={currentQuestion} />;
      default:
        return null;
    }
  };

  const handleBack = () => {
    prevStep();
  };

  const handleNext = () => {
    nextStep();
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Back button - positioned outside the container in the top left */}
      <button 
        onClick={handleBack}
        disabled={currentStep === 0}
        className={classnames(
          'absolute top-4 left-4 flex items-center font-medium',
          {
            'cursor-pointer': currentStep !== 0,
            'text-gray-300': currentStep === 0,
            'text-gray-600': currentStep !== 0
          }
        )}
      >
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 16 16" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="mr-1"
        >
          <path 
            d="M10 4L6 8L10 12" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        Back
      </button>
      
      <div className="flex items-center justify-center flex-grow">
        <div className="bg-white rounded-3xl overflow-hidden shadow-lg max-w-md w-full p-6 my-8">
          {/* Progress indicator */}
          <ProgressDots 
            totalSteps={questions.length} 
            currentStep={currentStep} 
          />

          {/* Cat icon */}
          <div className="flex justify-center mb-6">
            <img src={catIcon} alt="PawFi Cat" className="w-16 h-16" />
          </div>

          {/* Question title and description */}
          <h1 className="text-xl font-bold text-center mb-2">{currentQuestion.title}</h1>
          <p className="text-gray-600 text-center text-sm mb-6">{currentQuestion.description}</p>

          {/* Dynamic question content */}
          {renderQuestion()}

          {/* Next button */}
          <Button 
            onClick={handleNext} 
            fullWidth 
            className="mt-6"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default QuestionContainer;
