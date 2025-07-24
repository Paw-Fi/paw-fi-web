"use client";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import "@/types/route-types"; // Import route type definitions
import React, { useState } from "react";
import { motion } from "framer-motion";
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
  faEnvelope,
  faStar,
  faClock,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import basicLessonsData from "@/data/basic-lessons.json";
import faqData from "@/data/home/home-faq.json";
import AmbientHalo from "../components/ui/ambient-halo";
export const DISCORD_URL = "https://discord.gg/M2Dgujvtze";
import { MotionGlobalConfig } from "framer-motion";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => {
    // Use canonical helper for consistent URLs
    const pageUrl = getCanonicalUrl("/");
    const title =
      "Moneko – Learn How to Save and Start Investing | Beginner-Friendly Finance App";
    const description =
      "Moneko is a free, beginner-friendly app that helps you build good money habits through fun, interactive lessons in saving, budgeting, and investing";
    const keywords =
      "financial education, personal finance, money management, investing, saving, budgeting, financial literacy, free financial tools, Moneko";
    const imageUrl = "https://moneko.io/og-img.png";

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
          href: "https://moneko.io/",
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

function BasicLessonCard({
  icon,
  title,
  description,
  linkTo,
}: {
  icon: string;
  title: string;
  description: string;
  linkTo: string;
}) {
  // Assuming fadeInUp and elasticScale variants are defined elsewhere in the file or imported
  return (
    <div>
      <div className="flex h-full flex-col rounded-3xl border border-slate-300/30 bg-slate-50/60 p-8 shadow-2xl shadow-slate-900/20 backdrop-blur-xl transition-all duration-300 ease-in-out dark:border-slate-700/30 dark:bg-slate-900/60 dark:shadow-black/30">
        <Link to={linkTo} className="group flex h-full flex-col">
          <div className="flex-grow">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg shadow-purple-500/40 transition-transform duration-200">
              <span className="text-3xl text-white" aria-hidden="true">
                {icon}
              </span>
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900 transition-colors duration-200 dark:text-white">
              {title}
            </h3>
            <p className="mb-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {description}
            </p>
          </div>
          <div className="mt-auto text-purple-600">
            Start Lesson
            <span className="ml-2 transition-transform duration-200 ease-in-out">
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
import { useDeviceType } from "@/hooks/use-device-type";
import { useEffect } from "react";

import { useNewsletterSubscription } from "@/hooks/use-newsletter-subscription";
import { HomeHeader } from "@/components/index/header";
import { AISearchInput } from "@/components/ui/ai-search-input";
import { getRemainingSpots } from "@/lib/early-access";
import { useCookie } from "@/utils/use-cookie";
import { FreeTrialGiveawayForm } from "@/components/forms/FreeTrialGiveawayForm";
import { EarlyAccessSection } from "@/components/index/early-access-section";



export default function HomePage() {
  // Finance-related suggestion prompts
  const chatSuggestions = [
    "Help me set up a budget",
    "How do I start investing?",
    "Tell me about retirement planning",
    "What's an emergency fund?",
    "Explain compound interest",
    "Tips for saving money",
  ];

  const { isMobile } = useDeviceType();

  if (isMobile) {
    MotionGlobalConfig.skipAnimations = true;
  }

  return (
    <div className="relative min-h-screen bg-[#f5f3ff]">
      {/* Enhanced ambient halo background with scroll animations */}
      <AmbientHalo />

      {/* Hidden H1 for SEO */}
      <h1 className="sr-only">
        Learn How to Save and Start Investing for Beginners with Moneko, Your AI
        Money Coach
      </h1>

      {/* Navigation */}
      <nav className="sticky top-0 z-50">
        <HomeHeader />
      </nav>

      <section className="relative min-h-screen pt-16 px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl">
           {/* Heading */}
          <div className="mb-8 sm:mb-12 text-center">
           <motion.h2
              className="mb-2 sm:mb-3 mt-12 sm:mt-16 md:mt-24 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              Build Your First Portfolio
            </motion.h2>
            <motion.h3
              className="mb-3 sm:mb-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              from 0 to 1
            </motion.h3>
            <motion.p
              className="text-base sm:text-lg md:text-xl text-gray-600 px-4 sm:px-0"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Create personalized financial journeys by chatting with AI
            </motion.p>
          </div>

          {/* AI Search Input */}
          <div className="mb-8 sm:mb-12">
            <AISearchInput 
              placeholder="Ask Moneko to create personalized financial journey for my..."
              suggestions={chatSuggestions}
            />
          </div>
        </div>

        {/* Animated Scroll Arrow */}
        <motion.div
          className="absolute bottom-8 sm:bottom-12 md:bottom-16 left-1/2 transform -translate-x-1/2 z-10"
          initial={{ opacity: 0, y: 0, x: "-50%" }}
          animate={{ 
            opacity: [0.5, 1, 0.5],
            y: [0, 8, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <motion.button
            onClick={() => {
              const nextSection = document.querySelector('section:nth-of-type(2)');
              if (nextSection) {
                nextSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="flex flex-col items-center justify-center p-2 sm:p-4 text-gray-600 hover:text-gray-800 transition-colors duration-200 cursor-pointer"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-xs sm:text-sm font-medium mb-1 sm:mb-2 hidden sm:block">Scroll to explore</span>
            <FontAwesomeIcon 
              icon={faChevronDown} 
              className="text-lg sm:text-xl md:text-2xl"
            />
          </motion.button>
        </motion.div>
</section>
      <EarlyAccessSection/>

      {/* Portfolio Builder Section - Exact Match to Mockup */}
      <section className="relative overflow-hidden py-20 ">
        {/* Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">

          {/* Video Cards with Seamless Integration */}
          <div className="mt-24 grid gap-8 md:grid-cols-2">
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
                  className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-blue-600/80 to-transparent p-4 pt-12 sm:p-6"
                  style={{ transform: "translateY(0)" }}
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
                  style={{ transform: "translateY(0)" }}
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
            {basicLessonsData.lessons.slice(0, 2).map((lesson) => (
              <BasicLessonCard
                key={`preview-${lesson.lesson_id}`}
                icon={lesson.icon}
                title={lesson.title}
                description={lesson.description}
                linkTo={`/dashboard/essentials/${basicLessonsData.course_id}/lesson/${lesson.lesson_id}`}
              />
            ))}
            {/* Explore More Card */}
            {basicLessonsData.lessons.length > 2 && (
              <div>
                <div className="h-full rounded-3xl border border-slate-300/30 bg-slate-50/60 p-8 shadow-2xl shadow-slate-900/20 backdrop-blur-xl dark:border-slate-700/30 dark:bg-slate-900/60 dark:shadow-black/30">
                  <Link
                    to={`dashboard/essentials/${basicLessonsData.course_id}`}
                    role="button"
                    className="group flex h-full w-full flex-col items-center justify-center text-center"
                  >
                    <div className="flex flex-grow flex-col items-center justify-center">
                      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg shadow-purple-500/40">
                        <FontAwesomeIcon
                          icon={faPlus}
                          className="text-3xl text-white"
                          aria-hidden="true"
                        />
                      </div>
                      <h3 className="mb-3 text-xl font-bold text-slate-900 transition-colors duration-200 dark:text-white">
                        Explore All Lessons
                      </h3>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
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
                <Link
                  to="/dashboard/essentials"
                  className="text-gray-400 hover:text-white"
                >
                  AI Learning
                </Link>
              </motion.li>
              <motion.li variants={fadeInUp} custom={0.5}>
                <Link
                  to={`dashboard/essentials/${basicLessonsData.course_id}`}
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
                <Link
                  to="/dashboard/chat"
                  className="text-gray-400 hover:text-white"
                >
                  Chat with AI
                </Link>
              </motion.li>
              <motion.li variants={fadeInUp} custom={0.7}>
                <Link to="/team" className="text-gray-400 hover:text-white">
                  Meet the team
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
                  href="mailto:hello@moneko.io"
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
