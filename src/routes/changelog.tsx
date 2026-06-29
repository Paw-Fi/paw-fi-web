import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { seo } from "@/utils/seo";

// @ts-ignore

export const Route = createFileRoute("/changelog")({
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
