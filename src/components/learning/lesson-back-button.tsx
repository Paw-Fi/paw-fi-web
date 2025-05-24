"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

interface LessonBackButtonProps {
  onBack: () => void;
}

export function LessonBackButton({ onBack }: LessonBackButtonProps) {
  return (
      <button
        onClick={onBack}
        className="flex cursor-pointer items-center font-medium text-gray-600 text-nowrap"
      >
        <FontAwesomeIcon 
          icon={faArrowLeft} 
          className="text-lg" 
          fixedWidth 
        />
      </button>
  
  );
}
