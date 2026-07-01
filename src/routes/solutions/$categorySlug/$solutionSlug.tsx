"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock3 } from "lucide-react";
import { HomeHeader } from "@/components/index/header";
import { Markdown } from "@/components/ui/markdown";
import { StructuredData } from "@/components/seo/structured-data";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import {
  findSolutionCategory,
  findSolutionGuide,
  getSolutionGuidesByCategory,
} from "@/data/solutions";

export const Route = createFileRoute("/solutions/$categorySlug/$solutionSlug")({
  loader: async ({ params }) => {
    const category = findSolutionCategory(params.categorySlug);
    const guide = findSolutionGuide(params.categorySlug, params.solutionSlug);

    if (!category || !guide) {
      throw new Response("Not Found", { status: 404 });
    }

    return {
      category,
      guide,
      relatedGuides: getSolutionGuidesByCategory(category.slug).filter(
        (item) => item.slug !== guide.slug,
      ),
    };
  },
  head: ({ loaderData }) => {
    const guide = loaderData?.guide;
    const category = loaderData?.category;

    if (!guide || !category) {
      return { title: "Solution not found" };
    }

    const pageUrl = getCanonicalUrl(
      `/solutions/${category.slug}/${guide.slug}`,
    );
    const title = `${guide.title} | ${category.title} | Moneko`;
    const description = guide.excerpt;

    const meta = seo({
      title,
      description,
      keywords: guide.keywords.join(", "),
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    const wordCount = guide.content.trim().split(/\s+/).length;

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description,
      url: pageUrl,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": pageUrl,
      },
      wordCount,
      articleSection: category.title,
      isAccessibleForFree: true,
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
  component: SolutionArticleRoute,
});

function SolutionArticleRoute() {
  const { category, guide, relatedGuides } = Route.useLoaderData();
  const pageUrl = getCanonicalUrl(`/solutions/${category.slug}/${guide.slug}`);

  return (
    <div className="bg-moneko-background min-h-screen">
      <HomeHeader />
      <main className="mx-auto max-w-4xl px-4 pt-28 pb-16 sm:px-6 lg:px-8">
        <nav className="text-muted-foreground flex items-center gap-2 text-sm">
          <Link
            to="/solutions"
            className="hover:text-primary transition-colors"
          >
            Solutions
          </Link>
          <span>/</span>
          <Link
            to="/solutions/$categorySlug"
            params={{ categorySlug: category.slug }}
            className="hover:text-primary transition-colors"
          >
            {category.title}
          </Link>
          <span>/</span>
          <span>{guide.title}</span>
        </nav>

        <article className="border-border bg-card/80 mt-6 rounded-3xl border p-6 shadow-sm sm:p-8">
          <div className="text-primary text-sm font-semibold tracking-[0.18em] uppercase">
            {category.title}
          </div>
          <h1 className="text-foreground mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            {guide.title}
          </h1>
          <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
            {guide.excerpt}
          </p>
          <div className="text-muted-foreground mt-5 flex items-center gap-2 text-sm">
            <Clock3 className="h-4 w-4" />
            <span>
              {Math.max(
                1,
                Math.round(guide.content.trim().split(/\s+/).length / 220),
              )}{" "}
              min read
            </span>
          </div>

          <div className="prose prose-slate dark:prose-invert prose-headings:scroll-mt-28 prose-a:text-primary prose-a:no-underline hover:prose-a:underline mt-8 max-w-none">
            <Markdown content={guide.content} />
          </div>
        </article>

        {relatedGuides.length > 0 && (
          <section className="mt-12">
            <h2 className="text-foreground text-2xl font-semibold">
              Related guides
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {relatedGuides.slice(0, 4).map((relatedGuide) => (
                <Link
                  key={relatedGuide.slug}
                  to="/solutions/$categorySlug/$solutionSlug"
                  params={{
                    categorySlug: category.slug,
                    solutionSlug: relatedGuide.slug,
                  }}
                  className="border-border/70 bg-background/90 hover:border-primary/30 rounded-2xl border p-5 transition-colors"
                >
                  <h3 className="text-foreground text-lg font-semibold">
                    {relatedGuide.title}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {relatedGuide.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <StructuredData
        type="breadcrumb"
        data={[
          { name: "Solutions", url: getCanonicalUrl("/solutions") },
          {
            name: category.title,
            url: getCanonicalUrl(`/solutions/${category.slug}`),
          },
          { name: guide.title, url: pageUrl },
        ]}
      />
    </div>
  );
}
