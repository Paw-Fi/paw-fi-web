"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Check } from "lucide-react";

interface Option {
  id: string;
  label: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selectedValues: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxSelections?: number;
  label?: string;
  helperText?: string;
}

export function MultiSelectDropdown({
  options,
  selectedValues,
  onChange,
  placeholder = "Select options",
  className = "",
  disabled = false,
  maxSelections,
  label,
  helperText,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      const option = options.find(opt => opt.id === selectedValues[0]);
      return option ? option.label : placeholder;
    }
    return `${selectedValues.length} selected`;
  };

  const isPlaceholder = selectedValues.length === 0;

  const isOptionDisabled = (optionId: string) => {
    if (selectedValues.includes(optionId)) return false;
    return maxSelections ? selectedValues.length >= maxSelections : false;
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300 text-start">
          {label}
          {helperText && (
            <span className="text-sm text-slate-500 dark:text-slate-400"> {helperText}</span>
          )}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full rounded-xl bg-white px-4 py-1.5 dark:bg-slate-900 text-left outline-none backdrop-blur-sm transition-all duration-200 focus:ring-2 focus:ring-[#7458FF]/30 border border-slate-200 dark:border-slate-700 flex items-center justify-between ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-600'
        }`}
      >
        <span className={`text-sm ${isPlaceholder ? "text-slate-500 dark:text-slate-400 " : "text-slate-900 dark:text-slate-100 "}`}>
          {getDisplayText()}
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-slate-400 dark:text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
        )}
      </button>
      
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 backdrop-blur-xl rounded-xl max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 shadow-lg">
          {options.map((option) => (
            <div
              key={option.id}
              className={`flex items-center px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors duration-150 first:rounded-t-xl last:rounded-b-xl ${
                isOptionDisabled(option.id) && !selectedValues.includes(option.id)
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
              onClick={() => !isOptionDisabled(option.id) && onChange(option.id)}
            >
              <div className="mr-3 flex-shrink-0">
                <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors duration-150 ${
                  selectedValues.includes(option.id)
                    ? 'bg-[#7458FF] border-[#7458FF] text-white'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                }`}>
                  {selectedValues.includes(option.id) && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
              </div>
              <span className="text-sm text-slate-900 dark:text-slate-100">
                {option.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}