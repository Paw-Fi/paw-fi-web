"use client";

import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";

// SEO Imports

// SEO Constants
const META_TITLE = "WhatsApp Expense Tracker & AI Receipt Scanner | Moneko Assistant";
const META_DESCRIPTION = "The fastest way to track spending. Use Moneko's WhatsApp AI assistant to log expenses via voice notes, scan receipts, and manage shared budgets effortlessly.";
const META_KEYWORDS = "whatsapp expense tracker, whatsapp budget bot, ai receipt scanner, track spending via whatsapp, shared household budget whatsapp, automated expense logging";

export const Route = createFileRoute("/features/whatsapp-assistant")({
  component: lazyRouteComponent(() => import("@/components/performance/whatsapp-assistant-route-component"), "WhatsAppAssistantRouteComponent"),
  head: () => {
    const pageUrl = getCanonicalUrl("/features/whatsapp-assistant");
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
