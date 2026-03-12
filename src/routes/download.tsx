"use client";

import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import type { FAQItem } from "@/components/homepage/new/faq-section";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";

const META_TITLE = "Download Moneko - iOS & Android";
const META_DESCRIPTION = "Download Moneko on your iPhone or Android device. Experience the future of AI budgeting with seamless sync across all your devices.";
const META_KEYWORDS =
  "download moneko, moneko app, budgeting app ios, budgeting app android, expense tracker app, digital envelope budgeting app, couples budgeting app, whatsapp expense tracker";

const downloadFaqItems: FAQItem[] = [
  {
    id: "download-platforms",
    question: "Is Moneko available on iPhone and Android?",
    answer: "Yes. You can download Moneko for iOS or Android from the links on this page.",
  },
  {
    id: "download-what-next",
    question: "What can I do after I download Moneko?",
    answer: "You can track expenses, organize budgets with the Pockets system, and manage shared spending with Household Mode.",
  },
  {
    id: "download-household",
    question: "Does Moneko support shared budgets for couples or households?",
    answer: "Yes. Moneko includes Household Mode for shared bills and joint expense tracking.",
  },
];

export const Route = createFileRoute("/download")({
  component: lazyRouteComponent(() => import("@/components/performance/download-route-component"), "DownloadRouteComponent"),
  head: () => {
    const pageUrl = getCanonicalUrl("/download");
    const meta = seo({
      title: META_TITLE,
      description: META_DESCRIPTION,
      keywords: META_KEYWORDS,
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": pageUrl,
          url: pageUrl,
          name: META_TITLE,
          description: META_DESCRIPTION,
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://moneko.io" },
              { "@type": "ListItem", position: 2, name: "Download" },
            ],
          },
        },
        {
          "@type": "SoftwareApplication",
          name: "Moneko",
          applicationCategory: "FinanceApplication",
          operatingSystem: "iOS, Android",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Is Moneko available on iPhone and Android?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. You can download Moneko for iOS or Android from the links on this page.",
              },
            },
            {
              "@type": "Question",
              name: "What can I do after I download Moneko?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "You can track expenses, organize budgets with the Pockets system, and manage shared spending with Household Mode.",
              },
            },
            {
              "@type": "Question",
              name: "Does Moneko support shared budgets for couples or households?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. Moneko includes Household Mode for shared bills and joint expense tracking.",
              },
            },
          ],
        },
      ],
    };

    return {
      meta,
      links: [{ rel: "canonical", href: pageUrl }],
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});
