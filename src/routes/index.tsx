"use client";

import React, { Suspense } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import "@/types/route-types";
import { motion, MotionGlobalConfig } from "framer-motion";
import { Helmet } from "@dr.pogodin/react-helmet";

// Lazy load Lottie animations for better performance
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

// Assets and icons
import catCoin from "@/assets/images/icon.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faPlay,
  faX,
  faShieldAlt,
  faTrophy,
  faGraduationCap,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { faFacebook, faInstagram } from "@fortawesome/free-brands-svg-icons";

// UI Components
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { OptimizedImage } from "@/components/seo/optimized-image";

// Custom Components
import { HomeHeader } from "@/components/index/header";
import { AISearchInput } from "@/components/ui/ai-search-input";
import { EarlyAccessSection } from "@/components/index/early-access-section";
import AmbientHalo from "@/components/ui/ambient-halo";

// New Homepage Components
import { HeroDashboardPreview } from "@/components/homepage/hero-dashboard-preview";
import { DashboardShowcase } from "@/components/homepage/dashboard-showcase";
import { FeaturesShowcase } from "@/components/homepage/features-showcase";
import { SocialProofMetrics } from "@/components/homepage/social-proof-metrics";
import { StreamlinedFAQ } from "@/components/homepage/streamlined-faq";

// Utils and data
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { useDeviceType } from "@/hooks/use-device-type";
import { disableAnimationsOnMobile } from "../utils/disable-framer-motion-mobile";
import basicLessonsData from "@/data/basic-lessons.json";
import { Footer } from "@/components/homepage/footer";
import { useEffect } from "react";

export const DISCORD_URL = "https://discord.gg/M2Dgujvtze";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => {
    const pageUrl = getCanonicalUrl("/");
    const title = "AI Finance Coach | Moneko | 50,000+ Users";
    const description =
      "The #1 Mint alternative! Join 50,000+ former Mint users who've saved $2.3M+ with Moneko's AI personal finance coach. Free budgeting app with automated investing, CFA-certified guidance, and 127% better returns. Start saving your first $1,000 in 90 days.";
    const keywords =
      "mint alternative, best mint alternative 2025, AI finance coach, personal finance app, budgeting app after mint, mint replacement, free budgeting app, investment advisor, robo advisor, financial planning, wealth building, CFA certified, financial education, money management, portfolio optimization, retirement planning, debt management, financial literacy, Y Combinator, SOC 2 certified, behavioral finance, compound interest calculator, emergency fund, financial goals, mint app replacement, budgeting app like mint";
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
          "@id": "https://moneko.io#organization",
          name: "Moneko",
          alternateName: "Moneko Finance",
          url: "https://moneko.io",
          logo: {
            "@type": "ImageObject",
            url: "https://moneko.io/logo192.png",
            width: 192,
            height: 192,
          },
          description:
            "AI-powered personal finance coach providing budgeting, investing, and wealth building guidance with certified financial professionals.",
          foundingDate: "2023",
          founders: [
            {
              "@type": "Person",
              name: "Moneko Team",
            },
          ],
          hasCredential: [
            {
              "@type": "EducationalOccupationalCredential",
              credentialCategory: "CFA Charter",
              recognizedBy: {
                "@type": "Organization",
                name: "CFA Institute",
              },
            },
            {
              "@type": "EducationalOccupationalCredential",
              credentialCategory: "CSC Certification",
              recognizedBy: {
                "@type": "Organization",
                name: "Canadian Securities Institute",
              },
            },
          ],
          knowsAbout: [
            "Personal Finance",
            "Investment Management",
            "Financial Planning",
            "Budgeting",
            "Wealth Building",
            "Portfolio Optimization",
            "Retirement Planning",
            "Debt Management",
            "Financial Education",
            "Behavioral Finance",
            "Risk Management",
            "Tax Planning",
          ],
          areaServed: ["Canada", "United States"],
          serviceType: "Financial Technology",
          award: ["Y Combinator Alumni", "SOC 2 Type II Certified"],
        },
        {
          "@type": "WebSite",
          "@id": "https://moneko.io#website",
          url: "https://moneko.io",
          name: "Moneko",
          description:
            "AI Finance Coach for budgeting, investing & wealth building",
          publisher: {
            "@id": "https://moneko.io#organization",
          },
          potentialAction: [
            {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate: "https://moneko.io/search?q={search_term_string}",
              },
              "query-input": "required name=search_term_string",
            },
          ],
        },
        {
          "@type": "SoftwareApplication",
          name: "Moneko - Best Mint Alternative AI Finance Coach",
          applicationCategory: "FinanceApplication",
          operatingSystem: ["Web", "iOS", "Android"],
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.9",
            ratingCount: "50000",
            bestRating: "5",
            worstRating: "1",
          },
          description:
            "AI-powered personal finance coach providing personalized budgeting, investing, and wealth building guidance.",
          featureList: [
            "AI Financial Coaching",
            "Personalized Budgeting",
            "Investment Portfolio Management",
            "Financial Goal Tracking",
            "Educational Courses",
            "Risk Assessment",
            "Debt Management",
            "Retirement Planning",
          ],
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How secure is my financial data with Moneko?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Your financial security is our top priority. We use bank-level 256-bit encryption, are SOC 2 Type II certified, and never store your banking credentials. All data is encrypted both in transit and at rest.",
              },
            },
            {
              "@type": "Question",
              name: "How accurate are Moneko's AI recommendations?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Our AI is trained by certified financial professionals (CFA, CSC, MBA) and uses advanced machine learning algorithms. Our recommendations have helped users save an average of $15,000+ and achieve 127% better portfolio performance.",
              },
            },
            {
              "@type": "Question",
              name: "Is Moneko really free to use?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes! Moneko offers a comprehensive free tier that includes AI financial coaching, basic budgeting tools, educational courses, and portfolio tracking. Premium features are available for advanced users.",
              },
            },
          ],
        },
        {
          "@type": "Service",
          "@id": "https://moneko.io#service",
          name: "AI Personal Finance Coaching",
          provider: {
            "@id": "https://moneko.io#organization",
          },
          serviceType: "Financial Coaching",
          description:
            "Personalized AI-powered financial coaching for budgeting, investing, and wealth building",
          areaServed: ["Canada", "United States"],
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Moneko Services",
            itemListElement: [
              {
                "@type": "Offer",
                itemOffered: {
                  "@type": "Service",
                  name: "AI Financial Coaching",
                  description: "Personalized financial guidance powered by AI",
                },
              },
              {
                "@type": "Offer",
                itemOffered: {
                  "@type": "Service",
                  name: "Investment Portfolio Management",
                  description: "AI-optimized portfolio construction and management",
                },
              },
              {
                "@type": "Offer",
                itemOffered: {
                  "@type": "Service",
                  name: "Financial Education",
                  description: "Comprehensive courses on personal finance topics",
                },
              },
            ],
          },
        },
      ],
    };

    return {
      meta,
      link: [{ rel: "canonical", href: pageUrl }],
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});

