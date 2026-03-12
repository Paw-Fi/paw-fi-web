"use client";

import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";

// SEO & Meta Imports

const META_TITLE = "Joint Expense Tracker & Budgeting for Couples | Moneko Household";
const META_DESCRIPTION = "The best joint expense tracker for couples. Manage shared household bills, split expenses fairly, and track joint savings without losing your personal privacy.";
const META_KEYWORDS = "joint expense tracker, couples budgeting app, shared household finances, bill splitter for partners, joint budget planner, finance app for couples, split rent and utilities";

export const Route = createFileRoute("/features/household-mode")({
  component: lazyRouteComponent(() => import("@/components/performance/household-mode-route-component"), "HouseholdModeRouteComponent"),
  head: () => {
    const pageUrl = getCanonicalUrl("/features/household-mode");
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
