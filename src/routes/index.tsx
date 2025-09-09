"use client";

import React, { Suspense } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import "@/types/route-types"; // Import route type definitions
import { motion } from "framer-motion";

// Lazy load Lottie animations for better performance - import JSON directly for now
import Lottie from "lottie-react";
import aiChatAnimation from "@/assets/videos/AI-Chat.json";
import badgeUnlockAnimation from "@/assets/videos/Badge-Unlock.json";

// Create lazy-loaded Lottie wrapper
const LazyLottieAnimation = React.lazy(() =>
  Promise.resolve({
    default: ({
      animationData,
      className = "w-3/4 h-3/4",
      ...props
    }: {
      animationData: any;
      className?: string;
    }) => (
      <Suspense
        fallback={
          <div className={`${className} bg-muted animate-pulse rounded-lg`} />
        }
      >
        <Lottie
          animationData={animationData}
          loop={true}
          className={className}
          {...props}
        />
      </Suspense>
    ),
  }),
);

import catCoin from "@/assets/images/icon.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faPlus,
  faChevronDown,
  faPlay,
  faX,
} from "@fortawesome/free-solid-svg-icons";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import basicLessonsData from "@/data/basic-lessons.json";
import faqData from "@/data/home/home-faq.json";
export const DISCORD_URL = "https://discord.gg/M2Dgujvtze";
import { MotionGlobalConfig } from "framer-motion";
import { Helmet } from "@dr.pogodin/react-helmet";

