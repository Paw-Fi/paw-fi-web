"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Star } from "lucide-react";
import { HomeHeader } from "@/components/index/header";
import { FaqSection } from "@/components/ui/faq-section";
import { StructuredData } from "@/components/seo/structured-data";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import {
  findSolutionCategory,
  getSolutionGuidesByCategory,
} from "@/data/solutions";

export const Route = createFileRoute("/solutions/$categorySlug/")({
  loader: async ({ params }) => {
    const category = findSolutionCategory(params.categorySlug);

    if (!category) {
      throw new Response("Not Found", { status: 404 });
    }

    return {
      category,
      guides: getSolutionGuidesByCategory(category.slug),
    };
  },
  head: ({ loaderData }) => {
    const category = loaderData?.category;
    const guides = loaderData?.guides ?? [];

    if (!category) {
      return { title: "Solutions" };
    }

    const pageUrl = getCanonicalUrl(`/solutions/${category.slug}`);
    const title = `${category.title} | Moneko Solutions`;
    const description = category.description;

    const meta = seo({
      title,
      description,
      keywords: `${category.title.toLowerCase()}, budgeting solutions, Moneko, money guides`,
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: category.title,
      description,
      url: pageUrl,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: guides.slice(0, 10).map((guide, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: guide.title,
          url: getCanonicalUrl(`/solutions/${category.slug}/${guide.slug}`),
        })),
      },
    };

    const faqStructuredData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: category.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    };

    return {
      meta,
      links: [{ rel: "canonical", href: pageUrl }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(faqStructuredData).replace(/</g, "\\u003c"),
        },
      ],
    };
  },
  component: SolutionCategoryIndexRoute,
});

function SolutionCategoryIndexRoute() {
  const { category, guides } = Route.useLoaderData();
  const featuredGuides = category.featuredGuideSlugs
    .map((slug) => guides.find((guide) => guide.slug === slug))
    .filter((guide): guide is (typeof guides)[number] => Boolean(guide));

  return (
    <div className="bg-moneko-background min-h-screen">
      <HomeHeader />
      <main className="mx-auto max-w-6xl px-4 pt-28 pb-16 sm:px-6 lg:px-8">
        <nav className="text-muted-foreground flex items-center gap-2 text-sm">
          <Link
            to="/solutions"
            className="hover:text-primary transition-colors"
          >
            Solutions
          </Link>
          <span>/</span>
          <span>{category.title}</span>
        </nav>

        <section className="border-border bg-card/80 mt-6 rounded-3xl border p-8 shadow-sm sm:p-10">
          <div className="text-primary flex items-center gap-2 text-sm font-semibold tracking-[0.18em] uppercase">
            <Star className="h-4 w-4" />
            Intro page
          </div>
          <h1 className="text-foreground mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            {category.title}
          </h1>
          <p className="text-muted-foreground mt-5 max-w-3xl text-lg leading-relaxed">
            {category.hero}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/download"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded-full px-5 py-3 text-sm font-semibold transition-colors"
            >
              Download Moneko
            </Link>
            <Link
              to="/solutions"
              className="border-border text-foreground hover:border-primary/40 hover:text-primary inline-flex items-center rounded-full border px-5 py-3 text-sm font-semibold transition-colors"
            >
              Browse all solutions
            </Link>
          </div>
        </section>

        <section className="mt-14 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="mb-5 flex items-center gap-2">
              <h2 className="text-foreground text-2xl font-semibold">
                Popular guides
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {featuredGuides.map((guide) => (
                <Link
                  key={guide.slug}
                  to="/solutions/$categorySlug/$solutionSlug"
                  params={{
                    categorySlug: category.slug,
                    solutionSlug: guide.slug,
                  }}
                  className="border-border/70 bg-background/90 hover:border-primary/30 rounded-2xl border p-5 transition-colors"
                >
                  <h3 className="text-foreground text-lg font-semibold">
                    {guide.title}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {guide.excerpt}
                  </p>
                  <span className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-semibold">
                    Read guide
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <aside className="space-y-8">
            <section className="border-border bg-card/70 rounded-3xl border p-6">
              <h2 className="text-foreground text-xl font-semibold">
                Recommended features
              </h2>
              <ul className="mt-4 space-y-3">
                {category.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="text-primary h-4 w-4" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="border-border bg-card/70 rounded-3xl border p-6">
              <h2 className="text-foreground text-xl font-semibold">
                What this page covers
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                This intro page is the hub for the category. It links to every
                solution article and gives search engines a clear path into the
                related budgeting content.
              </p>
            </section>
          </aside>
        </section>

        <FaqSection
          faqData={category.faqs}
          title="Frequently Asked Questions"
        />
      </main>

      <StructuredData
        type="breadcrumb"
        data={[
          { name: "Solutions", url: getCanonicalUrl("/solutions") },
          {
            name: category.title,
            url: getCanonicalUrl(`/solutions/${category.slug}`),
          },
        ]}
      />
    </div>
  );
}
