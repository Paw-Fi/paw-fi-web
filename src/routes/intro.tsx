'use client';

import { useState, useRef } from 'react';
import { createFileRoute, Link } from "@tanstack/react-router";
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
// Using Link directly with viewTransition prop instead of Button component
import catIcon from "../assets/images/cat.gif";
import { Typewriter } from "../components/animations/typewriter";

export const Route = createFileRoute("/intro")({
  component: IntroPage,
});

function IntroPage() {
  const [showContent, setShowContent] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [typingComplete, setTypingComplete] = useState(false);

  const catIconRef = useRef<HTMLImageElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const secondParagraphRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  
  // Cat animation effect using useGSAP hook
  useGSAP(() => {
    if (!catIconRef.current) return;
    
    // Animate the cat with a little bounce
    gsap.to(catIconRef.current, {
      y: -10,
      duration: 1.5,
      ease: 'power1.inOut',
      repeat: -1,
      yoyo: true
    });
  }, { scope: catIconRef });

  // Animate content elements when they appear
  useGSAP(() => {
    if (showContent && contentRef.current) {
      const items = contentRef.current.querySelectorAll('.animate-item');
      if (items.length === 0) return;
      
      gsap.fromTo(items, 
        { y: 20, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          duration: 0.6, 
          stagger: 0.15, 
          ease: 'power2.out'
        }
      );
    }
  }, { 
    dependencies: [showContent], 
    scope: contentRef
  });
  
  // Animate second paragraph when it appears
  useGSAP(() => {
    if (typingComplete && secondParagraphRef.current) {
      // Animate the second paragraph after typewriter finishes
      gsap.fromTo(
        secondParagraphRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }
      );
    }
  }, { dependencies: [typingComplete], scope: secondParagraphRef });
  
  // Handle button animation when it appears
  useGSAP(() => {
    if (showButton && buttonRef.current) {
      gsap.fromTo(buttonRef.current, 
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
      );
    }
  }, { 
    dependencies: [showButton],
    scope: buttonRef
  });
  
  // Using direct Link components with viewTransition prop

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="relative flex w-full max-w-md flex-col gap-4 overflow-hidden rounded-3xl bg-white px-4 py-6 shadow-lg">
        {/* Title animation */}
        <h1 className="mb-4 text-center text-2xl font-bold text-gray-800 animate-item">
          Welcome to PawFi!
        </h1>

        {/* Animated Cat icon */}
        <div className="mb-4 flex justify-center">
          <img 
            ref={catIconRef}
            src={catIcon} 
            alt="PawFi Cat" 
            className="h-24 w-24" 
            onLoad={() => setShowContent(true)} 
          />
        </div>

        {/* Introduction text with typewriter effect */}
        {showContent && (
          <div 
            ref={contentRef}
            className="mb-6 text-center text-sm text-gray-700 md:text-base"
          >
            <Typewriter
              text="I'm PawFi, your personal finance guide! I'm here to help you save and invest toward your life goals. "
              duration={2}
              className="mb-2"
              onComplete={() => {
                setTypingComplete(true);
              }}
            />
           
            {
               typingComplete&&  <Typewriter
                 text="Let's create a personalized plan that fits
                your needs and goals. Ready to start your financial journey?"
                 duration={2}
                 className="mb-2"
                 onComplete={() => {
                   setShowButton(true);
                 }}
               />
            }
          </div>
        )}

        {/* Get started button */}
        {showButton && (
          <div ref={buttonRef} className="flex justify-center">
            <Link
              to="/questionnaire"
              viewTransition={{ types: ['slide-left'] }}
              className="inline-block py-3 px-6 bg-[#1b1b1b] text-white rounded-lg font-medium hover:opacity-90 text-center"
            >
              Let's get started!
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
