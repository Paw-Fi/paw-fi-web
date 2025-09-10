"use client";

import React, { Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import aiChatAnimation from "@/assets/videos/AI-Chat.json";
import badgeUnlockAnimation from "@/assets/videos/Badge-Unlock.json";
import catCoin from "@/assets/images/icon.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faPlus,
  faChevronDown,
  faPlay,
} from "@fortawesome/free-solid-svg-icons";
import { faFacebook, faInstagram } from "@fortawesome/free-brands-svg-icons";
import { faX } from "@fortawesome/free-solid-svg-icons";
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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import AmbientHalo from "@/components/ui/ambient-halo";
import { disableAnimationsOnMobile } from "../../utils/disable-framer-motion-mobile";
import { MotionGlobalConfig } from "framer-motion";
import { Helmet } from "@dr.pogodin/react-helmet";
import { FaqSection } from "@/components/ui/faq-section";
import { EarlyAccessSection } from "@/components/index/early-access-section";
import faqData from "@/data/home/home-faq.json";

// Lazy load Lottie animations for better performance
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

interface HomePageVariant {
  meta: {
    title: string;
    description: string;
    keywords: string;
  };
  hero: {
    title: string;
    subtitle: string;
    ctaText: string;
    ctaRoute: string;
    chatSuggestions: string[];
  };
  videoSection: {
    title: string;
    subtitle: string;
    videoUrl: string;
    poster: string;
  };
  features: Array<{
    title: string;
    description: string;
    icon: string;
    route: string;
  }>;
  lessons: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
  benefits: string[];
}

interface ReusableHomePageProps {
  variant: HomePageVariant;
  canonicalUrl: string;
}

function FeatureCard({
  title,
  description,
  icon,
  route,
}: {
  title: string;
  description: string;
  icon: string;
  route: string;
}) {
  return (
    <Card className="group border-border bg-card hover:bg-accent/50 h-full touch-manipulation transition-all duration-200 ease-out active:scale-[0.98]">
      <Link to={route} className="flex h-full flex-col">
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
            Get Started
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

function LessonCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <Card className="group border-border bg-card hover:bg-accent/50 h-full touch-manipulation transition-all duration-200 ease-out active:scale-[0.98]">
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
    </Card>
  );
}

export default function ReusableHomePage({
  variant,
  canonicalUrl,
}: ReusableHomePageProps) {
  const { isMobile } = useDeviceType();
  disableAnimationsOnMobile();

  // Skip complex animations on mobile for performance
  if (isMobile) {
    MotionGlobalConfig.skipAnimations = true;
  }

  return (
    <div className="relative min-h-screen bg-transparent">
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{variant.meta.title}</title>
        <meta name="description" content={variant.meta.description} />
        <meta name="keywords" content={variant.meta.keywords} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={variant.meta.title} />
        <meta property="og:description" content={variant.meta.description} />
        <meta property="og:image" content="https://moneko.io/og-img.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="628" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:site_name" content="Moneko" />

        {/* Twitter / X */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={variant.meta.title} />
        <meta name="twitter:description" content={variant.meta.description} />
        <meta name="twitter:image" content="https://moneko.io/og-img.png" />
        <meta name="twitter:site" content="@moneko_ai" />
        <meta name="twitter:creator" content="@moneko_ai" />

        {/* Canonical Link */}
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      <AmbientHalo />

      {/* Hidden H1 for SEO */}
      <h1 className="sr-only">{variant.meta.title}</h1>

      {/* Navigation */}
      <nav className="border-border sticky top-0 z-50 border-b bg-white/10 backdrop-blur-md">
        <HomeHeader />
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-4 pt-20 pb-12 sm:px-6 sm:pt-24 sm:pb-16 md:pt-32 md:pb-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Heading */}
          <div className="mb-8 text-center sm:mb-12 md:mb-16">
            <motion.h2
              className="text-foreground mb-4 text-3xl leading-tight font-bold tracking-tight sm:mb-6 sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              {variant.hero.title}
            </motion.h2>

            <motion.p
              className="text-muted-foreground dark:text-moneko-foreground mx-auto mb-8 max-w-5xl text-base leading-relaxed font-light sm:mb-10 sm:text-lg md:mb-12 md:text-xl lg:text-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            >
              {variant.hero.subtitle}
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
              placeholder="Ask about passive income strategies, compound interest, or building wealth..."
              suggestions={variant.hero.chatSuggestions}
            />
          </motion.div>

          {/* CTA Button */}
          <motion.div
            className="text-center mb-8 sm:mb-12 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
          >
            <Link to={variant.hero.ctaRoute}>
              <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
                {variant.hero.ctaText}
                <FontAwesomeIcon
                  icon={faArrowRight}
                  className="ml-2"
                  aria-hidden="true"
                />
              </button>
            </Link>
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
              {variant.videoSection.title}
            </motion.h2>
            <motion.p
              className="text-muted-foreground dark:text-moneko-foreground mx-auto max-w-3xl text-base leading-relaxed sm:text-lg md:text-xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {variant.videoSection.subtitle}
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
                      24/7 Moneko AI Finance Coach
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-sm leading-relaxed sm:text-base feature-summary">
                      Get instant, personalized advice on budgeting, investing,
                      goal tracking, and wealth building from Moneko's expert AI 
                      trained by certified financial professionals.
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
                      Smart Goal Tracking & Gamified Learning
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-sm leading-relaxed sm:text-base feature-summary">
                      Stay motivated with Moneko's achievement system, visual goal tracking,
                      and XP rewards as you build wealth and achieve financial milestones
                      through personalized learning paths.
                    </CardDescription>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Lessons Section */}
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
              Master the essential concepts and strategies for building sustainable
              passive income without complex trading or market timing.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:gap-8 lg:grid-cols-3">
            {variant.lessons.slice(0, 2).map((lesson, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <LessonCard {...lesson} />
              </motion.div>
            ))}

            {/* Explore More Card */}
            {variant.lessons.length > 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="group border-border bg-card hover:bg-accent/50 h-full touch-manipulation transition-all duration-200 active:scale-[0.98]">
                  <Link
                    to="/dashboard/learning"
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
                      View all {variant.lessons.length} foundational
                      courses designed to build your financial expertise.
                    </CardDescription>
                  </Link>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-muted/30 relative z-10 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h2
            className="text-foreground mb-8 text-2xl leading-tight font-bold sm:mb-12 sm:text-3xl md:text-4xl lg:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Why Choose Our Approach?
          </motion.h2>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {variant.benefits.map((benefit, index) => (
              <motion.div
                key={index}
                className="bg-background p-6 rounded-lg border border-border"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <p className="text-foreground font-medium">{benefit}</p>
              </motion.div>
            ))}
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
                <strong>Moneko</strong> - Your trusted AI personal finance coach for smart budgeting, 
                goal tracking, investing education, and building lasting wealth.
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
                    to="/dashboard/learning/your-2025-guide-to-investing"
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