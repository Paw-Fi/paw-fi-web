"use client";

import { useDeferredValue, useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Clock,
  Mail,
  MessageSquare,
  ReceiptText,
  Rocket,
  Search,
  Sparkles,
  WalletCards,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StructuredData } from "@/components/seo/structured-data";
import {
  getFeaturedHelpArticles,
  getHelpArticlesByCategory,
  helpArticles,
  helpCategories,
  totalHelpArticles,
  type HelpArticle,
  type HelpCategory,
} from "@/data/help-articles";
import { cn } from "@/lib/utils";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";

export const Route = createFileRoute("/help")({
  component: HelpCenterPage,
  head: () => {
    const title =
      "Moneko Help Center | Guides for Budgeting, Expenses, Pockets, and AI Planning";
    const description =
      "Learn how to use Moneko with step-by-step help guides for Spaces, expenses, splits, Apple Pay tracking, Pockets, Wallets, recurring expenses, and AI scenario planning.";
    const pageUrl = getCanonicalUrl("/help");

    return {
      meta: seo({
        title,
        description,
        keywords:
          "Moneko help center, budgeting app help, expense tracking guide, envelope budgeting, Pockets, Wallets, AI spending planner",
        url: pageUrl,
      }),
      links: [{ rel: "canonical", href: pageUrl }],
    };
  },
});

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