export default function HomePage() {
  const chatSuggestions = [
    "Help me set up a budget",
    "How do I start investing?",
    "What's the best savings account?",
    "How much should I save for retirement?",
    "Help me pay off debt faster",
    "What are ETFs and should I invest?",
  ];

  const { isMobile } = useDeviceType();
  
  // Apply mobile animation disabling
  useEffect(() => {
    disableAnimationsOnMobile();
    if (isMobile) {
      MotionGlobalConfig.skipAnimations = true;
    }
  }, [isMobile]);

  const title = "Best Mint Alternative 2024: AI Finance Coach | Moneko | 50,000+ Users";
  const description =
    "The #1 Mint alternative! Join 50,000+ former Mint users who've saved $2.3M+ with Moneko's AI personal finance coach. Free budgeting app with automated investing, CFA-certified guidance, and 127% better returns. Start saving your first $1,000 in 90 days.";

  return (
    <div className="relative min-h-screen bg-transparent">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Moneko" />
        <meta name="theme-color" content="#6366f1" />
        
        {/* Open Graph Tags */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://moneko.io/og-img.png" />
        <meta property="og:url" content="https://moneko.io" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Moneko" />
        
        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://moneko.io/og-img.png" />
        
        {/* Additional SEO Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Moneko" />
        <link rel="apple-touch-icon" href="/logo192.png" />
      </Helmet>

      <AmbientHalo />

      <nav className="border-border sticky top-0 z-50 border-b bg-white/10 backdrop-blur-md">
        <HomeHeader />
      </nav>

      {/* Hero Dashboard Preview */}
      <HeroDashboardPreview />

      {/* Video Demo Section */}
      <section className="relative z-10 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center sm:mb-10 md:mb-12">
            {isMobile ? (
              <>
                <h2 className="text-foreground mb-4 text-2xl leading-tight font-bold sm:mb-6 sm:text-3xl md:text-4xl lg:text-5xl">
                  Why 50,000+ Users Switched from Mint to Moneko's AI Finance Coach
                </h2>
                <p className="text-muted-foreground dark:text-moneko-foreground mx-auto max-w-3xl text-base leading-relaxed sm:text-lg md:text-xl">
                  Watch how <strong>Moneko's AI personal finance coach</strong> creates personalized budgeting strategies, automates investment portfolios, and helps users save their first $1,000 in 90 days. See why we're rated the <strong>#1 Mint alternative</strong> for intelligent financial planning.
                </p>
              </>
            ) : (
              <>
                <motion.h2
                  className="text-foreground mb-4 text-2xl leading-tight font-bold sm:mb-6 sm:text-3xl md:text-4xl lg:text-5xl"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                >
                  Why 50,000+ Users Switched from Mint to Moneko's AI Finance Coach
                </motion.h2>
                <motion.p
                  className="text-muted-foreground dark:text-moneko-foreground mx-auto max-w-3xl text-base leading-relaxed sm:text-lg md:text-xl"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  Watch how <strong>Moneko's AI personal finance coach</strong> creates personalized budgeting strategies, automates investment portfolios, and helps users save their first $1,000 in 90 days. See why we're rated the <strong>#1 Mint alternative</strong> for intelligent financial planning.
                </motion.p>
              </>
            )}
          </div>

          <Dialog>
            <DialogTrigger asChild>
              {isMobile ? (
                <div className="group border-border relative cursor-pointer touch-manipulation overflow-hidden rounded-xl border sm:rounded-2xl">
                  <div className="relative aspect-video w-full">
                    <video
                      className="h-full w-full object-cover"
                      src="/Moneko-onboard%20.webm"
                      poster="/video-poster.webp"
                      width={800}
                      height={450}
                      muted
                      autoPlay
                      loop
                      playsInline
                      preload="metadata"
                    />

                    {/* Text overlay container */}
                    <div className="absolute inset-0 flex items-center bg-gradient-to-r from-black/60 via-black/30 to-transparent">
                      <div className="max-w-2xl p-4 text-white sm:p-6 md:p-8 lg:p-12">
                        <h3 className="mb-3 text-lg leading-tight font-bold sm:mb-4 sm:text-xl md:text-2xl lg:text-3xl">
                          AI-Powered Budgeting & Investment Planning
                        </h3>
                        <p className="mb-4 text-sm leading-relaxed text-white/90 sm:mb-6 sm:text-base md:text-lg lg:text-xl">
                          See how our CFA-certified AI personal finance coach creates custom budget plans, automates investment portfolios, and helps you achieve financial goals faster than traditional budgeting apps.
                        </p>
                        <div className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 sm:gap-2 sm:text-base">
                          <FontAwesomeIcon
                            icon={faPlay}
                            className="text-xs sm:text-sm"
                          />
                          <span>Watch 3-Minute Demo</span>
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
                </div>
              ) : (
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
                      width={800}
                      height={450}
                      muted
                      autoPlay
                      loop
                      playsInline
                      preload="metadata"
                    />

                    {/* Text overlay container */}
                    <div className="absolute inset-0 flex items-center bg-gradient-to-r from-black/60 via-black/30 to-transparent">
                      <div className="max-w-2xl p-4 text-white sm:p-6 md:p-8 lg:p-12">
                        <h3 className="mb-3 text-lg leading-tight font-bold sm:mb-4 sm:text-xl md:text-2xl lg:text-3xl">
                          AI-Powered Budgeting & Investment Planning
                        </h3>
                        <p className="mb-4 text-sm leading-relaxed text-white/90 sm:mb-6 sm:text-base md:text-lg lg:text-xl">
                          See how our CFA-certified AI personal finance coach creates custom budget plans, automates investment portfolios, and helps you achieve financial goals faster than traditional budgeting apps.
                        </p>
                        <div className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 sm:gap-2 sm:text-base">
                          <FontAwesomeIcon
                            icon={faPlay}
                            className="text-xs sm:text-sm"
                          />
                          <span>Watch 3-Minute Demo</span>
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
              )}
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
                  width={1920}
                  height={1080}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </section>

   

      {/* Dashboard Showcase with Animated Beam */}
      <DashboardShowcase />

   {/* Social Proof Metrics */}
   <SocialProofMetrics />

      {/* Streamlined FAQ */}
      <StreamlinedFAQ />

      {/* Early Access Section */}
      {/* <EarlyAccessSection /> */}

      <Footer/>
    </div>
  );
}
