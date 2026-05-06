"use client";

import { Suspense, lazy } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StructuredData } from "@/components/seo/structured-data";
import {
  findHelpArticleBySlug,
  getHelpCategory,
  getRelatedHelpArticles,
} from "@/data/help-articles";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";

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
    <div className="bg-moneko-background min-h-screen">
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

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <nav aria-label="Help Center navigation">
          <Button asChild variant="ghost" className="mb-8 rounded-full">
            <Link to="/help">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to Help Center
            </Link>
          </Button>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <article className="min-w-0" aria-labelledby="help-article-title">
            <header className="border-border/70 bg-card/80 mb-8 rounded-3xl border p-6 shadow-sm sm:p-8">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <Badge className="rounded-full" variant="secondary">
                  {article.number}
                </Badge>
                {category ? (
                  <Badge className="rounded-full" variant="outline">
                    {category.title}
                  </Badge>
                ) : null}
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {article.readTime} min read
                </span>
              </div>
              <h1
                id="help-article-title"
                className="text-foreground max-w-3xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl"
              >
                {article.title}
              </h1>
              <p className="text-muted-foreground mt-5 max-w-3xl text-lg leading-8">
                {article.description}
              </p>
            </header>

            <section aria-label="Article content">
              <Card className="bg-card/80">
                <CardContent className="p-6 sm:p-8">
                  <Suspense
                    fallback={
                      <div
                        className="bg-muted/40 h-80 animate-pulse rounded-2xl"
                        aria-label="Loading article content"
                      />
                    }
                  >
                    <Markdown content={article.content} className="prose-lg" />
                  </Suspense>
                </CardContent>
              </Card>
            </section>

            <footer className="text-muted-foreground mt-6 text-sm">
              Last updated May 6, 2026. This Help Center article is free to read
              and maintained by Moneko.
            </footer>
          </article>

          <aside
            className="space-y-6 lg:sticky lg:top-24"
            aria-label="Related help"
          >
            <Card className="bg-card/80">
              <CardHeader>
                <CardTitle>In this category</CardTitle>
                <CardDescription>
                  {category?.description ?? "More Moneko Help Center guides."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <nav className="grid gap-3" aria-label="Related articles">
                  {relatedArticles.map((relatedArticle) => (
                    <Link
                      key={relatedArticle.id}
                      to="/help/$helpId"
                      params={{ helpId: relatedArticle.slug }}
                      className="group border-border/70 bg-background/80 hover:border-primary/40 focus-visible:ring-primary rounded-2xl border p-4 transition-all hover:shadow-sm focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Badge
                            variant="secondary"
                            className="mb-2 rounded-full"
                          >
                            {relatedArticle.number}
                          </Badge>
                          <h2 className="text-foreground group-hover:text-primary text-sm font-semibold">
                            {relatedArticle.title}
                          </h2>
                        </div>
                        <ArrowRight
                          className="text-muted-foreground group-hover:text-primary mt-1 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </div>
                    </Link>
                  ))}
                </nav>
              </CardContent>
            </Card>

            <Card className="bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle>Can't find your answer?</CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  Ask Moneko or contact support with details about your Space.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Button asChild variant="secondary" className="rounded-full">
                  <Link to="/questions">Ask Moneko</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 rounded-full bg-transparent"
                >
                  <a href="mailto:hello@moneko.io">Email support</a>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
