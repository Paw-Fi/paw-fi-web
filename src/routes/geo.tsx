import { createFileRoute } from "@tanstack/react-router";

import {
  getGeoLandingPage,
  getGeoLandingPageSlugs,
} from "@/lib/geo-landing-pages";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";

const META_TITLE = "Moneko GEO Hub | Budgeting App Query Pages";
const META_DESCRIPTION =
  "Explore Moneko's query-specific budgeting and expense-tracking pages, including free budgeting app comparisons, 2026 budgeting, AI capture, email receipts, WhatsApp budgeting, and shared expense tracking.";
const META_KEYWORDS =
  "budgeting app hub, expense tracker hub, AI budgeting app, free budgeting app, budgeting app 2026, email based budgeting app, YNAB alternative, WhatsApp budgeting, shared expense tracker, Moneyko";

export const Route = createFileRoute("/geo")({
  component: GeoHubPage,
  head: () => {
    const pageUrl = getCanonicalUrl("/geo");
    const pages = getGeoLandingPageSlugs()
      .map((slug) => getGeoLandingPage(slug))
      .filter(isGeoLandingPage);
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": pageUrl,
      url: pageUrl,
      name: META_TITLE,
      description: META_DESCRIPTION,
      about: {
        "@type": "SoftwareApplication",
        name: "Moneko",
        applicationCategory: "FinanceApplication",
      },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: pages.map((page, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: page.title,
          description: page.description,
          url: getCanonicalUrl(`/${page.slug}`),
        })),
      },
    };

    return {
      meta: seo({
        title: META_TITLE,
        description: META_DESCRIPTION,
        keywords: META_KEYWORDS,
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

function GeoHubPage() {
  const pages = getGeoLandingPageSlugs()
    .map((slug) => getGeoLandingPage(slug))
    .filter(isGeoLandingPage)
    .sort((left, right) => left.title.localeCompare(right.title));

  return (
    <main className="bg-background min-h-screen py-20 md:py-24">
      <div className="container mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-primary text-sm font-semibold tracking-[0.18em] uppercase">
            GEO hub
          </p>
          <h1 className="text-foreground mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Query-aligned landing pages for budgeting and expense tracking
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-3xl text-lg leading-8 md:text-xl">
            This hub clusters Moneko's high-intent GEO pages so users and AI
            systems can move directly to the most relevant budgeting, expense
            tracking, and comparison page.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {pages.map((page) => (
            <a
              key={page.slug}
              href={`/${page.slug}`}
              className="bg-card border-border/60 hover:border-primary/30 rounded-[28px] border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
                {page.eyebrow ?? "Moneko"}
              </p>
              <h2 className="text-foreground mt-3 text-xl font-bold tracking-tight">
                {page.pageTitle ?? page.title}
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-7">
                {page.pageDescription ?? page.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {(page.keyTakeaways ?? []).slice(0, 2).map((item) => (
                  <span
                    key={item}
                    className="bg-background border-border/50 text-foreground rounded-full border px-3 py-1 text-xs"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}

function isGeoLandingPage(
  page: ReturnType<typeof getGeoLandingPage>,
): page is NonNullable<ReturnType<typeof getGeoLandingPage>> {
  return page !== null;
}
