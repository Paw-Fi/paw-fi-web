"use client";

import React, { Suspense } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { useDeviceType } from "@/hooks/use-device-type";
import { HomeHeader } from "@/components/index/header";
import { AISearchInput } from "@/components/ui/ai-search-input";
import AmbientHalo from "@/components/ui/ambient-halo";
import { disableAnimationsOnMobile } from "../../utils/disable-framer-motion-mobile";
import { MotionGlobalConfig } from "framer-motion";
import { Helmet } from "@dr.pogodin/react-helmet";
const ReusableHomePageDeferredContent = React.lazy(() =>
  import("@/components/index/reusable-home-page-deferred-content").then(
    (module) => ({
      default: module.ReusableHomePageDeferredContent,
    }),
  ),
);

export interface HomePageVariant {
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
            className="mb-8 text-center sm:mb-12 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
          >
            <Link to={variant.hero.ctaRoute}>
              <button className="bg-primary hover:bg-primary/90 text-primary-foreground transform rounded-xl px-8 py-4 text-lg font-semibold shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl">
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

      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
            <div className="bg-muted h-[1200px] w-full animate-pulse rounded-3xl" />
          </div>
        }
      >
        <ReusableHomePageDeferredContent variant={variant} />
      </Suspense>
    </div>
  );
}
