'use client';

import { useRef } from 'react';
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import introInvestingCourse from "../../data/learning";
import type { Lesson } from "../../types/learning";

export const Route = createFileRoute("/learning/")({
  component: LearningPage,
});

function LearningPage() {
  // Get lessons data from imported course
  const { lessons } = introInvestingCourse;
  const cardsRef = useRef<HTMLDivElement>(null);
  
  // Helper function to calculate approximate completion time
  const getCompletionTime = (questionsCount: number): string => {
    // Assume average of 45 seconds per question plus 1 minute intro/conclusion
    const estimatedMinutes = Math.ceil((questionsCount * 45 / 60) + 1);
    return `~${estimatedMinutes} min${estimatedMinutes > 1 ? 's' : ''}`;
  };
  
  // Add hover animation for lesson cards using useGSAP
  useGSAP(() => {
    if (!cardsRef.current) return;
    
    const cards = cardsRef.current.querySelectorAll('.lesson-card');
    if (cards.length === 0) return;
    
    // Animate cards in with stagger
    gsap.fromTo(
      cards,
      { y: 20, opacity: 0 },
      { 
        y: 0, 
        opacity: 1, 
        stagger: 0.1, 
        duration: 0.5, 
        ease: 'power2.out'
      }
    );
    
    // Set up hover animations for each card
    cards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        gsap.to(card, {
          y: -8,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          duration: 0.3,
          ease: 'power2.out'
        });
      });
      
      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          y: 0,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          duration: 0.3,
          ease: 'power2.out'
        });
      });
    });
    
    return () => {
      // Clean up event listeners
      cards.forEach(card => {
        card.removeEventListener('mouseenter', () => {});
        card.removeEventListener('mouseleave', () => {});
      });
    };
  }, { scope: cardsRef });

  return (
    <div className="min-h-screen bg-background pb-20 [view-transition-name:main-content] flex items-center">  

      {/* Lessons grid */}
      <div className="mx-auto max-w-4xl px-4 pt-8">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">
          Intro to Investing Course
        </h2>

        <div ref={cardsRef} className="flex flex-col gap-6">
          {lessons.map((lesson: Lesson) => (
            <div key={lesson.id}>
              {lesson.unlocked ? (
                <Link
                  to="/learning/$lessonId"
                  params={{ lessonId: lesson.id }}
                  viewTransition={{ types: ['slide-left'] }}
                  className="lesson-card block overflow-hidden rounded-2xl bg-white shadow-md transition-all"
                >
                  <div className="flex p-6">
                    {/* Icon & XP */}
                    <div className="mr-6 flex flex-col items-center">
                      <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-3xl text-purple-600">
                        {lesson.icon}
                      </div>
                      <span className="mt-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
                        {lesson.xp} XP
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col">
                      <h3 className="mb-2 text-xl font-bold text-gray-900">
                        {lesson.title}
                      </h3>
                      <p className="mb-4 flex-1 text-gray-600">
                        {lesson.description}
                      </p>

                      {/* Questions and time info */}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {/* Questions counter */}
                        <div className="flex items-center">
                          <svg
                            className="mr-1 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            ></path>
                          </svg>
                          {lesson.questions.length} Questions
                        </div>
                        
                        {/* Completion time */}
                        <div className="flex items-center">
                          <svg 
                            className="mr-1 h-4 w-4" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24" 
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth="2" 
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            ></path>
                          </svg>
                          {getCompletionTime(lesson.questions.length)}
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center">
                      <svg
                        className="h-6 w-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5l7 7-7 7"
                        ></path>
                      </svg>
                    </div>
                  </div>
                </Link>
              ) : (
                /* Locked lesson card */
                <div className="lesson-card block overflow-hidden rounded-2xl bg-white shadow-md opacity-70">
                  <div className="flex p-6">
                    {/* Locked icon & XP */}
                    <div className="mr-6 flex flex-col items-center">
                      <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl text-gray-400">
                        🔒
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col">
                      <h3 className="mb-2 text-xl font-bold text-gray-500">
                        {lesson.title}
                      </h3>
                      <p className="mb-4 flex-1 text-gray-400">
                        Complete previous lessons to unlock
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}