"use client";

import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { resources } from "@/data/resources";

export const Route = createFileRoute("/resources/$resourceId")({
  loader: async ({ params }) => {
    const resource = resources.find((r) => r.id === params.resourceId);
    if (!resource) {
      throw new Error("Resource not found");
    }
    return { resource };
  },
  component: lazyRouteComponent(
    () => import("@/components/performance/resource-detail-route-component"),
    "ResourceDetailRouteComponent",
  ),
  head: ({ loaderData }) => {
    const resource = loaderData?.resource;
    if (!resource) return {};

    const title = `${resource.name} | Financial Resources | Moneko`;
    const description = resource.description;
    const pageUrl = getCanonicalUrl(`/resources/${resource.id}`);

    const meta = seo({
      title,
      description,
      url: pageUrl,
    });

    return {
      meta,
      links: [{ rel: "canonical", href: pageUrl }],
    };
  },
});
