import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

// @ts-ignore

export const Route = createFileRoute("/changelog")({
  component: lazyRouteComponent(
    () => import("@/components/performance/changelog-route-component"),
    "ChangelogRouteComponent",
  ),
  head: () => {
    return {
      meta: [
        {
          title: "Changelog | Moneko",
          name: "description",
          content:
            "Track all the latest updates, features, and improvements to Moneko.",
        },
        {
          property: "og:title",
          content: "Changelog | Moneko",
        },
        {
          property: "og:description",
          content:
            "Track all the latest updates, features, and improvements to Moneko.",
        },
        {
          name: "canonical",
          content: "https://moneko.io/changelog",
        },
      ],
    };
  },
});
