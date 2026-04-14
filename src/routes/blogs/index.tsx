"use client";

import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { blogs as staticBlogs } from "@/data/blogs/blogs";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";

export const Route = createFileRoute("/blogs/")({
  loader: async () => {
    return { blogs: staticBlogs };
  },
  component: lazyRouteComponent(
    () => import("@/components/performance/blogs-index-route-component"),
    "BlogsIndexRouteComponent",
  ),
  head: ({ loaderData }) => {
    const listingBlogs = loaderData?.blogs || staticBlogs;
    const title =
      "Moneko Financial Education Blog | Expert Personal Finance Insights";
    const description =
      "Explore expert insights on personal finance, investing, budgeting, and more from Moneko's financial education blog. Stay informed with the latest money management strategies, AI-powered budgeting tips, and wealth-building advice.";
    const keywords =
      "moneko blog, financial education blog, money management tips, investing tips, personal finance advice, financial literacy, budgeting strategies, wealth building, moneko insights";
    const imageUrl = "https://moneko.io/og-img.png";
    const pageUrl = getCanonicalUrl("/blogs");

    const meta = seo({
      title,
      description,
      keywords,
      image: imageUrl,
      url: pageUrl,
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      headline:
        "Moneko Financial Education Blog - Expert Personal Finance Insights",
      description,
      url: pageUrl,
      publisher: {
        "@type": "Organization",
        name: "Moneko",
        alternateName: "Moneko App",
        logo: {
          "@type": "ImageObject",
          url: "https://moneko.io/og-img.png",
        },
        sameAs: [
          "https://www.facebook.com/monekoapp",
          "https://twitter.com/monekoapp",
          "https://www.linkedin.com/company/moneko",
          "https://www.instagram.com/monekoapp",
        ],
      },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: listingBlogs.slice(0, 10).map((blog, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `https://moneko.io/blogs/${blog.slug}`,
          name: blog.title,
        })),
      },
      about: {
        "@type": "Thing",
        name: "Personal Finance Education",
        description:
          "Financial literacy, budgeting, investing, and money management",
      },
    };

    return {
      meta,
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        },
      ],
    };
  },
});
