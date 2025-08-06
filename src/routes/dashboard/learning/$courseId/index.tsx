import { createFileRoute } from '@tanstack/react-router';
import { useParams, Link } from '@tanstack/react-router';
import { useAuth } from '@/contexts/auth-context';
import { useUserCourses, CourseDataSource } from '@/services/course-service';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import type { Course } from '@/types/learning.types';
import { useNavigate } from '@tanstack/react-router';
import basicCourse from '@/data/basic-lessons.json';
import { seo } from '@/utils/seo';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useFinancialHealthProfile } from '@/hooks/use-financial-health-profile';
import { useCompletedLessons } from '@/hooks/useCompletedLessons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGraduationCap,
  faRobot,
  faBookOpen,
  faPlay,
  faLock,
  faCheck,
  faClock,
  faTrophy,
  faGem,
  faMedal,
  faLightbulb,
  faShareNodes,
  faCertificate,
  faChevronRight,
  faCircleCheck,
  faRocket,
  faForward,
  faCopy,
  faExternalLink,
  faClose
} from '@fortawesome/free-solid-svg-icons';
import {
  faTwitter,
  faReddit,
  faDiscord,
  faLinkedin,
  faFacebook
} from '@fortawesome/free-brands-svg-icons';
import { createPortal } from 'react-dom';
import { getCanonicalUrl } from "@/utils/canonical";
import { supabase } from '@/lib/supabase';
import { useSubscription } from '@/hooks/use-subscription';
import { DashboardBlockModal } from '@/components/dashboard/DashboardBlockModal';

export const Route = createFileRoute("/dashboard/learning/$courseId/")({
  component: ModernCourseDetailPage,
  loader: async ({ params }) => {
   if(params.courseId === basicCourse.course_id){
    return { course: basicCourse };
   }
    const { data: courses, error: courseError } = await supabase
    .from("user_courses")
    .select("*")
    .eq("course_id", params.courseId)
    .order("created_at", { ascending: false });
   
    return { course:courses?.[0] };
  },
  head: ({ params, loaderData }) => {
    const { course } = loaderData;
    const pageUrl = getCanonicalUrl(`/dashboard/learning/${params.courseId}`);
    const title = `${course?.title} | Moneko Learning`;
    const description = course?.description;
    const keywords = `${course?.title}, ${course?.category}, financial education, Moneko, online course`;
    const imageUrl = course?.image || "https://moneko.io/og-img.png"; // Use course image if available

    const meta = seo({
      title,
      description,
      keywords,
      image: imageUrl,
      url: pageUrl,
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Course",
      "name": course.title,
      "description": course.description,
      "provider": {
        "@type": "Organization",
        "name": "Moneko",
        "url": "https://moneko.io"
      },
      "url": pageUrl,
      "hasCourseInstance": {
        "@type": "CourseInstance",
        "courseMode": "online",
        "courseWorkload": `PT1H`, // Assuming 1 hour per lesson for simplicity
        "instructor": {
          "@type": "Person",
          "name": "Moneko Experts"
        }
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
          type: "application/ld+json",
          children: JSON.stringify(structuredData)
        }
      ]
    };
  },
});

