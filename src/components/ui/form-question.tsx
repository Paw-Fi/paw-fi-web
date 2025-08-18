import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faExclamationTriangle,
  faCheck,
  faDollarSign,
  faPercent
} from "@fortawesome/free-solid-svg-icons";
import type { QuestionType, QuestionOption, QuestionValidation } from '@/types/financial-quiz-constants';

interface FormQuestionProps {
  id: string;
  question: string;
  description?: string;
  type: QuestionType;
  options?: QuestionOption[];
  value: any;
  onChange: (value: any) => void;
  error?: string;
  placeholder?: string;
  validation?: QuestionValidation;
  optionsPerRow?: 2 | 3 | 4;
}

export function FormQuestion({
  id,
  question,
  description,
  type,
  options,
  value,
  onChange,
  error,
  placeholder,
  validation,
  optionsPerRow = 2
}: FormQuestionProps) {
  const inputClasses = `w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary dark:focus:border-primary ${
    error ? 'border-red-500 dark:border-red-400 focus:ring-red-500/50 dark:focus:ring-red-400/50' : ''
  }`;

  const renderInput = () => {
    switch (type) {
      case 'text':
      case 'email':
        return (
          <input
            type={type === 'text' ? 'text' : 'email'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={inputClasses}
          />
        );
        
      case 'text_area':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className={inputClasses}
          />
        );

      case 'number':
      case 'currency':
      case 'percentage':
        return (
          <div className="relative">
            {type === 'currency' && (
              <FontAwesomeIcon 
                icon={faDollarSign} 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" 
              />
            )}
            <input
              type="number"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              min={validation?.min}
              max={validation?.max}
              className={`${inputClasses} ${type === 'currency' ? 'pl-10' : ''} ${type === 'percentage' ? 'pr-10' : ''}`}
            />
            {type === 'percentage' && (
              <FontAwesomeIcon 
                icon={faPercent} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" 
              />
            )}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={inputClasses}
          />
        );

      case 'single_choice':
        return (
          <div className={`grid grid-cols-1 ${
            optionsPerRow === 4 ? "md:grid-cols-4" : 
            optionsPerRow === 3 ? "md:grid-cols-3" : 
            "md:grid-cols-2"
          } gap-2`}>
            {options?.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`rounded-md p-2 text-sm transition-colors ${
                  value === option.value 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        );

      case 'multiple_choice':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className={`grid grid-cols-1 ${
            optionsPerRow === 4 ? "md:grid-cols-4" : 
            optionsPerRow === 3 ? "md:grid-cols-3" : 
            "md:grid-cols-2"
          } gap-2`}>
            {options?.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    const newValues = isSelected
                      ? selectedValues.filter(v => v !== option.value)
                      : [...selectedValues, option.value];
                    onChange(newValues);
                  }}
                  className={`rounded-md p-2 text-sm transition-colors flex items-center justify-center space-x-2 ${
                    isSelected 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <FontAwesomeIcon 
                    icon={faCheck} 
                    className={`w-4 h-4 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`} 
                  />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        );

      case 'debt_list':
        // For now, show a simple text input with instructions
        return (
          <div>
            <textarea
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="List your debts (one per line): Name, Balance, Interest Rate, Min Payment"
              rows={6}
              className={inputClasses}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter each debt on a separate line with details separated by commas
            </p>
          </div>
        );
        
      case 'rating_scale':
        return (
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                type="button"
                onClick={() => onChange(rating)}
                className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                  value === rating 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
        );
        
      case 'slider':
        return (
          <div>
            <input
              type="range"
              min={validation?.min || 0}
              max={validation?.max || 100}
              value={value || (validation?.min || 0)}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>{validation?.min || 0}</span>
              <span className="font-medium">{value || (validation?.min || 0)}</span>
              <span>{validation?.max || 100}</span>
            </div>
          </div>
        );

      default:
        return <p>Unsupported question type: {type}</p>;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col"
    >
      <label className="mb-1 text-sm font-medium text-gray-800 dark:text-gray-200">
        {question}
        {validation?.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
      </label>
      {description && (
        <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">{description}</p>
      )}
      {renderInput()}
      <AnimatePresence>
        {error && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-sm text-red-500 dark:text-red-400 flex items-center"
          >
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}