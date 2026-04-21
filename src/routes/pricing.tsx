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
        "Moneko Pricing | AI Budgeting App Plans for Individuals & Households",
      description:
        "Compare Moneko plans for AI budgeting, WhatsApp expense tracking, Pockets, and shared household budgets. Start with a 30-day free trial.",
      keywords:
        "moneko pricing, moneko plans, AI budgeting app pricing, budgeting app subscription, envelope budgeting app, household budgeting app, WhatsApp expense tracker, personal finance app subscription",
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
        lowPrice: "4.99",
        highPrice: "69.99",
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
