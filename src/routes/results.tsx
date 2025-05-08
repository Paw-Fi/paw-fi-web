'use client';

import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useQuestionnaire } from '../contexts/questionnaire-context';
import piggyIcon from '@/assets/images/piggy.svg';
import lightbulbIcon from '@/assets/images/lightbulb.svg';
import bookIcon from '@/assets/images/book.svg';
import increaseIcon from '@/assets/images/increase.svg';
export const Route = createFileRoute('/results')({
  component: Results,
});

// Define the structure for feature cards
interface FeatureCard {
  id: string;
  title: string;
  description: string;
  bgColor: string;
  icon: string;
  alt: string;
}

// Feature card data
const featureCards: FeatureCard[] = [
  {
    id: 'saving',
    title: 'Goal-Based Saving',
    description: 'Create savings goals and track your progress with playful milestones.',
    bgColor: 'bg-purple-100',
    icon: piggyIcon,
    alt: 'Piggy'
  },
  {
    id: 'suggestions',
    title: 'Smart Suggestions',
    description: 'Get personalized tips to improve your financial habits, tailored to your needs.',
    bgColor: 'bg-green-100',
    icon: lightbulbIcon,
    alt: 'Lightbulb'
  },
  {
    id: 'learning',
    title: 'Learn Your Way',
    description: 'Access bite-sized financial lessons that make money management fun.',
    bgColor: 'bg-blue-100',
    icon: bookIcon,
    alt: 'Book'
  },
  {
    id: 'progress',
    title: 'Motivational Progress',
    description: 'Watch your progress with encouraging visual trackers and celebrations.',
    bgColor: 'bg-yellow-100',
    icon: increaseIcon,
    alt: 'Increase'
  }
];

function Results() {
  const { state } = useQuestionnaire();
  const resultsRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  // Debug state
  useEffect(() => {
    console.log('Results page state:', state);
  }, [state]);
  
  // Animate results content using GSAP
  useGSAP(() => {
    // Animate header and description with a fade-in effect
    if (resultsRef.current) {
      const header = resultsRef.current.querySelector('.results-header');
      const description = resultsRef.current.querySelector('.results-description');
      
      gsap.fromTo(
        [header, description],
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.2, ease: 'power2.out' }
      );
    }
    
    // Animate feature cards with a staggered entrance
    if (cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll('.feature-card');
      
      gsap.fromTo(
        cards,
        { opacity: 0, y: 30, scale: 0.95 },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          duration: 0.5, 
          stagger: 0.1, 
          ease: 'back.out(1.2)',
          delay: 0.3
        }
      );
    }
  }, { scope: resultsRef });
  
  return (
    <div 
      ref={resultsRef}
      className="min-h-screen flex flex-col bg-background [view-transition-name:main-content]"
    >    
      
      <div className="bg-white rounded-3xl overflow-hidden shadow-lg max-w-md m-auto min-w-[35vw] p-6">
      {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4 results-header">Your Plan is Ready!</h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto results-description">
            Based on your answers, we've crafted a personalized financial plan to help you achieve your goals.
          </p>
        </div>
        
        {/* Features grid */}
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {featureCards.map(card => (
            <div key={card.id} className={`${card.bgColor} rounded-xl p-6 feature-card`}>
              <div className="bg-white rounded-full w-12 h-12 flex items-center justify-center mb-3">
                <img src={card.icon} alt={card.alt} />
              </div>
              <h3 className="font-semibold text-lg mb-2">{card.title}</h3>
              <p className="text-sm text-gray-600">{card.description}</p>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <Link
            to="/learning"
            viewTransition={{ types: ['slide-left'] }}
            className="inline-block py-4 px-8 bg-primary text-white font-medium rounded-lg shadow-md hover:opacity-90 active:opacity-80 transition-colors w-full md:w-auto text-center"
          >
            Start Learning Now
          </Link>
        </div>
      </div>
    </div>
  );
}
