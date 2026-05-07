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
  Mail,
  ReceiptText,
  Rocket,
  Search,
  Sparkles,
  WalletCards,
  ChevronRight,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StructuredData } from "@/components/seo/structured-data";
import {
  getFeaturedHelpArticles,
  getHelpArticlesByCategory,
  helpArticles,
  helpCategories,
  totalHelpArticles,
  type HelpArticle,
} from "@/data/help-articles";
import { cn } from "@/lib/utils";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";
import { HomeHeader } from "@/components/index/header";

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
  hidden: { opacity: 0, y: 10 },
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

  const isIndex = pathname === "/help";

  return (
    <div className="bg-moneko-background font-poppins selection:bg-primary/20 min-h-screen">
      <HomeHeader />
      <div className="pt-16 md:pt-20">
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

        <div className="mx-auto flex max-w-[1440px] px-4 sm:px-6 lg:px-8">
          {/* Sidebar */}
          <aside className="hidden w-72 flex-shrink-0 pb-12 lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <h2 className="mb-6 text-sm font-bold tracking-wider text-muted-foreground uppercase">
                Guides & Resources
              </h2>
              <Accordion type="multiple" className="w-full border-none">
                {helpCategories.map((category) => (
                  <AccordionItem
                    key={category.id}
                    value={category.id}
                    className="border-none"
                  >
                    <AccordionTrigger className="hover:text-primary py-2 text-sm font-semibold transition-colors hover:no-underline [&[data-state=open]]:text-primary">
                      <div className="flex items-center gap-3">
                        <span className="opacity-70">
                          {getCategoryIcon(category.iconName, "h-4 w-4")}
                        </span>
                        {category.title}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-2 pl-7">
                      <ul className="space-y-1">
                        {(() => {
                          const articles = getHelpArticlesByCategory(category.id);
                          console.log(`Category: ${category.id}`, articles);
                          return articles;
                        })().map((article) => (
                          <li key={article.id}>
                            <Link
                              to="/help/$helpId"
                              params={{ helpId: article.slug }}
                              className={cn(
                                "block rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-card hover:text-primary",
                                pathname.includes(article.slug)
                                  ? "bg-card text-primary"
                                  : "text-muted-foreground",
                              )}
                            >
                              {article.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </aside>

          {/* Content Area */}
          <main className="min-w-0 flex-1 pt-3 pb-12 lg:pl-12">
            {isIndex ? (
              <div className="space-y-16">
                {/* Hero & Search */}
                <section className="text-left">
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="font-hepta-slab text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
                  >
                    How can we help?
                  </motion.h1>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mt-8 w-full max-w-2xl"
                  >
                    <div className="relative flex items-center">
                      <Search className="absolute left-5 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search articles, guides, and workflows..."
                        className="h-14 w-full rounded-2xl border-border bg-card pl-14 pr-6 text-base shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                  </motion.div>
                </section>

                <AnimatePresence mode="wait">
                  {hasSearchQuery ? (
                    <motion.div
                      key="search-results"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <SearchResults
                        articles={visibleArticles}
                        query={searchQuery}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="main-content"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-16"
                    >
                      {/* Category Grid */}
                      <section aria-labelledby="categories-heading">
                        <h2
                          id="categories-heading"
                          className="mb-8 text-xl font-bold tracking-tight text-foreground sm:text-2xl"
                        >
                          Browse by topic
                        </h2>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {helpCategories.map((category) => (
                            <motion.div
                              key={category.id}
                              variants={itemVariants}
                              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-sm"
                            >
                              <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
                                  {getCategoryIcon(category.iconName, "h-5 w-5")}
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-base font-bold tracking-tight">
                                    {category.title}
                                  </h3>
                                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                    {category.description}
                                  </p>
                                  <div className="mt-4">
                                    {(() => {
                                      const articles = getHelpArticlesByCategory(
                                        category.id,
                                      );
                                      if (articles.length === 0) return null;
                                      return (
                                        <Link
                                          to="/help/$helpId"
                                          params={{ helpId: articles[0].slug }}
                                          className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
                                        >
                                          View guides
                                          <ChevronRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                                        </Link>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </section>

                      {/* Featured Articles Section */}
                      <section aria-labelledby="featured-heading">
                        <div className="mb-8 flex items-end justify-between gap-4">
                          <h2
                            id="featured-heading"
                            className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
                          >
                            Featured Guides
                          </h2>
                          <Link
                            to="/help"
                            className="hidden text-xs font-semibold text-primary hover:underline sm:block"
                          >
                            View all {totalHelpArticles}
                          </Link>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {featuredArticles.slice(0, 6).map((article) => (
                            <motion.div key={article.id} variants={itemVariants}>
                              <HelpArticleCard article={article} />
                            </motion.div>
                          ))}
                        </div>
                      </section>

                      {/* Support Footer Area */}
                      <section className="rounded-3xl border border-border bg-card/50 p-8 text-center backdrop-blur-sm sm:p-12">
                        <motion.div
                          variants={itemVariants}
                          className="mx-auto max-w-xl"
                        >
                          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                            Still need a hand?
                          </h2>
                          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                            Our support team is ready to help you get the most out
                            of Moneko.
                          </p>
                          <div className="mt-8 flex justify-center">
                            <Button
                              asChild
                              variant="outline"
                              className="h-11 rounded-xl border-border px-8 font-semibold transition-all hover:bg-primary/5 hover:text-primary"
                            >
                              <a href="mailto:hello@moneko.io">Contact Support</a>
                            </Button>
                          </div>
                        </motion.div>
                      </section>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Outlet />
              </motion.div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function HelpArticleCard({ article }: { article: HelpArticle }) {
  const category = helpCategories.find((c) => c.id === article.categoryId);

  return (
    <Link
      to="/help/$helpId"
      params={{ helpId: article.slug }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
    >
      <div className="mb-3">
        {category && (
          <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            {category.title}
          </span>
        )}
      </div>

      <h3 className="mb-2 text-base font-bold leading-tight transition-colors group-hover:text-primary">
        {article.title}
      </h3>

      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {article.description}
      </p>

      <div className="mt-4 flex items-center pt-2 text-[10px] font-bold text-primary uppercase tracking-wider">
        <span>Read Guide</span>
        <ChevronRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
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
    <div className="flex flex-col items-center text-center">
      <div className="text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/5">
        {icon}
      </div>
      <h3 className="mb-1 text-lg font-bold">{title}</h3>
      <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
        {description}
      </p>
      <Button
        variant="outline"
        className="border-border hover:bg-primary/5 hover:text-primary rounded-xl px-8 font-semibold transition-all"
      >
        {actionText}
      </Button>
    </div>
  );

  return (
    <div className="group border-border bg-card max-w-sm rounded-2xl border p-8 transition-all hover:border-primary/30">
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
      <div className="flex flex-col items-start text-left">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          {articles.length} {articles.length === 1 ? "result" : "results"} for{" "}
          <span className="text-primary">"{query}"</span>
        </h2>
      </div>

      {articles.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <HelpArticleCard article={article} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="mx-auto w-full rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold">No results found</h3>
          <p className="mt-2 px-6 text-sm text-muted-foreground">
            Try searching for general terms like "budget", "wallet", or
            "expense".
          </p>
        </div>
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

function getCategoryIcon(iconName: string, className = "h-7 w-7") {
  switch (iconName) {
    case "rocket":
      return <Rocket className={className} />;
    case "receipt":
      return <ReceiptText className={className} />;
    case "wallet":
      return <WalletCards className={className} />;
    case "sparkles":
      return <Sparkles className={className} />;
    default:
      return <Rocket className={className} />;
  }
}
