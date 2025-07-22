"use client";

import { useAuth } from "@/contexts/auth-context";
import { useUserCourses } from "@/services/course-service";
import { Link, createFileRoute } from "@tanstack/react-router";
import { motion, Variants } from "framer-motion";
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faGraduationCap, 
  faRobot, 
  faComments, 
  faChevronDown, 
  faChevronUp,
  faBrain,
  faMagicWandSparkles,
  faBullseye,
  faWandMagicSparkles,
  faBookOpen
} from '@fortawesome/free-solid-svg-icons';
import { FinancialAdvisorChatInterface } from '@/components/chat/financial-advisor-chat-interface';
import { useFinancialHealthProfile } from '@/hooks/use-financial-health-profile';
import basicCourse from '@/data/basic-lessons.json';
import { seo } from "@/utils/seo";
import { FinancialEducatorChatInterface } from "@/components/chat/financial-educator-chat-interface";

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
  const [showLearningAI, setShowLearningAI] = useState(false);
  
  const {
    data: aiCourses = [],
    isLoading: isAICoursesLoading,
    isError: isAICoursesError,
  } = useUserCourses(user?.id ?? "", { 
    enabled: !!user,
    source: 'remote' 
  });
  
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
  const learningProgress = aiCourses.length > 0 ? {
    totalCourses: aiCourses.length,
    totalLessons: aiCourses.reduce((acc, course) => acc + course.lessons.length, 0),
    completedLessons: aiCourses.reduce((acc, course) => 
      acc + course.lessons.filter(lesson => lesson.unlocked).length, 0
    ),
    totalXP: aiCourses.reduce((acc, course) => 
      acc + course.lessons.filter(lesson => lesson.unlocked).reduce((xpAcc, lesson) => xpAcc + (lesson.xp || 0), 0), 0
    ),
  } : null;
  
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

  const sectionVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="px-4 py-12">
  

      {/* Financial Essentials Section */}
      <motion.section 
        className="mb-16"
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-lg">
                <FontAwesomeIcon icon={faGraduationCap} className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-emerald-800">Financial Essentials</h2>
                <p className="text-sm text-emerald-600 font-medium">Expert-Led Fundamentals</p>
              </div>
            </div>
          </div>
          <p className="text-center text-gray-600 max-w-2xl mx-auto">
            🎓 Master the fundamentals with lessons crafted by certified financial advisors. 
            These essential courses build your financial foundation step by step.
          </p>
        </div>

        <motion.div
          className="max-w-4xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={cardVariants}
            whileHover={{ y: -5, boxShadow: "0 15px 35px -5px rgba(16, 185, 129, 0.15)" }}
          >
            <Link
              to={`/dashboard/learning/${basicCourse.course_id}`}
              className="block cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 shadow-lg hover:border-emerald-300 transition-all duration-300"
            >
              <div className="p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-4xl" aria-hidden="true">
                    {basicCourse.icon || "🎓"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-emerald-900">
                        {basicCourse.title}
                      </h3>
                      <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white">
                        Expert-Led
                      </span>
                    </div>
                    <p className="text-emerald-700 mb-4">
                      {basicCourse.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between border-t border-emerald-200 pt-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <div className="bg-emerald-500 mr-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white">
                        {basicCourse.lessons.length}
                      </div>
                      <span className="text-sm text-emerald-800 font-medium">Essential Lessons</span>
                    </div>
                  </div>
                  <div className="text-sm text-emerald-600 font-medium">
                    Start Learning →
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* AI Personalized Learning Section */}
      <motion.section 
        className="mb-16"
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.2 }}
      >
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg">
                <FontAwesomeIcon icon={faRobot} className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-purple-800">AI-Personalized Learning</h2>
                <p className="text-sm text-purple-600 font-medium">Tailored to Your Goals</p>
              </div>
            </div>
          </div>
          <p className="text-center text-gray-600 max-w-2xl mx-auto">
            ✨ Courses created specifically for your financial situation, goals, and learning pace. 
            Our AI adapts as you progress and learns what works best for you.
          </p>
        </div>

        {isAICoursesLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <motion.div
            className="max-w-5xl mx-auto grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {aiCourses.length === 0 ? (
              <div className="col-span-full">
                <motion.div 
                  className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-2xl border-2 border-purple-200 shadow-lg p-8 text-center"
                  variants={cardVariants}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-6 mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg">
                    <FontAwesomeIcon icon={faWandMagicSparkles} className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-purple-900 mb-2">Ready for Personalized Learning?</h3>
                  <p className="text-purple-700 mb-6 max-w-md mx-auto">
                    Create your first AI-generated course below. Tell our Learning Coach what you want to learn!
                  </p>
                  
                  {/* Features preview */}
                  <div className="grid grid-cols-3 gap-4 text-sm mb-6">
                    <div className="flex items-center justify-center text-purple-700">
                      <FontAwesomeIcon icon={faBrain} className="h-4 w-4 mr-2" />
                      <span>Adaptive</span>
                    </div>
                    <div className="flex items-center justify-center text-indigo-700">
                      <FontAwesomeIcon icon={faMagicWandSparkles} className="h-4 w-4 mr-2" />
                      <span>Custom</span>
                    </div>
                    <div className="flex items-center justify-center text-blue-700">
                      <FontAwesomeIcon icon={faBullseye} className="h-4 w-4 mr-2" />
                      <span>Goal-Focused</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      document.getElementById('ai-coach')?.scrollIntoView({ behavior: 'smooth' });
                      setShowLearningAI(true);
                    }}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                  >
                    <FontAwesomeIcon icon={faWandMagicSparkles} className="h-5 w-5 mr-2" />
                    Create Your First Course
                  </button>
                </motion.div>
              </div>
            ) : (
              aiCourses.map((course) => (
                <motion.div
                  key={course.course_id}
                  variants={cardVariants}
                  whileHover={{ y: -5, boxShadow: "0 15px 35px -5px rgba(139, 92, 246, 0.15)" }}
                >
                  <Link
                    to={`/dashboard/learning/${course.course_id}`}
                    className="block cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 shadow-lg hover:border-purple-300 transition-all duration-300"
                  >
                    <div className="p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="text-3xl" aria-hidden="true">
                          {course.icon || "🤖"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-purple-900">
                              {course.title}
                            </h3>
                            <span className="rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-2 py-1 text-xs font-medium text-white">
                              AI-Generated
                            </span>
                          </div>
                          <p className="text-sm text-purple-700">
                            {course.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-purple-200 pt-3">
                        <div className="flex items-center">
                          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 mr-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white">
                            {course.lessons.length}
                          </div>
                          <span className="text-sm text-purple-800 font-medium">Lessons</span>
                        </div>
                        <div className="text-sm text-purple-600 font-medium">
                          Continue →
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </motion.section>

      {/* AI Learning Coach Section */}
      <motion.section 
        id="ai-coach"
        className="max-w-4xl mx-auto"
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.4 }}
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
                    Create personalized courses and get help with your financial education
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLearningAI(!showLearningAI)}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <FontAwesomeIcon icon={faComments} className="h-4 w-4 mr-2" />
                {showLearningAI ? 'Hide Coach' : 'Ask the Coach'}
                <FontAwesomeIcon 
                  icon={showLearningAI ? faChevronUp : faChevronDown} 
                  className="h-4 w-4 ml-2" 
                />
              </button>
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
                    I'll help you learn based on your progress and goals
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
                <FinancialEducatorChatInterface 
                />
            )}
          </motion.div>
        </motion.div>
      </motion.section>
    </div>
  );
}