import { createFileRoute } from '@tanstack/react-router';
import { useParams, Link } from '@tanstack/react-router';
import { useAuth } from '@/contexts/auth-context';
import { useUserCourses, CourseDataSource } from '@/services/course-service';
import { motion, Variants } from 'framer-motion';
import type { Lesson, Course } from '@/types/learning.types';
import { useNavigate } from '@tanstack/react-router';
import basicCourse from '@/data/basic-lessons.json';
import { seo } from '@/utils/seo';
import { useState } from 'react';
import { useFinancialHealthProfile } from '@/hooks/use-financial-health-profile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGraduationCap, faRobot, faWandMagicSparkles, faBookOpen } from '@fortawesome/free-solid-svg-icons';

export const Route = createFileRoute("/dashboard/learning/$courseId/")({
  component: UnifiedCourseDetailPage,
  head: ({ params }: { params: { courseId: string } }) => {
    let courseTitle = 'Course Details';
    let courseDescription = 'Learn more about this course on Moneko.';
    const siteOgImage = 'https://moneko.io/og-img.png';

    try {
      const foundCourse = basicCourse;
      
      if (foundCourse) {
        courseTitle = foundCourse.title || courseTitle;
        courseDescription = foundCourse.description || courseDescription;
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

export default function UnifiedCourseDetailPage() {
  const { courseId } = useParams({ from: '/dashboard/learning/$courseId/' });
  const { user } = useAuth();
  const [showLearningAI, setShowLearningAI] = useState(false);
  
  // Determine if this is the essentials course
  const isEssentialsCourse = courseId === basicCourse.course_id;
  const dataSource: CourseDataSource = isEssentialsCourse ? 'local' : 'remote';
  
  const {
    data: courses = [],
    isLoading,
    isError,
    error,
  } = useUserCourses(user?.id ?? '', { 
    enabled: !!user,
    source: dataSource 
  });
  
  const course = isEssentialsCourse ? basicCourse : courses.find((c: Course) => c.course_id === courseId) || null;
  
  // Get user's learning context for enhanced AI responses
  const { profile: financialProfile, hasProfile } = useFinancialHealthProfile(user?.id);
  
  // Calculate learning progress for this course
  const learningProgress = course ? {
    courseName: course.title,
    totalLessons: course.lessons.length,
    completedLessons: course.lessons.filter(lesson => lesson.unlocked).length,
    totalXP: course.lessons.filter(lesson => lesson.unlocked).reduce((acc, lesson) => acc + (lesson.xp || 0), 0),
  } : null;

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

  const CourseTypeHeader = () => {
    if (isEssentialsCourse) {
      return (
        <motion.div 
          className="mb-8 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-blue-50 p-6 shadow-lg dark:border-emerald-700 dark:from-emerald-900/30 dark:to-blue-900/30"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500 shadow-lg">
              <FontAwesomeIcon icon={faGraduationCap} className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-200">
                  Financial Essentials
                </h2>
                <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white">
                  Expert-Led
                </span>
              </div>
              <p className="text-emerald-700 dark:text-emerald-300">
                🎓 Master the fundamentals with lessons crafted by certified financial advisors with 10+ years of experience. 
                These essential courses build your financial foundation step by step.
              </p>
            </div>
          </div>
        </motion.div>
      );
    } else {
      return (
        <motion.div 
          className="mb-8 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 shadow-lg dark:border-purple-700 dark:from-purple-900/30 dark:to-indigo-900/30"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg">
              <FontAwesomeIcon icon={faRobot} className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-bold text-purple-800 dark:text-purple-200">
                  AI-Personalized Learning
                </h2>
                <span className="rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-3 py-1 text-xs font-medium text-white">
                  AI-Generated
                </span>
              </div>
              <p className="text-purple-700 dark:text-purple-300">
                ✨ Courses tailored specifically to your financial situation, goals, and learning pace. 
                Our AI creates personalized lessons that adapt as you progress.
              </p>
            </div>
          </div>
        </motion.div>
      );
    }
  };

  return (
    <div className="py-12 px-4 relative">
      {/* Course Type Indicator */}
      <CourseTypeHeader />

      {isLoading ? (
        <div className="flex flex-col gap-4 items-center mb-8">
          <div className="h-4 w-64 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-80 mx-auto rounded bg-gray-200 animate-pulse" />
        </div>
      ) : (
        <>
          <div className="flex flex-row items-center justify-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{course?.title}</h1>
          </div>
          <div className="text-center mb-8">
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">{course?.description}</p>
          </div>
        </>
      )}
      
      {isLoading ? (
        <div className="space-y-4 lg:w-[40rem] mx-auto">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="lesson-card block bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden transition-all cursor-pointer p-6 mb-4 animate-pulse"
            >
              <div className="flex items-center mb-2">
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 mr-3" />
                <div className="flex-1">
                  <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                  <div className="h-4 w-1/2 bg-gray-100 dark:bg-gray-600 rounded" />
                </div>
              </div>
              <div className="mb-3">
                <div className="h-4 w-full bg-gray-100 dark:bg-gray-600 rounded mb-1" />
                <div className="h-4 w-2/3 bg-gray-100 dark:bg-gray-600 rounded" />
              </div>
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 mr-2" />
                  <div className="h-4 w-16 bg-gray-100 dark:bg-gray-600 rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-10 bg-gray-100 dark:bg-gray-600 rounded" />
                  <div className="h-6 w-14 rounded-full bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
              {i > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded bg-gray-100 dark:bg-gray-700 px-3 py-2">
                  <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-600" />
                  <div className="h-4 w-40 bg-gray-200 dark:bg-gray-600 rounded" />
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
            <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-2xl shadow-md">
              <FontAwesomeIcon icon={faBookOpen} className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">No lessons available for this course.</p>
              <Link
                to="/dashboard/chat"
                className="inline-flex items-center justify-center px-5 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
              >
                <FontAwesomeIcon icon={faWandMagicSparkles} className="w-5 h-5 mr-2" />
                Create Custom Lessons with AI
              </Link>
            </div>
          ) : (
            //@ts-ignore expect error
            course.lessons.map((lesson: Lesson) => (
              lesson.unlocked ? (
                <motion.div
                  key={lesson.lesson_id}
                  variants={cardVariants}
                  whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                  className="lesson-card"
                >
                  <Link
                    to={`/dashboard/learning/${courseId}/lesson/${lesson.lesson_id}`}
                    className="block bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden cursor-pointer"
                  >
                    <div className="p-4">
                      <div className="flex items-center mb-3">
                        <div className="mr-3 text-3xl" aria-hidden="true">
                          {lesson.icon || '📚'}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">{lesson.title}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{lesson.description}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full mr-2 bg-primary flex items-center justify-center text-white font-semibold text-xs">
                            {lesson.questions.length}
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">Questions</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
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
                  className="lesson-card block bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden brightness-[0.97] cursor-not-allowed"
                >
                  <div className="p-4">
                    <div className="flex items-center mb-3">
                      <div className="mr-3 text-3xl" aria-hidden="true">
                        {lesson.icon || '🔒'}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-600 dark:text-gray-500">{lesson.title}</h3>
                        <p className="text-sm text-gray-400 dark:text-gray-600">{lesson.description}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full mr-2 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-semibold text-xs">
                          {lesson.questions.length}
                        </div>
                        <span className="text-sm text-gray-400">Questions</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-sm text-gray-400">
                          ~{Math.max(5, lesson.questions.length * 2)} min
                        </div>
                        <div className="bg-gray-200 dark:bg-gray-700 text-gray-500 px-3 py-1 text-sm rounded-full">
                          +{lesson.xp}XP
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-500 dark:text-gray-400 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Complete previous lessons to unlock
                    </div>
                  </div>
                </motion.div>
              )
            ))
          )}
        </motion.div>
      )}
    </div>
  );
}