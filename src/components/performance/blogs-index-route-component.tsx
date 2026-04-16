"use client";

import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";
import { BlogTag } from "@/components/blogs/blogs.typing";
import { BlogFilters } from "@/components/blogs/blog-filters";
import { BlogMasonryGrid } from "@/components/blogs/blog-masonry-grid";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { HomeHeader } from "@/components/index/header";
import { Route } from "@/routes/blogs/index";
import { fetchSubredditBlogs } from "@/services/reddit-blog-service";

export function BlogsIndexRouteComponent() {
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

        setBlogs([...redditBlogs, ...initialBlogs]);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setBlogs(initialBlogs);
      });

    return () => {
      isMounted = false;
    };
  }, [initialBlogs]);

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
