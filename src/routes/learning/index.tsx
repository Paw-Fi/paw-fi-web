"use client";

import { useAuth } from "@/contexts/auth-context";
import { useUserCourses } from "@/services/course-service";
import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";

// Import data from separate data file

import { seo } from "@/utils/seo";

export const Route = createFileRoute("/learning/")({
  component: LearningPage,
  head: () => {
    const pageUrl = "https://moneko.io/learning/";
    const meta = seo({
      title: "Moneko: AI-Powered Financial Learning & Personalized Lessons",
      description:
        "Unlock your financial potential with Moneko. Our AI understands your needs to deliver personalized financial lessons, complemented by expert-written courses and powerful calculators.",
      keywords:
        "AI financial learning, personalized finance lessons, Moneko, financial education, AI finance coach, investment analysis, financial modeling, personal finance, money management, financial literacy tools",
      image: "https://paw-fi.app/og-img.png",
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

function LearningPage() {
  const { user } = useAuth();
  const {
    data: courses = [],
    isLoading,
    isError,
    error,
  } = useUserCourses(user?.id ?? "", { enabled: !!user });
  
  // Define animation variants for cards
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15
      }
    }
  };
  
  const cardVariants = {
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

  if (!user) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-gray-600">
          You must be logged in to view your courses.
        </p>
      </div>
    );
  }

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
        <h1 className="mb-2 text-2xl font-bold">Your Personalized Courses</h1>
        <p className="mx-auto max-w-md text-gray-600">
          Choose a course to continue learning. You can generate more courses
          with our AI.
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
            <div className="col-span-full rounded-2xl bg-white p-8 text-center shadow-md">
              <p className="mb-4 text-gray-600">
                No courses available. Chat with our AI to generate personalized
                courses.
              </p>
              <Link
                to="/chat"
                className="focus:ring-opacity-50 inline-flex items-center justify-center rounded-lg bg-purple-600 px-5 py-3 font-medium text-white transition-colors hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <svg
                  className="mr-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                Chat with AI
              </Link>
            </div>
          ) : (
            courses.map((course) => (
              <motion.div
                key={course.course_id}
                variants={cardVariants}
                whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
              >
                <Link
                  to={`/learning/${course.course_id}`}
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
