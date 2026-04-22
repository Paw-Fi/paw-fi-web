import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";

const META_TITLE = "How Moneko Works - AI Budgeting from Chat to Pockets";
const META_DESCRIPTION =
  "See how Moneko turns WhatsApp messages, receipts, voice notes, and mobile spending signals into reviewed budget entries, Pockets, and shared household views.";
const META_KEYWORDS =
  "how Moneko works, AI budgeting workflow, WhatsApp expense tracking, digital envelope budgeting, shared household budget";

export const Route = createFileRoute("/how-it-works")({
  component: lazyRouteComponent(
    () => import("@/components/performance/how-it-works-route-component"),
    "HowItWorksRouteComponent",
  ),
  head: () => {
    const pageUrl = getCanonicalUrl("/how-it-works");
    return {
      meta: seo({
        title: META_TITLE,
        description: META_DESCRIPTION,
        keywords: META_KEYWORDS,
        url: pageUrl,
      }),
      links: [{ rel: "canonical", href: pageUrl }],
    };
  },
});
