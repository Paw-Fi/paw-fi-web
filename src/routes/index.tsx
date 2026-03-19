"use client";

import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

import { getMainGeoLandingPage } from "@/lib/geo-landing-pages";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";

export const DISCORD_URL = "https://discord.gg/M2Dgujvtze";

const mainLandingPage = getMainGeoLandingPage();

export const Route = createFileRoute("/")({
  component: lazyRouteComponent(
    () => import("@/components/performance/home-page-route-component"),
    "HomePageRouteComponent",
  ),
  staticData: () => ({}),
  head: () => {
    const pageUrl = getCanonicalUrl("/");
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://moneko.io/#organization",
          name: "Moneko",
          url: "https://moneko.io",
          logo: "https://moneko.io/logo192.png",
          description: mainLandingPage.organizationDescription,
          sameAs: [
            "https://x.com/moneko_ai",
            "https://www.linkedin.com/company/moneko-ai",
            "https://www.instagram.com/moneko_ai",
            "https://www.facebook.com/moneko-ai",
          ],
        },
        {
          "@type": "WebSite",
          "@id": "https://moneko.io/#website",
          name: "Moneko",
          url: "https://moneko.io",
          description: mainLandingPage.websiteDescription,
          publisher: { "@id": "https://moneko.io/#organization" },
        },
        {
          "@type": "WebPage",
          "@id": pageUrl,
          url: pageUrl,
          name: mainLandingPage.title,
          description: mainLandingPage.description,
          isPartOf: { "@id": "https://moneko.io/#website" },
          inLanguage: "en-US",
        },
        {
          "@type": "SoftwareApplication",
          "@id": "https://moneko.io/#software",
          name: "Moneko",
          alternateName: mainLandingPage.softwareAlternateNames,
          operatingSystem: "Android, iOS, Web",
          applicationCategory: "FinanceApplication",
          applicationSubCategory: "BudgetingApplication",
          description: mainLandingPage.softwareDescription,
          url: "https://moneko.io",
          featureList: mainLandingPage.softwareFeatureList,
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            ratingCount: "50",
            bestRating: "5",
          },
        },
        {
          "@type": "FAQPage",
          "@id": `${pageUrl}#faq`,
          mainEntity: mainLandingPage.faqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        },
      ],
    };

    const meta = seo({
      title: mainLandingPage.title,
      description: mainLandingPage.description,
      keywords: mainLandingPage.keywords,
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    return {
      meta,
      links: [
        { rel: "canonical", href: pageUrl },
        { rel: "preconnect", href: "https://moneko.io" },
        {
          rel: "preload",
          href: "/logo192.webp",
          as: "image",
          type: "image/webp",
          fetchPriority: "high",
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});
