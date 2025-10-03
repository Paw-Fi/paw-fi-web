'use client';

import { useState, useEffect } from 'react';
import type { TextInputQuestion } from '@/types/learning.types';

interface TextInputQuestionProps {
  question: TextInputQuestion;
  onAnswer: (value: string) => void;
  value?: string;
}

export default function TextInputQuestion({ question, onAnswer, value = '' }: TextInputQuestionProps) {
  // Only use value if it's a non-question_id string, otherwise default to empty string
  const initialInputValue = value && typeof value === 'string' && value !== question.question_id ? value : "";
  const [inputValue, setInputValue] = useState<string>(initialInputValue);
  const [error, setError] = useState<string | null>(null);
  
  // Update internal state when external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const validateInput = (val: string): boolean => {
    // No validation needed if no validation rules specified
    if (!question.validation) return true;
    
    // Check if required and empty
    if (question.validation.required && !val.trim()) {
      setError('This field is required');
      return false;
    }
    
    // Validate with regex pattern if specified
    if (question.validation.pattern) {
      const regex = new RegExp(question.validation.pattern);
      if (!regex.test(val)) {
        setError(question.validation.errorMessage || 'Invalid input');
        return false;
      }
    }
        
    // Validate numeric input if min/max specified
    // if (question.validation.min !== undefined || question.validation.max !== undefined) {
    //   const numVal = parseFloat(val);
      
    //   if (isNaN(numVal)) {
    //     setError('Please enter a valid number');
    //     return false;
    //   }
      
    //   if (question.validation.min !== undefined && numVal < question.validation.min) {
    //     setError(`Value must be at least ${question.validation.min}`);
    //     return false;
    //   }
      
    //   if (question.validation.max !== undefined && numVal > question.validation.max) {
    //     setError(`Value must be no more than ${question.validation.max}`);
    //     return false;
    //   }
    // }
    
    // All validations passed
    setError(null);
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Clear error when user types
    if (error) setError(null);
    
    // Only propagate the input value
    onAnswer(newValue);
  };



  const handleBlur = () => {
    validateInput(inputValue);
  };

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      <div className="relative">
        {question.prefix && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-4 pointer-events-none text-mobile-sm sm:text-base text-[var(--question-text-secondary)]">
            {question.prefix}
          </div>
        )}

        <input
          type="text"
          className={`w-full py-3 px-3 sm:px-4 border rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-mobile-base sm:text-base min-h-[48px]
            ${question.prefix ? 'pl-7 sm:pl-8' : ''}
            ${question.suffix ? 'pr-7 sm:pr-8' : ''}
            ${error ? 'border-[var(--quiz-error-border)] bg-[var(--quiz-error-bg)]' : 'border-[var(--question-border)] bg-[var(--question-bg)]'}`}
          placeholder={question.placeholder || ''}
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={!!error}
          aria-describedby={error ? `${question.question_id}-error` : undefined}
        />

        {question.suffix && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 sm:pr-4 pointer-events-none text-mobile-sm sm:text-base text-[var(--question-text-secondary)]">
            {question.suffix}
          </div>
        )}
      </div>

      {error && (
        <p
          id={`${question.question_id}-error`}
          className="text-mobile-xs sm:text-sm text-[var(--quiz-error-text)]"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}
