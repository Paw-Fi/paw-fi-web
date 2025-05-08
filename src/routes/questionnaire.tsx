'use client';

import { useRef } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import QuestionContainer from '../components/questionnaire/question-container';

export const Route = createFileRoute('/questionnaire')({ component: Questionnaire });

function Questionnaire() {
  // Create refs for animation targets
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use GSAP React hooks for better React integration
  useGSAP(() => {
    // Container entrance animation
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
      );
    }
    
    // Set up animation for active questions when they change
    const animateActiveQuestion = () => {
      const activeQuestion = containerRef.current?.querySelector('.active-question');
      if (activeQuestion) {
        gsap.fromTo(
          activeQuestion,
          { scale: 0.98, opacity: 0.8 },
          { 
            scale: 1, 
            opacity: 1, 
            duration: 0.5, 
            ease: 'back.out(1.7)' 
          }
        );
      }
    };

    // Set up a mutation observer to detect DOM changes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          animateActiveQuestion();
        }
      }
    });
    
    // Start observing the container
    if (containerRef.current) {
      observer.observe(containerRef.current, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      });
      
      // Initial animation
      animateActiveQuestion();
    }
    
    // Clean up observer when scope is destroyed
    return () => observer.disconnect();
  }, { scope: containerRef });
  
  return (
    <div ref={containerRef} className="questionnaire-container">
      <QuestionContainer />
    </div>
  );
}
