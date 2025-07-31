import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faChevronLeft,
  faChevronRight,
  faRocket,
  faCheck,
  faExclamationTriangle
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "./button";

interface FormNavigationProps {
  canGoBack: boolean;
  canGoNext: boolean;
  isLastStep: boolean;
  isFormComplete?: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  nextLabel?: string;
  backLabel?: string;
  submitIcon?: any;
  isSubmitting?: boolean;
  hasValidationErrors?: boolean;
}

export function FormNavigation({
  canGoBack,
  canGoNext,
  isLastStep,
  isFormComplete = false,
  onBack,
  onNext,
  onSubmit,
  submitLabel = "Submit",
  nextLabel = "Next",
  backLabel = "Previous",
  submitIcon = faRocket,
  isSubmitting = false,
  hasValidationErrors = false
}: FormNavigationProps) {
  return (
    <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-8">
      <button
        className="flex items-center rounded-lg border border-gray-200 px-4 py-2.5 font-medium text-gray-600 transition-all hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onBack}
        disabled={!canGoBack}
      >
        <FontAwesomeIcon icon={faChevronLeft} className="mr-2" />
        {backLabel}
      </button>

      {isLastStep ? (
        <Button 
          onClick={onSubmit} 
          size="lg" 
          className={`px-8 py-3 transition-all duration-300 ${
            hasValidationErrors 
              ? 'bg-red-500 hover:bg-red-600 border-red-500 shadow-red-200' 
              : ''
          }`}
          disabled={!isFormComplete || isSubmitting}
          title={hasValidationErrors ? "Please fix validation errors before submitting" : ""}
        >
          <FontAwesomeIcon 
            icon={hasValidationErrors ? faExclamationTriangle : submitIcon} 
            className={`mr-3 ${hasValidationErrors ? 'animate-pulse' : ''}`} 
          />
          {isSubmitting ? "Submitting..." : hasValidationErrors ? "Fix Errors" : submitLabel}
        </Button>
      ) : (
        <button
          className={`flex items-center rounded-lg px-6 py-2.5 font-medium shadow-sm transition-all ${
            canGoNext 
              ? "bg-primary text-white hover:bg-secondary" 
              : "cursor-not-allowed bg-gray-300 text-gray-500"
          }`}
          onClick={onNext}
          disabled={!canGoNext}
        >
          {nextLabel}
          <FontAwesomeIcon icon={faChevronRight} className="ml-2" />
        </button>
      )}
    </div>
  );
}