export const Route = createFileRoute("/")({
  // Enable Static Site Generation for this landing page since content is mostly static
  ssr: "static",
  component: HomePage,
  head: () => {
    // Use canonical helper for consistent URLs
    const pageUrl = getCanonicalUrl("/");
    const title =
      "AI Personal Finance Coach - Learn Budgeting, Investing & Save Money | Moneko";
    const description =
      "Transform your financial future with Moneko's AI-powered personal finance coach. Get personalized budgeting plans, learn investing basics, and achieve your money goals with expert guidance.";
    const keywords =
      "AI personal finance coach, budgeting app, learn investing, personal finance education, money management tools, savings goals, financial planning, financial literacy, investment calculator, retirement planning";
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
  return (
    <Card className="group border-border bg-card hover:bg-accent/50 h-full touch-manipulation transition-all duration-200 ease-out active:scale-[0.98]">
      <Link to={linkTo} className="flex h-full flex-col">
        <CardHeader className="flex-grow space-y-4 p-4 sm:space-y-6 sm:p-6 md:p-8">
          <div className="bg-primary text-primary-foreground flex h-12 w-12 items-center justify-center rounded-lg sm:h-14 sm:w-14 sm:rounded-xl">
            <span className="text-lg sm:text-xl md:text-2xl">{icon}</span>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <CardTitle className="text-card-foreground text-base leading-tight font-semibold sm:text-lg md:text-xl">
              {title}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm leading-relaxed sm:text-base">
              {description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardFooter className="p-4 pt-0 sm:p-6 md:p-8">
          <div className="text-primary flex items-center text-sm font-medium transition-transform duration-200 group-hover:translate-x-1 sm:text-base">
            Start Lesson
            <FontAwesomeIcon
              icon={faArrowRight}
              className="ml-1.5 text-xs sm:ml-2 sm:text-sm"
              aria-hidden="true"
            />
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
}

import { FaqSection } from "@/components/ui/faq-section";
import { faFacebook, faInstagram } from "@fortawesome/free-brands-svg-icons";
import { useDeviceType } from "@/hooks/use-device-type";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { OptimizedImage } from "@/components/seo/optimized-image";

import { HomeHeader } from "@/components/index/header";
import { AISearchInput } from "@/components/ui/ai-search-input";
import { EarlyAccessSection } from "@/components/index/early-access-section";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import AmbientHalo from "@/components/ui/ambient-halo";
import { disableAnimationsOnMobile } from "../utils/disable-framer-motion-mobile";

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
  disableAnimationsOnMobile();

  // Skip complex animations on mobile for performance
  if (isMobile) {
    MotionGlobalConfig.skipAnimations = true;
  }

  // SEO metadata
  const pageUrl = getCanonicalUrl("/");
  const title =
    "AI Personal Finance Coach - Learn Budgeting, Investing & Save Money | Moneko";
  const description =
    "Transform your financial future with Moneko's AI-powered personal finance coach. Get personalized budgeting plans, learn investing basics, and achieve your money goals with expert guidance.";
  const keywords =
    "AI personal finance coach, budgeting app, learn investing, personal finance education, money management tools, savings goals, financial planning, financial literacy, investment calculator, retirement planning";
  const imageUrl = "https://moneko.io/og-img.png";

  return (
    <div className="relative min-h-screen bg-transparent">
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="628" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:site_name" content="Moneko" />

        {/* Twitter / X */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={pageUrl} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={imageUrl} />
        <meta name="twitter:site" content="@moneko_ai" />
        <meta name="twitter:creator" content="@moneko_ai" />

        {/* Canonical Link */}
        <link rel="canonical" href={pageUrl} />
      </Helmet>

      <AmbientHalo />

      {/* Hidden H1 for SEO */}
      <h1 className="sr-only">
        AI Personal Finance Coach: Learn Budgeting, Investing, and Money
        Management with Moneko
      </h1>

      {/* Navigation */}
      <nav className="border-border sticky top-0 z-50 border-b bg-white/10 backdrop-blur-md">
        <HomeHeader />
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-4 pt-20 pb-12 sm:px-6 sm:pt-24 sm:pb-16 md:pt-32 md:pb-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Heading */}
          <div className="mb-8 text-center sm:mb-12 md:mb-16">
            <motion.h2
              className="text-foreground mb-4 text-3xl leading-tight font-bold tracking-tight sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              Master Your Money with AI Personal Finance Coach
            </motion.h2>

            <motion.p
              className="text-muted-foreground dark:text-moneko-foreground mx-auto mb-8 max-w-3xl text-base leading-relaxed font-light sm:mb-10 sm:text-lg md:mb-12 md:text-xl lg:text-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            >
              Get personalized budgeting plans, learn smart investing
              strategies, and achieve your financial goals with expert AI
              guidance tailored to your unique situation.
            </motion.p>
          </div>

          {/* AI Search Input */}
          <motion.div
            className="mb-8 sm:mb-12 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          >
            <AISearchInput
              placeholder="Ask your AI finance coach: 'Help me create a budget' or 'How should I start investing?'"
              suggestions={chatSuggestions}
            />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="text-center">
          <motion.button
            onClick={() => {
              const nextSection = document.querySelector(
                "section:nth-of-type(2)",
              );
              if (nextSection) {
                nextSection.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="text-muted-foreground hover:text-foreground inline-flex touch-manipulation flex-col items-center gap-1.5 transition-colors duration-200 active:scale-95 sm:gap-2"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="dark:text-moneko-foreground text-xs font-medium sm:text-sm">
              Scroll to explore
            </span>
            <FontAwesomeIcon
              icon={faChevronDown}
              className="dark:text-moneko-foreground text-base sm:text-lg"
            />
          </motion.button>
        </div>
      </section>

      {/* Video Demo Section */}
      <section className="relative z-10 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center sm:mb-10 md:mb-12">
            <motion.h2
              className="text-foreground mb-4 text-2xl leading-tight font-bold sm:mb-6 sm:text-3xl md:text-4xl lg:text-5xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              See AI-Powered Financial Planning in Action
            </motion.h2>
            <motion.p
              className="text-muted-foreground dark:text-moneko-foreground mx-auto max-w-3xl text-base leading-relaxed sm:text-lg md:text-xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Discover how Moneko's AI personal finance coach creates customized
              budgeting strategies, investment recommendations, and savings
              plans tailored specifically to your financial goals and lifestyle.
            </motion.p>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <motion.div
                className="group border-border relative cursor-pointer touch-manipulation overflow-hidden rounded-xl border sm:rounded-2xl"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="relative aspect-video w-full">
                  <video
                    className="h-full w-full object-cover"
                    src="/Moneko-onboard%20.webm"
                    poster="/video-poster.webp"
                    width="800"
                    height="450"
                    muted
                    autoPlay
                    loop
                    playsInline
                    loading="lazy"
                    preload="metadata"
                    decoding="async"
                  />

                  {/* Text overlay container */}
                  <div className="absolute inset-0 flex items-center bg-gradient-to-r from-black/60 via-black/30 to-transparent">
                    <div className="max-w-2xl p-4 text-white sm:p-6 md:p-8 lg:p-12">
                      <h3 className="mb-3 text-lg leading-tight font-bold sm:mb-4 sm:text-xl md:text-2xl lg:text-3xl">
                        Personalized Financial Education & Planning
                      </h3>
                      <p className="mb-4 text-sm leading-relaxed text-white/90 sm:mb-6 sm:text-base md:text-lg lg:text-xl">
                        Watch how our AI analyzes your financial situation and
                        creates personalized budgeting strategies and investment
                        recommendations.
                      </p>
                      <div className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 sm:gap-2 sm:text-base">
                        <FontAwesomeIcon
                          icon={faPlay}
                          className="text-xs sm:text-sm"
                        />
                        <span>Watch Demo</span>
                      </div>
                    </div>
                  </div>

                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-all duration-300 group-hover:opacity-100 group-active:opacity-100">
                    <div className="bg-background flex h-12 w-12 items-center justify-center rounded-full shadow-lg sm:h-14 sm:w-14 md:h-16 md:w-16">
                      <FontAwesomeIcon
                        icon={faPlay}
                        className="text-primary ml-0.5 text-sm sm:ml-1 sm:text-base md:text-lg"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-6xl border-none bg-black p-0">
              <div
                className="relative w-full"
                style={{ paddingBottom: "56.25%" }}
              >
                <video
                  className="absolute inset-0 h-full w-full object-contain"
                  src="/Moneko-onboard .webm"
                  poster="/video-poster.webp"
                  width="1920"
                  height="1080"
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  decoding="async"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <div className="relative z-10">
        <EarlyAccessSection />
      </div>

      {/* Features Section */}
      <section className="bg-muted/30 relative z-10 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center sm:mb-12 md:mb-16">
            <motion.h2
              className="text-foreground mb-4 text-2xl leading-tight font-bold sm:mb-6 sm:text-3xl md:text-4xl lg:text-5xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              AI-Powered Financial Tools & Learning Platform
            </motion.h2>
            <motion.p
              className="text-muted-foreground dark:text-moneko-foreground mx-auto max-w-3xl text-base leading-relaxed sm:text-lg md:text-xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Access comprehensive budgeting calculators, investment planning
              tools, and personalized financial education designed to accelerate
              your journey to financial independence.
            </motion.p>
          </div>

          <div className="mx-auto grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:gap-8 lg:w-2/3">
            {/* AI Chat Feature */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Card className="group border-border bg-card hover:border-primary/50 h-full touch-manipulation overflow-hidden transition-all duration-200 active:scale-[0.98]">
                <CardContent className="p-0">
                  <div className="from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 flex aspect-square items-center justify-center bg-gradient-to-br">
                    <Suspense
                      fallback={
                        <div className="bg-muted h-3/4 w-3/4 animate-pulse rounded-lg" />
                      }
                    >
                      <LazyLottieAnimation
                        animationData={aiChatAnimation}
                        className="h-3/4 w-3/4"
                      />
                    </Suspense>
                  </div>
                  <div className="p-4 sm:p-6">
                    <CardTitle className="text-card-foreground mb-2 text-lg leading-tight font-semibold sm:mb-3 sm:text-xl">
                      24/7 AI Personal Finance Coach
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-sm leading-relaxed sm:text-base">
                      Get instant, personalized advice on budgeting, investing,
                      debt management, and financial planning from your AI money
                      mentor.
                    </CardDescription>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Achievement System */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="group border-border bg-card hover:border-primary/50 h-full touch-manipulation overflow-hidden transition-all duration-200 active:scale-[0.98]">
                <CardContent className="p-0">
                  <div className="from-accent/20 to-secondary/20 dark:from-accent/10 dark:to-secondary/10 flex aspect-square items-center justify-center bg-gradient-to-br">
                    <Suspense
                      fallback={
                        <div className="bg-muted h-3/4 w-3/4 animate-pulse rounded-lg" />
                      }
                    >
                      <LazyLottieAnimation
                        animationData={badgeUnlockAnimation}
                        className="h-3/4 w-3/4"
                      />
                    </Suspense>
                  </div>
                  <div className="p-4 sm:p-6">
                    <CardTitle className="text-card-foreground mb-2 text-lg leading-tight font-semibold sm:mb-3 sm:text-xl">
                      Gamified Learning & Progress Tracking
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-sm leading-relaxed sm:text-base">
                      Stay motivated with achievement badges, XP rewards, and
                      visual progress tracking as you build essential money
                      management skills.
                    </CardDescription>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Expert-Led Lessons Section */}
      <section className="relative z-10 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center sm:mb-12 md:mb-16">
            <motion.h2
              className="text-foreground mb-4 text-2xl leading-tight font-bold sm:mb-6 sm:text-3xl md:text-4xl lg:text-5xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              Professional Financial Education Courses
            </motion.h2>
            <motion.p
              className="text-muted-foreground mx-auto max-w-3xl text-base leading-relaxed sm:text-lg md:text-xl dark:text-moneko-foreground"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Master personal finance fundamentals through expert-designed
              courses covering budgeting strategies, investment principles,
              retirement planning, and debt management - created by certified
              financial professionals (CFA, CSC, MBA) with 10+ years of
              experience.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:gap-8 lg:grid-cols-3">
            {basicLessonsData.lessons.slice(0, 2).map((lesson, index) => (
              <motion.div
                key={`preview-${lesson.lesson_id}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <BasicLessonCard
                  icon={lesson.icon}
                  title={lesson.title}
                  description={lesson.description}
                  linkTo={`/dashboard/learning/${basicLessonsData.course_id}/lesson/${lesson.lesson_id}`}
                />
              </motion.div>
            ))}

            {/* Explore More Card */}
            {basicLessonsData.lessons.length > 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="group border-border bg-card hover:bg-accent/50 h-full touch-manipulation transition-all duration-200 active:scale-[0.98]">
                  <Link
                    to={`dashboard/learning/${basicLessonsData.course_id}`}
                    className="flex h-full w-full flex-col items-center justify-center p-4 text-center sm:p-6 md:p-8"
                  >
                    <div className="bg-muted text-muted-foreground mb-4 flex h-12 w-12 items-center justify-center rounded-lg sm:mb-6 sm:h-14 sm:w-14 sm:rounded-xl">
                      <FontAwesomeIcon
                        icon={faPlus}
                        className="text-lg sm:text-xl"
                      />
                    </div>
                    <CardTitle className="text-card-foreground mb-2 text-base leading-tight font-semibold sm:mb-3 sm:text-lg md:text-xl">
                      Explore All Lessons
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-sm leading-relaxed sm:text-base">
                      View all {basicLessonsData.lessons.length} foundational
                      courses designed to build your financial expertise.
                    </CardDescription>
                  </Link>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <div className="bg-muted/30 relative z-10">
        <FaqSection faqData={faqData} />
      </div>

      {/* Footer */}
      <footer className="border-border bg-card relative z-10 border-t px-4 py-12 sm:px-6 sm:py-14 md:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10 md:gap-12 lg:grid-cols-4">
            {/* Brand */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center">
                <OptimizedImage
                  src={catCoin}
                  alt="Moneko Logo"
                  className="h-6 w-6 sm:h-8 sm:w-8"
                  width={32}
                  height={32}
                  loading="lazy"
                  decoding="async"
                />
                <span className="text-card-foreground ml-2 text-lg font-bold sm:text-xl">
                  Moneko
                </span>
              </div>
              <p className="text-muted-foreground max-w-xs text-sm leading-relaxed sm:text-base">
                Your trusted AI personal finance coach for budgeting, investing,
                and building wealth with confidence.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-card-foreground mb-4 text-xs font-semibold tracking-wider uppercase sm:mb-6 sm:text-sm">
                Quick Links
              </h3>
              <ul className="space-y-2 sm:space-y-3">
                <li>
                  <Link
                    to="/dashboard/learning"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    AI Financial Education
                  </Link>
                </li>
                <li>
                  <Link
                    to={`/dashboard/learning/${basicLessonsData.course_id}`}
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    Financial Planning Courses
                  </Link>
                </li>
                <li>
                  <Link
                    to="/calculators"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    Budgeting & Investment Calculators
                  </Link>
                </li>
                <li>
                  <Link
                    to="/dashboard"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    AI Finance Coach Chat
                  </Link>
                </li>
                <li>
                  <Link
                    to="/team"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    Meet the Team
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-card-foreground mb-4 text-xs font-semibold tracking-wider uppercase sm:mb-6 sm:text-sm">
                Legal
              </h3>
              <ul className="space-y-2 sm:space-y-3">
                <li>
                  <Link
                    to="/privacy-policy"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms-of-service"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cookie-policy"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h3 className="text-card-foreground mb-4 text-xs font-semibold tracking-wider uppercase sm:mb-6 sm:text-sm">
                Connect
              </h3>
              <ul className="space-y-2 sm:space-y-3">
                <li>
                  <a
                    href="https://www.facebook.com/monekoai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    Facebook
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.instagram.com/moneko_ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href="https://x.com/moneko_ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    X
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:hello@moneko.io"
                    className="text-muted-foreground hover:text-primary touch-manipulation text-sm transition-colors active:scale-95 sm:text-base"
                  >
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-border mt-12 flex flex-col border-t pt-6 sm:mt-14 sm:pt-8 md:mt-16 md:flex-row md:items-center md:justify-between">
            <p className="text-muted-foreground mb-3 text-xs sm:mb-4 sm:text-sm md:mb-0">
              © 2025 Moneko. All rights reserved.
            </p>

            {/* Social Icons */}
            <div className="flex space-x-4 sm:space-x-6">
              <a
                href="https://www.facebook.com/monekoai/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Moneko on Facebook"
                className="text-muted-foreground hover:text-primary touch-manipulation transition-colors active:scale-95"
              >
                <FontAwesomeIcon
                  icon={faFacebook}
                  className="h-4 w-4 sm:h-5 sm:w-5"
                />
              </a>
              <a
                href="https://x.com/moneko_ai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Moneko on X"
                className="text-muted-foreground hover:text-primary touch-manipulation transition-colors active:scale-95"
              >
                <FontAwesomeIcon icon={faX} className="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
              <a
                href="https://www.instagram.com/moneko_ai/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Moneko on Instagram"
                className="text-muted-foreground hover:text-primary touch-manipulation transition-colors active:scale-95"
              >
                <FontAwesomeIcon
                  icon={faInstagram}
                  className="h-4 w-4 sm:h-5 sm:w-5"
                />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
