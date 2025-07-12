"use client";

import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRss } from "@fortawesome/free-solid-svg-icons";
import { blogs, tags } from "@/data/blogs/blogs";
import { BlogFilters } from "@/components/blogs/blog-filters";
import { BlogMasonryGrid } from "@/components/blogs/blog-masonry-grid";
import { FeaturedBlogCard } from "@/components/blogs/featured-blog-card";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { HomeHeader } from "@/components/index/header";

export const Route = createFileRoute("/blogs/")({
  component: BlogsPage,
  head: () => {
    const title = "Financial Education Blog | Moneko";
    const description = "Explore expert insights on personal finance, investing, budgeting, and more. Stay informed with the latest financial education articles from Moneko.";
    const keywords = "financial blog, money management, investing tips, personal finance, financial literacy, Moneko blog";
    const imageUrl = "https://moneko.io/og-img.png";
    const pageUrl = getCanonicalUrl("/blogs");

    const meta = seo({
      title,
      description,
      keywords,
      image: imageUrl,
      url: pageUrl,
    });

    // Create structured data for blog listing page
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "headline": "Financial Education Blog | Moneko",
      "description": description,
      "url": pageUrl,
      "publisher": {
        "@type": "Organization",
        "name": "Moneko",
        "logo": {
          "@type": "ImageObject",
          "url": "https://moneko.io/favicon.ico"
        }
      },
      "mainEntity": {
        "@type": "ItemList",
        "itemListElement": blogs.slice(0, 10).map((blog, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "url": `https://moneko.io/blogs/${blog.slug}`
        }))
      }
    };

    return {
      meta,
      link: [
        {
          rel: "canonical",
          href: pageUrl
        }
      ],
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData)
        }
      ]
    };
  }
});

function BlogsPage() {
  const [filteredBlogs, setFilteredBlogs] = useState(blogs);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const featuredBlog = blogs.find(blog => blog.featured) || blogs[0];

  // Filter blogs based on selected tags and search query
  useEffect(() => {
    let result = [...blogs];
    
    // Filter by tags if any are selected
    if (selectedTags.length > 0) {
      result = result.filter(blog => 
        blog.tags.some(tag => selectedTags.includes(tag.id))
      );
    }
    
    // Filter by search query if any
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        blog => 
          blog.title.toLowerCase().includes(query) || 
          blog.excerpt.toLowerCase().includes(query) ||
          blog.tags.some(tag => tag.name.toLowerCase().includes(query)) ||
          blog.author.name.toLowerCase().includes(query)
      );
    }
    
    setFilteredBlogs(result);
  }, [selectedTags, searchQuery]);

  const handleTagSelect = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId) 
        : [...prev, tagId]
    );
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // For masonry layout, we'll keep all blogs but mark some as featured
  // This allows the masonry grid to handle the sizing appropriately
  const gridBlogs = filteredBlogs.map(blog => ({
    ...blog,
    // If this is the featured blog and no filters are applied, mark it as extra featured
    // for special styling in the masonry grid
    extraFeatured: blog.id === featuredBlog.id && selectedTags.length === 0 && !searchQuery
  }));

  return (
    <AmbientHaloLayout>
      <HomeHeader/>
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12 text-center"
      >
        <h1             className="mb-4 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl lg:text-5xl dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400"
        >
          Financial Education Blog
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          Expert insights and practical advice to help you navigate your financial journey with confidence.
        </p>
      </motion.div>

      <BlogFilters 
        tags={tags} 
        selectedTags={selectedTags} 
        onTagSelect={handleTagSelect} 
        onSearch={handleSearch}
      />

      {/* We no longer need a separate featured blog section as it's handled in the masonry grid */}

      {filteredBlogs.length > 0 ? (
        <BlogMasonryGrid blogs={gridBlogs} />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="my-16 text-center"
        >
          <h3 className="mb-2 text-xl font-medium text-gray-900 dark:text-white">No articles found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search or filter to find what you're looking for.
          </p>
        </motion.div>
      )}
   
    </div>
    </AmbientHaloLayout>
  );
}
