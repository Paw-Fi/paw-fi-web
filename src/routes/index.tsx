"use client";

import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";

export const DISCORD_URL = "https://discord.gg/M2Dgujvtze";

const META_TITLE = "Moneko - AI Budgeting App & Expense Tracker";
const META_DESCRIPTION =
  "The AI financial assistant that chats with you. Track spending, manage pockets, and plan with AI-right from WhatsApp or our dedicated app.";
const META_KEYWORDS =
  "budgeting app, expense tracker, AI finance, whatsapp budget, pocket budgeting, envelope system, joint finances";

export const Route = createFileRoute("/")({
  component: lazyRouteComponent(
    () => import("@/components/performance/home-page-route-component"),
    "HomePageRouteComponent",
  ),
  staticData: () => ({}),
  head: () => {
    const pageUrl = getCanonicalUrl("/");
    const meta = seo({
      title: META_TITLE,
      description: META_DESCRIPTION,
      keywords: META_KEYWORDS,
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    return {
      meta,
      links: [
        { rel: "canonical", href: pageUrl },
        {
          rel: "preload",
          href: "/logo192.webp",
          as: "image",
          type: "image/webp",
        },
      ],
    };
  },
});
