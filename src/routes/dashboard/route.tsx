import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";

export const Route = createFileRoute("/dashboard")({
  component: lazyRouteComponent(
    () => import("@/components/performance/dashboard-route-component"),
    "DashboardRouteComponent",
  ),
  loader: async () => {
    return {};
  },
  head: () => {
    const pageUrl = getCanonicalUrl("/dashboard");
    const title = "Personal Finance Dashboard - AI Portfolio Tracking | Moneko";
    const description =
      "Access comprehensive financial dashboard with AI portfolio tracking, learning paths, goal management & smart calculators.";
    const keywords =
      "personal finance dashboard, portfolio tracking, AI financial coach, financial education platform, investment tracking, budgeting tools, financial goal tracker, wealth building dashboard";
    const imageUrl = "https://moneko.io/og-img.png";

    const meta = seo({
      title,
      description,
      keywords,
      url: pageUrl,
      image: imageUrl,
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://moneko.io/#organization",
          name: "Moneko",
          url: "https://moneko.io",
          logo: "https://moneko.io/icon.svg",
          sameAs: [
            "https://www.facebook.com/monekoai/",
            "https://www.instagram.com/moneko_ai",
            "https://x.com/moneko_ai",
          ],
        },
        {
          "@type": "WebSite",
          "@id": "https://moneko.io/#website",
          name: "Moneko",
          url: "https://moneko.io",
          publisher: {
            "@id": "https://moneko.io/#organization",
          },
        },
        {
          "@type": "WebPage",
          "@id": pageUrl,
          url: pageUrl,
          name: title,
          description: description,
          isPartOf: {
            "@id": "https://moneko.io/#website",
          },
          about: [
            { "@type": "Thing", name: "Personal Finance Management" },
            { "@type": "Thing", name: "Portfolio Tracking" },
            { "@type": "Thing", name: "Financial Education" },
            { "@type": "Thing", name: "Goal Management" },
          ],
        },
        {
          "@type": "SoftwareApplication",
          name: "Moneko Personal Finance Dashboard",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web, iOS, Android",
          description: description,
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          featureList: [
            "AI portfolio tracking",
            "Financial health monitoring",
            "Goal management",
            "Interactive learning courses",
            "Financial calculators",
            "Chat-based AI coaching",
          ],
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: "https://moneko.io",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Dashboard",
              item: pageUrl,
            },
          ],
        },
      ],
    };

    return {
      meta: [
        ...meta,
        {
          name: "robots",
          content: "noindex, nofollow",
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
