"use client";

import { createFileRoute } from "@tanstack/react-router";
import "@/types/route-types";
import { HomeHeader } from "@/components/index/header";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";
import { Helmet } from "@dr.pogodin/react-helmet";

// V2 Components
import { HeroV2 } from "@/components/homepage/v2/hero-v2";
import { FeaturesSection } from "@/components/homepage/v2/features-section";
import { ComparisonTable } from "@/components/homepage/v2/comparison-table";
import { CTASection } from "@/components/homepage/v2/cta-section";
import { HowItWorksSection } from "@/components/homepage/v2/how-it-works-section";
import { CaptureSection } from "@/components/homepage/v2/capture-section";
import { WidgetsSection } from "@/components/homepage/v2/widgets-section";

// Existing Components
import FAQSection from "@/components/homepage/new/faq-section";
import { Footer } from "@/components/homepage/footer";
import AmbientHalo from "@/components/ui/ambient-halo";
import { Separator } from "@/components/ui/separator";

// Discord URL for community link
export const DISCORD_URL = "https://discord.gg/M2Dgujvtze";

const META_TITLE = "Moneko - AI Budgeting App & Expense Tracker";
const META_DESCRIPTION = "The AI financial assistant that chats with you. Track spending, manage pockets, and plan with AI—right from WhatsApp or our dedicated app.";
const META_KEYWORDS = "budgeting app, expense tracker, AI finance, whatsapp budget, pocket budgeting, envelope system, joint finances";

export const Route = createFileRoute("/")({
  component: HomePage,
  staticData: () => ({}),
  head: () => {
    const pageUrl = getCanonicalUrl("/");
    const meta = seo({
      title: META_TITLE,
      description: META_DESCRIPTION,
      keywords: META_KEYWORDS,
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
  const pageUrl = getCanonicalUrl("/");
  
  // Structured data (Schema.org)
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://moneko.io/#organization",
        "name": "Moneko",
        "alternateName": "Moneko App",
        "url": "https://moneko.io",
        "description": META_DESCRIPTION,
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
        "name": META_TITLE,
        "description": META_DESCRIPTION,
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
        "operatingSystem": "iOS, Android, Web",
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
        "description": META_DESCRIPTION
      }
    ]
  };

  return (
    <div className="relative min-h-screen bg-background font-sans selection:bg-primary/20">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <AmbientHalo />

      <HomeHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <HeroV2 />
        
        {/* Social Proof / Trust (Optional separator or keep it clean) */}
    
        {/* Core Features Bento Grid (Pockets, Households, Insights) */}
        <FeaturesSection />

            {/* Deep Dive 2: Capture (The Magic) */}
        <CaptureSection />

            {/* Deep Dive 1: How it Works (Workflow) */}
        <HowItWorksSection />

        {/* Deep Dive 3: Widgets (Visual Appeal) */}
        <WidgetsSection />

        {/* Deep Dive 4: Comparison (Why us) */}
        <ComparisonTable />

        <FAQSection />

        <CTASection />
      </main>

      <Footer />
    </div>
  );
}