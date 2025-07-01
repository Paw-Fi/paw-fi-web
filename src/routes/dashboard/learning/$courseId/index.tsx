import { createFileRoute } from '@tanstack/react-router';

import { useParams, Link } from '@tanstack/react-router';
import { useAuth } from '@/contexts/auth-context';
import { useUserCourses, CourseDataSource } from '@/services/course-service';
import { motion, Variants } from 'framer-motion';
import type { Lesson, Course } from '@/types/learning.types';

import { useNavigate } from '@tanstack/react-router';
import basicCourse from '@/data/basic-lessons.json';
import { seo } from '@/utils/seo';

export const Route = createFileRoute("/dashboard/learning/$courseId/")({
  component: CourseDetailPage,
  head: ({ params }: { params: { courseId: string } }) => {
    let courseTitle = 'Course Details'; // Default title
    let courseDescription = 'Learn more about this course on Moneko.'; // Default description
    const siteOgImage = 'https://paw-fi.app/og-img.png'; // Default site OG image

    try {

      const foundCourse = basicCourse
      
      if (foundCourse) {
        courseTitle = foundCourse.title || courseTitle;
        courseDescription = foundCourse.description || courseDescription;
        // Assuming Course type does not have a specific image property here
      }
    } catch (e) {
      console.error('Error fetching course data for head tags in /learning/$courseId/:', e);
    }

    const pageUrl = `https://moneko.io/learning/${params.courseId}`;
    const keywords = `${courseTitle.replace(/[^a-zA-Z0-9 ]/g, '')}, financial education, Moneko, online course`;

    const meta = seo({
      title: `${courseTitle} | Moneko Learning`,
      description: `Explore lessons in the ${courseTitle} course. ${courseDescription}`,
      keywords: keywords,
      image: siteOgImage,
      url: pageUrl,
    });

    // Add structured data for the course
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Course",
      "name": courseTitle,
      "description": courseDescription,
      "provider": {
        "@type": "Organization",
        "name": "Moneko",
        "url": "https://moneko.io/"
      }
    };

    return {
      meta,
      link: [
        {
          rel: 'canonical',
          href: pageUrl
        }
      ],
      script: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(structuredData)
        }
      ]
    };
  },
});



interface CourseDetailPageProps {
  /** Data source to use for fetching courses */
  dataSource?: CourseDataSource;
}

export default function CourseDetailPage({ dataSource = 'remote' }: CourseDetailPageProps) {
  // Determine the correct route path based on dataSource
  const routePath = dataSource === 'local' ? '/dashboard/essentials/$courseId/' : '/dashboard/learning/$courseId/';
  const { courseId } = useParams({ from: routePath });
  const { user } = useAuth();
  const {
    data: courses = [],
    isLoading,
    isError,
    error,
  } = useUserCourses(user?.id ?? '', { 
    enabled: !!user,
    source: dataSource 
  });
  const course = courseId === basicCourse.id ? basicCourse : courses.find((c: Course) => c.course_id === courseId) || null;

  // Define animation variants for container and lesson cards
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15
      }
    }
  };
  
  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const navigate = useNavigate();

  return (
    <div className="py-12 px-4 relative">
      {isLoading ? (
 
          <div className="flex flex-col gap-4 items-center mb-8">
            <div className="h-4 w-64 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-80 mx-auto rounded bg-gray-200 animate-pulse " />
          </div>
   
      ) : (
        <>
          <div className="flex flex-row items-center justify-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{course?.title}</h1>
          </div>
          <div className="text-center mb-8">
            <p className="text-gray-600 max-w-md mx-auto">{course?.description}</p>
          </div>
        </>
      )}
      {isLoading ? (
        <div className="space-y-4  lg:w-[40rem] mx-auto">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="lesson-card block bg-white rounded-2xl shadow-md overflow-hidden transition-all cursor-pointer p-6 mb-4 animate-pulse"
            >
              <div className="flex items-center mb-2">
                <div className="h-8 w-8 rounded-full bg-gray-200 mr-3" />
                <div className="flex-1">
                  <div className="h-5 w-3/4 bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-1/2 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="mb-3">
                <div className="h-4 w-full bg-gray-100 rounded mb-1" />
                <div className="h-4 w-2/3 bg-gray-100 rounded" />
              </div>
              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-6 w-6 rounded-full bg-gray-200 mr-2" />
                  <div className="h-4 w-16 bg-gray-100 rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-10 bg-gray-100 rounded" />
                  <div className="h-6 w-14 rounded-full bg-gray-200" />
                </div>
              </div>
              {/* Locked bar skeleton (show on 2 out of 3 for realism) */}
              {i > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded bg-gray-100 px-3 py-2">
                  <div className="h-4 w-4 rounded bg-gray-200" />
                  <div className="h-4 w-40 bg-gray-200 rounded" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <motion.div 
          className="max-w-xl mx-auto space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {!course || course.lessons.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl shadow-md">
              <p className="text-gray-600 mb-4">No lessons available for this course.</p>
              <Link
                to="/dashboard/chat"
                className="inline-flex items-center justify-center px-5 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Chat with AI
              </Link>
            </div>
          ) : (
            //@ts-ignore expect error
            (course.lessons.map((lesson: Lesson) => (
              lesson.unlocked ? (
                <motion.div
                  key={lesson.lesson_id}
                  variants={cardVariants}
                  whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                  className="lesson-card"
                >
                  <Link
                    to={`/dashboard/${dataSource === 'local' ? 'essentials' : 'learning'}/${courseId}/lesson/${lesson.lesson_id}`}
                    className="block bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer"
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
                </motion.div>
              ) : (
                <motion.div
                  key={lesson.id}
                  variants={cardVariants}
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
                </motion.div>
              )
            )))
          )}
        </motion.div>
      )}
    </div>
  )
}
