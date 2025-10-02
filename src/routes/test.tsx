"use client";

import { createFileRoute } from "@tanstack/react-router";
import "@/types/route-types";
import { HomeHeader } from "@/components/index/header";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";
import { Helmet } from "@dr.pogodin/react-helmet";
import { motion } from "framer-motion";
// Dynamic content system
import passiveIncomeVariants from "@/data/home/passive-income-variants.json";

// Direct imports to avoid lazy loading issues
import HeroSection from "@/components/homepage/new/hero-section";
import { FeaturesBentoGrid } from "@/components/homepage/features-bento-grid";
import VideoSection from "@/components/homepage/new/video-section";
import ThreeStepsSection from "@/components/homepage/new/three-steps-section";
import ExpertLessonsSection from "@/components/homepage/new/expert-lessons-section";
import FAQSection from "@/components/homepage/new/faq-section";
import { Footer } from "@/components/homepage/footer";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import { DashboardShowcase } from "@/components/homepage/dashboard-showcase";
import { DotPattern } from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";

// Discord URL for community link
export const DISCORD_URL = "https://discord.gg/M2Dgujvtze";

// Use budgeting-focused variant for homepage messaging
const contentVariant = "main";
const pageData = passiveIncomeVariants[contentVariant];

export const Route = createFileRoute("/test-home-beams")({
  component: TestHomeBeamsPage,
  staticData: () => ({}),
  head: () => {
    const pageUrl = getCanonicalUrl("/test-home-beams");
    const meta = seo({
      title: "Test Home with Beams - " + pageData.meta.title,
      description: pageData.meta.description,
      keywords: pageData.meta.keywords,
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    return {
      meta,
      links: [
        { rel: "canonical", href: pageUrl },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        { rel: "preload", href: "/logo192.webp", as: "image", type: "image/webp" },
      ],
    };
  },
});

export default function TestHomeBeamsPage() {
  const pageUrl = getCanonicalUrl("/test-home-beams");
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://moneko.io/#organization",
        "name": "Moneko",
        "url": "https://moneko.io",
        "logo": {
          "@type": "ImageObject",
          "url": "https://moneko.io/og-img.png",
          "width": "1200",
          "height": "630"
        }
      },
      {
        "@type": "WebSite",
        "@id": "https://moneko.io/#website",
        "name": "Moneko",
        "url": "https://moneko.io",
        "publisher": { "@id": "https://moneko.io/#organization" }
      },
      {
        "@type": "WebPage",
        "@id": pageUrl,
        "url": pageUrl,
        "name": pageData.meta.title,
        "description": pageData.meta.description,
        "isPartOf": { "@id": "https://moneko.io/#website" },
        "inLanguage": "en-US"
      }
    ]
  };

  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-900 overflow-hidden">
      <Helmet>
        <title>Test Home with Beams - {pageData.meta.title}</title>
        <meta name="description" content={pageData.meta.description} />
        <meta name="keywords" content={pageData.meta.keywords} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      {/* Background Beams with Collision - same as early-access */}
      <BackgroundBeamsWithCollision className="fixed inset-0 z-0 h-screen">
      </BackgroundBeamsWithCollision>

      {/* Dotted grid pattern overlay - same as early-access */}
      <DotPattern
        className={cn(
          "fixed inset-0 opacity-30 dark:opacity-15 pointer-events-none z-[1]",
          "[mask-image:radial-gradient(1200px_circle_at_center,white,transparent)]"
        )}
        cr={1}
        cx={20}
        cy={20}
      />

      {/* Header */}
      <nav className="border-border sticky top-0 z-50 border-b bg-white/10 backdrop-blur-md">
        <HomeHeader />
      </nav>

      {/* Hero Section - Transparent background with beams */}
      <motion.section
        className="relative z-10"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
      >
        <HeroSection data={pageData} />
      </motion.section>

      {/* Video Section */}
      <motion.section
        className="relative z-10 bg-white/80 dark:bg-gray-900/80"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
      >
        <VideoSection data={pageData} />
      </motion.section>

      {/* Features Bento Grid Section */}
      <motion.section
        className="relative z-10 bg-white/80 dark:bg-gray-900/80"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
      >
        <FeaturesBentoGrid />
      </motion.section>

      {/* DashboardShowcase Section */}
      <motion.section
        className="relative z-10 bg-white/80 dark:bg-gray-900/80"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
      >
        <DashboardShowcase />
      </motion.section>

      {/* Three Steps Section */}
      <motion.section
        className="relative z-10 bg-white/80 dark:bg-gray-900/80"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
      >
        <ThreeStepsSection data={pageData} />
      </motion.section>

      {/* Testimonials Section */}
      {/* <TestimonialsSection /> */}

      {/* Expert-Led Lessons Section */}
      <motion.section
        className="relative z-10 bg-white/80 dark:bg-gray-900/80"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
      >
        <ExpertLessonsSection data={pageData} />
      </motion.section>

      {/* FAQ Section */}
      <motion.section
        className="relative z-10"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
      >
        <FAQSection />
      </motion.section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
