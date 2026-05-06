"use client";

import { Suspense, lazy } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, FileText } from "lucide-react";
import { StructuredData } from "@/components/seo/structured-data";
import {
  findHelpArticleBySlug,
  getHelpCategory,
  getRelatedHelpArticles,
} from "@/data/help-articles";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";
import { FaqSection } from "@/components/ui/faq-section";

const Markdown = lazy(() =>
  import("@/components/ui/markdown").then((module) => ({
    default: module.Markdown,
  })),
);

export const Route = createFileRoute("/help/$helpId")({
  component: HelpArticlePage,
  loader: async ({ params }) => {
    const article = findHelpArticleBySlug(params.helpId);

    if (!article) {
      throw new Response("Not Found", { status: 404 });
    }

    return {
      article,
      category: getHelpCategory(article.categoryId),
      relatedArticles: getRelatedHelpArticles(article),
    };
  },
  head: ({ loaderData }) => {
    const article = loaderData?.article;

    if (!article) {
      return { title: "Moneko Help Article Not Found" };
    }

    const title = `${article.seoTitle ?? article.title} | Moneko Help Center`;
    const pageUrl = getCanonicalUrl(`/help/${article.slug}`);
    const meta = seo({
      title,
      description: article.description,
      keywords: article.keywords.join(", "),
      url: pageUrl,
    }).map((tag) =>
      tag.property === "og:type" ? { ...tag, content: "article" } : tag,
    );

    return {
      meta: [
        ...meta,
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { name: "author", content: "Moneko" },
        { name: "language", content: "en" },
        { property: "og:locale", content: "en_US" },
        { property: "article:author", content: "Moneko" },
        { property: "article:section", content: "Help Center" },
        { property: "article:published_time", content: "2026-05-06" },
        { property: "article:modified_time", content: "2026-05-06" },
      ],
      links: [
        { rel: "canonical", href: pageUrl },
        { rel: "alternate", hrefLang: "en", href: pageUrl },
      ],
    };
  },
});

function HelpArticlePage() {
  const { article, category, relatedArticles } = Route.useLoaderData();
  const wordCount = article.content.trim().split(/\s+/).length;
  const pageUrl = getCanonicalUrl(`/help/${article.slug}`);
  const articleSchemaData = {
    title: article.title,
    description: article.description,
    url: pageUrl,
    datePublished: "2026-05-06",
    dateModified: "2026-05-06",
    publisher: {
      name: "Moneko",
      url: "https://moneko.io",
      logo: "https://moneko.io/logo192.png",
    },
    wordCount,
    timeRequired: `PT${article.readTime}M`,
    educationalLevel: "Beginner",
    isAccessibleForFree: true,
    keywords: article.keywords,
    articleSection: category?.title ?? "Help Center",
    proficiencyLevel: "Beginner",
    dependencies: "Moneko app access and an active personal or shared Space",
    speakable: {
      cssSelector: ["h1", "h2", ".prose p"],
    },
  };
  const faqItems = article.faqItems?.length
    ? article.faqItems
    : [
        {
          question: article.title,
          answer: article.description,
        },
      ];
  const howToSteps = article.howToSteps?.length
    ? article.howToSteps
    : article.title.toLowerCase().includes("how")
      ? [
          {
            name: "Open the relevant Moneko area",
            text: "Start in the Space, Settings, or feature area mentioned in the guide.",
          },
          {
            name: "Follow the setup steps",
            text: "Use the step-by-step instructions to configure or complete the workflow.",
          },
          {
            name: "Review the result",
            text: "Check the saved expense, Pocket, Wallet, recurring item, or plan for accuracy.",
          },
        ]
      : [];

  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:gap-16">
      <StructuredData type="article" data={articleSchemaData} />
      {article.includeTechArticleSchema ? (
        <StructuredData type="techArticle" data={articleSchemaData} />
      ) : null}
      <StructuredData
        type="breadcrumb"
        data={[
          { name: "Help Center", url: getCanonicalUrl("/help") },
          { name: article.title, url: pageUrl },
        ]}
      />
      <StructuredData type="faq" data={faqItems} />
      {howToSteps.length ? (
        <StructuredData
          type="howto"
          data={{
            name: article.title,
            description: article.description,
            totalTime: `PT${article.readTime}M`,
            estimatedCost: {
              currency: "USD",
              value: "0",
            },
            steps: howToSteps,
          }}
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <header className="mb-10">
          <div className="mb-4 flex items-center gap-3 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            {category && <span>{category.title}</span>}
            {category && <span className="h-1 w-1 rounded-full bg-border" />}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {article.readTime} min read
            </span>
          </div>
          <h1
            id="help-article-title"
            className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl"
          >
            {article.title}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {article.description}
          </p>
        </header>

        <section aria-label="Article content" className="border-t border-border pt-10">
          <div className="max-w-none">
            <Suspense
              fallback={
                <div
                  className="h-80 animate-pulse rounded-2xl bg-muted/40"
                  aria-label="Loading article content"
                />
              }
            >
              <Markdown content={article.content} className="prose-base sm:prose-lg" />
            </Suspense>

            {article.faqItems && article.faqItems.length > 0 && (
              <div className="mt-16 border-t border-border pt-10">
                <FaqSection faqData={article.faqItems} />
              </div>
            )}
          </div>
        </section>

        <footer className="mt-16 border-t border-border pt-8 text-xs text-muted-foreground">
          Last updated May 6, 2026. This Help Center article is free to read
          and maintained by Moneko.
        </footer>
      </div>

      <aside className="order-first w-full shrink-0 lg:order-last lg:w-64 lg:sticky lg:top-32" aria-label="Related help">
        <div className="space-y-12 pb-12 lg:pb-0">
          <section>
            <h2 className="mb-4 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              In this category
            </h2>
            <nav className="space-y-5" aria-label="Related articles">
              {relatedArticles.map((relatedArticle) => (
                <Link
                  key={relatedArticle.id}
                  to="/help/$helpId"
                  params={{ helpId: relatedArticle.slug }}
                  className="group block"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    <h3 className="text-sm font-medium leading-tight text-foreground transition-colors group-hover:text-primary">
                      {relatedArticle.title}
                    </h3>
                  </div>
                  <div className="mt-1.5 flex items-center pl-6 text-[10px] font-bold text-primary opacity-0 transition-all group-hover:opacity-100">
                    Read guide <ArrowRight className="ml-1 h-3 w-3" />
                  </div>
                </Link>
              ))}
            </nav>
          </section>
        </div>
      </aside>
    </div>
  );
}
