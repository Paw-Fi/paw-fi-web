import { createFileRoute } from '@tanstack/react-router';

import { useParams, Link } from '@tanstack/react-router';
import { useEffect, useState, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { Course, Lesson } from '@/types/learning.types';
import { COURSES_STORAGE_KEY } from '@/data/lessons';
import { sanitizeCourse } from '@/utils/sanitize-course';
import { LessonBackButton } from '@/components/learning/lesson-back-button';
import { useNavigate } from '@tanstack/react-router';
import basicCourse from '@/data/basic-lessons.json';
import { seo } from '@/utils/seo';

export const Route = createFileRoute("/learning/$courseId/")({
  component: CourseDetailPage,
  head: ({ params }: { params: { courseId: string } }) => {
    let courseTitle = 'Course Details'; // Default title
    let courseDescription = 'Learn more about this course on PawFi.'; // Default description
    const siteOgImage = 'https://paw-fi.app/og-img.png'; // Default site OG image

    try {
      const storedCourses = localStorage.getItem(COURSES_STORAGE_KEY);
      let foundCourse: Course | undefined = undefined;

      if (storedCourses) {
        const courses: Course[] = JSON.parse(storedCourses);
        foundCourse = courses.find(c => c.id === params.courseId);
      }

      // If not found in localStorage, check basicCourse (assuming it's a single Course object)
      if (!foundCourse && basicCourse && (basicCourse as Course).id === params.courseId) {
        foundCourse = basicCourse as Course;
      }
      
      if (foundCourse) {
        courseTitle = foundCourse.title || courseTitle;
        courseDescription = foundCourse.description || courseDescription;
        // Assuming Course type does not have a specific image property here
      }
    } catch (e) {
      console.error('Error fetching course data for head tags in /learning/$courseId/:', e);
    }

    const pageUrl = `https://pawfi.app/learning/${params.courseId}`;
    const keywords = `${courseTitle.replace(/[^a-zA-Z0-9 ]/g, '')}, financial education, PawFi, online course`;

    const meta = seo({
      title: `${courseTitle} | PawFi Learning`,
      description: `Explore lessons in the ${courseTitle} course. ${courseDescription}`,
      keywords: keywords,
      image: siteOgImage,
      url: pageUrl,
    });

    return {
      meta,
    };
  },
});



export default function CourseDetailPage() {
  const { courseId } = useParams({ from: '/learning/$courseId/' });
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lessonCardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(true);
    try {
      const stored = localStorage.getItem(COURSES_STORAGE_KEY);
      if (stored) {
        const courses: Course[] = JSON.parse(stored);
        const found = [...courses, basicCourse as Course].find((c) => c.id === courseId);
        if (found) {
          const sanitized = sanitizeCourse(found);
          setCourse(sanitized);
        } else {
          setCourse(null);
        }
      }
    } catch (error) {
      console.error('Error loading course:', error);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useGSAP(() => {
    if (!lessonCardsRef.current) return;
    const cards = lessonCardsRef.current.querySelectorAll('.lesson-card');
    if (cards.length === 0) return;
    gsap.set(cards, { opacity: 0, y: 20 });
    gsap.to(cards, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.15,
      ease: 'power2.out',
    });
  }, [course]);

  const navigate = useNavigate();

  return (
    <div className="py-12 px-4">
      <div className="mb-4 lg:mb-0">

            <LessonBackButton onBack={() => navigate({ to: "/learning" })} />
      </div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">{course?.title}</h1>
        <p className="text-gray-600 max-w-md mx-auto">{course?.description}</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <div ref={lessonCardsRef} className="max-w-xl mx-auto space-y-6">
          {!course || course.lessons.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl shadow-md">
              <p className="text-gray-600 mb-4">No lessons available for this course.</p>
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
            course.lessons.map((lesson: Lesson) => (
              lesson.unlocked ? (
                <Link
                  key={lesson.id}
                  to={`/learning/${courseId}/lesson/${lesson.id}`}
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
