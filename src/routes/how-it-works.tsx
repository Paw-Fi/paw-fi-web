import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";

const META_TITLE = "How Moneko Works - AI Budgeting Simplified"
const META_DESCRIPTION = "See how Moneko uses AI to simplify personal and household finance. From voice capture to envelope budgeting and WhatsApp integration."

export const Route = createFileRoute('/how-it-works')({
  component: lazyRouteComponent(() => import("@/components/performance/how-it-works-route-component"), "HowItWorksRouteComponent"),
  head: () => {
    const pageUrl = getCanonicalUrl("/how-it-works")
    return {
      meta: seo({
        title: META_TITLE,
        description: META_DESCRIPTION,
        url: pageUrl,
      })
    }
  }
})