export default function ModernCourseDetailPage() {
  const { courseId } = useParams({ from: '/dashboard/learning/$courseId/' });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'overview' | 'lessons' | 'achievements'>('lessons');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [savedCourse, setSavedCourse] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const{isActive}=useSubscription(user?.id);
  
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
  
  // Get completed lessons data
  const { data: completedLessons = [], isLoading: isLoadingCompleted } = useCompletedLessons(user?.id);

  // Calculate course metrics based on actual completion data
  const courseMetrics = course && !isLoadingCompleted ? (() => {
    // Filter completed lessons to only include lessons from this course
    const courseCompletedLessons = completedLessons.filter(cl => 
      course.lessons.some(lesson => lesson.id === cl.lesson_id)
    );
    
    return {
      completedLessons: courseCompletedLessons.length,
      totalLessons: course.lessons.length,
      progress: Math.round((courseCompletedLessons.length / course.lessons.length) * 100),
      totalXP: course.lessons.reduce((acc, lesson) => acc + (lesson.xp || 0), 0),
      earnedXP: courseCompletedLessons.reduce((acc, completedLesson) => {
        const lesson = course.lessons.find(l => l.id === completedLesson.lesson_id);
        return acc + (lesson?.xp || 0);
      }, 0),
      estimatedTime: course.lessons.length * 10, // minutes
      // Next lesson logic based on course type
      nextLesson: (() => {
        if (isEssentialsCourse) {
          // For essentials course, find first lesson that's unlocked but not completed
          return course.lessons.find((lesson, index) => {
            const isCompleted = courseCompletedLessons.some(cl => cl.lesson_id === lesson.id);
            if (isCompleted) return false;
            
            // First lesson is always unlocked
            if (index === 0) return true;
            
            // Subsequent lessons are unlocked if previous lesson is completed
            const previousLesson = course.lessons[index - 1];
            return courseCompletedLessons.some(cl => cl.lesson_id === previousLesson.id);
          });
        } else {
          // For other courses, use the lesson's unlocked property
          return course.lessons.find(lesson => 
            lesson.unlocked && !courseCompletedLessons.some(cl => cl.lesson_id === lesson.id)
          );
        }
      })(),
      lastCompletedLesson: courseCompletedLessons.length > 0 
        ? course.lessons.find(lesson => 
            lesson.id === courseCompletedLessons[courseCompletedLessons.length - 1]?.lesson_id
          )
        : null
    };
  })() : null;

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const heroVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const isFirstLesson=courseMetrics?.nextLesson?.id===course?.lessons[0].id;

  const handleLessonClick=(lessonId:string)=>{
    if(isActive){
     navigate(`/dashboard/learning/${courseId}/lesson/${lessonId}`) 
    }else{
      setShowSubscriptionModal(true);
    }
  }
    
  

  if (isLoading || isLoadingCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-20 h-20 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (!course || !courseMetrics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FontAwesomeIcon icon={faBookOpen} className="h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
          <h2 className="text-2xl font-bold text-foreground dark:text-dark-foreground mb-2">Course not found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">The course you're looking for doesn't exist.</p>
          <Link
            to="/dashboard/learning"
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
          >
            Back to Learning Hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-background dark:from-dark-background via-white dark:via-gray-900 to-background dark:to-dark-background"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Hero Section with Course Info */}
      <motion.section
        className="relative overflow-hidden"
        variants={heroVariants}
      >
        {/* Background Gradient */}
        <div className={`absolute inset-0 ${isEssentialsCourse
            ? 'bg-gradient-to-br from-emerald-600/10 dark:from-emerald-400/20 via-teal-600/10 dark:via-teal-400/20 to-green-600/10 dark:to-green-400/20'
            : 'bg-gradient-to-br from-purple-600/10 dark:from-purple-400/20 via-indigo-600/10 dark:via-indigo-400/20 to-blue-600/10 dark:to-blue-400/20'
          }`} />

        {/* Decorative Elements */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400/20 dark:bg-purple-400/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 dark:bg-indigo-400/30 rounded-full blur-3xl" />

        <div className="relative px-4 py-8 max-w-7xl mx-auto">
          

            {/* Course Header */}
            <div className="grid lg:grid-cols-3 gap-8 ">
              {/* Course Info */}
              <div className="lg:col-span-2">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {/* Course Type Badge */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`
                      flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
                      ${isEssentialsCourse
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                      }
                    `}>
                      <FontAwesomeIcon icon={isEssentialsCourse ? faGraduationCap : faRobot} className="h-4 w-4" />
                      <span>{isEssentialsCourse ? 'Expert-Led Course' : 'AI-Personalized'}</span>
                    </div>
                    {!isEssentialsCourse && (
                      <span className="px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-sm font-medium rounded-full">
                        <FontAwesomeIcon icon={faGem} className="h-3 w-3 mr-1" />
                        Premium
                      </span>
                    )}
                  </div>

                  {/* Course Title & Description */}
                  <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                    <span className={`
                      bg-gradient-to-r bg-clip-text text-transparent
                      ${isEssentialsCourse
                        ? 'from-emerald-600 to-teal-600'
                        : 'from-purple-600 to-indigo-600'
                      }
                    `}>
                      {course.title}
                    </span>
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                    {course.description}
                  </p>

                  {/* Course Metrics */}
                  <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faBookOpen} className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">{courseMetrics.totalLessons} Lessons</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faClock} className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">~{courseMetrics.estimatedTime} minutes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faTrophy} className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">{courseMetrics.totalXP} XP Total</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    {courseMetrics.nextLesson ? (
                      <button
                        onClick={() => handleLessonClick(courseMetrics.nextLesson?.lesson_id || '')}
                        className={`
                          group flex items-center gap-2 px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-300
                          ${isEssentialsCourse
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-xl'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-xl'
                          }
                        `}
                      >
                        <span>{isFirstLesson? "Start Learning" : "Continue Learning"}</span>
                        <FontAwesomeIcon icon={faPlay} className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    ) : courseMetrics.progress === 100 ? (
                      <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium shadow-lg">
                        <FontAwesomeIcon icon={faCircleCheck} className="h-5 w-5" />
                        <span>Course Completed!</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleLessonClick(course.lessons[0].lesson_id)}
                        className={`
                          group flex items-center gap-2 px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-300
                          ${isEssentialsCourse
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-xl'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-xl'
                          }
                        `}
                      >
                        <FontAwesomeIcon icon={faRocket} className="h-5 w-5" />
                        <span>Start Course</span>
                        <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    )}

                    {/* <button
                      onClick={() => setSavedCourse(!savedCourse)}
                      className={`
                        flex items-center gap-2 px-6 py-3 rounded-xl font-medium border-2 transition-all duration-300
                        ${savedCourse
                          ? 'bg-gray-100 border-gray-300 text-gray-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      <FontAwesomeIcon icon={faBookmark} className={`h-5 w-5 ${savedCourse ? 'text-yellow-500' : ''}`} />
                      <span>{savedCourse ? 'Saved' : 'Save Course'}</span>
                    </button> */}

                    <button 
                      onClick={() => setShowShareModal(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-300"
                    >
                      <FontAwesomeIcon icon={faShareNodes} className="h-5 w-5" />
                      <span>Share</span>
                    </button>
                  </div>
                </motion.div>
              </div>

              {/* Progress Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-1"
              >
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-bold text-foreground dark:text-dark-foreground mb-4">Your Progress</h3>

                  {/* Progress Ring */}
                  <div className="relative w-48 h-48 mx-auto mb-6">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-gray-200 dark:text-gray-600"
                      />
                      <motion.circle
                        cx="96"
                        cy="96"
                        r="80"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 80}`}
                        strokeDashoffset={`${2 * Math.PI * 80 * (1 - courseMetrics.progress / 100)}`}
                        className={isEssentialsCourse ? "text-emerald-500 dark:text-emerald-400" : "text-purple-500 dark:text-purple-400"}
                        initial={{ strokeDashoffset: `${2 * Math.PI * 80}` }}
                        animate={{ strokeDashoffset: `${2 * Math.PI * 80 * (1 - courseMetrics.progress / 100)}` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-foreground dark:text-dark-foreground">{courseMetrics.progress}%</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Complete</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">Lessons Completed</span>
                      <span className="font-semibold text-foreground dark:text-dark-foreground">
                        {courseMetrics.completedLessons}/{courseMetrics.totalLessons}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">XP Earned</span>
                      <span className="font-semibold text-foreground dark:text-dark-foreground">
                        {courseMetrics.earnedXP}/{courseMetrics.totalXP}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">Time Remaining</span>
                      <span className="font-semibold text-foreground dark:text-dark-foreground">
                        ~{Math.round(courseMetrics.estimatedTime * (1 - courseMetrics.progress / 100))} min
                      </span>
                    </div>
                  </div>

                  {courseMetrics.progress === 100 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 bg-gradient-to-r from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-700"
                    >
                      <div className="flex items-center gap-3">
                        <FontAwesomeIcon icon={faCertificate} className="h-6 w-6 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="font-semibold text-green-800 dark:text-green-300">Certificate Available!</p>
                          <p className="text-sm text-green-600 dark:text-green-400">Download your completion certificate</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>
        </div>
      </motion.section>


      {/* Content Sections */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Lessons Section */}
          {activeSection === 'lessons' && (
            <motion.section
              key="lessons"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid lg:grid-cols-3 gap-8"
            >
              {/* Lessons List */}
              <div className="lg:col-span-2 space-y-4">
                {course.lessons.map((lesson, index) => {
                  const lessonId = lesson.id 
                  const isCompleted = completedLessons.some(cl => cl.lesson_id === lessonId);
                  
                  // For essentials course, determine unlock status based on completion of previous lessons
                  let isUnlocked: boolean;
                  if (isEssentialsCourse) {
                    // First lesson is always unlocked
                    if (index === 0) {
                      isUnlocked = true;
                    } else {
                      // Subsequent lessons are unlocked if previous lesson is completed
                      const previousLesson = course.lessons[index - 1];
                      const previousLessonId = (previousLesson as any).id || previousLesson.lesson_id;
                      isUnlocked = completedLessons.some(cl => cl.lesson_id === previousLessonId);
                    }
                  } else {
                    // For other courses, use the lesson's unlocked property
                    isUnlocked = lesson.unlocked;
                  }
                  
                  const isNext = isUnlocked && !isCompleted;

                  return (
                    <motion.div
                      key={lesson.lesson_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative"
                    >
                     

                      <button
                        onClick={() => isUnlocked && handleLessonClick(lesson.lesson_id)}
                        className={`
                          block w-full text-left relative overflow-hidden rounded-2xl transition-all duration-300
                          ${isUnlocked
                            ? 'bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl cursor-pointer'
                            : 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-75'
                          }
                          ${isNext ? 'ring-2 ring-purple-500 dark:ring-purple-400 ring-offset-2 dark:ring-offset-gray-900' : ''}
                        `}
                        disabled={!isUnlocked}
                      >
                        <div className="p-6">
                          <div className="flex items-start gap-4">
                            {/* Lesson Number/Status */}
                            <div className={`
                              w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0
                              ${isCompleted
                                ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
                                : isUnlocked
                                  ? 'bg-gradient-to-br from-purple-100 dark:from-purple-900/30 to-indigo-100 dark:to-indigo-900/30 text-purple-700 dark:text-purple-300'
                                  : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                              }
                            `}>
                              {isCompleted ? (
                                <FontAwesomeIcon icon={faCheck} className="h-6 w-6" />
                              ) : isUnlocked ? (
                                <span>{index + 1}</span>
                              ) : (
                                <FontAwesomeIcon icon={faLock} className="h-5 w-5" />
                              )}
                            </div>

                            {/* Lesson Content */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div>
                                  <h3 className={`
                                    text-lg font-bold mb-1
                                    ${isUnlocked ? 'text-foreground dark:text-dark-foreground' : 'text-gray-500 dark:text-gray-400'}
                                  `}>
                                    {lesson.title}
                                  </h3>
                                  <p className={`
                                    text-sm
                                    ${isUnlocked ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}
                                  `}>
                                    {lesson.description}
                                  </p>
                                </div>
                                <div className="text-3xl flex-shrink-0">
                                  {lesson.icon || '📚'}
                                </div>
                              </div>
                              
                              {/* ===== FIX START ===== */}
                              {/* Lesson Meta */}
                              <div className="flex items-center gap-4 mt-4">
                                <div className="flex items-center gap-1.5">
                                  <FontAwesomeIcon icon={faBookOpen} className={`h-4 w-4 ${isUnlocked ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`} />
                                  <span className={`text-sm ${isUnlocked ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                                    {lesson.questions.length} Questions
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <FontAwesomeIcon icon={faClock} className={`h-4 w-4 ${isUnlocked ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`} />
                                  <span className={`text-sm ${isUnlocked ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                                    ~{Math.max(5, lesson.questions.length * 2)} min
                                  </span>
                                </div>
                                <div className={`
                                  ml-auto px-3 py-1 rounded-full text-sm font-semibold
                                  ${isCompleted
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    : isUnlocked
                                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                  }
                                `}>
                                  +{lesson.xp} XP
                                </div>
                              </div>

                              {/* Status Messages */}
                              {isNext && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center gap-2"
                                >
                                  <FontAwesomeIcon icon={faForward} className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Let's move on!</span>
                                </motion.div>
                              )}
                              {!isUnlocked && (
                                <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg flex items-center gap-2">
                                  <FontAwesomeIcon icon={faLock} className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                  <span className="text-sm text-gray-600 dark:text-gray-400">Complete previous lessons to unlock</span>
                                </div>
                              )}
                              {/* ===== FIX END ===== */}
                            </div>
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </div>

              {/* AI Assistant Card */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="sticky top-24"
                >
            

                  {/* Learning Tips */}
                  <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-6 border border-yellow-200 dark:border-yellow-700">
                    <div className="flex items-center gap-2 mb-3">
                      <FontAwesomeIcon icon={faLightbulb} className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      <h4 className="font-semibold text-foreground dark:text-dark-foreground">Learning Tip</h4>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Complete lessons in order for the best learning experience. Each lesson builds on previous concepts!
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.section>
          )}

          {/* Other sections remain the same... */}
        </AnimatePresence>
      </div>
      
      {/* Share Modal */}
     {createPortal( <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-foreground dark:text-dark-foreground">Share Course</h3>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Course Preview */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-start gap-4">
                  <div className={`
                    w-16 h-16 rounded-xl flex items-center justify-center text-2xl flex-shrink-0
                    ${isEssentialsCourse
                      ? 'bg-gradient-to-br from-emerald-100 to-teal-100'
                      : 'bg-gradient-to-br from-purple-100 to-indigo-100'
                    }
                  `}>
                    {course?.icon || '📚'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground dark:text-dark-foreground mb-1 line-clamp-2">{course?.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{course?.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>{courseMetrics?.totalLessons} lessons</span>
                      <span>•</span>
                      <span>{courseMetrics?.totalXP} XP</span>
                      <span>•</span>
                      <span>~{courseMetrics?.estimatedTime} min</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Share Options */}
              <div className="p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Share this course with your friends and help them learn!</p>
                
                {/* Copy Link */}
                <button
                  onClick={() => {
                    const url = `https://moneko.io/dashboard/learning/${courseId}`;
                    navigator.clipboard.writeText(url);
                    toast.success('Link copied to clipboard!');
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors mb-3"
                >
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faCopy} className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-foreground dark:text-dark-foreground">Copy Link</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Share via any platform</div>
                  </div>
                </button>

                {/* Social Media Platforms */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Twitter/X */}
                  <button
                    onClick={() => {
                      const url = `https://moneko.io/dashboard/learning/${courseId}`;
                      const text = `Check out this amazing course: ${course?.title} on @MonekoApp! 🚀 #FinancialEducation #Learning`;
                      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                      <FontAwesomeIcon icon={faTwitter} className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-foreground dark:text-dark-foreground">X (Twitter)</div>
                    </div>
                  </button>

                  {/* LinkedIn */}
                  <button
                    onClick={() => {
                      const url = `https://moneko.io/dashboard/learning/${courseId}`;
                      const title = `${course?.title} - Moneko`;
                      const summary = course?.description || 'Learn financial concepts with this comprehensive course';
                      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(summary)}`, '_blank');
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <FontAwesomeIcon icon={faLinkedin} className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-foreground dark:text-dark-foreground">LinkedIn</div>
                    </div>
                  </button>

                  {/* Facebook */}
                  <button
                    onClick={() => {
                      const url = `https://moneko.io/dashboard/learning/${courseId}`;
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <FontAwesomeIcon icon={faFacebook} className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-foreground dark:text-dark-foreground">Facebook</div>
                    </div>
                  </button>

                  {/* Reddit */}
                  <button
                    onClick={() => {
                      const url = `https://moneko.io/dashboard/learning/${courseId}`;
                      const title = `${course?.title} - Free Financial Education Course`;
                      window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`, '_blank');
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                      <FontAwesomeIcon icon={faReddit} className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-foreground dark:text-dark-foreground">Reddit</div>
                    </div>
                  </button>
                </div>

                {/* Discord - Full Width */}
                <button
                  onClick={() => {
                    const url = `https://moneko.io/dashboard/learning/${courseId}`;
                    const message = `Hey! Check out this course: **${course?.title}** on Moneko! 🎓\n\n${course?.description}\n\n${url}`;
                    navigator.clipboard.writeText(message);
                    toast.success('Discord message copied to clipboard!');
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors mt-3"
                >
                  <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon icon={faDiscord} className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900">Discord</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Copy formatted message</div>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
      
      {/* Subscription Modal */}    
          <DashboardBlockModal onClose={() => setShowSubscriptionModal(false)} isVisible={showSubscriptionModal} />       

    </motion.div>
  );
}