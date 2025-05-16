'use client';

import { useRef } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

// Import data from separate data file
import type { Lesson } from '@/types/learning.types';
import { getAllLessons } from '@/data/lessons';

export const Route = createFileRoute('/learning/')({ 
  component: LearningPage,
});

function LearningPage() {
  // Get lessons data from imported course
  //const { lessons } = introInvestingCourse;

  const lessons=getAllLessons()
  
  // Reference to the container of lesson cards
  const lessonCardsRef = useRef<HTMLDivElement>(null);
  
  // Use GSAP for animations
  useGSAP(() => {
    if (!lessonCardsRef.current) return;
    
    // Select all lesson cards
    const cards = lessonCardsRef.current.querySelectorAll('.lesson-card');
    if (cards.length === 0) return;
    
    // Hide cards initially
    gsap.set(cards, { opacity: 0, y: 20 });
    
    // Animate cards one by one with stagger
    gsap.to(cards, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.15, // time between each card animation
      ease: 'power2.out'
    });
  }, { scope: lessonCardsRef });

  return (  
    <div className="min-h-screen bg-background py-12 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Introduction to Investing</h1>
        <p className="text-gray-600 max-w-md mx-auto">
          Understand how money grows—and how you can make it work for you.
        </p>
      </div>

      {/* Main content - Lesson cards in single column */}
      <div ref={lessonCardsRef} className="max-w-xl mx-auto space-y-6">
        {lessons.map((lesson: Lesson) => (
          lesson.unlocked ? (
            <Link
              key={lesson.id}
              to="/learning/$lessonId"
              params={{ lessonId: lesson.id }}
              className="lesson-card block bg-white rounded-2xl shadow-md overflow-hidden transition-all hover:shadow-lg cursor-pointer transform hover:-translate-y-1"
            >
              <div className="p-4">
                <div className="flex items-center mb-3">
                  <div className="mr-3 text-3xl" aria-hidden="true">
                    {lesson.icon || '📚'}
                  </div>
                  <div>
                    <h3 className="font-medium">{lesson.title}</h3>
                    <p className="text-sm text-gray-500">{lesson.description}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full mr-2 bg-primary flex items-center justify-center text-white font-semibold text-xs">
                      {lesson.questions.length}
                    </div>
                    <span className="text-sm">Questions</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-sm text-gray-500">
                      ~{Math.max(5, lesson.questions.length * 2)} min
                    </div>
                    <div className="bg-primary text-white px-3 py-1 text-sm rounded-full">
                      +{lesson.xp}XP
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div 
              key={lesson.id}
              className="lesson-card block bg-white rounded-2xl shadow-md overflow-hidden brightness-[0.97] cursor-not-allowed"
            >
              <div className="p-4">
                <div className="flex items-center mb-3">
                  <div className="mr-3 text-3xl" aria-hidden="true">
                    {lesson.icon || '📚'}
                  </div>
                  <div>
                    <h3 className="font-medium">{lesson.title}</h3>
                    <p className="text-sm text-gray-500">{lesson.description}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full mr-2 bg-gray-300 flex items-center justify-center text-white font-semibold text-xs">
                      {lesson.questions.length}
                    </div>
                    <span className="text-sm">Questions</span>
                  </div>
                  <div className="flex items-center">
                    <div className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full flex items-center">
                      <svg className="mr-1" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 11H5C3.89543 11 3 11.8954 3 13V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V13C21 11.8954 20.1046 11 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7 11V7C7 5.93913 7.42143 4.92172 8.17157 4.17157C8.92172 3.42143 9.93913 3 11 3H13C14.0609 3 15.0783 3.42143 15.8284 4.17157C16.5786 4.92172 17 5.93913 17 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Locked
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        ))}
      </div>   
    </div>
  );
}