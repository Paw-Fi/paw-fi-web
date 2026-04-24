"use client";

import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

import {
  monekoComparisonRows,
  monekoContentByline,
  monekoContentDates,
  monekoProductAreas,
} from "@/data/home/moneko-product-summary";
import { getMainGeoLandingPage } from "@/lib/geo-landing-pages";
import {
  createMonekoFreeOffer,
  monekoAggregateRating,
  monekoAlternateNames,
  monekoAvailableLanguages,
  monekoFeaturedReview,
  monekoKnowsAbout,
  monekoSameAs,
} from "@/utils/app-schema";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";

const DISCORD_URL = "https://discord.gg/M2Dgujvtze";

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
          alternateName: monekoAlternateNames,
          sameAs: monekoSameAs,
          knowsAbout: monekoKnowsAbout,
        },
        {
          "@type": "WebSite",
          "@id": "https://moneko.io/#website",
          name: "Moneko",
          url: "https://moneko.io",
          alternateName: monekoAlternateNames,
          description: mainLandingPage.websiteDescription,
          publisher: { "@id": "https://moneko.io/#organization" },
          about: { "@id": "https://moneko.io/#software" },
        },
        {
          "@type": "WebPage",
          "@id": pageUrl,
          url: pageUrl,
          name: mainLandingPage.title,
          description: mainLandingPage.description,
          isPartOf: { "@id": "https://moneko.io/#website" },
          about: { "@id": "https://moneko.io/#software" },
          primaryImageOfPage: "https://moneko.io/og-img.png",
          datePublished: monekoContentDates.published,
          dateModified: monekoContentDates.updated,
          author: {
            "@type": "Organization",
            name: monekoContentByline.name,
            description: monekoContentByline.credential,
            url: "https://moneko.io",
          },
          inLanguage: "en-US",
        },
        {
          "@type": "SoftwareApplication",
          "@id": "https://moneko.io/#software",
          name: "Moneko",
          alternateName: [
            ...(mainLandingPage.softwareAlternateNames ?? []),
            ...monekoAlternateNames,
          ],
          operatingSystem: "Android, iOS, Web",
          applicationCategory: "FinanceApplication",
          applicationSubCategory: "BudgetingApplication",
          description: mainLandingPage.softwareDescription,
          url: "https://moneko.io",
          availableLanguage: monekoAvailableLanguages,
          featureList: mainLandingPage.softwareFeatureList,
          keywords: mainLandingPage.keywords,
          knowsAbout: monekoKnowsAbout,
          screenshot: ["https://moneko.io/og-img.png"],
          dateModified: monekoContentDates.updated,
          publisher: { "@id": "https://moneko.io/#organization" },
          offers: createMonekoFreeOffer(pageUrl),
          aggregateRating: monekoAggregateRating,
          review: monekoFeaturedReview,
        },
        {
          "@type": "ItemList",
          "@id": `${pageUrl}#product-areas`,
          name: "Moneko product areas",
          itemListElement: monekoProductAreas.map((area, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: area.question,
            description: area.directAnswer,
          })),
        },
        {
          "@type": "Table",
          "@id": `${pageUrl}#budgeting-app-comparison`,
          about: "Moneko compared with traditional budgeting apps",
          name: "Moneko budgeting app comparison",
          description: monekoComparisonRows
            .map(
              (row) =>
                `${row.label}: Moneko - ${row.moneko} Traditional apps - ${row.traditionalApps}`,
            )
            .join(" "),
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
