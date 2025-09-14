"use client";

import { createFileRoute } from "@tanstack/react-router";
import "@/types/route-types";
import { motion, MotionGlobalConfig } from "framer-motion";
import { Helmet } from "@dr.pogodin/react-helmet";
import { HomeHeader } from "@/components/index/header";
import AmbientHalo from "@/components/ui/ambient-halo";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { useDeviceType } from "@/hooks/use-device-type";
import { disableAnimationsOnMobile } from "../../utils/disable-framer-motion-mobile";
import { useEffect } from "react";

// Dynamic content system
import passiveIncomeVariants from "@/data/home/passive-income-variants.json";

// Direct imports to avoid lazy loading issues
import HeroSection from "@/components/homepage/new/hero-section";
import { DashboardShowcase } from "@/components/homepage/dashboard-showcase";
import VideoSection from "@/components/homepage/new/video-section";
import ThreeStepsSection from "@/components/homepage/new/three-steps-section";
import TestimonialsSection from "@/components/homepage/new/testimonials-section";
import ExpertLessonsSection from "@/components/homepage/new/expert-lessons-section";
import FAQSection from "@/components/homepage/new/faq-section";
import { Footer } from "@/components/homepage/footer";

// Discord URL for community link
export const DISCORD_URL = "https://discord.gg/M2Dgujvtze";

// Use time to wealth variant
const contentVariant = "time-to-wealth";
const pageData = passiveIncomeVariants[contentVariant];

export const Route = createFileRoute("/passive-income/time-to-wealth")({
  component: TimeToWealthPage,
  staticData: () => ({}),
  head: () => {
    const pageUrl = getCanonicalUrl("/passive-income/time-to-wealth");
    const meta = seo({
      title: pageData.meta.title,
      description: pageData.meta.description,
      keywords: pageData.meta.keywords,
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    return {
      meta,
      link: [
        { rel: "canonical", href: pageUrl },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        { rel: "preload", href: "/logo192.webp", as: "image", type: "image/webp" },
      ],
    };
  },
});

export default function TimeToWealthPage() {
  const { isMobile } = useDeviceType();
  
  useEffect(() => {
    disableAnimationsOnMobile();
    if (isMobile) {
      // Disable framer motion animations on mobile for performance
      MotionGlobalConfig.skipAnimations = true;
    }
  }, [isMobile]);

  return (
    <div className="relative min-h-screen bg-background">
      <Helmet>
        <title>{pageData.meta.title}</title>
        <meta name="description" content={pageData.meta.description} />
        <meta name="keywords" content={pageData.meta.keywords} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <AmbientHalo />

      {/* Header */}
      <nav className="border-border sticky top-0 z-50 border-b bg-white/10 backdrop-blur-md">
        <HomeHeader />
      </nav>

      {/* Hero Section */}
      <HeroSection data={pageData} />

      {/* Dashboard Showcase Section */}
      <DashboardShowcase />

      {/* Video Section */}
      <VideoSection data={pageData} />

      {/* Three Steps Section */}
      <ThreeStepsSection data={pageData} />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* Expert-Led Lessons Section */}
      <ExpertLessonsSection data={pageData} />

      {/* FAQ Section */}
      <FAQSection />

      {/* Footer */}
      <Footer />
    </div>
  );
}