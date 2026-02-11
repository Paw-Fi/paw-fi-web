"use client";

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { blogs as staticBlogs } from "@/data/blogs/blogs";
import { BlogTag } from "@/components/blogs/blogs.typing";
import { BlogFilters } from "@/components/blogs/blog-filters";
import { BlogMasonryGrid } from "@/components/blogs/blog-masonry-grid";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { HomeHeader } from "@/components/index/header";
import { fetchSubredditBlogs } from "@/services/reddit-blog-service";

export const Route = createFileRoute("/blogs/")({
  loader: async () => {
    return { blogs: staticBlogs };
  },
  component: BlogsPage,
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
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        },
      ],
    };
  },
});

function BlogsPage() {
  const { blogs: initialBlogs } = Route.useLoaderData();
  const [blogs, setBlogs] = useState(initialBlogs);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    void fetchSubredditBlogs()
      .then((redditBlogs) => {
        if (!isMounted) {
          return;
        }

        setBlogs([...redditBlogs, ...staticBlogs]);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setBlogs(staticBlogs);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const availableTags = useMemo(() => getUniqueTagsFromBlogs(blogs), [blogs]);

  const filteredBlogs = useMemo(() => {
    let result = [...blogs];

    if (selectedTags.length > 0) {
      result = result.filter((blog) =>
        blog.tags.some((tag) => selectedTags.includes(tag.id)),
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (blog) =>
          blog.title.toLowerCase().includes(query) ||
          blog.excerpt.toLowerCase().includes(query) ||
          blog.tags.some((tag) => tag.name.toLowerCase().includes(query)) ||
          blog.author.name.toLowerCase().includes(query),
      );
    }

    return result;
  }, [blogs, selectedTags, searchQuery]);

  const featuredBlog = blogs.find((blog) => blog.featured) || blogs[0];

  const gridBlogs = filteredBlogs.map((blog) => ({
    ...blog,
    extraFeatured: featuredBlog
      ? blog.id === featuredBlog.id && selectedTags.length === 0 && !searchQuery
      : false,
  }));

  const handleTagSelect = (tagId: string) => {
    setSelectedTags((previous) =>
      previous.includes(tagId)
        ? previous.filter((id) => id !== tagId)
        : [...previous, tagId],
    );
  };

  return (
    <AmbientHaloLayout>
      <HomeHeader />
      <div className="mx-auto mt-24 max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-slate-900 md:text-7xl dark:text-white">
            Moneko Financial Education Blog
          </h1>
          <h2 className="mx-auto max-w-2xl text-xl leading-relaxed text-slate-600 dark:text-slate-400">
            Expert insights and practical advice from Moneko to help you
            navigate your financial journey with confidence and master your
            money.
          </h2>
        </motion.div>

        <BlogFilters
          tags={availableTags}
          selectedTags={selectedTags}
          onTagSelect={handleTagSelect}
          onSearch={setSearchQuery}
        />

        {filteredBlogs.length > 0 ? (
          <BlogMasonryGrid blogs={gridBlogs} />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="my-16 text-center"
          >
            <h3 className="text-foreground dark:text-dark-foreground mb-2 text-xl font-medium">
              No articles found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your search or filter to find what you&apos;re
              looking for.
            </p>
          </motion.div>
        )}
      </div>
    </AmbientHaloLayout>
  );
}

function getUniqueTagsFromBlogs(blogs: Array<{ tags: BlogTag[] }>): BlogTag[] {
  const tagsMap = new Map<string, BlogTag>();
  for (const blog of blogs) {
    for (const tag of blog.tags) {
      if (!tagsMap.has(tag.id)) {
        tagsMap.set(tag.id, tag);
      }
    }
  }

  return Array.from(tagsMap.values());
}
