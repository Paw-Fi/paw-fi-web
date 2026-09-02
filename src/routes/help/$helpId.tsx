"use client";

import { Suspense, lazy } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, FileText, ArrowRight } from "lucide-react";
import { StructuredData } from "@/components/seo/structured-data";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  findHelpArticleBySlug,
  getHelpCategory,
  getRelatedHelpArticles,
} from "@/data/help-articles";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";
import { FaqSection } from "@/components/ui/faq-section";
import { YouTubeEmbed } from "@/components/ui/youtube-embed";

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
        ...(article.publishedAt
          ? [
              {
                property: "article:published_time",
                content: article.publishedAt,
              },
            ]
          : []),
        ...(article.updatedAt
          ? [{ property: "article:modified_time", content: article.updatedAt }]
          : []),
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
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
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
  const faqItems = article.faqItems ?? [];
  const howToSteps = article.howToSteps ?? [];

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
      {faqItems.length ? <StructuredData type="faq" data={faqItems} /> : null}
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
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/help">Help Center</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {category && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/help">{category.title}</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              )}
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{article.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1
            id="help-article-title"
            className="text-foreground text-3xl leading-tight font-bold tracking-tight sm:text-5xl"
          >
            {article.title}
          </h1>
          <p className="text-muted-foreground mt-6 text-lg leading-relaxed sm:text-xl">
            {article.description}
          </p>
        </header>

        {article.videoId && (
          <YouTubeEmbed videoId={article.videoId} title={article.title} />
        )}

        <section
          aria-label="Article content"
          className="border-border border-t pt-10"
        >
          <div className="max-w-none">
            <Suspense
              fallback={
                <div
                  className="bg-muted/40 h-80 animate-pulse rounded-2xl"
                  aria-label="Loading article content"
                />
              }
            >
              <Markdown
                content={article.content}
                className="prose-base sm:prose-lg"
              />
            </Suspense>

            {article.faqItems && article.faqItems.length > 0 && (
              <div className="border-border mt-16 border-t pt-10">
                <FaqSection faqData={article.faqItems} />
              </div>
            )}
          </div>
        </section>

        <footer className="border-border text-muted-foreground mt-16 border-t pt-8 text-xs">
          This Help Center article is free to read and maintained by Moneko.
        </footer>
      </div>

      <aside
        className="order-last mt-10 w-full shrink-0 lg:sticky lg:top-32 lg:order-last lg:mt-0 lg:w-64"
        aria-label="Related help"
      >
        <div className="space-y-12 pb-12 lg:pb-0">
          <section>
            <h2 className="text-muted-foreground mb-4 text-[10px] font-bold tracking-widest uppercase">
              In this category
            </h2>
            <nav
              className="flex flex-col-reverse space-y-5 lg:flex-col"
              aria-label="Related articles"
            >
              {relatedArticles.map((relatedArticle) => (
                <Link
                  key={relatedArticle.id}
                  to="/help/$helpId"
                  params={{ helpId: relatedArticle.slug }}
                  className="group block"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="text-muted-foreground group-hover:text-primary mt-1 h-3.5 w-3.5 shrink-0 transition-colors" />
                    <h3 className="text-foreground group-hover:text-primary text-sm leading-tight font-medium transition-colors">
                      {relatedArticle.title}
                    </h3>
                  </div>
                  <div className="text-primary mt-1.5 flex items-center pl-6 text-[10px] font-bold opacity-0 transition-all group-hover:opacity-100">
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
