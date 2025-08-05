"use client";

import { useAuth } from "@/contexts/auth-context";
import { useUserCourses } from "@/services/course-service";
import { useCompletedLessons } from "@/hooks/useCompletedLessons";
import { Link, createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faGraduationCap, 
  faRobot, 
  faComments, 
  faChevronDown, 
  faBrain,
  faBookOpen,
  faWandSparkles,
  faLightbulb,
  faRocket,
  faTrophy,
  faFire,
  faChartLine,
  faCirclePlay,
  faArrowRight,
  faBolt,
  faPlus,
  faGem,
  faStar
} from '@fortawesome/free-solid-svg-icons';
import { useFinancialHealthProfile } from '@/hooks/use-financial-health-profile';
import basicCourse from '@/data/basic-lessons.json';
import { seo } from "@/utils/seo";
import { FinancialEducatorChatInterface } from "@/components/chat/financial-educator-chat-interface";
import { createPortal } from "react-dom";
import { useGamification } from "@/hooks/use-gamification";
import { FinancialGlassMetricsPanel } from "@/components/shared/FinancialGlassMetricsPanel";
import { DashboardHeroSection } from "@/components/shared/DashboardHeroSection";

export const Route = createFileRoute("/dashboard/learning/")({
  component: UnifiedLearningPage,
  head: () => {
    const pageUrl = "https://moneko.io/learning/";
    const meta = seo({
      title: "Financial Learning Hub | Expert-Led & AI-Personalized Courses - Moneko",
      description:
        "Master personal finance with expert-crafted essentials and AI-personalized courses. From fundamentals to advanced strategies, learn at your own pace.",
      keywords:
        "financial education, personal finance courses, AI learning, investment basics, financial literacy, money management, expert-led courses, personalized learning",
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });
    
    return {
      meta,
      link: [
        {
          rel: "canonical",
          href: pageUrl
        }
      ]
    };
  },
});

