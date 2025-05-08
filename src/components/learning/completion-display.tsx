'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import gsap from 'gsap';

interface CompletionDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  reward?: {
    amount: number;
    unit: string;
  };
  actionText: string;
  emoji?: string;
}

export function CompletionDisplay({
  isOpen,
  onClose,
  title,
  description,
  reward,
  actionText = 'Continue Learning',
  emoji = '🎉'
}: CompletionDisplayProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const rewardRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  
  // Animation for the content when modal is opened
  useEffect(() => {
    if (!isOpen || !titleRef.current || !descriptionRef.current || !emojiRef.current || !buttonRef.current) return;
    
    const tl = gsap.timeline({ defaults: { ease: 'back.out(1.7)' } });
    
    // Create and animate confetti elements
    const modalContent = document.querySelector('.modal-content');
    if (!modalContent) return;
    
    // Clear any existing confetti container
    const existingContainer = modalContent.querySelector('.confetti-container');
    if (existingContainer) existingContainer.remove();
    
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    modalContent.appendChild(confettiContainer);
    
    // Create confetti pieces
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.backgroundColor = ['#7458FF', '#9181FF', '#16CDA2', '#FFD166', '#FF6B6B'][Math.floor(Math.random() * 5)];
      confetti.style.width = `${Math.random() * 10 + 5}px`;
      confetti.style.height = `${Math.random() * 10 + 5}px`;
      confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
      confetti.style.position = 'absolute';
      confetti.style.top = '-10px';
      confetti.style.left = `${Math.random() * 100}%`;
      
      confettiContainer.appendChild(confetti);
      
      gsap.to(confetti, {
        y: window.innerHeight,
        x: `${(Math.random() - 0.5) * 200}`,
        rotation: Math.random() * 360,
        duration: Math.random() * 3 + 2,
        ease: 'none',
        repeat: -1,
        delay: Math.random() * 2
      });
    }
    
    // Make sure all elements are visible before animating
    gsap.set([titleRef.current, descriptionRef.current, buttonRef.current], { 
      visibility: 'visible', 
      opacity: 0 
    });
    
    // Special handling for emoji which can sometimes not display properly with certain animations
    if (emojiRef.current) {
      gsap.set(emojiRef.current, { 
        visibility: 'visible', 
        opacity: 1,
        scale: 1,
        rotation: 0
      });
      
      // Add a bounce animation
      gsap.to(emojiRef.current, {
        y: -15,
        duration: 0.5,
        repeat: 1,
        yoyo: true,
        ease: "power2.out",
        delay: 0.3
      });
    }
    
    if (rewardRef.current) {
      gsap.set(rewardRef.current, { visibility: 'visible', opacity: 0 });
    }
    
    tl.from(titleRef.current, { 
      y: 30, 
      opacity: 0, 
      duration: 0.4 
    }, '-=0.3');
    
    tl.to(titleRef.current, { opacity: 1, duration: 0.3 }, '-=0.2');
    
    tl.from(descriptionRef.current, { 
      y: 30, 
      opacity: 0, 
      duration: 0.4 
    }, '-=0.2');
    
    tl.to(descriptionRef.current, { opacity: 1, duration: 0.3 }, '-=0.2');
    
    if (rewardRef.current) {
      tl.from(rewardRef.current, { 
        scale: 0.8, 
        opacity: 0, 
        duration: 0.4 
      }, '-=0.2');
      
      tl.to(rewardRef.current, { opacity: 1, duration: 0.3 }, '-=0.2');
    }
    
    tl.from(buttonRef.current, { 
      y: 30, 
      opacity: 0, 
      duration: 0.4 
    }, '-=0.2');
    
    tl.to(buttonRef.current, { opacity: 1, duration: 0.3 }, '-=0.2');
    
    return () => {
      // Clean up confetti and kill animation timeline
      if (confettiContainer.parentNode) {
        confettiContainer.remove();
      }
      tl.kill();
    };
  }, [isOpen]);
  
  return (
    <Modal isOpen={isOpen} disableOverlayClick onClose={onClose} contentClassName="modal-content mx-auto max-w-md flex flex-col rounded-3xl bg-white p-8 text-center">
      <div ref={emojiRef} className="mb-6 flex justify-center items-center">
        <span className="emoji-display block text-5xl leading-none">{emoji}</span>
      </div>
      
      <h2 ref={titleRef} className="mb-2 text-2xl font-bold">
        {title}
      </h2>
      
      <p ref={descriptionRef} className="mb-6 text-gray-600">
        {description}
      </p>
      
      {reward && (
        <div ref={rewardRef} className="mb-4">
          <div className="bg-primary inline-block rounded-2xl px-4 py-2 text-lg font-medium text-white">
            <span>+{reward.amount} {reward.unit}</span>
          </div>
        </div>
      )}
      
      <div ref={buttonRef}>
        <Button onClick={onClose} variant="primary">
          {actionText}
        </Button>
      </div>
    </Modal>
  );
}
