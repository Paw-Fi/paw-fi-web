"use client";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import "@/types/route-types"; // Import route type definitions
import React, { useState, useRef } from "react";
import {
  motion,
  useAnimation,
} from "framer-motion";
import Lottie from "lottie-react";
import aiChatAnimation from "@/assets/videos/AI-Chat.json";
import badgeUnlockAnimation from "@/assets/videos/Badge-Unlock.json";

import {
  fadeInUp,
  fadeInDown,
  elasticScale,
  staggerContainer,
  fadeIn,
} from "@/lib/motion-variants";
import { Button } from "@/components/ui/button";
import catCoin from "@/assets/images/icon.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faPlus,
  faX,
  faLightbulb,
  faPaperPlane,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import { seo } from "@/utils/seo";
import basicLessonsData from "@/data/basic-lessons.json";
import faqData from "@/data/home/home-faq.json";
import AmbientHalo from "../components/ui/ambient-halo";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => {
    const title = "Moneko – Learn How to Save and Start Investing | Beginner-Friendly Finance App";
    const description =
      "Moneko is a free, beginner-friendly app that helps you build good money habits through fun, interactive lessons in saving, budgeting, and investing";
    const keywords =
      "financial education, personal finance, money management, investing, saving, budgeting, financial literacy, free financial tools, Moneko";
    const imageUrl = "https://paw-fi.app/og-img.png";
    const pageUrl = "https://pawfi.app/";

    const meta = seo({
      title: title,
      description: description,
      keywords: keywords,
      image: imageUrl,
      url: pageUrl,
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          name: "Moneko",
          url: pageUrl,
          logo: `${pageUrl}icon.svg`, // Assuming icon.svg is served from root
        },
        {
          "@type": "WebSite",
          name: "Moneko",
          url: pageUrl,
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "What is Moneko?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Moneko is an online platform dedicated to making financial education accessible and engaging. We offer AI-driven personalized learning, expert-led courses, and practical financial tools to help you master personal finance, investing, budgeting, and more.",
              },
            },
            {
              "@type": "Question",
              name: "Who is Moneko for?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Moneko is for anyone looking to improve their financial literacy, from beginners just starting their financial journey to individuals seeking to deepen their understanding of specific financial topics. Whether you want to learn about saving, investing, managing debt, or planning for retirement, Moneko has resources for you.",
              },
            },
            {
              "@type": "Question",
              name: "How does the AI-powered learning work?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Our AI analyzes your financial goals and current knowledge to create a customized learning plan. You'll engage with interactive lessons, get instant answers from our AI chat, and practice with real-world scenarios, all tailored to your unique needs.",
              },
            },
            {
              "@type": "Question",
              name: "Are the financial courses and tools on Moneko free?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Moneko offers a mix of free and premium content. Many of our foundational lessons, AI chat features, and basic financial calculators are available for free to help you get started. Advanced courses and specialized tools may be part of a premium offering.",
              },
            },
            {
              "@type": "Question",
              name: "What kind of financial tools does Moneko offer?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Moneko provides a suite of practical financial calculators to help you plan and manage your money effectively. These include tools for auto loans, compound interest, mortgage calculations, retirement planning, and setting savings goals.",
              },
            },
          ],
        },
      ],
    };

    return {
      meta,
      link: [
        {
          rel: "canonical",
          href: "https://pawfi.app/",
        },
      ],
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});

function FeatureCard({
  icon,
  title,
  description,
  className = "",
  animationDelay = 0,
}: {
  icon: any;
  title: string;
  description: string;
  className?: string;
  animationDelay?: number;
}) {
  return (
    <motion.div
      className={`transform rounded-2xl bg-white p-6 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg ${className}`}
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      custom={animationDelay}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100">
        <FontAwesomeIcon
          icon={icon}
          size="lg"
          className="text-purple-600"
          aria-hidden="true"
        />
      </div>
      <h3 className="mb-2 text-xl font-bold">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </motion.div>
  );
}

