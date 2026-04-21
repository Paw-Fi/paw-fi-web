import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { z } from "zod";
import { getPassiveIncomePageOrFallback } from "@/lib/passive-income-pages";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";

const passiveIncomeSearchSchema = z.object({
  variant: z.string().optional().default("high-interest-portfolios"),
});

export const Route = createFileRoute("/passive-income/$slugId")({
  validateSearch: passiveIncomeSearchSchema,
  loader: async ({ params }) => getPassiveIncomePageOrFallback(params.slugId),
  component: lazyRouteComponent(
    () => import("@/components/performance/passive-income-route-component"),
    "PassiveIncomeRouteComponent",
  ),
  head: ({ params, loaderData }) => {
    const slugId = params.slugId;
    const variant = loaderData as any;
    const canonicalUrl = getCanonicalUrl(`/passive-income/${slugId}`);

    const meta = seo({
      title: variant.meta.title,
      description: variant.meta.description,
      keywords: variant.meta.keywords,
      image: "https://moneko.io/og-img.png",
      url: canonicalUrl,
    });

    return {
      meta,
      links: [
        {
          rel: "canonical",
          href: canonicalUrl,
        },
      ],
    };
  },
});
