import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faExclamationTriangle,
  faCheck,
  faDollarSign,
  faPercent
} from "@fortawesome/free-solid-svg-icons";

interface QuestionOption {
  value: string;
  label: string;
}

interface FormQuestionProps {
  id: string;
  question: string;
  description?: string;
  type: "text" | "email" | "number" | "currency" | "percentage" | "date" | "single_choice" | "multiple_choice";
  options?: QuestionOption[];
  value: any;
  onChange: (value: any) => void;
  error?: string;
  placeholder?: string;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
  };
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
  const inputClasses = `w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary ${
    error ? 'border-red-500 focus:ring-red-500/50' : ''
  }`;

  const renderInput = () => {
    switch (type) {
      case 'text':
      case 'email':
        return (
          <input
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
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
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" 
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
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
      <label className="mb-1 text-sm font-medium text-gray-800">
        {question}
        {validation?.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {description && (
        <p className="mb-2 text-xs text-gray-600">{description}</p>
      )}
      {renderInput()}
      <AnimatePresence>
        {error && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-sm text-red-500 flex items-center"
          >
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}