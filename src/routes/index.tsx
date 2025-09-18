"use client";

import { createFileRoute } from "@tanstack/react-router";
import "@/types/route-types";
import { HomeHeader } from "@/components/index/header";
import { Helmet } from "@dr.pogodin/react-helmet";
import AmbientHaloLazy from "@/components/ui/ambient-halo-lazy";
import { getCanonicalUrl } from "@/utils/canonical";
// Dynamic content system
import passiveIncomeVariants from "@/data/home/passive-income-variants.json";

// Direct imports to avoid lazy loading issues
import HeroSection from "@/components/homepage/new/hero-section";
import { DashboardShowcase } from "@/components/homepage/dashboard-showcase";
import VideoSection from "@/components/homepage/new/video-section";
import ThreeStepsSection from "@/components/homepage/new/three-steps-section";
import ExpertLessonsSection from "@/components/homepage/new/expert-lessons-section";
import FAQSection from "@/components/homepage/new/faq-section";
import { Footer } from "@/components/homepage/footer";

// Discord URL for community link
export const DISCORD_URL = "https://discord.gg/M2Dgujvtze";

// For now, use the first variant (high-interest-portfolios)
const contentVariant = "high-interest-portfolios";
const pageData = passiveIncomeVariants[contentVariant];

export const Route = createFileRoute("/")({
  component: HomePage,
  staticData: () => ({}),
  head: () => {
    const pageUrl = getCanonicalUrl("/");
    
    // Let Helmet handle the basic meta tags, we'll handle performance-critical preloads here
    return {
      links: [
        { rel: "canonical", href: pageUrl },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        { rel: "preload", href: "/logo192.webp", as: "image", type: "image/webp" },
      ],
    };
  },
});

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-background">
      <Helmet>
        <title>{pageData.meta.title}</title>
        <meta name="description" content={pageData.meta.description} />
        <meta name="keywords" content={pageData.meta.keywords} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <AmbientHaloLazy />

      {/* Header */}
      <nav className="border-border sticky top-0 z-50 border-b bg-white/10 backdrop-blur-md">
        <HomeHeader />
      </nav>

      {/* Hero Section - Transparent background with halo */}
      <section className="relative">
        <HeroSection data={pageData} />
      </section>

      {/* Dashboard Showcase Section */}
      <section className="relative bg-white/80 dark:bg-gray-900/80">
        <DashboardShowcase />
      </section>

      {/* Video Section */}
      <section className="relative bg-white/80 dark:bg-gray-900/80">
        <VideoSection data={pageData} />
      </section>

      {/* Three Steps Section */}
      <section className="relative bg-white/80 dark:bg-gray-900/80">
        <ThreeStepsSection data={pageData} />
      </section>

      {/* Testimonials Section */}
      {/* <TestimonialsSection /> */}

      {/* Expert-Led Lessons Section */}
      <section className="relative bg-white/80 dark:bg-gray-900/80">
        <ExpertLessonsSection data={pageData} />
      </section>

      {/* FAQ Section */}
      <section className="relative ">
        <FAQSection />
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}