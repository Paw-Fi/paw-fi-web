'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { TextPlugin } from 'gsap/TextPlugin';

// Register the plugin once
gsap.registerPlugin(TextPlugin);

interface TypewriterProps {
  text: string;
  delay?: number;
  duration?: number;
  className?: string;
  onComplete?: () => void;
  cursorClassName?: string;
  hideCursorOnComplete?: boolean;
}

export function Typewriter({
  text,
  delay = 0.5,
  duration = 2,
  className = '',
  onComplete,
  cursorClassName = 'typewriter-cursor',
  hideCursorOnComplete = true, // Default to hiding cursor when done
}: TypewriterProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const animationCompletedRef = useRef<boolean>(false);
  
  // Use GSAP React hook for automatic cleanup and better integration
  useGSAP(() => {
    const element = elementRef.current;
    const textElement = textRef.current;
    const cursorElement = cursorRef.current;
    
    if (!element || !textElement || !cursorElement) return;
    
    // Skip animation if it's already completed
    if (animationCompletedRef.current) return;
    
    // Reset text content before animation starts
    textElement.textContent = '';
    
    // Make cursor visible at the start of animation
    gsap.set(cursorElement, { opacity: 1 });
    
    // Clear any existing animations
    gsap.killTweensOf(textElement);
    gsap.killTweensOf(cursorElement);

    // Setup blinking cursor animation
    gsap.to(cursorElement, {
      opacity: 0,
      duration: 0.5,
      repeat: -1,
      yoyo: true,
      ease: 'power2.inOut'
    });
    
    // Create typewriter animation
    gsap.to(textElement, {
      delay,
      duration,
      text: {
        value: text,
        delimiter: '',
      },
      ease: 'none',
      onComplete: () => {
        // Mark this animation as completed to prevent it from running again
        animationCompletedRef.current = true;
        
        // Hide cursor when typing is complete if requested
        if (hideCursorOnComplete) {
          // Ensure blinking animation is stopped
          gsap.killTweensOf(cursorElement);
          
          // Fade out cursor completely
          gsap.to(cursorElement, {
            opacity: 0,
            duration: 0.3,
            ease: 'power2.inOut',
            overwrite: true
          });
          
          // After fade out, completely remove cursor by setting display none
          gsap.set(cursorElement, { display: 'none', delay: 0.3 });
        }
        
        // Call the onComplete callback if provided
        if (onComplete) {
          onComplete();
        }
      },
    });
  }, { dependencies: [text, delay, duration, onComplete, hideCursorOnComplete], scope: elementRef });

  return (
    <div ref={elementRef} className={className}>
      <span ref={textRef}></span>
      <span ref={cursorRef} className={cursorClassName}>|</span>
    </div>
  );
}
