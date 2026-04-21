"use client";

import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";

// SEO & Meta Imports

const META_TITLE =
  "AI Financial Assistant & Expense Forecasting | Moneko Insights";
const META_DESCRIPTION =
  "Ask Moneko budget questions in plain language. Use AI insights for spending summaries, scenario planning, category trends, and goal-aware money decisions.";
const META_KEYWORDS =
  "AI financial assistant, personal finance AI, expense forecasting tool, AI budget insights, smart financial alerts, financial scenario planning, automated spending analysis";

export const Route = createFileRoute("/features/ai-insights")({
  component: lazyRouteComponent(
    () => import("@/components/performance/ai-insights-route-component"),
    "AIInsightsRouteComponent",
  ),
  head: () => {
    const pageUrl = getCanonicalUrl("/features/ai-insights");
    const meta = seo({
      title: META_TITLE,
      description: META_DESCRIPTION,
      keywords: META_KEYWORDS,
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    return {
      meta,
      links: [{ rel: "canonical", href: pageUrl }],
    };
  },
});
