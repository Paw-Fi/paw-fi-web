"use client";

import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";

// SEO & Meta Imports

const META_TITLE = "Digital Envelope Budgeting App | The Moneko Pockets System";
const META_DESCRIPTION = "Master zero-based budgeting with Moneko Pockets. Our digital envelope system helps you allocate every dollar, track goals, and visualize your spending in real-time.";
const META_KEYWORDS = "envelope budgeting app, zero based budgeting system, digital envelope system, money allocation tool, visual budget tracker, financial goal setting app";

export const Route = createFileRoute("/features/pockets-system")({
  component: lazyRouteComponent(() => import("@/components/performance/pockets-system-route-component"), "PocketsSystemRouteComponent"),
  head: () => {
    const pageUrl = getCanonicalUrl("/features/pockets-system");
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
