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

// Existing Components
import FAQSection from "@/components/homepage/new/faq-section";
import { Footer } from "@/components/homepage/footer";
import AmbientHalo from "@/components/ui/ambient-halo";

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
    <div className="relative min-h-screen bg-moneko-background">
      <Helmet>
        <title>{META_TITLE}</title>
        <meta name="description" content={META_DESCRIPTION} />
        <meta name="keywords" content={META_KEYWORDS} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        
        {/* Open Graph Meta Tags for Social Sharing */}
        <meta property="og:title" content={META_TITLE} />
        <meta property="og:description" content={META_DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content="https://moneko.io/og-img.png" />
        <meta property="og:site_name" content="Moneko" />
        <meta property="og:locale" content="en_US" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={META_TITLE} />
        <meta name="twitter:description" content={META_DESCRIPTION} />
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

      {/* Main Content Sections */}
      <HeroV2 />
      
      <FeaturesSection />

      <ComparisonTable />

      <FAQSection />

      <CTASection />

      {/* Footer */}
      <Footer />
    </div>
  );
}