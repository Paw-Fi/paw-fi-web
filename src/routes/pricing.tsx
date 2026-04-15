import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { seo } from "@/utils/seo";

// Added new pro-max components

export const DISCORD_URL = "https://discord.gg/M2Dgujvtze";

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
        "Moneko Pro is your WhatsApp-first money assistant. Start a 30-day free trial, then keep everything unlocked for $34.99/year (best value), $4.99/month, or $69.99 lifetime. Track, budget, and get AI insights without leaving chat.",
      keywords:
        "moneko pricing, moneko plans, AI budgeting app pricing, budgeting app subscription, envelope budgeting app, household budgeting app, WhatsApp expense tracker, personal finance app subscription",
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

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
      offers: {
        "@type": "OfferCatalog",
        name: "Moneko - AI Personal Finance Coach & Budgeting App",
        itemListElement: [
          {
            "@type": "Offer",
            name: "Moneko Pro Monthly",
            price: "4.99",
            priceCurrency: "USD",
            description:
              "Monthly subscription to Moneko Pro with WhatsApp-first money assistance.",
            url: pageUrl,
            availability: "https://schema.org/InStock",
            category: "Digital Good",
          },
          {
            "@type": "Offer",
            name: "Moneko Pro Annual",
            price: "34.99",
            priceCurrency: "USD",
            description:
              "Annual subscription to Moneko Pro — best value plan with WhatsApp assistant features.",
            url: pageUrl,
            availability: "https://schema.org/InStock",
            category: "Digital Good",
          },
          {
            "@type": "Offer",
            name: "Moneko Pro Lifetime",
            price: "69.99",
            priceCurrency: "USD",
            description:
              "Lifetime access to Moneko Pro with all WhatsApp assistant features unlocked forever.",
            url: pageUrl,
            availability: "https://schema.org/InStock",
            category: "Digital Good",
          },
        ],
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
