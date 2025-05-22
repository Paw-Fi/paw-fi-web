"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";

interface LessonBackButtonProps {
  onBack: () => void;
}

export function LessonBackButton({ onBack }: LessonBackButtonProps) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-6">
      <button
        onClick={onBack}
        className="flex cursor-pointer items-center font-medium text-gray-600 text-nowrap"
      >
        <FontAwesomeIcon 
          icon={faChevronLeft} 
          className="mr-1.5 text-sm" 
          fixedWidth 
        />
      </button>
    </div>
  );
}
