import { memo } from 'react';

interface ProgressDotsProps {
  currentStep: number;
  totalSteps?: number; // Optional since we're not using it
}

function ProgressDots({ currentStep }: ProgressDotsProps) {
  // Limit to 3 dots as shown in the mockup, regardless of actual question count
  return (
    <div className="flex items-center justify-center gap-2 my-4">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`h-2 w-2 rounded-full transition-colors duration-200 ${
            index === currentStep % 3 ? 'bg-purple-600' : 'bg-gray-300'
          }`}
          aria-label={index === currentStep % 3 ? 'Current step' : `Step ${index + 1}`}
        />
      ))}
    </div>
  );
}

export default memo(ProgressDots);
