'use client';

import { useState, useEffect, useRef } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

// Import data from separate data file
import type { Lesson, Course } from '@/types/learning.types';
import { getAllLessons, getAllCourses } from '@/data/lessons';

// Storage keys - using only one storage key for consistency
const COURSE_STORAGE_KEY = 'paw-fi-course';

export const Route = createFileRoute('/learning/')({ 
  component: LearningPage,
});

function LearningPage() {
  // State for lessons and courses
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Reference to the container of lesson cards
  const lessonCardsRef = useRef<HTMLDivElement>(null);
  
  // Load lessons data from localStorage or fall back to default data
  useEffect(() => {
    setIsLoading(true);
    
    try {
      // First try to get course data (new format)
      const storedCourseData = localStorage.getItem(COURSE_STORAGE_KEY);
      
      if (storedCourseData) {
        // Parse stored JSON data
        const parsedCourse = JSON.parse(storedCourseData) as Course;
        
        // Verify that the parsed data has the expected shape
        if (parsedCourse && parsedCourse.id && Array.isArray(parsedCourse.lessons)) {
          setCourse(parsedCourse);
          setLessons(parsedCourse.lessons);
        }
      } else {
        // Try legacy format (array of lessons)
        const storedLessonsData = localStorage.getItem(COURSE_STORAGE_KEY);
        
        if (storedLessonsData) {
          // Parse stored JSON data
          const parsedData = JSON.parse(storedLessonsData) as Lesson[];
          
          // Verify that the parsed data is an array and has expected shape
          if (Array.isArray(parsedData) && parsedData.length > 0 && 'id' in parsedData[0]) {
            setLessons(parsedData);
          } else {
            // If data structure is invalid, fall back to default data
            const defaultLessons = getAllLessons();
            setLessons(defaultLessons);
            
            // Also get the course data
            const [defaultCourse] = getAllCourses();
            setCourse(defaultCourse);
          }
        } else {
          // If no data exists in localStorage, use default data
          const defaultLessons = getAllLessons();
          setLessons(defaultLessons);
          
          // Also get the course data
          const [defaultCourse] = getAllCourses();
          setCourse(defaultCourse);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Use default data as fallback
      const defaultLessons = getAllLessons();
      setLessons(defaultLessons);
      
      // Also get the course data
      const [defaultCourse] = getAllCourses();
      setCourse(defaultCourse);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Handle JSON import
  const handleJsonImport = () => {
    try {
      setJsonError('');
      
      // Parse the input JSON
      const parsedData = JSON.parse(jsonInput) as Lesson[];
      
      // Validate data structure
      if (!Array.isArray(parsedData)) {
        throw new Error('Imported data must be an array of lessons');
      }
      
      if (parsedData.length === 0) {
        throw new Error('No lessons found in imported data');
      }
      
      // Basic validation of lesson structure
      if (!parsedData[0].id || !parsedData[0].title || !Array.isArray(parsedData[0].questions)) {
        throw new Error('Invalid lesson structure in imported data');
      }
      
      // Store in localStorage
      localStorage.setItem(COURSE_STORAGE_KEY, jsonInput);
      
      // Update state
      setLessons(parsedData);
      setJsonInput('');
    } catch (error) {
      console.error('Error importing JSON:', error);
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON format');
    }
  };
  
  // Clear localStorage and reset to default lessons
  const handleResetLessons = () => {
    localStorage.removeItem(COURSE_STORAGE_KEY);
    const defaultLessons = getAllLessons();
    setLessons(defaultLessons);
    setJsonInput('');
    setJsonError('');
  };
  
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
  }, [lessons]);

  return (  
    <div className="min-h-screen bg-background py-12 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">{course?.title}</h1>
        <p className="text-gray-600 max-w-md mx-auto">
          {course?.description}
        </p>
      </div>


      {/* Loading indicator */}
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        /* Main content - Lesson cards in single column */
        <div ref={lessonCardsRef} className="max-w-xl mx-auto space-y-6">
          {lessons.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl shadow-md">
              <p className="text-gray-600 mb-4">No lessons available. Take our questionnaire to generate personalized lessons.</p>
              <Link
                to="/questionnaire"
                className="inline-flex items-center justify-center px-5 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Take Questionnaire
              </Link>
            </div>
          ) : (
            lessons.map((lesson: Lesson) => (
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
                        {lesson.icon || '🔒'}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-600">{lesson.title}</h3>
                        <p className="text-sm text-gray-400">{lesson.description}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full mr-2 bg-gray-200 flex items-center justify-center text-gray-500 font-semibold text-xs">
                          {lesson.questions.length}
                        </div>
                        <span className="text-sm text-gray-400">Questions</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-sm text-gray-400">
                          ~{Math.max(5, lesson.questions.length * 2)} min
                        </div>
                        <div className="bg-gray-200 text-gray-500 px-3 py-1 text-sm rounded-full">
                          +{lesson.xp}XP
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 py-2 px-3 bg-gray-50 rounded-lg text-sm text-gray-500 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Complete previous lessons to unlock
                    </div>
                  </div>
                </div>
              )
            ))
          )}
        </div>
      )}
    </div>
  );
}