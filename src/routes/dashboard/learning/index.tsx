"use client";

import { useAuth } from "@/contexts/auth-context";
import { useUserCourses } from "@/services/course-service";
import { useCompletedLessons } from "@/hooks/useCompletedLessons";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useState, useMemo } from "react";
// Clean design with minimal Lucide icons
import { useFinancialHealthProfile } from "@/hooks/use-financial-health-profile";
import basicCourse from "@/data/basic-lessons.json";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { FinancialEducatorChatInterface } from "@/components/chat/financial-educator-chat-interface";
import { createPortal } from "react-dom";
import { useGamification } from "@/hooks/use-gamification";
import { FinancialGlassMetricsPanel } from "@/components/shared/FinancialGlassMetricsPanel";
import { DashboardHeroSection } from "@/components/shared/DashboardHeroSection";
import { useAIChat } from "@/contexts/ai-chat-context";
import {
  Book,
  GraduationCap,
  Plus,
  Play,
  MessageCircle,
  Sparkles,
  Flame,
  Star,
  Trophy,
} from "lucide-react";
import React from "react";

export const Route = createFileRoute("/dashboard/learning/")({
  component: UnifiedLearningPage,
  head: () => {
    const canonicalUrl = getCanonicalUrl("/dashboard/learning/");
    const title =
      "Finance Learning Hub - AI Courses & Expert Education | Moneko";
    const description =
      "Comprehensive financial education with AI courses & expert fundamentals. Master budgeting, investing & wealth building.";
    const keywords =
      "financial education, personal finance courses, AI learning, investment education, financial literacy, money management, budgeting courses, retirement planning, wealth building education, personalized learning";

    const meta = seo({
      title,
      description,
      keywords,
      image: "https://moneko.io/og-img.png",
      url: canonicalUrl,
    });

    // Comprehensive structured data for educational platform
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Course",
          "@id": `${canonicalUrl}#course`,
          name: "Personal Finance Mastery Program",
          description:
            "Comprehensive financial education program combining expert-led fundamentals with AI-personalized advanced courses",
          provider: {
            "@type": "EducationalOrganization",
            "@id": "https://moneko.io#organization",
            name: "Moneko",
            description:
              "AI-powered personal finance education platform founded by CFA charterholder Sabina Shao",
            url: "https://moneko.io",
            logo: "https://moneko.io/og-img.png",
            founder: {
              "@type": "Person",
              name: "Sabina Shao",
              jobTitle: "CEO & Financial Education Expert",
              hasCredential: "CFA Charterholder",
              knowsAbout: [
                "Personal Finance",
                "Investment Strategy",
                "Financial Planning",
                "Wealth Building",
              ],
              yearsOfExperience: "10+",
            },
            sameAs: [
              "https://x.com/moneko_ai",
              "https://linkedin.com/company/moneko-ai",
            ],
          },
          courseMode: ["online", "self-paced", "ai-personalized"],
          educationalLevel: "beginner to advanced",
          teaches: [
            "Personal Finance Fundamentals",
            "Budgeting and Expense Tracking",
            "Investment Strategies",
            "Retirement Planning",
            "Risk Management",
            "Wealth Building",
            "Financial Goal Setting",
            "Tax Optimization",
          ],
          learningResourceType: [
            "Interactive Course",
            "AI Tutoring",
            "Practical Exercises",
            "Real-time Feedback",
          ],
          timeRequired: "PT2H",
          totalTime: "PT20H",
          educationalCredentialAwarded: "Financial Literacy Certificate",
          coursePrerequisites: "None - suitable for all levels",
        },
        {
          "@type": "EducationalOrganization",
          "@id": "https://moneko.io#organization",
          name: "Moneko",
          alternateName: "Moneko Financial Education",
          description:
            "Leading AI-powered personal finance education platform providing comprehensive courses, calculators, and portfolio tracking",
          url: "https://moneko.io",
          logo: {
            "@type": "ImageObject",
            url: "https://moneko.io/og-img.png",
            width: "1200",
            height: "630",
          },
          image: "https://moneko.io/og-img.png",
          foundingDate: "2024",
          areaServed: [
            "United States",
            "Canada",
            "United Kingdom",
            "Australia",
          ],
          educationalCredentialAwarded: [
            "Financial Literacy Certificate",
            "Investment Fundamentals Certificate",
            "Retirement Planning Certificate",
          ],
          hasOfferingCatalog: {
            "@type": "OfferingCatalog",
            name: "Personal Finance Education Catalog",
            itemListElement: [
              {
                "@type": "Course",
                name: "Financial Fundamentals Essentials",
                description:
                  "Expert-crafted course covering budgeting, saving, and basic investing",
                courseMode: "online",
                educationalLevel: "beginner",
              },
              {
                "@type": "Course",
                name: "AI-Personalized Investment Course",
                description:
                  "Tailored investment education based on your goals and risk tolerance",
                courseMode: "online",
                educationalLevel: "intermediate",
              },
            ],
          },
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "support@moneko.io",
            availableLanguage: "English",
          },
          sameAs: [
            "https://x.com/moneko_ai",
            "https://linkedin.com/company/moneko-ai",
          ],
        },
        {
          "@type": "WebApplication",
          "@id": `${canonicalUrl}#webapp`,
          name: "Moneko Learning Platform",
          description:
            "Interactive financial education platform with AI-powered personalized learning",
          url: canonicalUrl,
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web Browser",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            validFrom: "2024-01-01",
          },
          featureList: [
            "AI-Personalized Course Creation",
            "Expert-Led Financial Fundamentals",
            "Interactive Learning Modules",
            "Progress Tracking and Gamification",
            "Financial Health Assessment",
            "Goal-Based Learning Paths",
            "Real-time AI Tutoring",
            "Achievement System",
          ],
          screenshot: "https://moneko.io/og-img.png",
          softwareVersion: "2.0",
          applicationSubCategory: "Financial Education",
          audience: {
            "@type": "Audience",
            audienceType: [
              "Students",
              "Young Professionals",
              "Parents",
              "Retirees",
              "Entrepreneurs",
            ],
          },
        },
        {
          "@type": "ItemList",
          "@id": `${canonicalUrl}#features`,
          name: "Learning Platform Features",
          description:
            "Comprehensive features of Moneko's financial education platform",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              item: {
                "@type": "Service",
                name: "AI-Personalized Courses",
                description:
                  "Custom courses created by AI based on your financial goals and knowledge level",
              },
            },
            {
              "@type": "ListItem",
              position: 2,
              item: {
                "@type": "Service",
                name: "Expert-Led Essentials",
                description:
                  "Professionally crafted fundamental courses covering all personal finance basics",
              },
            },
            {
              "@type": "ListItem",
              position: 3,
              item: {
                "@type": "Service",
                name: "Interactive Learning",
                description:
                  "Engaging lessons with quizzes, exercises, and real-time AI assistance",
              },
            },
            {
              "@type": "ListItem",
              position: 4,
              item: {
                "@type": "Service",
                name: "Progress Gamification",
                description:
                  "Streak tracking, XP points, achievements, and learning challenges",
              },
            },
            {
              "@type": "ListItem",
              position: 5,
              item: {
                "@type": "Service",
                name: "Adaptive Learning",
                description:
                  "Content difficulty adjusts based on your comprehension and pace",
              },
            },
          ],
        },
      ],
    };

    // GEO-Optimized FAQ Schema for Learning Platform
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does Moneko's AI-personalized learning work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Moneko's AI analyzes your financial goals, experience level, and learning preferences to create custom courses tailored specifically for you. The AI draws from content created and reviewed by CFA charterholder Sabina Shao and certified financial experts to ensure accuracy and quality.",
          },
        },
        {
          "@type": "Question",
          name: "What makes Moneko's financial education different from other platforms?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Moneko combines expert-designed foundational courses by CFA charterholder Sabina Shao with AI-powered personalized learning paths. This unique approach ensures you get both proven financial education principles and content customized to your specific situation and goals.",
          },
        },
        {
          "@type": "Question",
          name: "Can I trust Moneko's financial advice and education?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Moneko provides education and guidance, not professional financial advice. Our learning content is based on well-known financial principles and is designed to help you build financial literacy and make more informed decisions.",
          },
        },
        {
          "@type": "Question",
          name: "How do the expert-designed essentials courses compare to AI courses?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Expert essentials courses provide foundational knowledge created by CFA charterholder Sabina Shao, covering universal financial principles. AI personalized courses build on these fundamentals with content tailored to your specific goals, timeline, and risk tolerance.",
          },
        },
      ],
    };

    return {
      meta,
      links: [
        {
          rel: "canonical",
          href: canonicalUrl,
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(faqSchema),
        },
      ],
    };
  },
});

