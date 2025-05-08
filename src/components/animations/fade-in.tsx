'use client';

import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  stagger?: number;
  from?: {
    y?: number;
    x?: number;
    opacity?: number;
    scale?: number;
  };
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.5,
  stagger = 0.1,
  from = { y: 20, opacity: 0 },
  className = '',
}: FadeInProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Use GSAP React hook for better cleanup and integration
  useGSAP(() => {
    const container = containerRef.current;
    if (!container) return;

    // Get all direct children
    const elements = container.children;
    if (elements.length === 0) return;
    
    // Create staggered entrance animation
    gsap.fromTo(
      elements,
      {
        opacity: from.opacity ?? 0,
        y: from.y ?? 0,
        x: from.x ?? 0,
        scale: from.scale ?? 1,
      },
      {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        duration,
        delay,
        stagger,
        ease: 'power2.out',
      }
    );
  }, { 
    dependencies: [delay, duration, stagger, from.opacity, from.y, from.x, from.scale],
    scope: containerRef 
  });

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
