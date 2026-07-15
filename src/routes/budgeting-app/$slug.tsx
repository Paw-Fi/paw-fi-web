import {
  createFileRoute,
  lazyRouteComponent,
  notFound,
  redirect,
} from "@tanstack/react-router";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { getPassiveIncomePage } from "@/lib/passive-income-pages";

export const Route = createFileRoute("/budgeting-app/$slug")({
  // Use Streaming SSR for dynamic personalized content
  ssr: true,
  loader: async ({ params }) => {
    if (params.slug === "best-budgeting-app-2026") {
      throw redirect({ href: "/budgeting-app-2026", statusCode: 301 });
    }

    const pageData = await getPassiveIncomePage(params.slug);

    if (!pageData) {
      throw notFound();
    }

    return {
      ...pageData,
      slug: params.slug,
    } as any;
  },
  component: lazyRouteComponent(
    () => import("@/components/performance/budgeting-app-slug-route-component"),
    "BudgetingAppSlugRouteComponent",
  ),

  head: ({ params, loaderData }) => {
    const pageUrl = getCanonicalUrl(`/budgeting-app/${params.slug}`);
    const pageTitle =
      loaderData?.meta?.title ??
      "Moneko | AI-Powered Budgeting App for Smart Financial Planning";
    const pageDescription =
      loaderData?.meta?.description ??
      "Discover how Moneko's AI-powered budgeting app delivers personalized financial education, smart budgeting tools, and investing courses tailored to your specific needs.";
    const pageKeywords =
      loaderData?.meta?.keywords ??
      "AI budgeting app, financial learning, personalized budget, investing courses, financial planning tools";

    // Create SEO metadata
    const meta = seo({
      title: pageTitle,
      description: pageDescription,
      keywords: pageKeywords,
      url: pageUrl,
      image: "https://moneko.io/og-img.png",
    });

    return {
      title: pageTitle,
      meta,
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
    };
  },
});
