"use client";

import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { resources } from "@/data/resources";

export const Route = createFileRoute("/resources/")({
  loader: async () => {
    return { resources };
  },
  component: lazyRouteComponent(
    () => import("@/components/performance/resources-index-route-component"),
    "ResourcesIndexRouteComponent",
  ),
  head: () => {
    const title = "Financial Resources & Tools | Moneko";
    const description = "Explore a curated collection of financial tools and resources to help you manage your money, track your goals, and improve your financial health.";
    const pageUrl = getCanonicalUrl("/resources");

    const meta = seo({
      title,
      description,
      url: pageUrl,
    });

    return {
      meta,
      links: [{ rel: "canonical", href: pageUrl }],
    };
  },
});
