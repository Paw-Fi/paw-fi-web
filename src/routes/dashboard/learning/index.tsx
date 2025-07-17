"use client";

import { useAuth } from "@/contexts/auth-context";
import { useUserCourses, CourseDataSource } from "@/services/course-service";
import { Link, createFileRoute } from "@tanstack/react-router";
import { motion, Variants } from "framer-motion";
import { EmptyStatePrompt } from "@/components/ui/empty-state-prompt";

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
  const {
    data: courses = [],
    isLoading,
    isError,
    error,
  } = useUserCourses(user?.id ?? "", { 
    enabled: !!user,
    source: dataSource 
  });
  
  // Define animation variants for cards
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
              <EmptyStatePrompt type="courses" />
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
    </div>
  );
}
