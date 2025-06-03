"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Blog } from "@/components/blogs/blogs.typing";
import { BlogCard } from "./blog-card";

interface BlogMasonryGridProps {
  blogs: Blog[];
}

export function BlogMasonryGrid({ blogs }: BlogMasonryGridProps) {
  const [columnCount, setColumnCount] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine number of columns based on container width
  useEffect(() => {
    const updateColumns = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.offsetWidth;
      
      if (width < 640) {
        setColumnCount(1);
      } else if (width < 1024) {
        setColumnCount(2);
      } else if (width < 1280) {
        setColumnCount(3);
      } else {
        setColumnCount(4);
      }
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  // Distribute blogs into columns for masonry layout
  const getColumnBlogs = () => {
    // Check if there's an extra featured blog that should span all columns
    const extraFeaturedBlog = blogs.find(blog => (blog as any).extraFeatured);
    const regularBlogs = extraFeaturedBlog 
      ? blogs.filter(blog => blog.id !== extraFeaturedBlog.id)
      : blogs;
      
    // Create arrays for each column
    const columns: Blog[][] = Array.from({ length: columnCount }, () => []);
    
    // Distribute regular blogs across columns
    regularBlogs.forEach((blog, index) => {
      const columnIndex = index % columnCount;
      columns[columnIndex].push(blog);
    });
    
    return { columns, extraFeaturedBlog };
  };

  const { columns, extraFeaturedBlog } = getColumnBlogs();

  return (
    <div ref={containerRef} className="w-full">
      {/* Extra featured blog at the top if it exists */}
      {extraFeaturedBlog && (
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <BlogCard 
            blog={{ ...extraFeaturedBlog, isExtraFeatured: true }} 
            index={0} 
          />
        </motion.div>
      )}
      
      {/* Masonry grid with columns */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(columnCount, 4)} gap-6`}>
        {columns.map((columnBlogs, columnIndex) => (
          <div key={columnIndex} className="flex flex-col gap-6">
            {columnBlogs.map((blog, blogIndex) => (
              <motion.div
                key={blog.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.5, 
                  delay: (columnIndex * 0.1) + (blogIndex * 0.05)
                }}
              >
                <BlogCard 
                  blog={blog} 
                  index={blogIndex} 
                />
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
