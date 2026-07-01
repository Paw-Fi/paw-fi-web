"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ChevronRight, Star } from "lucide-react";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { HomeHeader } from "@/components/index/header";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import {
  getSolutionCategoryOverview,
  getSolutionGuidesByCategory,
} from "@/data/solutions";

export const Route = createFileRoute("/solutions/")({
  head: () => {
    const pageUrl = getCanonicalUrl("/solutions");
    const title =
      "Moneko Solutions | Budgeting Guides for Individuals and Couples";
    const description =
      "Browse Moneko's SEO solution guides for budgeting, expense tracking, bill splitting, household planning, and money goals for individuals and couples.";

    const meta = seo({
      title,
      description,
      keywords:
        "budgeting solutions, personal budgeting guide, couple budgeting guide, bill splitting, household budgeting, expense tracking, financial goals",
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    const overview = getSolutionCategoryOverview();

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Moneko Solutions",
      description,
      url: pageUrl,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: overview.map((category, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: category.title,
          url: getCanonicalUrl(`/solutions/${category.slug}`),
        })),
      },
    };

    return {
      meta,
      links: [{ rel: "canonical", href: pageUrl }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        },
      ],
    };
  },
  component: SolutionsIndexRoute,
});

function SolutionsIndexRoute() {
  const categories = getSolutionCategoryOverview();

  return (
    <AmbientHaloLayout>
      <HomeHeader />
      <main className="mx-auto max-w-7xl px-4 pt-28 pb-16 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl text-center">
          <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
            Solutions
          </p>
          <h1 className="text-foreground mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Budgeting guides built for real life
          </h1>
          <p className="text-muted-foreground mt-5 text-lg leading-relaxed sm:text-xl">
            Browse practical solution pages for individuals and couples, then
            jump into step-by-step guides for the exact money situation you are
            solving right now.
          </p>
        </section>

        <section aria-labelledby="solution-paths" className="mt-16">
          <div className="mb-6 flex items-center gap-2">
            <Star className="text-primary h-4 w-4" />
            <h2
              id="solution-paths"
              className="text-foreground text-xl font-semibold"
            >
              Start with a solution path
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {categories.map((category) => (
              <Link
                key={category.slug}
                to="/solutions/$categorySlug"
                params={{ categorySlug: category.slug }}
                className="border-border/70 bg-card/80 hover:border-primary/30 group rounded-3xl border p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <p className="text-primary text-sm font-medium tracking-[0.18em] uppercase">
                  {category.title}
                </p>
                <h3 className="text-foreground mt-3 text-2xl font-semibold">
                  {category.title}
                </h3>
                <p className="text-muted-foreground mt-3 leading-relaxed">
                  {category.description}
                </p>
                <div className="mt-5 flex items-center justify-between gap-4">
                  <span className="text-foreground text-sm font-medium">
                    {category.guideCount} guides
                  </span>
                  <span className="text-primary inline-flex items-center gap-1 text-sm font-semibold transition-transform group-hover:translate-x-0.5">
                    Open the path
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="all-solutions" className="mt-16">
          <div className="mb-6 flex items-center gap-2">
            <BookOpen className="text-primary h-4 w-4" />
            <h2
              id="all-solutions"
              className="text-foreground text-xl font-semibold"
            >
              All solution guides
            </h2>
          </div>

          <div className="space-y-10">
            {categories.map((category) => {
              const guides = getSolutionGuidesByCategory(category.slug);

              return (
                <section
                  key={category.slug}
                  aria-labelledby={`${category.slug}-heading`}
                >
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <h3
                        id={`${category.slug}-heading`}
                        className="text-foreground text-2xl font-semibold"
                      >
                        {category.title}
                      </h3>
                      <p className="text-muted-foreground mt-1">
                        {category.hero}
                      </p>
                    </div>
                    <Link
                      to="/solutions/$categorySlug"
                      params={{ categorySlug: category.slug }}
                      className="text-primary hidden text-sm font-semibold sm:inline-flex"
                    >
                      View intro
                    </Link>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {guides.map((guide) => (
                      <Link
                        key={`${category.slug}-${guide.slug}`}
                        to="/solutions/$categorySlug/$solutionSlug"
                        params={{
                          categorySlug: category.slug,
                          solutionSlug: guide.slug,
                        }}
                        className="border-border/70 bg-background/85 hover:border-primary/30 block rounded-2xl border p-5 transition-colors"
                      >
                        <h4 className="text-foreground text-lg font-semibold">
                          {guide.title}
                        </h4>
                        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                          {guide.excerpt}
                        </p>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      </main>
    </AmbientHaloLayout>
  );
}
