"use client";

import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

import homeFaqData from "@/data/home/home-faq.json";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";

export const DISCORD_URL = "https://discord.gg/M2Dgujvtze";

const META_TITLE = "Moneko - AI Budgeting App & Expense Tracker";
const META_DESCRIPTION =
  "The AI financial assistant that chats with you. Track spending, manage pockets, and plan with AI-right from WhatsApp or our dedicated app.";
const META_KEYWORDS =
  "budgeting app, expense tracker, AI finance, whatsapp budget, pocket budgeting, envelope system, joint finances";

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
          description:
            "Moneko is an AI-powered budgeting app and expense tracker available on WhatsApp, iOS, Android, and Web.",
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
          description:
            "Moneko helps people budget better with AI-assisted planning, WhatsApp capture, and smart expense tracking.",
          publisher: { "@id": "https://moneko.io/#organization" },
        },
        {
          "@type": "WebPage",
          "@id": pageUrl,
          url: pageUrl,
          name: META_TITLE,
          description: META_DESCRIPTION,
          isPartOf: { "@id": "https://moneko.io/#website" },
          inLanguage: "en-US",
        },
        {
          "@type": "SoftwareApplication",
          "@id": "https://moneko.io/#software",
          name: "Moneko",
          operatingSystem: "Android, iOS, Web",
          applicationCategory: "FinanceApplication",
          description:
            "AI budgeting app and expense tracker that lets you manage finances via WhatsApp or a dedicated app.",
          url: "https://moneko.io",
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
          mainEntity: homeFaqData.map((item) => ({
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
