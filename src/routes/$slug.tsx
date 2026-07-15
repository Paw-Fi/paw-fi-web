"use client";

import { Suspense, lazy } from "react";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { QueryLandingPage } from "@/components/geo/query-landing-page";
import { HomeHeader } from "@/components/index/header";
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
  monekoAlternateNames,
  monekoAvailableLanguages,
  monekoFeaturedReview,
  monekoKnowsAbout,
  monekoSameAs,
} from "@/utils/app-schema";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";
import {
  APP_STORE_RATING,
  APP_STORE_REVIEW_COUNT,
} from "@/data/app-store-reviews";

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
    if (params.slug === "best-budgeting-app") {
      throw redirect({ href: "/budgeting-app-2026", statusCode: 301 });
    }

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
    const editorialComparison =
      loaderData.pageVariant === "editorialComparison"
        ? loaderData.editorialComparison
        : undefined;
    const publishedAt =
      editorialComparison?.publishedAt ?? loaderData.sitemapLastmod;
    const updatedAt =
      editorialComparison?.updatedAt ?? loaderData.sitemapLastmod;
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://moneko.io/#organization",
          name: "Moneko",
          alternateName: monekoAlternateNames,
          url: "https://moneko.io",
          logo: "https://moneko.io/logo192.png",
          sameAs: monekoSameAs,
          knowsAbout: monekoKnowsAbout,
        },
        {
          "@type": "WebSite",
          "@id": "https://moneko.io/#website",
          name: "Moneko",
          alternateName: monekoAlternateNames,
          url: "https://moneko.io",
          publisher: { "@id": "https://moneko.io/#organization" },
        },
        {
          "@type": "WebPage",
          "@id": pageUrl,
          url: pageUrl,
          name: loaderData.title,
          description: loaderData.description,
          isPartOf: { "@id": "https://moneko.io/#website" },
          about: { "@id": "https://moneko.io/#software" },
          breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
          datePublished: publishedAt,
          dateModified: updatedAt,
          inLanguage: "en-US",
        },
        {
          "@type": "BreadcrumbList",
          "@id": `${pageUrl}#breadcrumb`,
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Moneko",
              item: "https://moneko.io",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: loaderData.title,
              item: pageUrl,
            },
          ],
        },
        ...(editorialComparison
          ? [
              {
                "@type": "Article",
                "@id": `${pageUrl}#article`,
                headline: loaderData.pageTitle ?? loaderData.title,
                description:
                  loaderData.pageDescription ?? loaderData.description,
                datePublished: publishedAt,
                dateModified: updatedAt,
                mainEntityOfPage: { "@id": pageUrl },
                author: {
                  "@type": "Organization",
                  name: editorialComparison.author.name,
                  url:
                    editorialComparison.author.url ?? "https://moneko.io/team",
                },
                reviewedBy: {
                  "@type": "Organization",
                  name: editorialComparison.reviewer.name,
                  url:
                    editorialComparison.reviewer.url ??
                    "https://moneko.io/team",
                },
                publisher: { "@id": "https://moneko.io/#organization" },
              },
              {
                "@type": "ItemList",
                "@id": `${pageUrl}#rankings`,
                name: loaderData.pageTitle ?? loaderData.title,
                itemListOrder: "https://schema.org/ItemListOrderAscending",
                numberOfItems: editorialComparison.apps.length,
                itemListElement: editorialComparison.apps.map((app) => ({
                  "@type": "ListItem",
                  position: app.rank,
                  item: {
                    "@type": "SoftwareApplication",
                    name: app.name,
                    url: app.sourceUrl,
                    applicationCategory: "FinanceApplication",
                    description: `${app.bestFor}. ${app.verdict}`,
                  },
                })),
              },
            ]
          : []),
        {
          "@type": "SoftwareApplication",
          "@id": "https://moneko.io/#software",
          name: "Moneko",
          alternateName: monekoAlternateNames,
          operatingSystem: "Android, iOS, Web",
          applicationCategory: "FinanceApplication",
          applicationSubCategory: "BudgetingApplication",
          description: loaderData.description,
          url: "https://moneko.io",
          availableLanguage: monekoAvailableLanguages,
          keywords: loaderData.keywords,
          knowsAbout: monekoKnowsAbout,
          offers: createMonekoFreeOffer("https://moneko.io/pricing"),
          aggregateRating: monekoAggregateRating,
          review: monekoFeaturedReview,
        },
        {
          "@type": "ItemList",
          "@id": `${pageUrl}#takeaways`,
          name: `${loaderData.title} takeaways`,
          itemListElement: (loaderData.keyTakeaways ?? []).map(
            (item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item,
            }),
          ),
        },
        ...(loaderData.comparisonRows?.length
          ? [
              {
                "@type": "Table",
                "@id": `${pageUrl}#comparison`,
                name: loaderData.comparisonTitle ?? "Moneko comparison",
                description: loaderData.comparisonRows
                  .map(
                    (row) =>
                      `${row.label}: Moneko - ${row.moneko} ${loaderData.alternativeLabel ?? "Alternative"} - ${row.alternative}`,
                  )
                  .join(" "),
              },
            ]
          : []),
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
          editorialComparison={
            page.pageVariant === "editorialComparison"
              ? page.editorialComparison
              : undefined
          }
          ratingSummary={{
            rating: APP_STORE_RATING,
            reviewCount: APP_STORE_REVIEW_COUNT,
          }}
          showIntro
        />

        <MobileAppPreviewCarousel
          title="Try the app behind these budgeting workflows"
          description="See how Moneko turns mobile spending, WhatsApp messages, receipt scans, and shared budgets into a clearer plan."
        />

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
      </main>

      <Footer />
    </div>
  );
}

interface GeoLandingPageViewProps {
  page: GeoLandingPage;
}
