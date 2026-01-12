"use client";

import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
    const title = "Moneko Financial Education Blog | Expert Personal Finance Insights";
    const description = "Explore expert insights on personal finance, investing, budgeting, and more from Moneko's financial education blog. Stay informed with the latest money management strategies, AI-powered budgeting tips, and wealth-building advice.";
    const keywords = "moneko blog, financial education blog, money management tips, investing tips, personal finance advice, financial literacy, budgeting strategies, wealth building, moneko insights";
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
      "headline": "Moneko Financial Education Blog - Expert Personal Finance Insights",
      "description": description,
      "url": pageUrl,
      "publisher": {
        "@type": "Organization",
        "name": "Moneko",
        "alternateName": "Moneko App",
        "logo": {
          "@type": "ImageObject",
          "url": "https://moneko.io/og-img.png"
        },
        "sameAs": [
          "https://www.facebook.com/monekoapp",
          "https://twitter.com/monekoapp",
          "https://www.linkedin.com/company/moneko",
          "https://www.instagram.com/monekoapp"
        ]
      },
      "mainEntity": {
        "@type": "ItemList",
        "itemListElement": blogs.slice(0, 10).map((blog, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "url": `https://moneko.io/blogs/${blog.slug}`,
          "name": blog.title
        }))
      },
      "about": {
        "@type": "Thing",
        "name": "Personal Finance Education",
        "description": "Financial literacy, budgeting, investing, and money management"
      }
    };

    return {
      meta,
      links: [
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
        <h1 className="mb-4 bg-gradient-to-r from-primary via-accent-pink to-accent-indigo dark:from-dark-primary dark:via-dark-accent-pink dark:to-dark-accent-indigo bg-clip-text text-3xl font-bold text-transparent sm:text-4xl lg:text-5xl"
        >
          Moneko Financial Education Blog
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          Expert insights and practical advice from Moneko to help you navigate your financial journey with confidence and master your money.
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
          <h3 className="mb-2 text-xl font-medium text-foreground dark:text-dark-foreground">No articles found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search or filter to find what you're looking for.
          </p>
        </motion.div>
      )}
   
    </div>
    </AmbientHaloLayout>
  );
}
