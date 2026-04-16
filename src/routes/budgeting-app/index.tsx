import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { getPassiveIncomePageOrFallback } from "@/lib/passive-income-pages";

export const Route = createFileRoute("/budgeting-app/")({
  // Use Streaming SSR for dynamic personalized content
  ssr: true,
  loader: async () => getPassiveIncomePageOrFallback("main"),
  component: lazyRouteComponent(
    () => import("@/components/performance/budgeting-app-route-component"),
    "BudgetingAppRouteComponent",
  ),

  head: () => {
    const pageUrl = getCanonicalUrl("/budgeting-app/");

    // Create SEO metadata
    const meta = seo({
      title: "Moneko | AI-Powered Budgeting App for Smart Financial Planning",
      description:
        "Discover how Moneko's AI-powered budgeting app delivers personalized financial education, smart budgeting tools, and investing courses tailored to your specific needs.",
      keywords:
        "AI budgeting app, financial learning, personalized budget, investing courses, financial planning tools",
      url: pageUrl,
      image: "https://moneko.io/og-img.png",
    });

    return {
      title: "Moneko | AI-Powered Budgeting App for Smart Financial Planning",
      meta,
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
    };
  },
});