function BasicLessonCard({
  icon,
  title,
  description,
  linkTo,
  animationDelay = 0,
}: {
  icon: string;
  title: string;
  description: string;
  linkTo: string;
  animationDelay?: number;
}) {
  // Assuming fadeInUp and elasticScale variants are defined elsewhere in the file or imported
  return (
    <div>
      <div
        className="flex h-full flex-col rounded-3xl border border-slate-300/30 bg-slate-50/60 p-8 shadow-2xl shadow-slate-900/20 backdrop-blur-xl transition-all duration-300 ease-in-out dark:border-slate-700/30 dark:bg-slate-900/60 dark:shadow-black/30"
              >
        <Link to={linkTo} className="group flex h-full flex-col">
          <div className="flex-grow">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg shadow-purple-500/40 transition-transform duration-200">
              <span className="text-3xl text-white" aria-hidden="true">
                {icon}
              </span>
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900 transition-colors duration-200  dark:text-white ">
              {title}
            </h3>
            <p className="mb-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {description}
            </p>
          </div>
          <div className="mt-auto text-purple-600">
              Start Lesson
              <span className="ml-2 transition-transform duration-200 ease-in-out ">
                <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" />
              </span>
          </div>
        </Link>
      </div>
    </div>
  );
}

import { FaqSection } from "@/components/ui/faq-section";
import { faFacebook, faInstagram } from "@fortawesome/free-brands-svg-icons";

