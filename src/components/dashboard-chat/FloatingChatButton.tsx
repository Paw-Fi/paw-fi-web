
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots } from '@fortawesome/free-solid-svg-icons';

interface FloatingChatButtonProps {
  onClick: () => void;
}

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 right-8 bg-primary text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      aria-label="Open chat"
    >
      <FontAwesomeIcon icon={faCommentDots} className="w-8 h-8" />
    </button>
  );
};