function HelpCenterPage() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(
    searchQuery.trim().toLowerCase(),
  );
  const featuredArticles = getFeaturedHelpArticles();
  const visibleArticles = filterHelpArticles(deferredSearchQuery);
  const hasSearchQuery = deferredSearchQuery.length > 0;

  if (pathname !== "/help") {
    return <Outlet />;
  }

  return (
    <div className="bg-moneko-background font-poppins selection:bg-primary/20 min-h-screen">
      <StructuredData
        type="faq"
        data={helpArticles.slice(0, 12).map((article) => ({
          question: article.title,
          answer: article.description,
        }))}
      />
      <StructuredData
        type="breadcrumb"
        data={[{ name: "Help Center", url: getCanonicalUrl("/help") }]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 lg:pt-32 lg:pb-24">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 h-[1000px] w-[1000px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.08)_0%,transparent_70%)] opacity-50 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Badge
                variant="secondary"
                className="mb-6 rounded-full px-4 py-1 text-xs font-medium tracking-wide uppercase"
              >
                Support Hub
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-hepta-slab text-foreground text-4xl leading-tight font-bold tracking-tight sm:text-5xl lg:text-7xl"
            >
              How can we help?
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-muted-foreground mt-6 max-w-2xl text-lg sm:text-xl"
            >
              Everything you need to master your money with Moneko.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-10 w-full max-w-2xl"
            >
              <div className="group relative">
                <div className="from-primary/20 via-accent/20 to-primary/20 absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r opacity-0 blur transition duration-500 group-focus-within:opacity-100" />
                <div className="relative flex items-center">
                  <Search className="text-muted-foreground group-focus-within:text-primary absolute left-5 h-6 w-6 transition-colors" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search articles, guides, and workflows..."
                    className="border-border/50 bg-background/80 focus:border-primary/50 focus:ring-primary/10 h-16 w-full rounded-[2rem] pr-6 pl-14 text-lg shadow-sm backdrop-blur-xl transition-all focus:ring-4"
                  />
                </div>
              </div>
              <div className="text-muted-foreground mt-4 flex flex-wrap justify-center gap-2 text-sm">
                <span>Popular:</span>
                {["Spaces", "Wallets", "AI Planning", "Pockets"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSearchQuery(tag)}
                    className="hover:text-primary transition-colors hover:underline"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 pt-4 pb-24 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {hasSearchQuery ? (
            <motion.div
              key="search-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SearchResults articles={visibleArticles} query={searchQuery} />
            </motion.div>
          ) : (
            <motion.div
              key="main-content"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-24"
            >
              {/* Category Bento Grid */}
              <section aria-labelledby="categories-heading">
                <div className="mb-12">
                  <h2
                    id="categories-heading"
                    className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl"
                  >
                    Browse by topic
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Select a category to explore specialized guides.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-6 md:grid-rows-2">
                  {helpCategories.map((category, idx) => (
                    <motion.div
                      key={category.id}
                      variants={itemVariants}
                      className={cn(
                        "group border-border/50 bg-card hover:border-primary/30 hover:shadow-primary/5 relative overflow-hidden rounded-3xl border p-8 transition-all hover:shadow-2xl",
                        idx === 0 && "md:col-span-4 md:row-span-1",
                        idx === 1 && "md:col-span-2 md:row-span-1",
                        idx === 2 && "md:col-span-2 md:row-span-1",
                        idx === 3 && "md:col-span-4 md:row-span-1",
                      )}
                    >
                      <div className="relative z-10 flex h-full flex-col">
                        <div className="bg-primary/10 text-primary mb-6 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-110">
                          {getCategoryIcon(category.iconName)}
                        </div>
                        <Badge
                          variant="outline"
                          className="border-primary/20 bg-primary/5 mb-2 w-fit rounded-full text-[10px] tracking-wider uppercase"
                        >
                          {category.eyebrow}
                        </Badge>
                        <h3 className="text-2xl font-bold tracking-tight">
                          {category.title}
                        </h3>
                        <p className="text-muted-foreground mt-3 max-w-md leading-relaxed">
                          {category.description}
                        </p>
                        <div className="mt-auto pt-8">
                          <Link
                            to="/help/$helpId"
                            params={{
                              helpId: getHelpArticlesByCategory(category.id)[0]
                                .slug,
                            }}
                            className="text-primary inline-flex items-center font-semibold hover:underline"
                          >
                            Explore guides
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </Link>
                        </div>
                      </div>

                      {/* Decorative elements for bento style */}
                      <div className="bg-primary/5 absolute -right-8 -bottom-8 -z-0 h-48 w-48 rounded-full blur-3xl transition-opacity group-hover:opacity-100" />
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Featured Articles Section */}
              <section aria-labelledby="featured-heading">
                <div className="mb-12 flex items-end justify-between gap-4">
                  <div>
                    <h2
                      id="featured-heading"
                      className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl"
                    >
                      Featured Guides
                    </h2>
                    <p className="text-muted-foreground mt-2">
                      Hand-picked articles to help you get started quickly.
                    </p>
                  </div>
                  <Link
                    to="/help"
                    className="text-primary hidden text-sm font-semibold hover:underline sm:block"
                  >
                    View all {totalHelpArticles} articles
                  </Link>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {featuredArticles.slice(0, 6).map((article) => (
                    <motion.div key={article.id} variants={itemVariants}>
                      <HelpArticleCard article={article} />
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Additional Support Section */}
              <section className="from-card/50 rounded-[3rem] bg-gradient-to-b to-transparent p-12 text-center md:p-20">
                <motion.div
                  variants={itemVariants}
                  className="mx-auto max-w-3xl"
                >
                  <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
                    Still need a hand?
                  </h2>
                  <p className="text-muted-foreground mt-6 text-lg leading-relaxed">
                    If you couldn't find the answer you were looking for, our
                    support team is here to help you get the most out of Moneko.
                  </p>

                  <div className="mt-12 flex justify-center">
                    <SupportActionCard
                      title="Email Support"
                      description="Send us a detailed message and we'll get back to you as soon as possible."
                      icon={<Mail className="h-6 w-6" />}
                      href="mailto:hello@moneko.io"
                      actionText="Send email"
                    />
                  </div>
                </motion.div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function HelpArticleCard({ article }: { article: HelpArticle }) {
  const category = helpCategories.find((c) => c.id === article.categoryId);

  return (
    <Link
      to="/help/$helpId"
      params={{ helpId: article.slug }}
      className="group border-border/50 bg-card hover:border-primary/40 focus:ring-primary/50 relative flex h-full flex-col overflow-hidden rounded-[2rem] border p-6 transition-all hover:shadow-xl focus:ring-2 focus:outline-none"
    >
      <div className="mb-4 flex items-center justify-between">
        <Badge
          variant="secondary"
          className="bg-muted text-muted-foreground rounded-lg text-[10px] font-bold tracking-tight"
        >
          {article.readTime} MIN READ
        </Badge>
        {category && (
          <span className="text-muted-foreground group-hover:text-primary text-xs font-medium transition-colors">
            {category.title}
          </span>
        )}
      </div>

      <h3 className="group-hover:text-primary mb-3 text-xl leading-tight font-bold transition-colors">
        {article.title}
      </h3>

      <p className="text-muted-foreground mb-6 line-clamp-2 text-sm leading-relaxed">
        {article.description}
      </p>

      <div className="mt-auto flex items-center pt-2 text-sm font-bold">
        <span className="transition-all group-hover:mr-2">Read more</span>
        <ChevronRight className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100" />
      </div>
    </Link>
  );
}

function SupportActionCard({
  title,
  description,
  icon,
  href,
  actionText,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  actionText: string;
}) {
  const isExternal = href.startsWith("http") || href.startsWith("mailto");

  const content = (
    <div className="flex h-full flex-col items-center text-center">
      <div className="bg-primary/5 text-primary group-hover:bg-primary mb-6 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-300 group-hover:text-white">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
        {description}
      </p>
      <div className="mt-auto w-full">
        <Button
          variant="outline"
          className="border-primary/20 hover:bg-primary/5 hover:text-primary w-full rounded-2xl font-bold transition-all"
        >
          {actionText}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="group border-border/50 bg-background/50 hover:border-primary/40 rounded-[2.5rem] border p-8 backdrop-blur-sm transition-all hover:shadow-lg">
      {isExternal ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="block h-full"
        >
          {content}
        </a>
      ) : (
        <Link to={href as any} className="block h-full">
          {content}
        </Link>
      )}
    </div>
  );
}

function SearchResults({
  articles,
  query,
}: {
  articles: HelpArticle[];
  query: string;
}) {
  return (
    <div className="space-y-12">
      <div className="flex flex-col items-center text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {articles.length} {articles.length === 1 ? "result" : "results"} for{" "}
          <span className="text-primary">"{query}"</span>
        </h2>
        <p className="text-muted-foreground mt-4">
          {articles.length > 0
            ? "We found some guides that might match your search."
            : "No guides found for your current search. Try different keywords."}
        </p>
      </div>

      {articles.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <HelpArticleCard article={article} />
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="mx-auto max-w-xl rounded-3xl border-dashed py-12 text-center">
          <CardHeader>
            <div className="bg-muted mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full">
              <Search className="text-muted-foreground h-8 w-8" />
            </div>
            <CardTitle>Can't find it?</CardTitle>
            <CardDescription className="text-base">
              Try searching for general terms like "budget", "wallet", or
              "expense". Or reach out to us directly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="rounded-full">
              <a href="mailto:hello@moneko.io">Email support</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function filterHelpArticles(query: string): HelpArticle[] {
  if (!query) return helpArticles;

  return helpArticles.filter((article) => {
    const searchableText = [
      article.title,
      article.description,
      article.number,
      ...article.keywords,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(query);
  });
}

function getCategoryIcon(iconName: string) {
  switch (iconName) {
    case "rocket":
      return <Rocket className="h-7 w-7" />;
    case "receipt":
      return <ReceiptText className="h-7 w-7" />;
    case "wallet":
      return <WalletCards className="h-7 w-7" />;
    case "sparkles":
      return <Sparkles className="h-7 w-7" />;
    default:
      return <Rocket className="h-7 w-7" />;
  }
}
