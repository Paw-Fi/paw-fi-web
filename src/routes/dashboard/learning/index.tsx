"use client";

import { useAuth } from "@/contexts/auth-context";
import { useUserCourses, CourseDataSource } from "@/services/course-service";
import { Link, createFileRoute } from "@tanstack/react-router";
import { motion, Variants } from "framer-motion";
import { EmptyStatePrompt } from "@/components/ui/empty-state-prompt";
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faGraduationCap, 
  faRobot, 
  faComments, 
  faChevronDown, 
  faChevronUp,
  faBrain,
  faMagicWandSparkles,
  faBullseye 
} from '@fortawesome/free-solid-svg-icons';
import { ChatInterface } from '@/components/chat/chat-interface';
import { useFinancialHealthProfile } from '@/hooks/use-financial-health-profile';

// Import data from separate data file

import { seo } from "@/utils/seo";

export const Route = createFileRoute("/dashboard/learning/")({
  component: LearningPage,
  head: () => {
    const pageUrl = "https://moneko.io/learning/";
    const meta = seo({
      title: "Moneko: AI-Powered Financial Learning & Personalized Lessons",
      description:
        "Unlock your financial potential with Moneko. Our AI understands your needs to deliver personalized financial lessons, complemented by expert-written courses and powerful calculators.",
      keywords:
        "AI financial learning, personalized finance lessons, Moneko, financial education, AI finance coach, investment analysis, financial modeling, personal finance, money management, financial literacy tools",
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });
    
    // Add structured data for learning page
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Financial Education Courses",
      "description": "Expert-curated financial education courses on investing, personal finance, and money management",
      "url": pageUrl,
      "itemListElement": [
        {
          "@type": "Course",
          "name": "Your 2025 Guide to Investing",
          "description": "Learn the fundamentals of investing with practical strategies for 2025 and beyond",
          "provider": {
            "@type": "Organization",
            "name": "Moneko",
            "url": "https://moneko.io/"
          }
        },
        {
          "@type": "Course",
          "name": "Personal Finance Fundamentals",
          "description": "Master the basics of personal finance and build a strong financial foundation",
          "provider": {
            "@type": "Organization",
            "name": "Moneko",
            "url": "https://moneko.io/"
          }
        }
      ]
    };
    
    return {
      meta,
      link: [
        {
          rel: "canonical",
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

interface LearningPageProps {
  /** Data source to use for fetching courses */
  dataSource?: CourseDataSource;
}

export function LearningPage({ dataSource = 'remote' }: LearningPageProps) {
  const { user } = useAuth();
  const [showLearningAI, setShowLearningAI] = useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  
  const {
    data: courses = [],
    isLoading,
    isError,
    error,
  } = useUserCourses(user?.id ?? "", { 
    enabled: !!user,
    source: dataSource 
  });
  
  // Auto-expand AI for first-time users (no courses)
  useEffect(() => {
    if (!isLoading && courses.length === 0 && dataSource === 'remote') {
      setShowLearningAI(true);
    }
  }, [isLoading, courses.length, dataSource]);
  
  // Cycle through suggested prompts for returning users
  useEffect(() => {
    if (courses.length > 0 && !showLearningAI) {
      const interval = setInterval(() => {
        setCurrentPromptIndex((prevIndex) => (prevIndex + 1) % learningPrompts.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [courses.length, showLearningAI]);
  
  // Get user's learning context for enhanced AI responses
  const { profile: financialProfile, hasProfile } = useFinancialHealthProfile(user?.id);
  
  // Define suggested prompts
  const learningPrompts = [
    "Create a custom lesson about investing",
    "Help me choose the right course to start with",
    "Explain budgeting fundamentals", 
    "Generate practice questions for financial planning",
    "Create a personalized learning path",
    "Teach me about retirement planning",
    "Help me understand investment risks",
    "Create lessons based on my financial goals"
  ];
  
  // Calculate overall learning progress across all courses
  const learningProgress = courses.length > 0 ? {
    totalCourses: courses.length,
    totalLessons: courses.reduce((acc, course) => acc + course.lessons.length, 0),
    completedLessons: courses.reduce((acc, course) => 
      acc + course.lessons.filter(lesson => lesson.unlocked).length, 0
    ),
    totalXP: courses.reduce((acc, course) => 
      acc + course.lessons.filter(lesson => lesson.unlocked).reduce((xpAcc, lesson) => xpAcc + (lesson.xp || 0), 0), 0
    ),
  } : null;

  // Create context-aware initial message for learning AI
  const getInitialMessage = () => {
    // Special message for first-time users
    if (courses.length === 0 && dataSource === 'remote') {
      return "Welcome to your Learning Hub! I'm your AI Coach.\\n\\nIt looks like you don't have any courses yet. We can fix that right now!\\n\\nTell me what you want to learn about, or select a prompt below to create your first personalized course.";
    }
    
    let contextMessage = "Hello! I'm your AI Learning Coach. I create personalized financial lessons and help you with any learning questions.";
    
    if (learningProgress) {
      contextMessage += `\\n\\nI can see you've completed ${learningProgress.completedLessons} out of ${learningProgress.totalLessons} lessons across ${learningProgress.totalCourses} courses and earned ${learningProgress.totalXP} XP. `;
    }
    
    if (hasProfile && financialProfile) {
      const priorities = financialProfile.profile_data.goals_and_timeline.financial_priorities;
      if (priorities.length > 0) {
        contextMessage += `Based on your financial priorities (${priorities.slice(0, 2).join(', ')}), `;
      }
      contextMessage += "I can create lessons that match your specific situation and goals.";
    }
    
    contextMessage += `\\n\\nWhat would you like to learn about today? I can create custom lessons, explain financial concepts, or help you choose the right course!`;
    return contextMessage;
  };
  
  // Define animation variants for cards
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1
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


  if (isLoading) {
    return (
      <div className="px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-bold">Your Personalized Courses</h1>
          <p className="mx-auto max-w-md text-gray-600">
            Choose a course to continue learning. You can generate more courses
            with our AI.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="course-card min-h-64 block animate-pulse transform cursor-pointer overflow-hidden rounded-2xl bg-white shadow-md transition-all"
            >
              <div className="flex h-full flex-col justify-between p-6">
                <div>
                  <div className="mb-3 flex items-center">
                    <div className="mr-3 h-10 w-10 rounded-full bg-gray-200" />
                    <div>
                      <div className="mb-2 h-5 w-32 rounded bg-gray-200" />
                      <div className="h-4 w-40 rounded bg-gray-100" />
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                  <div className="flex items-center">
                    <div className="mr-2 h-6 w-6 rounded-full bg-gray-200" />
                    <div className="h-4 w-16 rounded bg-gray-100" />
                  </div>
                  <div className="h-4 w-10 rounded bg-gray-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-red-600">
          Error loading courses:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold">
          {dataSource === 'local' ? 'Essential Financial Lessons' : 'Your Personalized Courses'}
        </h1>
        <p className="mx-auto max-w-md text-gray-600">
          {dataSource === 'local' 
            ? 'Master the fundamentals of personal finance with these essential lessons.' 
            : 'Choose a course to continue learning. You can generate more courses with our AI.'}
        </p>
      </div>
      {/* Personalization Banner for Essential Lessons */}
      {dataSource === 'local' && courses.length > 0 && (
        <motion.div 
          className="mb-8 max-w-4xl mx-auto"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-cyan-50 border border-purple-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Go Beyond the Basics</h3>
                <p className="text-gray-600 text-sm">These essentials are a great start. For a truly tailored experience, our AI Coach can create lessons based on your unique financial goals.</p>
              </div>
              <button
                onClick={() => {
                  document.getElementById('ai-coach')?.scrollIntoView({ behavior: 'smooth' });
                  setShowLearningAI(true);
                }}
                className="ml-6 flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <FontAwesomeIcon icon={faMagicWandSparkles} className="h-4 w-4 mr-2" />
                Create Custom Lesson
              </button>
            </div>
          </div>
        </motion.div>
      )}
      
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <motion.div
          className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {courses.length === 0 ? (
            dataSource === 'local' ? (
              <div className="col-span-full">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-50 via-white to-blue-50 p-12 text-center shadow-xl border border-purple-100">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-purple-200 rounded-full opacity-20 -translate-x-16 -translate-y-16"></div>
                  <div className="absolute bottom-0 right-0 w-24 h-24 bg-blue-200 rounded-full opacity-20 translate-x-12 translate-y-12"></div>
                  <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-pink-200 rounded-full opacity-10"></div>
                  
                  <div className="relative z-10">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg">
                      <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <h3 className="mb-4 text-2xl font-bold text-gray-800">Ready to Start Learning?</h3>
                    <p className="mb-8 text-lg text-gray-600 max-w-md mx-auto leading-relaxed">Essential lessons are being prepared for you. Check back soon for new content!</p>
                    <div className="mt-6 flex justify-center">
                      <div className="flex items-center space-x-2 text-purple-600">
                        <div className="animate-spin h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                        <span className="text-sm font-medium">New content coming soon...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="col-span-full">
                {/* Integrated Empty State with AI Coach */}
                <motion.div 
                  className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl border-2 border-green-200 shadow-lg overflow-hidden"
                  variants={cardVariants}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* AI-Focused Empty State Header */}
                  <div className="p-8 text-center border-b border-green-200">
                    <div className="mb-6 mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 text-white shadow-lg">
                      <FontAwesomeIcon icon={faGraduationCap} className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Start Your Learning Journey</h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">Create your first personalized course with our AI Learning Coach. Tell us what you want to learn!</p>
                    
                    {/* Features preview */}
                    <div className="grid grid-cols-3 gap-4 text-sm mb-6">
                      <div className="flex items-center justify-center text-green-700">
                        <FontAwesomeIcon icon={faBrain} className="h-3 w-3 mr-2" />
                        <span>Adaptive</span>
                      </div>
                      <div className="flex items-center justify-center text-emerald-700">
                        <FontAwesomeIcon icon={faMagicWandSparkles} className="h-3 w-3 mr-2" />
                        <span>Custom</span>
                      </div>
                      <div className="flex items-center justify-center text-teal-700">
                        <FontAwesomeIcon icon={faBullseye} className="h-3 w-3 mr-2" />
                        <span>Goal-Oriented</span>
                      </div>
                    </div>
                  </div>

                  {/* Auto-expanded Chat Interface for first-time users */}
                  <div className="h-96">
                    <ChatInterface 
                      initialQuestion={getInitialMessage()}
                      suggestedPrompts={learningPrompts}
                      assistantType="learning-coach"
                      placeholder="Tell me what you want to learn about..."
                      userProfile={hasProfile ? financialProfile : undefined}
                      learningContext={learningProgress}
                    />
                  </div>
                </motion.div>
              </div>
            )
          ) : (
            courses.map((course) => (
              <motion.div
                key={course.course_id}
                variants={cardVariants}
                whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
              >
                <Link
                  to={`/dashboard/${dataSource === 'local' ? 'essentials' : 'learning'}/${course.course_id}`}
                  className="course-card block cursor-pointer overflow-hidden rounded-2xl bg-white shadow-md"
                >
                <div className="flex h-full flex-col justify-between p-6">
                  <div>
                    <div className="mb-3 flex items-center">
                      <div className="mr-3 text-4xl" aria-hidden="true">
                        {course.icon || "📖"}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {course.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {course.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="flex items-center">
                      <div className="bg-primary mr-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white">
                        {course.lessons.length}
                      </div>
                      <span className="text-sm">Lessons</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-sm text-gray-500"></div>
                    </div>
                  </div>
                </div>
                </Link>
              </motion.div>
            ))
          )}
        </motion.div>
      )}
      
      {/* Learning AI Chat Section */}
      <motion.div 
        id="ai-coach"
        className="mt-12 max-w-4xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl border-2 border-green-200 shadow-lg overflow-hidden"
          variants={cardVariants}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
        >
          {/* Learning AI Header */}
          <div className="p-6 border-b border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 text-white shadow-md">
                  <FontAwesomeIcon icon={faGraduationCap} className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">AI Learning Coach</h3>
                  <p className="text-sm text-gray-600">
                    {dataSource === 'local' && courses.length > 0 
                      ? "Ready to create lessons tailored specifically for you?" 
                      : "Get personalized help with your financial education"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                {!showLearningAI && courses.length > 0 && dataSource === 'remote' && (
                  <motion.div 
                    key={currentPromptIndex}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.3 }}
                    className="mb-2 text-xs text-green-600 text-right max-w-48"
                  >
                    "{learningPrompts[currentPromptIndex]}"
                  </motion.div>
                )}
                <button
                  onClick={() => setShowLearningAI(!showLearningAI)}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <FontAwesomeIcon icon={faComments} className="h-4 w-4 mr-2" />
                  {showLearningAI ? 'Hide' : 'Ask the Coach'}
                  <FontAwesomeIcon 
                    icon={showLearningAI ? faChevronUp : faChevronDown} 
                    className="h-4 w-4 ml-2" 
                  />
                </button>
              </div>
            </div>
            
            {/* Features */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center text-green-700" title="Adapts to your learning pace and knowledge level">
                <FontAwesomeIcon icon={faBrain} className="h-3 w-3 mr-2" />
                <span>Adaptive Learning</span>
              </div>
              <div className="flex items-center text-emerald-700" title="Creates personalized lessons just for you">
                <FontAwesomeIcon icon={faMagicWandSparkles} className="h-3 w-3 mr-2" />
                <span>Custom Content</span>
              </div>
              <div className="flex items-center text-teal-700" title="Focuses on your specific financial goals">
                <FontAwesomeIcon icon={faBullseye} className="h-3 w-3 mr-2" />
                <span>Goal-Oriented</span>
              </div>
            </div>
          </div>

          {/* Learning Progress Panel */}
          {learningProgress && (
            <div className="px-6 py-3 bg-gradient-to-r from-green-100 via-emerald-100 to-teal-100 border-b border-green-200">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-green-800">
                  <FontAwesomeIcon icon={faRobot} className="h-4 w-4 mr-2" />
                  <span className="font-medium">
                    I'll help you learn based on your overall progress and goals
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-green-700">
                  <span>{learningProgress.totalCourses} courses</span>
                  <span>{learningProgress.completedLessons} lessons completed</span>
                  <span>{learningProgress.totalXP} XP earned</span>
                </div>
              </div>
            </div>
          )}

          {/* Chat Interface */}
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: showLearningAI ? 'auto' : 0, 
              opacity: showLearningAI ? 1 : 0 
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {showLearningAI && (
              <div className="h-96">
                <ChatInterface 
                  initialQuestion={getInitialMessage()}
                  suggestedPrompts={learningPrompts}
                  assistantType="learning-coach"
                  placeholder="Ask me to create lessons, explain concepts, or help with course selection..."
                  userProfile={hasProfile ? financialProfile : undefined}
                  learningContext={learningProgress}
                />
              </div>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