export function UnifiedLearningPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'personalized' | 'essentials'>('all');
  const [showAICoach, setShowAICoach] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const { gamificationData } = useGamification();

  const {
    data: aiCourses = [],
    isLoading: isAICoursesLoading,
    isError: isAICoursesError,
  } = useUserCourses(user?.id ?? "", { 
    enabled: !!user,
    source: 'remote' 
  });
  
  // Get completed lessons data using the same method as other pages
  const { data: completedLessons = [], isLoading: isLoadingCompleted } = useCompletedLessons(user?.id);
  
  const { profile: financialProfile, hasProfile } = useFinancialHealthProfile(user?.id);
  
  // Learning prompts organized by category
  const promptCategories = [
    {
      icon: faLightbulb,
      title: "Getting Started",
      prompts: [
        "Help me choose the right course to start with",
        "Explain budgeting fundamentals",
        "What should I learn first?"
      ]
    },
    {
      icon: faRocket,
      title: "Advanced Topics",
      prompts: [
        "Create a custom lesson about investing",
        "Teach me about retirement planning",
        "Help me understand investment risks"
      ]
    },
    {
      icon: faBolt,
      title: "Personalized Learning",
      prompts: [
        "Create a personalized learning path",
        "Create lessons based on my financial goals",
        "Generate practice questions for financial planning"
      ]
    }
  ];
  
  // Calculate learning stats using consistent completion logic
  const learningStats = useMemo(() => {
    if (isLoadingCompleted) {
      return {
        totalCourses: 0,
        completedLessons: 0,
        totalXP: 0,
        earnedXP: 0,
        streak: 0,
      };
    }

    // Include essentials course with AI courses for total count
    const allCourses = [basicCourse, ...aiCourses];
    
    return {
      totalCourses: allCourses.length,
      completedLessons: completedLessons.length, // Total completed lessons across all courses
      totalXP: allCourses.reduce((acc, course) => 
        acc + course.lessons.reduce((xpAcc, lesson) => xpAcc + (lesson.xp || 0), 0), 0
      ),
      earnedXP: gamificationData.xp,
      streak: gamificationData.streak,
    };
  }, [aiCourses, completedLessons, isLoadingCompleted,gamificationData]);

  // Combine all courses for unified view
  const allCourses = [
    {
      ...basicCourse,
      type: 'essential',
      difficulty: 'Beginner',
      duration: '2-3 hours',
      students: '10k+',
    },
    ...aiCourses.map(course => ({
      ...course,
      type: 'personalized',
      difficulty: 'Adaptive',
      duration: course.lessons.length<3?"~30 mins":course.lessons.length<6?"~1 hour":course.lessons.length<9?"~2 hours":"~3 hours",
      students: 'Just for you',
    }))
  ];

  const filteredCourses = activeTab === 'all' 
    ? allCourses 
    : allCourses.filter(course => 
        activeTab === 'personalized' ? course.type === 'personalized' : course.type === 'essential'
      );

  // Enhanced Animation variants with physics-based motion (2025 Design System)
  const pageVariants: Variants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { 
        duration: 0.4, 
        staggerChildren: 0.08,
        ease: [0.2, 0.8, 0.4, 1] // Structured Expression easing
      }
    }
  };

  const itemVariants: Variants = {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        duration: 0.3,
        ease: [0.25, 0.8, 0.5, 1] // Educational reveal timing
      }
    }
  };

  const courseCardVariants: Variants = {
    initial: { opacity: 0, scale: 0.96, y: 10 },
    animate: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: { 
        duration: 0.4,
        ease: [0.15, 0.8, 0.4, 1] // Premium feel transition
      }
    },
    hover: {
      scale: 1.015, // Subtle, confident hover
      y: -2,
      transition: { 
        duration: 0.2,
        ease: [0.4, 0.0, 0.2, 1] // Glass material timing
      }
    }
  };

  // Financial Glass material variants
  const glassVariants: Variants = {
    initial: { 
      backdropFilter: "blur(0px)",
      background: "rgba(255, 255, 255, 0)"
    },
    animate: { 
      backdropFilter: "blur(20px)",
      background: "rgba(255, 255, 255, 0.08)",
      transition: { 
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1]
      }
    }
  };

  return (
    <>
      {/* Design System CSS Injection */}
      <style jsx global>{`
        /* Financial Glass Material System */
        .financial-glass {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px) saturate(150%);
          border: 1px solid rgba(255, 255, 255, 0.125);
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        
        /* Expressive Typography Classes */
        .text-display {
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }
        
        .text-headline {
          font-size: clamp(1.875rem, 3vw, 2.5rem);
          font-weight: 600;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }
        
        .text-title {
          font-size: clamp(1.25rem, 2vw, 1.5rem);
          font-weight: 600;
          line-height: 1.3;
        }
        
        .text-body {
          font-size: 1rem;
          font-weight: 400;
          line-height: 1.6;
        }
        
        .text-label {
          font-size: 0.875rem;
          font-weight: 500;
          line-height: 1.4;
          letter-spacing: 0.01em;
        }
        
        /* Variable Font Support */
        * {
          font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        }
        
        /* Reduced Motion Support */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <motion.div 
        className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950/20"
        variants={pageVariants}
        initial="initial"
        animate="animate"
      >
      {/* Modern Hero Section with Stats */}
      <DashboardHeroSection
        title={`Welcome back, ${user?.user_metadata?.full_name || 'Learner'}`}
        titleGradient="from-violet-600 dark:from-violet-400 via-purple-600 dark:via-purple-400 to-indigo-600 dark:to-indigo-400"
        emoji="👋"
        emojiAnimation={{ rotate: [0, 20, 0], duration: 1, repeatDelay: 3 }}
        description="Continue your journey to financial mastery with AI-powered and expert-crafted courses."
        backgroundGradient="from-violet-600/5 dark:from-violet-400/10 via-purple-600/5 dark:via-purple-400/10 to-indigo-600/5 dark:to-indigo-400/10"
        decorativeGradients={{
          topRight: "bg-purple-400/10 dark:bg-purple-400/20",
          bottomLeft: "bg-indigo-400/10 dark:bg-indigo-400/20"
        }}
        actions={[
          {
            label: "Create AI Course",
            icon: faWandSparkles,
            onClick: () => setShowAICoach(true),
            variant: 'primary'
          },
          ...(aiCourses.length > 0 ? [{
            label: "Resume Learning",
            icon: faCirclePlay,
            variant: 'secondary' as const,
            component: (
              <Link
                to={`/dashboard/learning/${aiCourses[0].course_id}`}
                className="group flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:border-purple-300 dark:hover:border-purple-400 hover:text-purple-700 dark:hover:text-purple-400 transition-all duration-300"
              >
                <FontAwesomeIcon icon={faCirclePlay} className="h-5 w-5" />
                <span>Resume Learning</span>
              </Link>
            )
          }] : [])
        ]}
        metrics={[
          {
            icon: faFire,
            value: learningStats.streak,
            label: "Day Streak",
            gradientColors: "from-orange-600 to-red-600",
            iconColors: "from-orange-400 to-red-500",
            delay: 0.5
          },
          {
            icon: faTrophy,
            value: learningStats.totalXP.toLocaleString(),
            label: "Total XP",
            gradientColors: "from-blue-600 to-indigo-600",
            iconColors: "from-blue-400 to-indigo-500",
            delay: 0.6
          },
          {
            icon: faBookOpen,
            value: learningStats.totalCourses,
            label: "Courses",
            gradientColors: "from-green-600 to-emerald-600",
            iconColors: "from-green-400 to-emerald-500",
            delay: 0.7
          },
          {
            icon: faChartLine,
            value: learningStats.completedLessons,
            label: "Lessons Done",
            gradientColors: "from-purple-600 to-pink-600",
            iconColors: "from-purple-400 to-pink-500",
            delay: 0.8
          }
        ]}
      />

      {/* Modern Tab Navigation */}
      <motion.div 
        className="px-4 mb-8"
        variants={itemVariants}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="rounded-2xl p-2 shadow-xl border border-white/20 dark:border-gray-700/50 backdrop-blur-xl"
            variants={glassVariants}
            style={{
              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(124, 58, 237, 0.03) 100%)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.15)"
            }}
          >
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'All Courses', icon: faBookOpen },
                { id: 'personalized', label: 'AI Personalized', icon: faRobot },
                { id: 'essentials', label: 'Essentials', icon: faGraduationCap }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 relative overflow-hidden
                    ${activeTab === tab.id 
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg transform scale-[1.02]' 
                      : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:backdrop-blur-sm hover:scale-[1.01]'
                    }
                  `}
                >
                  <FontAwesomeIcon icon={tab.icon} className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Course Grid */}
      <motion.section 
        className="px-4 mb-12"
        variants={itemVariants}
      >
        <div className="max-w-7xl mx-auto">
          {isAICoursesLoading && activeTab !== 'essentials' ? (
            <div className="flex justify-center py-20">
              <motion.div 
                className="w-16 h-16 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          ) : filteredCourses.length === 0 ? (
            <motion.div 
              className="text-center py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-100 dark:from-purple-900/30 to-indigo-100 dark:to-indigo-900/30 rounded-full flex items-center justify-center">
                <FontAwesomeIcon icon={faPlus} className="h-10 w-10 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-foreground dark:text-dark-foreground mb-3">No courses yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Start your learning journey by creating your first AI-powered course!</p>
              <button
                onClick={() => setShowAICoach(true)}
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Create Your First Course
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredCourses.map((course, index) => (
                  <motion.div
                    key={course.course_id}
                    variants={courseCardVariants}
                    initial="initial"
                    animate="animate"
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover="hover"
                    layout
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={`/dashboard/learning/${course.course_id}`}
                      className="block h-full"
                    >
                      <div className={`
                        h-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border group
                        ${course.type === 'essential' 
                          ? 'border-emerald-200/50 dark:border-emerald-700/50 hover:border-emerald-400/70 dark:hover:border-emerald-500/70 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10' 
                          : 'border-purple-200/50 dark:border-purple-700/50 hover:border-purple-400/70 dark:hover:border-purple-500/70 hover:bg-purple-50/30 dark:hover:bg-purple-900/10'
                        }
                      `}>
                        {/* Course Header */}
                        <div className={`
                          p-6 pb-4 relative overflow-hidden
                          ${course.type === 'essential' 
                            ? 'bg-gradient-to-br from-emerald-50 dark:from-emerald-900/20 to-green-50 dark:to-green-900/20' 
                            : 'bg-gradient-to-br from-purple-50 dark:from-purple-900/20 to-indigo-50 dark:to-indigo-900/20'
                          }
                        `}>
                          {/* Decorative background */}
                          <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/20 rounded-full blur-2xl" />
                          
                          <div className="relative flex items-start gap-4">
                            <div className="text-4xl flex-shrink-0">{course.icon || "📚"}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`
                                  px-3 py-1 text-xs font-semibold rounded-full
                                  ${course.type === 'essential' 
                                    ? 'bg-emerald-500 text-white' 
                                    : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                                  }
                                `}>
                                  {course.type === 'essential' ? 'Expert-Led' : 'AI-Powered'}
                                </span>
                                {course.type === 'personalized' && (
                                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded-full">
                                    <FontAwesomeIcon icon={faGem} className="h-3 w-3 mr-1" />
                                    Premium
                                  </span>
                                )}
                              </div>
                              <motion.h3 
                              className="text-lg font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 mb-2 group-hover:text-gray-800 dark:group-hover:text-white transition-colors duration-200"
                                style={{
                                  fontVariationSettings: "'wght' 600",
                                  fontSize: "clamp(1.25rem, 2vw, 1.5rem)", // Design system text-title
                                  lineHeight: "1.3"
                                }}
                              >
                                {course.title}
                              </motion.h3>
                            </div>
                          </div>
                          
                          <p className="text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed" style={{
                            fontSize: "1rem", // Design system text-body
                            fontWeight: "400",
                            lineHeight: "1.6"
                          }}>
                            {course.description}
                          </p>
                        </div>

                        {/* Course Info */}
                        <div className="p-6 pt-4 space-y-4">
                          {/* Progress Bar (for all courses) */}
                          {(() => {
                            // Calculate course-specific completion using consistent logic
                            const courseCompletedLessons = completedLessons.filter(cl => 
                              course.lessons.some((lesson: any) => lesson.id === cl.lesson_id)
                            );
                            const completedCount = courseCompletedLessons.length;
                            const totalCount = course.lessons.length;
                            const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
                            
                            return (
                              <div>
                                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                  <span>Progress</span>
                                  <span>
                                    {completedCount}/{totalCount} lessons completed
                                  </span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <motion.div 
                                    className={`h-full rounded-full ${
                                      course.type === 'essential' 
                                        ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                                        : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                                    }`}
                                    initial={{ width: 0, scaleX: 0 }}
                                    animate={{ 
                                      width: `${progressPercentage}%`,
                                      scaleX: 1
                                    }}
                                    transition={{ 
                                      duration: 1.2, 
                                      delay: 0.5,
                                      ease: [0.25, 0.8, 0.5, 1] // Structured Expression timing
                                    }}
                                    style={{
                                      transformOrigin: "left center"
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })()}

                          {/* Course Meta */}
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Difficulty</p>
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{course.difficulty}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{course.duration}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Students</p>
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{course.students}</p>
                            </div>
                          </div>

                          {/* CTA Button */}
                          <button className={`
                            w-full py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2
                            ${course.type === 'essential' 
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50' 
                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                            }
                          `}>
                            {course.type === 'personalized' && course.lessons.some(l => l.unlocked) ? (
                              <>
                                <FontAwesomeIcon icon={faCirclePlay} className="h-4 w-4" />
                                Continue Learning
                              </>
                            ) : (
                              <>
                                <FontAwesomeIcon icon={faRocket} className="h-4 w-4" />
                                Start Course
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}

                {/* Add New Course Card */}
                {activeTab !== 'essentials' && (
                  <motion.div
                    variants={courseCardVariants}
                    initial="initial"
                    animate="animate"
                    whileHover="hover"
                    onClick={() => setShowAICoach(true)}
                    className="cursor-pointer"
                  >
                    <div className="h-full bg-gradient-to-br from-gray-50 dark:from-gray-800 to-gray-100 dark:to-gray-700 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 flex items-center justify-center p-8">
                      <div className="text-center">
                        <motion.div 
                          className="w-20 h-20 mx-auto mb-4 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-lg"
                          whileHover={{ rotate: 180 }}
                          transition={{ duration: 0.5 }}
                        >
                          <FontAwesomeIcon icon={faPlus} className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                        </motion.div>
                        <h3 className="text-lg font-bold text-foreground dark:text-dark-foreground mb-2">Create New Course</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Let AI design a course tailored to your goals</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.section>

      {/* AI Coach Floating Button (Mobile) */}
      <motion.button
        onClick={() => setShowAICoach(!showAICoach)}
        className="lg:hidden fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full shadow-2xl flex items-center justify-center text-white z-40"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <FontAwesomeIcon icon={faComments} className="h-6 w-6" />
      </motion.button>

      {/* AI Coach Modal/Sidebar */}
      {
        createPortal(<AnimatePresence>
          {showAICoach && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAICoach(false)}
                className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-40"
              />
  
              {/* AI Coach Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed flex flex-col right-0 top-0 h-screen w-full lg:w-[40vw] bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-hidden"
              >
                {/* Header */}
                <div className="bg-gradient-to-r py-3 w-full from-violet-600 to-purple-600 px-6 text-white flex flex-row items-center gap-4">
                      <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <FontAwesomeIcon icon={faGraduationCap} className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">AI Learning Coach</h3>
                        <p className="text-sm text-white/80">Create personalized courses instantly</p>
                      </div>
                </div>
  
  
                {/* Chat Interface */}
                 <div className="flex-1 h-full overflow-hidden">
                 <FinancialEducatorChatInterface />
                 </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>, document.body)
      }
      </motion.div>
    </>
  );
}