export function UnifiedLearningPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "all" | "personalized" | "essentials"
  >("all");
  const { openChat } = useAIChat();
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const { gamificationData } = useGamification();

  const {
    data: aiCourses = [],
    isLoading: isAICoursesLoading,
    isError: isAICoursesError,
  } = useUserCourses(user?.id ?? "", {
    enabled: !!user,
    source: "remote",
  });

  // Get completed lessons data using the same method as other pages
  const { data: completedLessons = [], isLoading: isLoadingCompleted } =
    useCompletedLessons(user?.id);

  const { profile: financialProfile, hasProfile } = useFinancialHealthProfile(
    user?.id,
  );

  // Learning prompts organized by category (simplified for clean design)
  const promptCategories = [
    {
      title: "Getting Started",
      prompts: [
        "Help me choose the right course to start with",
        "Explain budgeting fundamentals",
        "What should I learn first?",
      ],
    },
    {
      title: "Advanced Topics",
      prompts: [
        "Create a custom lesson about investing",
        "Teach me about retirement planning",
        "Help me understand investment risks",
      ],
    },
    {
      title: "Personalized Learning",
      prompts: [
        "Create a personalized learning path",
        "Create lessons based on my financial goals",
        "Generate practice questions for financial planning",
      ],
    },
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
      totalXP: allCourses.reduce(
        (acc, course) =>
          acc +
          course.lessons.reduce((xpAcc, lesson) => xpAcc + (lesson.xp || 0), 0),
        0,
      ),
      earnedXP: gamificationData.xp,
      streak: gamificationData.streak,
    };
  }, [aiCourses, completedLessons, isLoadingCompleted, gamificationData]);

  // Combine all courses for unified view
  const allCourses = [
    {
      ...basicCourse,
      type: "essential",
      difficulty: "Beginner",
      duration: "2-3 hours",
      students: "10k+",
    },
    ...aiCourses.map((course) => ({
      ...course,
      type: "personalized",
      difficulty: "Adaptive",
      duration:
        course.lessons.length < 3
          ? "~30 mins"
          : course.lessons.length < 6
            ? "~1 hour"
            : course.lessons.length < 9
              ? "~2 hours"
              : "~3 hours",
      students: "Just for you",
    })),
  ];

  const filteredCourses =
    activeTab === "all"
      ? allCourses
      : allCourses.filter((course) =>
          activeTab === "personalized"
            ? course.type === "personalized"
            : course.type === "essential",
        );

  // Subtle Apple-inspired animation variants
  const pageVariants: Variants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.4,
        staggerChildren: 0.06,
        ease: [0.25, 0.46, 0.45, 0.94], // Apple easing
      },
    },
  };

  const itemVariants: Variants = {
    initial: { opacity: 0, y: 12 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94], // Apple easing
      },
    },
  };

  const courseCardVariants: Variants = {
    initial: { opacity: 0, y: 16 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94], // Apple easing
      },
    },
    hover: {
      y: -4, // Subtle hover lift
      transition: {
        duration: 0.2,
        ease: [0.25, 0.46, 0.45, 0.94], // Apple easing
      },
    },
  };

  return (
    <motion.div
      className="min-h-screen"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Clean Apple-inspired Header */}
      <motion.div
        className="mb-8 px-4 py-6 sm:mb-12 sm:px-6 sm:py-12 md:mb-16 md:px-8 md:py-16"
        variants={itemVariants}
      >
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="text-foreground mb-3 text-3xl font-light tracking-tight sm:mb-4 sm:text-4xl md:mb-6 md:text-5xl lg:text-6xl">
            Master Your Financial Future
          </h1>
          <p className="text-muted-foreground mx-auto mb-6 max-w-3xl text-base leading-relaxed sm:mb-8 sm:text-lg md:mb-12 md:text-xl">
            Build wealth through expert-led essentials and personalized AI
            courses. From budgeting basics to advanced investing strategies.
          </p>

          {/* Action buttons */}
          <div className="mb-8 flex flex-col items-center justify-center gap-3 px-4 sm:mb-12 sm:flex-row sm:gap-6 sm:px-0 md:mb-16">
            <button
              onClick={() => {
                const nextCourse =
                  learningStats.completedLessons === 0
                    ? `/dashboard/learning/${basicCourse.course_id}`
                    : aiCourses.length > 0
                      ? `/dashboard/learning/${aiCourses[0].course_id}`
                      : `/dashboard/essentials`;
                navigate({ to: nextCourse });
              }}
              className="bg-primary text-primary-foreground w-full rounded-full px-6 py-3 text-base font-medium transition-opacity duration-200 hover:opacity-90 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
            >
              Start Learning Path
            </button>
            <button
              onClick={() => openChat("educator")}
              className="border-border bg-card text-card-foreground hover:bg-muted/50 w-full rounded-full border px-6 py-3 text-base font-medium transition-colors duration-200 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
            >
              Create AI Course
            </button>
          </div>

          {/* Stats Grid - Clean Design */}
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 px-4 sm:grid-cols-4 sm:gap-6 sm:px-0 md:gap-8">
            <div className="text-center">
              <div className="mb-1 text-2xl font-light text-orange-600 sm:mb-2 sm:text-3xl md:text-4xl dark:text-orange-400">
                {learningStats.streak}
              </div>
              <div className="text-muted-foreground text-xs sm:text-sm">
                Learning Streak
              </div>
            </div>
            <div className="text-center">
              <div className="mb-1 text-2xl font-light text-green-600 sm:mb-2 sm:text-3xl md:text-4xl dark:text-green-400">
                {learningStats.completedLessons}
              </div>
              <div className="text-muted-foreground text-xs sm:text-sm">
                Lessons Complete
              </div>
            </div>
            <div className="text-center">
              <div className="mb-1 text-2xl font-light text-blue-600 sm:mb-2 sm:text-3xl md:text-4xl dark:text-blue-400">
                {Math.round(
                  (learningStats.completedLessons /
                    Math.max(learningStats.totalCourses * 5, 1)) *
                    100,
                )}
                %
              </div>
              <div className="text-muted-foreground text-xs sm:text-sm">
                Progress
              </div>
            </div>
            <div className="text-center">
              <div className="mb-1 text-2xl font-light text-purple-600 sm:mb-2 sm:text-3xl md:text-4xl dark:text-purple-400">
                {learningStats.earnedXP.toLocaleString()}
              </div>
              <div className="text-muted-foreground text-xs sm:text-sm">
                Skills XP
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Clean Tab Navigation */}
      <motion.div
        className="mb-6 px-4 sm:mb-8 sm:px-6 md:mb-12 md:px-8"
        variants={itemVariants}
      >
        <div className="mx-auto max-w-7xl">
          <div className="bg-muted/30 flex rounded-xl p-1.5 sm:rounded-2xl sm:p-2">
            {[
              { id: "all", label: "All Courses" },
              { id: "personalized", label: "AI Personalized" },
              { id: "essentials", label: "Essentials" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`min-h-[44px] flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 sm:rounded-xl sm:px-4 sm:py-3 sm:text-base md:px-6 ${
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                } `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Course Grid */}
      <motion.section
        className="mb-8 px-4 sm:mb-12 sm:px-6 md:mb-16 md:px-8"
        variants={itemVariants}
      >
        <div className="mx-auto max-w-7xl">
          {isAICoursesLoading && activeTab !== "essentials" ? (
            <div className="flex justify-center py-12 sm:py-20">
              <div className="border-muted border-t-primary h-8 w-8 animate-spin rounded-full border-2" />
            </div>
          ) : filteredCourses.length === 0 ? (
            <motion.div
              className="px-4 py-12 text-center sm:py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="bg-muted/30 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl sm:mb-8 sm:h-24 sm:w-24 sm:rounded-3xl">
                <Plus className="text-muted-foreground h-10 w-10 sm:h-12 sm:w-12" />
              </div>
              <h3 className="text-foreground mb-3 text-xl font-light sm:mb-4 sm:text-2xl">
                No courses yet
              </h3>
              <p className="text-muted-foreground mx-auto mb-6 max-w-md text-sm leading-relaxed sm:mb-8 sm:text-base">
                Start your learning journey by creating your first AI-powered
                course!
              </p>
              <button
                onClick={() => openChat("educator")}
                className="bg-primary text-primary-foreground w-full rounded-full px-6 py-3 font-medium transition-opacity duration-200 hover:opacity-90 sm:w-auto sm:px-8"
              >
                Create Your First Course
              </button>
            </motion.div>
          ) : (
            <>
              {/* Mobile: Compact List View - Hidden on sm and up */}
              <div className="space-y-3 sm:hidden">
                <AnimatePresence mode="popLayout">
                  {filteredCourses.map((course, index) => (
                    <motion.div
                      key={course.course_id}
                      variants={courseCardVariants}
                      initial="initial"
                      animate="animate"
                      exit={{ opacity: 0, y: 20 }}
                      layout
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={`/dashboard/learning/${course.course_id}`}
                        className="block"
                      >
                        <div className="bg-card hover:bg-muted/20 overflow-hidden rounded-2xl p-4 transition-colors duration-200">
                          {/* Compact horizontal layout */}
                          <div className="flex items-start gap-3">
                            {/* Icon and badge */}
                            <div className="flex-shrink-0">
                              <div className="mb-2 text-3xl">
                                {course.icon || "📚"}
                              </div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                                  course.type === "essential"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                } `}
                              >
                                {course.type === "essential" ? "Expert" : "AI"}
                              </span>
                            </div>

                            {/* Content */}
                            <div className="min-w-0 flex-1">
                              <h3 className="text-foreground mb-1 line-clamp-2 text-base font-medium">
                                {course.title}
                              </h3>
                              <p className="text-muted-foreground mb-2 line-clamp-2 text-xs">
                                {course.description}
                              </p>

                              {/* Progress bar */}
                              {(() => {
                                const courseCompletedLessons =
                                  completedLessons.filter((cl) =>
                                    course.lessons.some(
                                      (lesson: any) =>
                                        lesson.id === cl.lesson_id,
                                    ),
                                  );
                                const completedCount =
                                  courseCompletedLessons.length;
                                const totalCount = course.lessons.length;
                                const progressPercentage =
                                  totalCount > 0
                                    ? (completedCount / totalCount) * 100
                                    : 0;

                                return (
                                  <div className="mb-2">
                                    <div className="text-muted-foreground mb-1 flex justify-between text-xs">
                                      <span>
                                        {completedCount}/{totalCount} lessons
                                      </span>
                                      <span>{course.duration}</span>
                                    </div>
                                    <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
                                      <motion.div
                                        className={`h-full rounded-full ${
                                          course.type === "essential"
                                            ? "bg-green-600"
                                            : "bg-purple-600"
                                        }`}
                                        initial={{ width: 0 }}
                                        animate={{
                                          width: `${progressPercentage}%`,
                                        }}
                                        transition={{
                                          duration: 0.8,
                                          delay: 0.3,
                                          ease: [0.25, 0.46, 0.45, 0.94],
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Play button */}
                            <div className="flex-shrink-0">
                              <div
                                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                  course.type === "essential"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                } `}
                              >
                                <Play className="h-4 w-4" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}

                  {/* Add New Course - Compact Mobile */}
                  {activeTab !== "essentials" && (
                    <motion.div
                      variants={courseCardVariants}
                      initial="initial"
                      animate="animate"
                      onClick={() => openChat("educator")}
                      className="cursor-pointer"
                    >
                      <div className="bg-muted/20 hover:bg-muted/30 border-muted rounded-2xl border-2 border-dashed p-4 transition-colors duration-200 hover:border-purple-400/50">
                        <div className="flex items-center gap-3">
                          <div className="bg-card flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl">
                            <Plus className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-foreground mb-0.5 text-base font-medium">
                              Create New Course
                            </h3>
                            <p className="text-muted-foreground text-xs">
                              AI-tailored to your goals
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Desktop: Card Grid View - Hidden below sm */}
              <div className="hidden gap-6 sm:grid sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {filteredCourses.map((course, index) => (
                    <motion.div
                      key={course.course_id}
                      variants={courseCardVariants}
                      initial="initial"
                      animate="animate"
                      exit={{ opacity: 0, y: 20 }}
                      whileHover="hover"
                      layout
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={`/dashboard/learning/${course.course_id}`}
                        className="block h-full"
                      >
                        <div className="bg-card hover:bg-muted/20 group h-full overflow-hidden rounded-2xl p-6 transition-colors duration-200 sm:rounded-3xl sm:p-8">
                          {/* Course Header */}
                          <div className="mb-6">
                            <div className="mb-4 flex items-center gap-3">
                              <div className="text-2xl">
                                {course.icon || "📚"}
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                  course.type === "essential"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                } `}
                              >
                                {course.type === "essential"
                                  ? "Expert-Led"
                                  : "AI-Powered"}
                              </span>
                            </div>

                            <h3 className="text-foreground group-hover:text-foreground/80 mb-3 text-xl font-medium transition-colors duration-200">
                              {course.title}
                            </h3>

                            <p className="text-muted-foreground line-clamp-3 leading-relaxed">
                              {course.description}
                            </p>
                          </div>

                          {/* Course Info */}
                          <div className="space-y-6">
                            {/* Progress Bar (for all courses) */}
                            {(() => {
                              // Calculate course-specific completion using consistent logic
                              const courseCompletedLessons =
                                completedLessons.filter((cl) =>
                                  course.lessons.some(
                                    (lesson: any) => lesson.id === cl.lesson_id,
                                  ),
                                );
                              const completedCount =
                                courseCompletedLessons.length;
                              const totalCount = course.lessons.length;
                              const progressPercentage =
                                totalCount > 0
                                  ? (completedCount / totalCount) * 100
                                  : 0;

                              return (
                                <div>
                                  <div className="text-muted-foreground mb-2 flex justify-between text-sm">
                                    <span>Progress</span>
                                    <span>
                                      {completedCount}/{totalCount} lessons
                                    </span>
                                  </div>
                                  <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
                                    <motion.div
                                      className={`h-full rounded-full ${
                                        course.type === "essential"
                                          ? "bg-green-600"
                                          : "bg-purple-600"
                                      }`}
                                      initial={{ width: 0 }}
                                      animate={{
                                        width: `${progressPercentage}%`,
                                      }}
                                      transition={{
                                        duration: 0.8,
                                        delay: 0.3,
                                        ease: [0.25, 0.46, 0.45, 0.94],
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Course Meta */}
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <p className="text-muted-foreground mb-1 text-xs">
                                  Difficulty
                                </p>
                                <p className="text-foreground text-sm font-medium">
                                  {course.difficulty}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-1 text-xs">
                                  Duration
                                </p>
                                <p className="text-foreground text-sm font-medium">
                                  {course.duration}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground mb-1 text-xs">
                                  Students
                                </p>
                                <p className="text-foreground text-sm font-medium">
                                  {course.students}
                                </p>
                              </div>
                            </div>

                            {/* CTA Button */}
                            <button
                              className={`flex w-full items-center justify-center gap-2 rounded-full py-4 font-medium transition-colors duration-200 ${
                                course.type === "essential"
                                  ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/40"
                                  : "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/40"
                              } `}
                            >
                              {course.type === "personalized" &&
                              course.lessons.some((l: any) => l.unlocked) ? (
                                <>
                                  <Play className="h-4 w-4" />
                                  Continue Learning
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4" />
                                  Start Course
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}

                  {/* Add New Course Card - Desktop */}
                  {activeTab !== "essentials" && (
                    <motion.div
                      variants={courseCardVariants}
                      initial="initial"
                      animate="animate"
                      whileHover="hover"
                      onClick={() => openChat("educator")}
                      className="cursor-pointer"
                    >
                      <div className="bg-muted/20 hover:bg-muted/30 border-muted flex h-full items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-colors duration-200 hover:border-purple-400/50 sm:rounded-3xl sm:p-8">
                        <div className="text-center">
                          <motion.div
                            className="bg-card mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Plus className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                          </motion.div>
                          <h3 className="text-foreground mb-3 text-lg font-medium">
                            Create New Course
                          </h3>
                          <p className="text-muted-foreground leading-relaxed">
                            Let AI design a course tailored to your goals
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </motion.section>

      {/* AI Coach Floating Button (Mobile) - Clean Design */}
      <motion.button
        onClick={() => openChat("educator")}
        className="fixed right-6 bottom-6 z-40 flex h-14 min-h-[44px] w-14 min-w-[44px] items-center justify-center rounded-full bg-purple-600 text-white shadow-lg lg:hidden"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          delay: 0.5,
          duration: 0.3,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <MessageCircle className="h-6 w-6" />
      </motion.button>
    </motion.div>
  );
}
