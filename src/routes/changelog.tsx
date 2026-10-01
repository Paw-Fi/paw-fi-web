import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { seo } from "@/utils/seo";

// @ts-ignore

export const Route = createFileRoute("/changelog")({
  validateSearch: (search: Record<string, unknown>) => ({
    version: typeof search.version === "string" ? search.version : undefined,
  }),
  component: lazyRouteComponent(
    () => import("@/components/performance/changelog-route-component"),
    "ChangelogRouteComponent",
  ),
  head: () => {
    return {
      meta: seo({
        title: "Changelog | Moneko",
        description:
          "Track all the latest updates, features, and improvements to Moneko.",
        image: "https://moneko.io/og-img.png",
        url: "https://moneko.io/changelog",
      }),
      links: [{ rel: "canonical", href: "https://moneko.io/changelog" }],
    };
  },
});
