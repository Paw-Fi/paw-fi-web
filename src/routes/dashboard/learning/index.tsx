"use client";

import { useAuth } from "@/contexts/auth-context";
import { useUserCourses } from "@/services/course-service";
import { useCompletedLessons } from "@/hooks/useCompletedLessons";
import { Link, createFileRoute, useSearch } from "@tanstack/react-router";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useState, useMemo, useEffect } from 'react';
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

export const Route = createFileRoute("/dashboard/learning/")({
  component: UnifiedLearningPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      topic: (search.topic as string) || '',
      source: (search.source as string) || '',
      action: (search.action as string) || '',
      question: (search.question as string) || ''
    };
  },
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
  const { topic, source, action, question } = useSearch({ from: '/dashboard/learning/' });
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

  // Handle AI recommendations
  useEffect(() => {
    if (source === 'ai_recommendation') {
      if (action === 'create_course' && topic) {
        // Auto-trigger AI course creation with topic
        setSelectedPrompt(`Create a course about ${topic}`);
        setShowAICoach(true);
      } else if (question) {
        // Auto-fill AI chat with question
        setSelectedPrompt(`Help me understand: ${question}`);
        setShowAICoach(true);
      }
    }
  }, [source, action, topic, question]);

  const filteredCourses = activeTab === 'all' 
    ? allCourses 
    : allCourses.filter(course => 
        activeTab === 'personalized' ? course.type === 'personalized' : course.type === 'essential'
      );

  // Animation variants
  const pageVariants: Variants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { duration: 0.5, staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  const courseCardVariants: Variants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3 }
    },
    hover: {
      scale: 1.02,
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.div 
      className="min-h-screen"
   
    >
      {/* AI Recommendation Context */}
      {source === 'ai_recommendation' && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <FontAwesomeIcon icon={faRobot} className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                Your AI coach recommended learning about <strong>{topic}</strong> to help with your financial goals.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modern Hero Section with Stats */}
      <motion.section 
        className="relative px-4 py-8 mb-8 overflow-hidden"
        variants={itemVariants}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 dark:from-violet-400/10 via-purple-600/5 dark:via-purple-400/10 to-indigo-600/5 dark:to-indigo-400/10 rounded-3xl" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400/10 dark:bg-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/10 dark:bg-indigo-400/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Welcome Section */}
            <div className="flex-1">
              <motion.div
        
              >
                <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                  <span className="bg-gradient-to-r from-violet-600 dark:from-violet-400 via-purple-600 dark:via-purple-400 to-indigo-600 dark:to-indigo-400 bg-clip-text text-transparent">
                    Welcome back, {user?.user_metadata?.full_name || 'Learner'}
                  </span>
                  <motion.span
                    className="inline-block ml-3"
                    animate={{ rotate: [0, 20, 0] }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 3 }}
                  >
                    👋
                  </motion.span>
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                  Continue your journey to financial mastery with AI-powered and expert-crafted courses.
                </p>
                
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3">
                  <motion.button
                    onClick={() => setShowAICoach(true)}
                    className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-purple-600/20 dark:shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-600/30 dark:hover:shadow-purple-500/40 transition-all duration-300"
                  >
                    <FontAwesomeIcon icon={faWandSparkles} className="h-5 w-5" />
                    <span>Create AI Course</span>
                    <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
                  </motion.button>
                  
                  {aiCourses.length > 0 && (
                    <Link
                      to={`/dashboard/learning/${aiCourses[0].course_id}`}
                      className="group flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:border-purple-300 dark:hover:border-purple-400 hover:text-purple-700 dark:hover:text-purple-400 transition-all duration-300"
                    >
                      <FontAwesomeIcon icon={faCirclePlay} className="h-5 w-5" />
                      <span>Resume Learning</span>
                    </Link>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Compact Metrics Bar */}
            <motion.div 
              className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-lg"
              variants={itemVariants}
            >
              <div className="flex items-center justify-between gap-6 overflow-x-auto">
                {/* Streak Metric */}
                <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center shadow-md">
                    <FontAwesomeIcon icon={faFire} className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-foreground dark:text-dark-foreground">{learningStats.streak}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Day Streak</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-600 flex-shrink-0" />

                {/* XP Metric */}
                <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center shadow-md">
                    <FontAwesomeIcon icon={faTrophy} className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-foreground dark:text-dark-foreground">{learningStats.totalXP}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Total XP</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-600 flex-shrink-0" />

                {/* Courses Metric */}
                <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center shadow-md">
                    <FontAwesomeIcon icon={faBookOpen} className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-foreground dark:text-dark-foreground">{learningStats.totalCourses}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Courses</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-600 flex-shrink-0" />

                {/* Lessons Metric */}
                <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
                    <FontAwesomeIcon icon={faChartLine} className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-foreground dark:text-dark-foreground">{learningStats.completedLessons}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Lessons Done</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Modern Tab Navigation */}
      <motion.div 
        className="px-4 mb-8"
        variants={itemVariants}
      >
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-gray-100 dark:border-gray-700">
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
                    flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-300
                    ${activeTab === tab.id 
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <FontAwesomeIcon icon={tab.icon} className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
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
                        h-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border
                        ${course.type === 'essential' 
                          ? 'border-emerald-200 dark:border-emerald-700 hover:border-emerald-300 dark:hover:border-emerald-600' 
                          : 'border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600'
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
                              <h3 className="text-lg font-bold text-foreground dark:text-dark-foreground line-clamp-2 mb-2">
                                {course.title}
                              </h3>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
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
                                    className={`h-full ${
                                      course.type === 'essential' 
                                        ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                                        : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                                    }`}
                                    initial={{ width: 0 }}
                                    animate={{ 
                                      width: `${progressPercentage}%` 
                                    }}
                                    transition={{ duration: 1, delay: 0.5 }}
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
                 <FinancialEducatorChatInterface 
                    initialPrompt={selectedPrompt}
                    onPromptUsed={() => setSelectedPrompt(null)}
                  />
                 </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>, document.body)
      }
    </motion.div>
  );
}