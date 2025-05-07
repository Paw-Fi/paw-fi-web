'use client';

import { useState, useEffect } from 'react';
import classnames from 'classnames';
import type { ChoiceQuestion as ChoiceQuestionType } from '@/types/learning';

interface ChoiceQuestionProps {
  question: ChoiceQuestionType;
  onAnswer: (answer: Array<string> | string) => void;
  value?: Array<string> | string;
}

function ChoiceQuestion({ question, onAnswer, value }: ChoiceQuestionProps) {
  // For MCQ we store an array of selected option ids, for SCQ just a single id
  const [selectedOptions, setSelectedOptions] = useState<Array<string>>(
    question.type === 'mcq' 
      ? (value as Array<string> || []) 
      : (value ? [value as string] : [])
  );
  
  // Effect to call onAnswer when selection changes
  useEffect(() => {
    if (selectedOptions.length > 0) {
      if (question.type === 'mcq') {
        onAnswer(selectedOptions);
      } else {
        // For SCQ, just return the single selected option
        onAnswer(selectedOptions[0]);
      }
    }
  }, [selectedOptions, onAnswer, question.type]);
  
  const toggleOption = (optionId: string) => {
    if (question.type === 'mcq') {
      // For multiple choice, toggle the selection
      setSelectedOptions(prev => {
        if (prev.includes(optionId)) {
          return prev.filter(id => id !== optionId);
        } else {
          return [...prev, optionId];
        }
      });
    } else {
      // For single choice, replace the selection
      setSelectedOptions([optionId]);
    }
  };
  
  return (
    <div className="choice-question">
      <div className="space-y-3">
        {question.options.map((option) => (
          <div 
            key={option.id}
            onClick={() => toggleOption(option.id)}
            className={classnames(
              'p-4 rounded-lg border transition-all cursor-pointer',
              {
                'border-primary bg-purple-50': selectedOptions.includes(option.id),
                'border-gray-200 hover:border-gray-300': !selectedOptions.includes(option.id)
              }
            )}
          >
            <div className="flex items-start">
              <div className="mr-3 mt-0.5">
                {question.type === 'mcq' ? (
                  <div className={classnames(
                    'w-5 h-5 rounded border flex items-center justify-center',
                    {
                      'border-primary bg-primary text-white': selectedOptions.includes(option.id),
                      'border-gray-300': !selectedOptions.includes(option.id)
                    }
                  )}>
                    {selectedOptions.includes(option.id) && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                ) : (
                  <div className={classnames(
                    'w-5 h-5 rounded-full border flex items-center justify-center',
                    {
                      'border-primary': selectedOptions.includes(option.id),
                      'border-gray-300': !selectedOptions.includes(option.id)
                    }
                  )}>
                    {selectedOptions.includes(option.id) && (
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
