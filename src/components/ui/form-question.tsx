import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faExclamationTriangle,
  faCheck,
  faDollarSign,
  faPercent
} from "@fortawesome/free-solid-svg-icons";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { cn } from "@/lib/utils";
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
  const getInputClassName = (hasError: boolean) => {
    if (hasError) {
      return "border-red-200 dark:border-red-800 focus-visible:border-red-500 focus-visible:ring-red-100 dark:focus-visible:ring-red-900";
    }
    return "";
  };

  const renderInput = () => {
    switch (type) {
      case 'text':
      case 'email':
        return (
          <Input
            id={id}
            type={type === 'text' ? 'text' : 'email'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={getInputClassName(!!error)}
          />
        );
        
      case 'text_area':
        return (
          <Textarea
            id={id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className={getInputClassName(!!error)}
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
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground-color w-4 h-4 z-10" 
              />
            )}
            <Input
              id={id}
              type="number"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              min={validation?.min}
              max={validation?.max}
              className={cn(
                getInputClassName(!!error),
                type === 'currency' ? 'pl-12' : '',
                type === 'percentage' ? 'pr-12' : ''
              )}
            />
            {type === 'percentage' && (
              <FontAwesomeIcon 
                icon={faPercent} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground-color w-4 h-4 z-10" 
              />
            )}
          </div>
        );

      case 'date':
        return (
          <Input
            id={id}
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={getInputClassName(!!error)}
          />
        );

      case 'single_choice':
        return (
          <div className={`grid grid-cols-1 ${
            optionsPerRow === 4 ? "md:grid-cols-4" : 
            optionsPerRow === 3 ? "md:grid-cols-3" : 
            "md:grid-cols-2"
          } gap-3`}>
            {options?.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`rounded-xl p-4 text-sm font-medium transition-all duration-200 border ${
                  value === option.value 
                    ? 'bg-primary text-white border-primary shadow-sm' 
                    : 'bg-card text-foreground border hover:border-primary/50 hover:shadow-sm'
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
          } gap-3`}>
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
                  className={`rounded-xl p-4 text-sm font-medium transition-all duration-200 border flex items-center gap-3 ${
                    isSelected 
                      ? 'bg-primary text-white border-primary shadow-sm' 
                      : 'bg-card text-foreground border hover:border-primary/50 hover:shadow-sm'
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
            <Textarea
              id={id}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="List your debts (one per line): Name, Balance, Interest Rate, Min Payment"
              rows={6}
              className={getInputClassName(!!error)}
            />
            <p className="text-sm text-muted-foreground-color mt-2">
              Enter each debt on a separate line with details separated by commas
            </p>
          </div>
        );
        
      case 'rating_scale':
        return (
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                type="button"
                onClick={() => onChange(rating)}
                className={`w-12 h-12 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                  value === rating 
                    ? 'bg-primary text-white border-primary shadow-sm' 
                    : 'bg-card text-foreground border hover:border-primary/50 hover:shadow-sm'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
        );
        
      case 'slider':
        return (
          <div className="py-2">
            <input
              id={id}
              type="range"
              min={validation?.min || 0}
              max={validation?.max || 100}
              value={value || (validation?.min || 0)}
              onChange={(e) => onChange(Number(e.target.value))}
              className={cn(
                "w-full h-3 bg-subtle-background rounded-full appearance-none cursor-pointer slider",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200",
                "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm",
                "[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-sm"
              )}
            />
            <div className="flex justify-between text-sm text-muted-foreground-color mt-3">
              <span>{validation?.min || 0}</span>
              <span className="font-semibold text-foreground px-3 py-1 bg-subtle-background rounded-lg shadow-sm">{value || (validation?.min || 0)}</span>
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
      className="space-y-3"
    >
      <label className="block text-sm font-semibold text-foreground">
        {question}
        {validation?.required && <span className="text-warning ml-1">*</span>}
      </label>
      {description && (
        <p className="text-sm text-muted-foreground-color leading-relaxed">{description}</p>
      )}
      <div className="mt-2">
        {renderInput()}
      </div>
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2"
          >
            <p className="text-xs text-warning">
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}