"use client";

import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";

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

  const isOptionDisabled = (optionId: string) => {
    if (selectedValues.includes(optionId)) return false;
    return maxSelections ? selectedValues.length >= maxSelections : false;
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-foreground text-start">
          {label}
          {helperText && (
            <span className="text-sm text-muted-foreground"> {helperText}</span>
          )}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full rounded-lg border border-border bg-background/70 p-3 text-left outline-none backdrop-blur-sm transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-primary dark:bg-background/70 flex items-center justify-between ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className="text-foreground">
          {getDisplayText()}
        </span>
        <FontAwesomeIcon 
          icon={isOpen ? faChevronUp : faChevronDown} 
          className="text-muted-foreground"
        />
      </button>
      
      {isOpen && !disabled && (
        <div className="absolute z-40 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option.id}
              className={`flex items-center p-3 hover:bg-accent cursor-pointer transition-colors duration-150 ${
                isOptionDisabled(option.id) && !selectedValues.includes(option.id)
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(option.id)}
                onChange={() => onChange(option.id)}
                disabled={isOptionDisabled(option.id)}
                className="mr-3 h-4 w-4 text-primary focus:ring-primary border-border rounded accent-primary"
                style={{
                  accentColor: selectedValues.includes(option.id) ? 'hsl(var(--primary))' : undefined
                }}
              />
              <span className="text-sm text-foreground">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}