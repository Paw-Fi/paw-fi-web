'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import classNames from 'classnames';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  overlayClassName?: string;
  contentClassName?: string;
  disableOverlayClick?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  disableOverlayClick = false,
  overlayClassName = 'bg-overlay',
  contentClassName = 'mx-auto max-w-md flex flex-col rounded-3xl bg-white p-8'
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!overlayRef.current || !contentRef.current) return;
    
    const overlay = overlayRef.current;
    const content = contentRef.current;
    
    if (isOpen) {
      // Make sure content is visible initially
      overlay.style.visibility = 'visible';
      content.style.visibility = 'visible';
      
      // Animate overlay
      gsap.fromTo(overlay, 
        { opacity: 0 }, 
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
      
      // Animate content
      gsap.fromTo(content, 
        { opacity: 0, y: 20, scale: 0.9 }, 
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.7)' }
      );
      
      // Add confetti animation
      const confettiElements = Array.from(content.querySelectorAll('.confetti'));
      if (confettiElements.length > 0) {
        gsap.fromTo(confettiElements, 
          { y: -100, opacity: 1 },
          { 
            y: window.innerHeight,
            x: () => (Math.random() - 0.5) * 200,
            rotation: () => Math.random() * 360,
            duration: () => Math.random() * 3 + 2,
            opacity: 0,
            ease: 'none',
            stagger: 0.1,
            repeat: -1,
          }
        );
      }
      
    } else {
      // Animate out overlay
      const tl = gsap.timeline({
        onComplete: () => {
          overlay.style.visibility = 'hidden';
          content.style.visibility = 'hidden';
        }
      });
      
      tl.to(content, { 
        opacity: 0, 
        y: 20, 
        scale: 0.9, 
        duration: 0.2, 
        ease: 'power2.in' 
      });
      
      tl.to(overlay, { 
        opacity: 0, 
        duration: 0.2, 
        ease: 'power2.in' 
      }, '-=0.1');
    }
    
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        ref={overlayRef}
        className={`absolute inset-0 ${overlayClassName}`}
        onClick={!disableOverlayClick ? onClose : undefined}
        style={{ visibility: 'hidden' }}
      />

      {/* Modal content */}
      <div
        ref={contentRef}
        className={classNames(`relative p-6`,contentClassName)}
        style={{ visibility: 'hidden' }}
      >
        {children}
      </div>
    </div>
  );
}
