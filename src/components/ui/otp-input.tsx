'use client';

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  autoSubmit?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  className,
  autoSubmit = false,
}: OtpInputProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize input refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Convert value string to array of individual digits
  const digits = value.split('').slice(0, length);
  while (digits.length < length) {
    digits.push('');
  }

  // Auto-submit when all digits are filled
  useEffect(() => {
    if (autoSubmit && value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, length, onComplete, autoSubmit]);

  const focusInput = (index: number) => {
    if (index >= 0 && index < length && inputRefs.current[index]) {
      inputRefs.current[index]?.focus();
      setActiveIndex(index);
    }
  };

  const handleChange = (index: number, digit: string) => {
    if (disabled) return;

    // Only allow single digits
    const newDigit = digit.replace(/\D/g, '').slice(-1);
    
    const newDigits = [...digits];
    newDigits[index] = newDigit;
    
    const newValue = newDigits.join('');
    onChange(newValue);

    // Auto-focus next input if digit was entered
    if (newDigit && index < length - 1) {
      focusInput(index + 1);
    }

    // Call onComplete if all digits are filled
    if (newValue.length === length && onComplete) {
      onComplete(newValue);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (e.key) {
      case 'Backspace':
        e.preventDefault();
        if (digits[index]) {
          // Clear current digit
          handleChange(index, '');
        } else if (index > 0) {
          // Move to previous input and clear it
          focusInput(index - 1);
          handleChange(index - 1, '');
        }
        break;
      
      case 'Delete':
        e.preventDefault();
        handleChange(index, '');
        break;
      
      case 'ArrowLeft':
        e.preventDefault();
        focusInput(index - 1);
        break;
      
      case 'ArrowRight':
        e.preventDefault();
        focusInput(index + 1);
        break;
      
      case 'Home':
        e.preventDefault();
        focusInput(0);
        break;
      
      case 'End':
        e.preventDefault();
        focusInput(length - 1);
        break;
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const pastedDigits = pastedData.replace(/\D/g, '').slice(0, length);
    
    if (pastedDigits) {
      onChange(pastedDigits);
      
      // Focus the next empty input or the last input
      const nextIndex = Math.min(pastedDigits.length, length - 1);
      focusInput(nextIndex);
      
      // Call onComplete if all digits are filled
      if (pastedDigits.length === length && onComplete) {
        onComplete(pastedDigits);
      }
    }
  };

  const handleFocus = (index: number) => {
    setActiveIndex(index);
    // Select all text in the input for easy replacement
    inputRefs.current[index]?.select();
  };

  const handleClick = (index: number) => {
    focusInput(index);
  };

  return (
    <div className={cn("flex gap-2 justify-center", className)}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          onClick={() => handleClick(index)}
          disabled={disabled}
          className={cn(
            "w-12 h-12 text-center text-lg font-mono font-semibold",
            "border-2 rounded-lg transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            // Active/filled state styling
            digit
              ? "border-primary bg-primary/5 text-primary"
              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800",
            // Focus state
            activeIndex === index && !disabled
              ? "ring-2 ring-primary border-primary"
              : "",
            // Hover state
            !disabled && "hover:border-primary/50"
          )}
          aria-label={`Digit ${index + 1} of ${length}`}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}
