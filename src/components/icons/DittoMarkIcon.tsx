import React from 'react';

interface DittoMarkIconProps {
  className?: string;
}

export function DittoMarkIcon({ className }: DittoMarkIconProps) {
  return (
    <span className={`text-[9rem] font-serif text-primary-300 dark:text-primary-600 opacity-20 transform ${className || ''}`}>
      "
    </span>
  );
}
