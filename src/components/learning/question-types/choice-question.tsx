'use client';

import classnames from 'classnames';
import type { ChoiceQuestion as ChoiceQuestionType } from '@/types/learning.types';

interface ChoiceQuestionProps {
  question: ChoiceQuestionType;
  onAnswer: (answer: any) => void;
  value?: string | string[];
}

function ChoiceQuestion({ question, onAnswer, value }: ChoiceQuestionProps) {
  // Determine which options are selected based on the value prop
  const isOptionSelected = (optionId: string): boolean => {
    if (!value) return false;
    
    if (question.type === 'mcq') {
      return Array.isArray(value) && value.includes(optionId);
    } else {
      return value === optionId;
    }
  };

  // Handle option selection without using local state
  const handleOptionSelect = (optionId: string) => {
    if (question.type === 'mcq') {
      // For multiple choice, toggle the selection
      const currentValue = Array.isArray(value) ? value : [];
      const newValue = currentValue.includes(optionId)
        ? currentValue.filter(id => id !== optionId)
        : [...currentValue, optionId];
      
      onAnswer(newValue);
    } else {
      // For single choice, just use the option id
      onAnswer(optionId);
    }
  };
  
  // Determine if options should be displayed in a grid layout
  const useGridLayout = question.itemsPerRow === 2;
  
  return (
    <div className="choice-question">
      <div className={classnames(
        // For single item per row, use vertical spacing
        {'space-y-3': !useGridLayout,
        // For two items per row, use grid
        'grid grid-cols-1 sm:grid-cols-2 gap-3': useGridLayout}
      )}>
        {question.options.map((option) => (
          <div 
            key={option.id}
            onClick={() => handleOptionSelect(option.id)}
            className={classnames(
              'p-4 rounded-lg border transition-all cursor-pointer',
              {
                'border-primary bg-purple-50': isOptionSelected(option.id),
                'border-gray-200 hover:border-gray-300': !isOptionSelected(option.id)
              }
            )}
          >
            <div className="flex items-start">
              <div className="mr-3 mt-0.5">
                {question.type === 'mcq' ? (
                  <div className={classnames(
                    'w-5 h-5 rounded border flex items-center justify-center',
                    {
                      'border-primary bg-primary text-white': isOptionSelected(option.id),
                      'border-gray-300': !isOptionSelected(option.id)
                    }
                  )}>
                    {isOptionSelected(option.id) && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                ) : (
                  <div className={classnames(
                    'w-5 h-5 rounded-full border flex items-center justify-center',
                    {
                      'border-primary': isOptionSelected(option.id),
                      'border-gray-300': !isOptionSelected(option.id)
                    }
                  )}>
                    {isOptionSelected(option.id) && (
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <span className="font-medium text-gray-900">{option.content}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChoiceQuestion;