function WaitlistForm() {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    window.open("https://discord.gg/RZdG7GpX", "_blank");
  };

  return (
    <motion.div
      className="rounded-3xl border border-white/20 bg-white/50 p-12 shadow-lg shadow-slate-900/10 backdrop-blur-2xl dark:border-slate-700/20 dark:bg-slate-900/30"
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      <div className="flex flex-col items-center justify-center text-center">
        <motion.h3
          className="mb-3 text-3xl font-bold text-slate-900 dark:text-white"
          variants={fadeInUp}
          custom={0.1}
        >
          Get Early Access to AI-Powered Learning
        </motion.h3>
        <motion.p
          className="mb-8 max-w-2xl text-lg text-slate-700 dark:text-slate-300"
          variants={fadeInUp}
          custom={0.2}
        >
          Be among the first to experience personalized financial education with
          PawFi. Join our community for updates and beta access.
        </motion.p>

        <motion.div variants={fadeInUp} custom={0.3}>
          <button
            onClick={handleSubmit}
            className="group inline-flex items-center justify-center rounded-xl bg-purple-600 px-6 py-3 text-base font-medium text-white shadow-md transition-all duration-200 ease-in-out hover:bg-purple-700 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-900"
          >
            <FontAwesomeIcon icon={faDiscord} className="mr-2 h-5 w-5" />
            Join Discord
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const [chatQuery, setChatQuery] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && chatQuery.trim()) {
      e.preventDefault();
      startTransitionAnimation();
    }
  };

  // Animation controls for more complex sequences
  const inputControls = useAnimation();
  const rippleControls = useAnimation();
  const textControls = useAnimation();
  const iconControls = useAnimation();
  const placeholderControls = useAnimation();
  const [rippleCount, setRippleCount] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Start the enhanced transition animation
  const startTransitionAnimation = async () => {
    if (!chatQuery.trim() || isTransitioning) return;

    setIsTransitioning(true);
    setIsAnimating(true);
    inputRef.current?.blur(); // Remove focus to prevent keyboard from showing during animation

    // Create multiple ripple effects with staggered timing
    setRippleCount((prev) => Math.min(prev + 3, 5)); // Limit to 5 ripples max

    // First ripple effect animation - enhanced with more organic feel
    rippleControls.start({
      scale: [0, 2.8],
      opacity: [0.9, 0],
      transition: { duration: 1.5, ease: [0.19, 1, 0.22, 1] },
    });

    // Animate placeholder text to transform with smoother fade
    placeholderControls.start({
      opacity: [0, 1],
      y: [10, 0],
      transition: { duration: 0.5, delay: 0.2, ease: "easeOut" },
    });

    // Animate text to shrink and fade with improved timing
    textControls.start({
      scale: [1, 0.92],
      opacity: [1, 0.7],
      transition: { duration: 0.5, ease: "easeInOut" },
    });

    // Animate icons with slight delay between them for staggered effect
    iconControls.start({
      scale: [1, 1.2, 0.8],
      opacity: [1, 0.9, 0],
      transition: { duration: 0.6, ease: "easeInOut", staggerChildren: 0.08 },
    });

    // Enhanced input container animation sequence with more sophisticated morphing
    // and improved glassmorphism transitions
    await inputControls.start({
      scale: [1, 1.03, 1.05, 1.08],
      y: [0, -8, -20, -30],
      boxShadow: [
        "0 4px 6px rgba(120, 78, 198, 0.1)",
        "0 10px 20px rgba(120, 78, 198, 0.2)",
        "0 15px 30px rgba(120, 78, 198, 0.3)",
        "0 20px 40px rgba(120, 78, 198, 0.4)",
      ],
      borderRadius: ["9999px", "30px", "25px", "20px"],
      backgroundColor: [
        "rgba(255,255,255,0.6)",
        "rgba(250,245,255,0.7)",
        "rgba(245,240,255,0.75)",
        "rgba(240,235,255,0.8)",
      ],
      backdropFilter: ["blur(8px)", "blur(10px)", "blur(12px)", "blur(15px)"],
      transition: { duration: 0.8, ease: [0.19, 1, 0.22, 1] },
    });

    // Improved fade out with slight delay for smoother transition
    setTimeout(() => {
      setAnimationComplete(true);
    }, 150);

    // Navigate after animation completes with adjusted timing for smoother experience
    setTimeout(() => {
      navigate({ to: "/chat", search: { q: chatQuery } });
    }, 500);
  };


  return (
    <div className="relative min-h-screen bg-[#f5f3ff]">
      {/* Enhanced ambient halo background with scroll animations */}
      <AmbientHalo />
      
      {/* Hidden H1 for SEO */}
      <h1 className="sr-only">Learn How to Save and Start Investing for Beginners with Moneko, Your AI Money Coach</h1>

      {/* Navigation */}
      <nav className="sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8">
          <div className="flex items-center gap-x-8">
            <Link to="/" className="flex items-center gap-2">
              <img
                src={catCoin}
                alt="Moneko Logo"
                className="size-10"               
              />
              <span className="text-xl font-semibold text-slate-800">
                Moneko
              </span>
            </Link>
            <div className="hidden items-center gap-x-6 md:flex">
              <Link
                to="/learning"
                className="text-sm font-medium text-slate-700 transition-colors hover:text-purple-600"
              >
                Learning
              </Link>
              <Link
                to="/calculators"
                className="text-sm font-medium text-slate-700 transition-colors hover:text-purple-600"
              >
                Calculators
              </Link>
              <Link
                to="/blogs"
                className="text-sm font-medium text-slate-700 transition-colors hover:text-purple-600"
              >
                Blogs
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-x-5">
            <Link
              to="/login"
              className="hidden text-sm font-medium text-slate-700 transition-colors hover:text-purple-600 md:block"
            >
              Explore Courses
            </Link>
            <Link
              to="/chat"
              className="font-medium text-purple-600 hover:text-purple-800"
            >
              <Button className="bg-purple-600 hover:bg-purple-700">
                Chat with AI
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Portfolio Builder Section - Exact Match to Mockup */}
      <section className="relative overflow-hidden bg-transparent py-20">
        {/* Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">
          {/* Heading */}
          <div className="mb-12 text-center">
            <motion.h2
              className="mb-3 text-4xl font-bold md:text-5xl mt-24"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              Build Your First Portfolio
            </motion.h2>
            <motion.h3
              className="mb-4 text-3xl font-bold md:text-4xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              from 0 to 1
            </motion.h3>
            <motion.p
              className="text-lg text-gray-600"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Create personalized financial journeys by chatting with AI
            </motion.p>
          </div>

          {/* Chat Input */}
          <motion.div
            className="mx-auto mb-12 max-w-3xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <motion.div
              variants={fadeInUp}
              animate={inputControls}
              initial={{
                scale: 1,
                y: 0,
                opacity: 1,
                boxShadow: "0 4px 6px rgba(120, 78, 198, 0.1)",
              }}
              className={`relative mx-auto flex w-full max-w-3xl items-center rounded-full p-1 transition-all duration-500 ${isAnimating ? "bg-gradient-to-r from-purple-50/90 to-indigo-50/90 backdrop-blur-lg" : "border border-white/20 bg-white/60 backdrop-blur-md"}`}
              style={{
                opacity: animationComplete ? 0 : 1,
                WebkitBackdropFilter: "blur(12px)",
              }}
            >             
              {/* Enhanced Input field with animation */}
              <motion.div
                className="relative z-10 flex-grow"
              >
                <input
                  type="text"
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask PawFi to create personalized financial journey for my..."
                  className="w-full border-none bg-transparent px-6 py-3 text-gray-700 placeholder-gray-400 placeholder:pl-2 transition-all duration-300 ease-in-out focus:outline-none outline-none ring-0 focus:ring-0 focus:shadow-none"
                  aria-label="Ask a financial question"
                  ref={inputRef}
                  disabled={isTransitioning}
                />

                {/* Animated placeholder that appears during transition */}
                {isAnimating && (
                  <motion.div
                    className="pointer-events-none absolute bottom-0 left-0 right-0 top-0 flex items-center px-4"
                    animate={placeholderControls}
                    initial={{ opacity: 0, y: 10 }}
                  >
                    <div className="flex items-center">
                      <span className="mr-2 text-purple-600">Creating</span>
                      <motion.div
                        animate={{
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.5,
                          repeatType: "loop",
                          times: [0, 0.5, 1],
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faLightbulb}
                          className="h-4 w-4 text-amber-500"
                        />
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Private badge */}
              <motion.div
                className="z-10 mr-2 flex-shrink-0"
                animate={iconControls}
              >
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon
                    icon={faLock}
                    className="h-4 w-4 text-gray-400"
                  />
                  <span className="text-sm text-gray-400">Private</span>
                </div>
              </motion.div>
              {/* Send button with animation */}
              <motion.button
              
                onClick={() => {
                  if (chatQuery.trim() && !isTransitioning) {
                    handleKeyDown({ key: 'Enter', preventDefault: () => {} } as React.KeyboardEvent);
                  }
                }}
                className="mr-1 size-10 flex cursor-pointer justify-center items-center flex-shrink-0 rounded-full bg-gradient-to-r from-purple-400 to-indigo-600 p-2 text-white shadow-md transition-all duration-200 hover:shadow-lg"
                aria-label="Send message"
                animate={iconControls}
              >
                <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4" />
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Video Cards with Seamless Integration */}
          <div className="grid gap-8 md:grid-cols-2 mt-24">
            {/* AI Chat Animation Card */}
            <motion.div
              className="group relative overflow-hidden rounded-3xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
            >
              {/* Gradient overlay for seamless integration */}

              {/* Glowing border effect */}

              {/* Card content with glassmorphism - MORE TRANSPARENT */}
              <div className="relative z-0 overflow-hidden rounded-3xl bg-white/60 shadow-lg backdrop-blur-sm transition-all duration-500 group-hover:bg-white/80">
                <div className="relative flex aspect-square items-center justify-center p-2">
                  <Lottie
                    animationData={aiChatAnimation}
                    loop={true}
                    className="h-full w-full"
                  />
                </div>

                {/* Caption overlay - now always visible and mobile-friendly */}
                <div
                  className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-purple-600/80 to-transparent p-4 pt-12 sm:p-6"
                  style={{ transform: 'translateY(0)' }}
                >
                  <h3 className="text-lg font-medium text-white">
                    AI-Powered Chat Assistant
                  </h3>
                  <p className="text-sm text-purple-100">
                    Get personalized financial guidance instantly
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Badge Unlock Animation Card */}
            <motion.div
              className="group relative overflow-hidden rounded-3xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              viewport={{ once: true }}
            >
              {/* Gradient overlay for seamless integration */}

              {/* Glowing border effect */}

              {/* Card content with glassmorphism - MORE TRANSPARENT */}
              <div className="relative z-0 overflow-hidden rounded-3xl bg-white/60 shadow-lg backdrop-blur-sm transition-all duration-500 group-hover:bg-white/50">
                <div className="relative flex aspect-square items-center justify-center p-2">
                  <Lottie
                    animationData={badgeUnlockAnimation}
                    loop={true}
                    className="h-full w-full"
                  />
                </div>

                {/* Caption overlay - now always visible and mobile-friendly */}
                <div
                  className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-blue-600/80 to-transparent p-4 pt-12 sm:p-6"
                  style={{ transform: 'translateY(0)' }}
                >
                  <h3 className="text-lg font-medium text-white">
                    Achievement Badges
                  </h3>
                  <p className="text-sm text-blue-100">
                    Earn rewards as you build financial skills
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Expert-Led Basic Lessons Section */}
      <section className="relative overflow-hidden px-6 py-20 md:px-12 lg:px-24">
        {/* Subtle gradient overlay */}

        <div className="relative z-10 mx-auto max-w-7xl">
          <motion.h2
            className="mb-6 text-center text-3xl font-bold text-slate-800 md:text-4xl"
            variants={fadeInDown}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            Dive Deeper with Expert-Led Lessons
          </motion.h2>
          <motion.p
            className="mb-12 text-center text-lg text-slate-600 md:mx-auto md:max-w-2xl"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            custom={0.2}
          >
            Our foundational courses are crafted by a seasoned Financial
            Instructor (CFA, CSC, MBA) with over 10 years of experience, making
            complex topics clear and actionable, no matter your background.
          </motion.p>
          <motion.div
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {basicLessonsData.lessons.slice(0, 2).map((lesson, index) => (
              <BasicLessonCard
                key={`preview-${lesson.lesson_id}`}
                icon={lesson.icon}
                title={lesson.title}
                description={lesson.description}
                linkTo={`/learning/${basicLessonsData.id}/lesson/${lesson.lesson_id}`}
                animationDelay={0.1 * (index + 1)}
              />
            ))}
            {/* Explore More Card */}
            {basicLessonsData.lessons.length > 2 && (
              <div>
                <div
                  className="h-full rounded-3xl border border-slate-300/30 bg-slate-50/60 p-8 shadow-2xl shadow-slate-900/20 backdrop-blur-xl dark:border-slate-700/30 dark:bg-slate-900/60 dark:shadow-black/30"
                >
                  <Link
                    to={`/learning/${basicLessonsData.id}`}
                    role="button"
                    className="group flex h-full w-full flex-col items-center justify-center text-center"
                  >
                    <div className="flex flex-grow flex-col items-center justify-center">
                      <div
                        className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg shadow-purple-500/40"
                      >
                        <FontAwesomeIcon
                          icon={faPlus}
                          className="text-3xl text-white"
                          aria-hidden="true"
                        />
                      </div>
                      <h3
                        className="mb-3 text-xl font-bold text-slate-900 transition-colors duration-200  dark:text-white "
                      >
                        Explore All Lessons
                      </h3>
                      <p
                        className="text-sm text-slate-700 dark:text-slate-300"
                      >
                        View all {basicLessonsData.lessons.length} foundational
                        courses.
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <FaqSection faqData={faqData} />

      {/* Waitlist Section */}
      <section
        id="waitlist"
        className="relative overflow-hidden px-6 py-20 md:px-12 lg:px-24"
      >
        {/* Subtle gradient overlay */}

        <motion.div
          className="relative z-10 mx-auto max-w-4xl"
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5 }}
        >
          <WaitlistForm />
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative overflow-hidden bg-gray-900/70 px-6 py-12 text-white backdrop-blur-md md:px-12 lg:px-24">
        {/* Subtle gradient overlay */}

        <motion.div
          className="relative z-10 mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          <motion.div variants={fadeInUp} custom={0.1}>
            <motion.div
              className="mb-4 flex items-center"
              variants={fadeInUp}
              custom={0.2}
            >
              <motion.img
                src={catCoin}
                alt="Moneko Logo"
                className="h-8 w-8"
                width="32"
                height="32"
                loading="lazy"
                variants={elasticScale}
                custom={0.3}
              />
              <motion.span
                className="ml-2 text-xl font-bold"
                variants={fadeInUp}
                custom={0.4}
              >
                Moneko
              </motion.span>
            </motion.div>
            <motion.p
              className="text-gray-400"
              variants={fadeInUp}
              custom={0.5}
            >
              Empowering your financial journey with intelligent, personalized
              learning.
            </motion.p>
          </motion.div>

          <motion.div variants={fadeInUp} custom={0.2}>
            <motion.h3
              className="mb-4 text-lg font-bold"
              variants={fadeInUp}
              custom={0.3}
            >
              Quick Links
            </motion.h3>
            <motion.ul className="space-y-2" variants={staggerContainer}>
              <motion.li variants={fadeInUp} custom={0.4}>
                <Link to="/learning" className="text-gray-400 hover:text-white">
                  AI Learning
                </Link>
              </motion.li>
              <motion.li variants={fadeInUp} custom={0.5}>
                <Link
                  to="/learning/$courseId"
                  params={{ courseId: "your-2025-guide-to-investing" }}
                  className="text-gray-400 hover:text-white"
                >
                  Expert Courses
                </Link>
              </motion.li>
              <motion.li variants={fadeInUp} custom={0.6}>
                <Link
                  to="/calculators"
                  className="text-gray-400 hover:text-white"
                >
                  Financial Calculators
                </Link>
              </motion.li>
              <motion.li variants={fadeInUp} custom={0.7}>
                <Link to="/chat" className="text-gray-400 hover:text-white">
                  Chat with AI
                </Link>
              </motion.li>
            </motion.ul>
          </motion.div>

          <motion.div variants={fadeInUp} custom={0.3}>
            <motion.h3
              className="mb-4 text-lg font-bold"
              variants={fadeInUp}
              custom={0.4}
            >
              Legal
            </motion.h3>
            <motion.ul className="space-y-2" variants={staggerContainer}>
              <motion.li variants={fadeInUp} custom={0.5}>
                <Link
                  to="/privacy-policy"
                  className="text-gray-400 hover:text-white"
                >
                  Privacy Policy
                </Link>
              </motion.li>
              <motion.li variants={fadeInUp} custom={0.6}>
                <Link
                  to="/terms-of-service"
                  className="text-gray-400 hover:text-white"
                >
                  Terms of Service
                </Link>
              </motion.li>
              <motion.li variants={fadeInUp} custom={0.7}>
                <Link
                  to="/cookie-policy"
                  className="text-gray-400 hover:text-white"
                >
                  Cookie Policy
                </Link>
              </motion.li>
            </motion.ul>
          </motion.div>

          <motion.div variants={fadeInUp} custom={0.4}>
            <motion.h3
              className="mb-4 text-lg font-bold"
              variants={fadeInUp}
              custom={0.5}
            >
              Connect
            </motion.h3>
            <motion.ul className="space-y-2" variants={staggerContainer}>
              <motion.li variants={fadeInUp} custom={0.6}>
                <a
                  href="https://www.facebook.com/monekoai/"
                  className="text-gray-400 hover:text-white"
                >
                  Facebook
                </a>
              </motion.li>
              <motion.li variants={fadeInUp} custom={0.6}>
                <a
                  href="https://www.instagram.com/moneko_ai/"
                  className="text-gray-400 hover:text-white"
                >
                  Instagram
                </a>
              </motion.li>
              <motion.li variants={fadeInUp} custom={0.7}>
                <a
                  href="https://x.com/moneko_ai"
                  className="text-gray-400 hover:text-white"
                >
                  X
                </a>
              </motion.li>
              <motion.li variants={fadeInUp} custom={0.8}>
                <a
                  href="mailto:hello@pawfi.com"
                  className="text-gray-400 hover:text-white"
                >
                  Contact Us
                </a>
              </motion.li>
            </motion.ul>
          </motion.div>

          <motion.div
            className="col-span-full mx-auto mt-12 max-w-7xl border-t border-gray-800 pt-8 text-center text-gray-400"
            variants={fadeInUp}
            custom={0.9}
          >
            <motion.div
              className="mb-4 flex justify-center space-x-4"
              variants={staggerContainer}
            >
              <motion.a
                href="https://www.facebook.com/monekoai/"
                aria-label="Moneko on Facebook"
                className="text-gray-400 hover:text-white"
                variants={fadeInUp}
                custom={1.0}
              >
                <FontAwesomeIcon icon={faFacebook} />
              </motion.a>
              <motion.a
                href="https://x.com/moneko_ai"
                aria-label="Moneko on X"
                className="text-gray-400 hover:text-white"
                variants={fadeInUp}
                custom={1.1}
              >
                <FontAwesomeIcon icon={faX} />
              </motion.a>
              <motion.a
                href="https://www.instagram.com/moneko_ai/"
                aria-label="Moneko on Instagram"
                className="text-gray-400 hover:text-white"
                variants={fadeInUp}
                custom={1.2}
              >
                <FontAwesomeIcon icon={faInstagram} />
              </motion.a>
            </motion.div>
            <motion.p variants={fadeInUp} custom={1.3}>
              © 2025 Moneko. All rights reserved.
            </motion.p>
          </motion.div>
        </motion.div>
      </footer>
    </div>
  );
}
