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
    console.log("lessonId",isActive)
    if(isActive){
      navigate({
        to: '/dashboard/learning/$courseId/lesson/$lessonId',
        params: {
          courseId,
          lessonId,
        },
      })
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
          <FontAwesomeIcon icon={faBookOpen} className="h-16 w-16 text-muted-foreground/60 mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Course not found</h2>
          <p className="text-muted-foreground mb-6">The course you're looking for doesn't exist.</p>
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
      className="min-h-screen"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Hero Section with Course Info - Mobile Optimized */}
      <motion.section
        className="relative overflow-hidden"
        variants={heroVariants}
      >
        {/* Background Gradient - Subtle on mobile */}
        <div className={`absolute inset-0 ${isEssentialsCourse
            ? 'bg-gradient-to-br from-emerald-600/5 sm:from-emerald-600/10 dark:from-emerald-400/10 sm:dark:from-emerald-400/20 via-teal-600/5 sm:via-teal-600/10 dark:via-teal-400/10 sm:dark:via-teal-400/20 to-green-600/5 sm:to-green-600/10 dark:to-green-400/10 sm:dark:to-green-400/20'
            : 'bg-gradient-to-br from-purple-600/5 sm:from-purple-600/10 dark:from-purple-400/10 sm:dark:from-purple-400/20 via-indigo-600/5 sm:via-indigo-600/10 dark:via-indigo-400/10 sm:dark:via-indigo-400/20 to-blue-600/5 sm:to-blue-600/10 dark:to-blue-400/10 sm:dark:to-blue-400/20'
          }`} />

        {/* Decorative Elements - Hidden on mobile */}
        <div className="hidden sm:block absolute -top-40 -right-40 w-80 h-80 bg-purple-400/20 dark:bg-purple-400/30 rounded-full blur-3xl" />
        <div className="hidden sm:block absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 dark:bg-indigo-400/30 rounded-full blur-3xl" />

        <div className="relative px-3 sm:px-4 py-4 sm:py-8 max-w-7xl mx-auto">
          {/* Course Header - Mobile Optimized Layout */}
          <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-1 lg:grid-cols-3 sm:gap-8">
            {/* Course Info */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {/* Course Type Badge - Mobile Optimized */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className={`
                    flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-mobile-sm sm:text-sm font-semibold min-h-[32px]
                    ${isEssentialsCourse
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                    }
                  `}>
                    <FontAwesomeIcon icon={isEssentialsCourse ? faGraduationCap : faRobot} className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>{isEssentialsCourse ? 'Expert-Led Course' : 'AI-Personalized'}</span>
                  </div>
                  {!isEssentialsCourse && (
                    <span className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-mobile-sm sm:text-sm font-medium rounded-full min-h-[32px] flex items-center">
                      <FontAwesomeIcon icon={faGem} className="h-3 w-3 mr-1" />
                      Premium
                    </span>
                  )}
                </div>

                {/* Course Title & Description - Mobile Optimized Typography */}
                <h1 className="text-mobile-lg sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
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
                <p className="text-mobile-base sm:text-lg text-foreground/70 mb-4 sm:mb-6 leading-relaxed">
                  {course.description}
                </p>

                {/* Course Metrics - Mobile Optimized with CSS Variables */}
                <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <FontAwesomeIcon icon={faBookOpen} className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    <span className="text-mobile-sm sm:text-base text-foreground">{courseMetrics.totalLessons} Lessons</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <FontAwesomeIcon icon={faClock} className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    <span className="text-mobile-sm sm:text-base text-foreground">~{courseMetrics.estimatedTime} min</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <FontAwesomeIcon icon={faTrophy} className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    <span className="text-mobile-sm sm:text-base text-foreground">{courseMetrics.totalXP} XP</span>
                  </div>
                </div>

                {/* Action Buttons - Mobile Optimized Touch Targets */}
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {courseMetrics.nextLesson ? (
                    <button
                      onClick={() => handleLessonClick(courseMetrics.nextLesson?.lesson_id || '')}
                      className={`
                        group flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-300 min-h-[44px] text-mobile-base sm:text-base
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
                    <button className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium shadow-lg min-h-[44px] text-mobile-base sm:text-base">
                      <FontAwesomeIcon icon={faCircleCheck} className="h-5 w-5" />
                      <span>Course Completed!</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLessonClick(course.lessons[0].lesson_id)}
                      className={`
                        group flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-300 min-h-[44px] text-mobile-base sm:text-base
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

                  <button 
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-card border-2 border-border text-foreground rounded-xl font-medium hover:border-border/80 transition-all duration-300 min-h-[44px] text-mobile-base sm:text-base"
                  >
                    <FontAwesomeIcon icon={faShareNodes} className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Progress Card - Mobile Optimized Compact Design */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-1"
            >
              <div className="bg-card/90 backdrop-blur-sm rounded-2xl sm:rounded-2xl shadow-lg sm:shadow-xl p-4 sm:p-6 border border-border">
                <h3 className="text-mobile-base sm:text-lg font-bold text-foreground mb-3 sm:mb-4">Your Progress</h3>

                {/* Progress Ring - Smaller on mobile */}
                <div className="relative w-32 h-32 sm:w-48 sm:h-48 mx-auto mb-4 sm:mb-6">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx={window.innerWidth < 640 ? "64" : "96"}
                      cy={window.innerWidth < 640 ? "64" : "96"}
                      r={window.innerWidth < 640 ? "52" : "80"}
                      stroke="currentColor"
                      strokeWidth={window.innerWidth < 640 ? "8" : "12"}
                      fill="none"
                      className="text-muted/50"
                    />
                    <motion.circle
                      cx={window.innerWidth < 640 ? "64" : "96"}
                      cy={window.innerWidth < 640 ? "64" : "96"}
                      r={window.innerWidth < 640 ? "52" : "80"}
                      stroke="currentColor"
                      strokeWidth={window.innerWidth < 640 ? "8" : "12"}
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * (window.innerWidth < 640 ? 52 : 80)}`}
                      strokeDashoffset={`${2 * Math.PI * (window.innerWidth < 640 ? 52 : 80) * (1 - courseMetrics.progress / 100)}`}
                      className={isEssentialsCourse ? "text-emerald-500 dark:text-emerald-400" : "text-purple-500 dark:text-purple-400"}
                      initial={{ strokeDashoffset: `${2 * Math.PI * (window.innerWidth < 640 ? 52 : 80)}` }}
                      animate={{ strokeDashoffset: `${2 * Math.PI * (window.innerWidth < 640 ? 52 : 80) * (1 - courseMetrics.progress / 100)}` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl sm:text-4xl font-bold text-foreground">{courseMetrics.progress}%</span>
                    <span className="text-mobile-xs sm:text-sm text-muted-foreground">Complete</span>
                  </div>
                </div>

                {/* Stats - Mobile Optimized */}
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-center p-2.5 sm:p-3 bg-muted/50 rounded-lg">
                    <span className="text-mobile-sm sm:text-base text-muted-foreground">Lessons</span>
                    <span className="font-semibold text-mobile-sm sm:text-base text-foreground">
                      {courseMetrics.completedLessons}/{courseMetrics.totalLessons}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 sm:p-3 bg-muted/50 rounded-lg">
                    <span className="text-mobile-sm sm:text-base text-muted-foreground">XP Earned</span>
                    <span className="font-semibold text-mobile-sm sm:text-base text-foreground">
                      {courseMetrics.earnedXP}/{courseMetrics.totalXP}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 sm:p-3 bg-muted/50 rounded-lg">
                    <span className="text-mobile-sm sm:text-base text-muted-foreground">Time Left</span>
                    <span className="font-semibold text-mobile-sm sm:text-base text-foreground">
                      ~{Math.round(courseMetrics.estimatedTime * (1 - courseMetrics.progress / 100))} min
                    </span>
                  </div>
                </div>

                {courseMetrics.progress === 100 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-r from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-700"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <FontAwesomeIcon icon={faCertificate} className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-mobile-sm sm:text-base text-green-800 dark:text-green-300">Certificate Available!</p>
                        <p className="text-mobile-xs sm:text-sm text-green-600 dark:text-green-400">Download your certificate</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>


      {/* Content Sections - Mobile Optimized */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <AnimatePresence mode="wait">
          {/* Lessons Section */}
          {activeSection === 'lessons' && (
            <motion.section
              key="lessons"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4 sm:space-y-0 sm:grid lg:grid-cols-3 sm:gap-8"
            >
              {/* Lessons List - Mobile Optimized */}
              <div className="lg:col-span-2 space-y-3 sm:space-y-4">
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
                          block w-full text-left relative overflow-hidden rounded-xl sm:rounded-2xl transition-all duration-300 touch-manipulation min-h-[44px]
                          ${isUnlocked
                            ? 'bg-card shadow-md sm:shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer'
                            : 'bg-muted/50 cursor-not-allowed opacity-75'
                          }
                          ${isNext ? 'ring-2 ring-purple-500 dark:ring-purple-400 ring-offset-1 sm:ring-offset-2 dark:ring-offset-gray-900' : ''}
                        `}
                        disabled={!isUnlocked}
                      >
                        <div className="p-3 sm:p-4 lg:p-6">
                          <div className="flex items-start gap-2.5 sm:gap-3 lg:gap-4">
                            {/* Lesson Number/Status - Mobile Optimized */}
                            <div className={`
                              w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center text-base sm:text-lg lg:text-2xl font-bold flex-shrink-0
                              ${isCompleted
                                ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
                                : isUnlocked
                                  ? 'bg-gradient-to-br from-purple-100 dark:from-purple-900/30 to-indigo-100 dark:to-indigo-900/30 text-purple-700 dark:text-purple-300'
                                  : 'bg-muted text-muted-foreground'
                              }
                            `}>
                              {isCompleted ? (
                                <FontAwesomeIcon icon={faCheck} className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                              ) : isUnlocked ? (
                                <span>{index + 1}</span>
                              ) : (
                                <FontAwesomeIcon icon={faLock} className="h-4 w-4 sm:h-5 sm:w-5" />
                              )}
                            </div>

                            {/* Lesson Content - Mobile Optimized Typography */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 sm:gap-4 mb-1.5 sm:mb-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className={`
                                    text-mobile-base sm:text-lg font-bold mb-0.5 sm:mb-1
                                    ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}
                                  `}>
                                    {lesson.title}
                                  </h3>
                                  <p className={`
                                    text-mobile-sm sm:text-sm line-clamp-2
                                    ${isUnlocked ? 'text-foreground/70' : 'text-muted-foreground/60'}
                                  `}>
                                    {lesson.description}
                                  </p>
                                </div>
                                <div className="text-xl sm:text-2xl lg:text-3xl flex-shrink-0">
                                  {lesson.icon || '📚'}
                                </div>
                              </div>
                              
                              {/* Lesson Meta - Mobile Optimized with CSS Variables */}
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4 mt-2.5 sm:mt-4">
                                <div className="flex items-center gap-1 sm:gap-1.5">
                                  <FontAwesomeIcon icon={faBookOpen} className={`h-3 w-3 sm:h-4 sm:w-4 ${isUnlocked ? 'text-muted-foreground' : 'text-muted-foreground/60'}`} />
                                  <span className={`text-mobile-xs sm:text-xs lg:text-sm ${isUnlocked ? 'text-foreground/70' : 'text-muted-foreground/60'}`}>
                                    {lesson.questions.length} Questions
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 sm:gap-1.5">
                                  <FontAwesomeIcon icon={faClock} className={`h-3 w-3 sm:h-4 sm:w-4 ${isUnlocked ? 'text-muted-foreground' : 'text-muted-foreground/60'}`} />
                                  <span className={`text-mobile-xs sm:text-xs lg:text-sm ${isUnlocked ? 'text-foreground/70' : 'text-muted-foreground/60'}`}>
                                    ~{Math.max(5, lesson.questions.length * 2)} min
                                  </span>
                                </div>
                                <div className={`
                                  ml-auto px-2 sm:px-2.5 lg:px-3 py-1 rounded-full text-mobile-xs sm:text-xs lg:text-sm font-semibold
                                  ${isCompleted
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    : isUnlocked
                                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                      : 'bg-muted text-muted-foreground'
                                  }
                                `}>
                                  +{lesson.xp} XP
                                </div>
                              </div>

                              {/* Status Messages - Mobile Optimized */}
                              {isNext && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="mt-2 sm:mt-3 p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center gap-1.5 sm:gap-2"
                                >
                                  <FontAwesomeIcon icon={faForward} className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                  <span className="text-mobile-sm sm:text-sm font-medium text-purple-700 dark:text-purple-300">Let's move on!</span>
                                </motion.div>
                              )}
                              {!isUnlocked && (
                                <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-muted/50 rounded-lg flex items-center gap-1.5 sm:gap-2">
                                  <FontAwesomeIcon icon={faLock} className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="text-mobile-sm sm:text-sm text-muted-foreground">Complete previous lessons to unlock</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </div>

              {/* Learning Tips - Hidden on mobile, visible on desktop */}
              <div className="hidden lg:block lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="sticky top-24"
                >
                  {/* Learning Tips */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-6 border border-yellow-200 dark:border-yellow-700">
                    <div className="flex items-center gap-2 mb-3">
                      <FontAwesomeIcon icon={faLightbulb} className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      <h4 className="font-semibold text-foreground">Learning Tip</h4>
                    </div>
                    <p className="text-sm text-foreground">
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
      
      {/* Share Modal - Mobile Optimized (Full-screen on mobile, Modal on desktop) */}
     {createPortal( <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 1, y: '100%' }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1, y: '100%' }}
              transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 300,
                duration: 0.3
              }}
              className="bg-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header - Mobile Optimized */}
              <div className="p-4 sm:p-6 border-b border-border flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-mobile-lg sm:text-xl font-bold text-foreground">Share Course</h3>
                    <p className="text-mobile-sm sm:text-sm text-muted-foreground mt-0.5">Spread the knowledge!</p>
                  </div>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-muted/50 rounded-lg transition-colors touch-manipulation flex-shrink-0"
                    aria-label="Close modal"
                  >
                    <FontAwesomeIcon icon={faClose} className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Course Preview - Mobile Optimized */}
              <div className="p-4 sm:p-6 border-b border-border flex-shrink-0">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className={`
                    w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-xl sm:text-2xl flex-shrink-0
                    ${isEssentialsCourse
                      ? 'bg-gradient-to-br from-emerald-100 to-teal-100'
                      : 'bg-gradient-to-br from-purple-100 to-indigo-100'
                    }
                  `}>
                    {course?.icon || '📚'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-mobile-base sm:text-base text-foreground mb-1 line-clamp-2">{course?.title}</h4>
                    <p className="text-mobile-sm sm:text-sm text-muted-foreground mb-2 line-clamp-2">{course?.description}</p>
                    <div className="flex items-center gap-2 sm:gap-4 text-mobile-xs sm:text-xs text-muted-foreground">
                      <span>{courseMetrics?.totalLessons} lessons</span>
                      <span>•</span>
                      <span>{courseMetrics?.totalXP} XP</span>
                      <span>•</span>
                      <span>~{courseMetrics?.estimatedTime} min</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Share Options - Mobile Optimized with Scrollable Content */}
              <div className="flex-1 overflow-y-auto scrollbar-hide sm:scrollbar-auto p-4 sm:p-6">
                <p className="text-mobile-sm sm:text-sm text-muted-foreground mb-4">Share this course with your friends and help them learn!</p>
                
                {/* Copy Link - Mobile Optimized */}
                <button
                  onClick={() => {
                    const url = `https://moneko.io/dashboard/learning/${courseId}`;
                    navigator.clipboard.writeText(url);
                    toast.success('Link copied to clipboard!');
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors mb-3 touch-manipulation min-h-[60px]"
                >
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                    <FontAwesomeIcon icon={faCopy} className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-mobile-base sm:text-base text-foreground">Copy Link</div>
                    <div className="text-mobile-sm sm:text-sm text-muted-foreground">Share via any platform</div>
                  </div>
                </button>

                {/* Social Media Platforms - Mobile Optimized Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Twitter/X */}
                  <button
                    onClick={() => {
                      const url = `https://moneko.io/dashboard/learning/${courseId}`;
                      const text = `Check out this amazing course: ${course?.title} on @MonekoApp! 🚀 #FinancialEducation #Learning`;
                      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors touch-manipulation min-h-[60px]"
                  >
                    <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                      <FontAwesomeIcon icon={faTwitter} className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-mobile-base sm:text-base text-foreground">X (Twitter)</div>
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
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors touch-manipulation min-h-[60px]"
                  >
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FontAwesomeIcon icon={faLinkedin} className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-mobile-base sm:text-base text-foreground">LinkedIn</div>
                    </div>
                  </button>

                  {/* Facebook */}
                  <button
                    onClick={() => {
                      const url = `https://moneko.io/dashboard/learning/${courseId}`;
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors touch-manipulation min-h-[60px]"
                  >
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FontAwesomeIcon icon={faFacebook} className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-mobile-base sm:text-base text-foreground">Facebook</div>
                    </div>
                  </button>

                  {/* Reddit */}
                  <button
                    onClick={() => {
                      const url = `https://moneko.io/dashboard/learning/${courseId}`;
                      const title = `${course?.title} - Free Financial Education Course`;
                      window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`, '_blank');
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors touch-manipulation min-h-[60px]"
                  >
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FontAwesomeIcon icon={faReddit} className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-mobile-base sm:text-base text-foreground">Reddit</div>
                    </div>
                  </button>
                </div>

                {/* Discord - Full Width - Mobile Optimized */}
                <button
                  onClick={() => {
                    const url = `https://moneko.io/dashboard/learning/${courseId}`;
                    const message = `Hey! Check out this course: **${course?.title}** on Moneko! 🎓\n\n${course?.description}\n\n${url}`;
                    navigator.clipboard.writeText(message);
                    toast.success('Discord message copied to clipboard!');
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors mt-3 touch-manipulation min-h-[60px]"
                >
                  <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FontAwesomeIcon icon={faDiscord} className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-mobile-base sm:text-base text-foreground">Discord</div>
                    <div className="text-mobile-sm sm:text-sm text-muted-foreground">Copy formatted message</div>
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