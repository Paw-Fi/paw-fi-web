"use client";

interface LessonBackButtonProps {
  onBack: () => void;
}

export function LessonBackButton({ onBack }: LessonBackButtonProps) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-6">
      <button
        onClick={onBack}
        className="flex cursor-pointer items-center font-medium text-gray-600"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mr-1"
        >
          <path
            d="M10 4L6 8L10 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Go Back
      </button>
    </div>
  );
}
