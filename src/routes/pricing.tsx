/**
 * Sample checkout URLs:
 * - Monthly + MONEKO-3:    /checkout?plan=plus&billing=monthly&promo=MONEKO-3
 * - 12-month commitment + MONEKO100: /checkout?plan=plus&billing=yearly&promo=MONEKO100
 * - Lifetime: /checkout?plan=lifetime
 */

import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import {
  createMonekoPricingOffers,
  monekoAggregateRating,
  monekoFeaturedReview,
} from "@/utils/app-schema";
import { seo } from "@/utils/seo";

// Added new pro-max components

const DISCORD_URL = "https://discord.gg/M2Dgujvtze";

export const Route = createFileRoute("/pricing")({
  component: lazyRouteComponent(
    () => import("@/components/performance/pricing-route-component"),
    "PricingRouteComponent",
  ),
  head: () => {
    const pageUrl = "https://moneko.io/pricing";
    const meta = seo({
      title:
        "Moneko Plus Pricing | AI Budgeting App for Individuals & Households",
      description:
        "Moneko Plus includes flexible monthly billing, discounted monthly payments with a 12-month commitment, and lifetime access options for AI expense capture, reports, scenarios, wallets, Spaces, bank sync, and multi-currency tools.",
      keywords:
        "moneko pricing, moneko plus, AI budgeting app pricing, budgeting app subscription, envelope budgeting app, household budgeting app, WhatsApp expense tracker, personal finance app subscription",
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    const pricingOffers = createMonekoPricingOffers(pageUrl);
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Moneko - AI Budgeting App",
      description:
        "Moneko is an AI-assisted budgeting app that helps you capture spending, organize pockets (envelopes), manage recurring items, and plan scenarios across personal and household finances.",
      image: "https://moneko.io/og-img.png",
      brand: {
        "@type": "Brand",
        name: "Moneko",
      },
      category: "FinanceApplication",
      audience: {
        "@type": "Audience",
        audienceType: "Individual Financial Learners",
      },
      aggregateRating: monekoAggregateRating,
      review: monekoFeaturedReview,
      offers: {
        "@type": "AggregateOffer",
        url: pageUrl,
        priceCurrency: "USD",
        lowPrice: "0",
        highPrice: "79.99",
        offerCount: pricingOffers.length,
        availability: "https://schema.org/InStock",
        offers: pricingOffers,
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Moneko - AI Personal Finance Coach & Budgeting App",
        itemListElement: pricingOffers,
      },
    };

    return {
      meta,
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});
