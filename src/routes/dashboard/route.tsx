import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
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

    return {
      meta: [
        ...meta,
        {
          name: "robots",
          content: "noindex, nofollow",
        },
      ],
    };
  },
});
