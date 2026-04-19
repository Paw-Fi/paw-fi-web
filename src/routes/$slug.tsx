"use client";

import { Suspense, lazy } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";

import { QueryLandingPage } from "@/components/geo/query-landing-page";
import { HomeHeader } from "@/components/index/header";
import { HeroV2 } from "@/components/homepage/v2/hero-v2";
import { Footer } from "@/components/homepage/footer";
import { MobileAppPreviewCarousel } from "@/components/shared/mobile-app-preview-carousel";
import AmbientHalo from "@/components/ui/ambient-halo";
import {
  getGeoLandingPage,
  type GeoLandingPage,
} from "@/lib/geo-landing-pages";
import {
  createMonekoFreeOffer,
  monekoAggregateRating,
  monekoAvailableLanguages,
  monekoFeaturedReview,
} from "@/utils/app-schema";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";

const UserCommunityShowcase = lazy(() =>
  import("@/components/homepage/user-community-showcase").then((module) => ({
    default: module.UserCommunityShowcase,
  })),
);

const FeaturesSection = lazy(() =>
  import("@/components/homepage/v2/features-section").then((module) => ({
    default: module.FeaturesSection,
  })),
);

export const Route = createFileRoute("/$slug")({
  loader: ({ params }) => {
    const page = getGeoLandingPage(params.slug);

    if (!page || params.slug === "main") {
      throw notFound();
    }

    return page;
  },
  component: GeoLandingPageRoute,
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {};
    }

    const pageUrl = getCanonicalUrl(`/${loaderData.slug}`);
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": pageUrl,
          url: pageUrl,
          name: loaderData.title,
          description: loaderData.description,
          inLanguage: "en-US",
        },
        {
          "@type": "SoftwareApplication",
          "@id": "https://moneko.io/#software",
          name: "Moneko",
          alternateName: ["Moneko budgeting app", "Moneko expense tracker"],
          operatingSystem: "Android, iOS, Web",
          applicationCategory: "FinanceApplication",
          applicationSubCategory: "BudgetingApplication",
          description: loaderData.description,
          url: "https://moneko.io",
          availableLanguage: monekoAvailableLanguages,
          offers: createMonekoFreeOffer(pageUrl),
          aggregateRating: monekoAggregateRating,
          review: monekoFeaturedReview,
        },
        {
          "@type": "FAQPage",
          "@id": `${pageUrl}#faq`,
          mainEntity: loaderData.faqItems.map((item) => ({
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

    return {
      meta: seo({
        title: loaderData.title,
        description: loaderData.description,
        keywords: loaderData.keywords,
        image: "https://moneko.io/og-img.png",
        url: pageUrl,
      }),
      links: [{ rel: "canonical", href: pageUrl }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});

function GeoLandingPageRoute() {
  const page = Route.useLoaderData();

  return <GeoLandingPageView page={page} />;
}

function GeoLandingPageView({ page }: GeoLandingPageViewProps) {
  const deferredSectionFallback =
    "mx-auto my-6 w-full max-w-6xl rounded-[32px] border border-border/40 bg-background/60 p-10";

  return (
    <div className="bg-background relative min-h-screen overflow-x-hidden">
      <AmbientHalo />
      <HomeHeader />

      <main className="flex-1">
        <HeroV2 />

        <Suspense
          fallback={
            <div className={`${deferredSectionFallback} min-h-[28rem]`} />
          }
        >
          <FeaturesSection />
        </Suspense>

        <Suspense
          fallback={
            <div className={`${deferredSectionFallback} min-h-[28rem]`} />
          }
        >
          <UserCommunityShowcase />
        </Suspense>

        <QueryLandingPage
          eyebrow={page.eyebrow ?? "Moneko"}
          title={page.pageTitle ?? page.title}
          description={page.pageDescription ?? page.description}
          keyTakeaways={page.keyTakeaways ?? []}
          comparisonTitle={page.comparisonTitle ?? "Why choose Moneko?"}
          alternativeLabel={page.alternativeLabel ?? "Alternative"}
          comparisonRows={page.comparisonRows ?? []}
          sections={page.sections ?? []}
          proofCards={page.proofCards ?? []}
          faqItems={page.faqItems}
          resourceLinks={page.resourceLinks ?? []}
          showIntro={false}
        />

        <MobileAppPreviewCarousel
          title="Try the app behind these budgeting workflows"
          description="See how Moneko turns mobile spending, WhatsApp messages, receipt scans, and shared budgets into a clearer plan."
        />
      </main>

      <Footer />
    </div>
  );
}

interface GeoLandingPageViewProps {
  page: GeoLandingPage;
}
