"use client";

import React, { memo } from "react";

interface AuroraTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  darkColors?: string[];
  speed?: number;
  useTailwindGradient?: boolean;
}

export const AuroraText = memo(
  ({
    children,
    className = "",
    colors = ["#FF0080", "#7928CA", "#0070F3", "#38bdf8"],
    darkColors,
    speed = 1,
    useTailwindGradient = false,
  }: AuroraTextProps) => {
    // Use Tailwind gradient classes for better dark mode support
    if (useTailwindGradient) {
      return (
        <span className={`relative inline-block ${className}`}>
          <span className="sr-only">{children}</span>
          <span
            className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 dark:from-indigo-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent animate-pulse"
            aria-hidden="true"
          >
            {children}
          </span>
        </span>
      );
    }

    // Original implementation with dark mode support
    const lightGradientStyle = { 
      backgroundImage: `linear-gradient(135deg, ${colors.join(", ")}, ${colors[0]})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      animationDuration: `${10 / speed}s`,
    };

    const darkGradientStyle = darkColors ? {
      backgroundImage: `linear-gradient(135deg, ${darkColors.join(", ")}, ${darkColors[0]})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      animationDuration: `${10 / speed}s`,
    } : lightGradientStyle;

    return (
      <span className={`relative inline-block ${className}`}>
        <span className="sr-only">{children}</span>
        {/* Light mode gradient */}
        <span
          className="relative animate-aurora bg-[length:200%_auto] bg-clip-text text-transparent dark:hidden"
          style={lightGradientStyle}
          aria-hidden="true"
        >
          {children}
        </span>
        {/* Dark mode gradient */}
        <span
          className="relative animate-aurora bg-[length:200%_auto] bg-clip-text text-transparent hidden dark:inline"
          style={darkGradientStyle}
          aria-hidden="true"
        >
          {children}
        </span>
      </span>
    );
  },
);

AuroraText.displayName = "AuroraText";
