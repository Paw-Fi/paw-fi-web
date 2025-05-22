'use client';

import { useState, useEffect, useRef } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

// Import data from separate data file
import type { Course } from '@/types/learning.types';
import { COURSES_STORAGE_KEY } from '@/data/lessons';

export const Route = createFileRoute('/learning/')({ 
  component: LearningPage,
});

function LearningPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Reference to the container of lesson cards
  const lessonCardsRef = useRef<HTMLDivElement>(null);
  
  // Load courses data from localStorage or fall back to default data
  useEffect(() => {
    setIsLoading(true);
    try {
      // Migration: support old single-course data
      const legacy = localStorage.getItem('paw-fi-course');
      let loadedCourses: Course[] = [];
      if (legacy) {
        const legacyCourse = JSON.parse(legacy);
        if (legacyCourse && legacyCourse.id) {
          loadedCourses = [legacyCourse];
          localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(loadedCourses));
          localStorage.removeItem('paw-fi-course');
        }
      } else {
        const stored = localStorage.getItem(COURSES_STORAGE_KEY);
        if (stored) {
          loadedCourses = JSON.parse(stored);
        }
      }
      setCourses(Array.isArray(loadedCourses) ? loadedCourses : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Use GSAP for animations
  useGSAP(() => {
    if (!lessonCardsRef.current) return;
    const cards = lessonCardsRef.current.querySelectorAll('.course-card');
    if (cards.length === 0) return;
    gsap.set(cards, { opacity: 0, y: 20 });
    gsap.to(cards, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.15,
      ease: 'power2.out'
    });
  }, [courses]);

  return (
    <div className="py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Your Courses</h1>
        <p className="text-gray-600 max-w-md mx-auto">
          Choose a course to continue learning. You can generate more courses with our AI.
        </p>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <div ref={lessonCardsRef} className="mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl">
          {courses.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl shadow-md col-span-full">
              <p className="text-gray-600 mb-4">No courses available. Chat with our AI to generate personalized courses.</p>
              <Link
                to="/chat"
                className="inline-flex items-center justify-center px-5 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Chat with AI
              </Link>
            </div>
          ) : (
            courses.map((course) => (
              <Link
                key={course.id}
                to={`/learning/${course.id}`}
                className="course-card block bg-white rounded-2xl shadow-md overflow-hidden transition-all hover:shadow-lg cursor-pointer transform hover:-translate-y-1"
              >
                <div className="p-6 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-center mb-3">
                      <div className="mr-3 text-4xl" aria-hidden="true">
                        {course.icon || '📖'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{course.title}</h3>
                        <p className="text-sm text-gray-500">{course.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-3">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full mr-2 bg-primary flex items-center justify-center text-white font-semibold text-xs">
                        {course.lessons.length}
                      </div>
                      <span className="text-sm">Lessons</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-sm text-gray-500">
                        
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}