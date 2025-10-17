"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import "@/types/route-types";
import { HomeHeader } from "@/components/index/header";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";
import { Helmet } from "@dr.pogodin/react-helmet";
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
import AmbientHalo from "@/components/ui/ambient-halo";
import { DashboardShowcase } from "@/components/homepage/dashboard-showcase";

// Discord URL for community link
export const DISCORD_URL = "https://discord.gg/M2Dgujvtze";

// Use budgeting-focused variant for homepage messaging
const contentVariant = "main";
const pageData = passiveIncomeVariants[contentVariant];

export const Route = createFileRoute("/")({
  component: HomePage,
  staticData: () => ({}),
  head: () => {
    const pageUrl = getCanonicalUrl("/");
    const meta = seo({
      title: pageData.meta.title,
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

export default function HomePage() {
  const navigate = useNavigate();
  const pageUrl = getCanonicalUrl("/");

  // Backup check for password recovery flow (primary check is in AuthProvider)
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    const type = hashParams.get('type') || queryParams.get('type');
    
    if (type === 'recovery') {
      window.location.href = '/reset-password' + window.location.hash;
    }
  }, []);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://moneko.io/#organization",
        "name": "Moneko",
        "alternateName": "Moneko App",
        "url": "https://moneko.io",
        "description": "AI-powered personal finance coach and budgeting app helping users take control of their money",
        "logo": {
          "@type": "ImageObject",
          "url": "https://moneko.io/og-img.png",
          "width": "1200",
          "height": "630"
        },
        "sameAs": [
          "https://www.facebook.com/moneko-ai",
          "https://x.com/moneko_ai",
          "https://www.linkedin.com/company/moneko-ai",
          "https://www.instagram.com/moneko_ai"
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://moneko.io/#website",
        "name": "Moneko",
        "alternateName": "Moneko - AI Personal Finance Coach",
        "url": "https://moneko.io",
        "description": "The official website of Moneko, your AI personal finance coach and budgeting app",
        "publisher": { "@id": "https://moneko.io/#organization" },
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://moneko.io/search?q={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "WebPage",
        "@id": pageUrl,
        "url": pageUrl,
        "name": pageData.meta.title,
        "description": pageData.meta.description,
        "isPartOf": { "@id": "https://moneko.io/#website" },
        "inLanguage": "en-US",
        "about": {
          "@type": "Thing",
          "name": "Personal Finance Management",
          "description": "AI-powered budgeting and financial education"
        }
      },
      {
        "@type": "SoftwareApplication",
        "name": "Moneko",
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "Web, iOS, Android",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "ratingCount": "1250"
        },
        "description": "AI-powered personal finance coach and budgeting app"
      }
    ]
  };

  return (
    <div className="relative min-h-screen bg-moneko-background">
      <Helmet>
        <title>{pageData.meta.title}</title>
        <meta name="description" content={pageData.meta.description} />
        <meta name="keywords" content={pageData.meta.keywords} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        
        {/* Open Graph Meta Tags for Social Sharing */}
        <meta property="og:title" content={pageData.meta.title} />
        <meta property="og:description" content={pageData.meta.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://moneko.io/og-img.png" />
        <meta property="og:site_name" content="Moneko" />
        <meta property="og:locale" content="en_US" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageData.meta.title} />
        <meta name="twitter:description" content={pageData.meta.description} />
        <meta name="twitter:image" content="https://moneko.io/og-img.png" />
        <meta name="twitter:site" content="@monekoapp" />
        <meta name="twitter:creator" content="@monekoapp" />
        
        {/* Additional Brand & SEO Meta Tags */}
        <meta name="application-name" content="Moneko" />
        <meta name="apple-mobile-web-app-title" content="Moneko" />
        <meta name="author" content="Moneko" />
        <meta name="publisher" content="Moneko" />
        <meta name="theme-color" content="#8b5cf6" />
        <meta name="msapplication-TileColor" content="#8b5cf6" />
        
        {/* Structured Data */}
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <AmbientHalo />

      {/* Header */}
      <nav className="border-border sticky top-0 z-50 border-b bg-white/10 backdrop-blur-md">
        <HomeHeader />
      </nav>

      {/* Hero Section - Transparent background with halo */}
      <section className="relative">
        <HeroSection data={pageData} />
      </section>

      {/* Video Section */}
      {/* <section className="relative bg-section-bg-light">
        <VideoSection data={pageData} />
      </section> */}

      {/* Features Bento Grid Section */}
      <section className="relative bg-section-bg-light">
        <FeaturesBentoGrid />
      </section>

      {/* DashboardShowcase Section */}
      <section className="relative bg-section-bg-light">
        <DashboardShowcase />
      </section>

      {/* Three Steps Section */}
      <section className="relative bg-section-bg-light">
        <ThreeStepsSection data={pageData} />
      </section>

      {/* Testimonials Section */}
      {/* <TestimonialsSection /> */}

      {/* Expert-Led Lessons Section */}
      <section className="relative bg-section-bg-light">
        <ExpertLessonsSection data={pageData} />
      </section>

      {/* FAQ Section */}
      <section className="relative">
        <FAQSection />
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}