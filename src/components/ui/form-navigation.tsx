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
    <div className="flex items-center justify-between pt-8 mt-8">
      <Button
        variant="outline"
        onClick={onBack}
        disabled={!canGoBack}
        className="rounded-xl px-6 py-3 font-medium hover:shadow-sm"
      >
        <FontAwesomeIcon icon={faChevronLeft} className="mr-2 w-4 h-4" />
        {backLabel}
      </Button>

      {isLastStep ? (
        <Button 
          onClick={onSubmit} 
          size="lg" 
          className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
            hasValidationErrors 
              ? 'bg-warning hover:bg-warning/90 text-primary-foreground shadow-sm' 
              : 'shadow-sm hover:shadow-md'
          }`}
          disabled={!isFormComplete || isSubmitting}
          title={hasValidationErrors ? "Please fix validation errors before submitting" : ""}
        >
          <FontAwesomeIcon 
            icon={hasValidationErrors ? faExclamationTriangle : submitIcon} 
            className={`mr-3 w-4 h-4 ${hasValidationErrors ? 'animate-pulse' : ''}`} 
          />
          {isSubmitting ? "Submitting..." : hasValidationErrors ? "Fix Errors" : submitLabel}
        </Button>
      ) : (
        <Button
          onClick={onNext}
          disabled={!canGoNext}
          className={`rounded-xl px-8 py-3 font-semibold transition-all duration-200 ${
            canGoNext ? 'shadow-sm hover:shadow-md' : ''
          }`}
        >
          {nextLabel}
          <FontAwesomeIcon icon={faChevronRight} className="ml-2 w-4 h-4" />
        </Button>
      )}
    </div>
  );
}