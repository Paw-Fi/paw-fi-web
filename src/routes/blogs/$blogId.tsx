"use client";

import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faArrowLeft, 
  faClock, 
  faTag, 
  faShare
} from "@fortawesome/free-solid-svg-icons";
import { 
  faTwitter,
  faFacebook,
  faLinkedin
} from "@fortawesome/free-brands-svg-icons";
import ReactMarkdown from "react-markdown";
import { blogs } from "@/data/blogs/blogs";
import { Blog } from "@/components/blogs/blogs.typing";
import { formatDate } from "@/utils/date-utils";
import { seo } from "@/utils/seo";

export const Route = createFileRoute("/blogs/$blogId")({
  component: BlogDetailPage,
  loader: ({ params }) => {
    const blog = blogs.find(blog => blog.slug === params.blogId);
    if (!blog) {
      throw new Response("Not Found", { status: 404 });
    }
    return { blog };
  },
  head: ({ params }) => {
    const blog = blogs.find(blog => blog.slug === params.blogId);
    
    if (!blog) {
      return { title: "Blog Not Found" };
    }
    
    const title = blog.seo?.metaTitle || blog.title;
    const description = blog.seo?.metaDescription || blog.excerpt;
    const keywords = blog.seo?.keywords || blog.tags.map(tag => tag.name).join(", ");
    const imageUrl = blog.coverImage;
    const pageUrl = `https://pawfi.app/blogs/${blog.slug}`;
    
    const meta = seo({
      title,
      description,
      keywords,
      image: imageUrl,
      url: pageUrl,
    });
    
    // Create structured data for blog post
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": blog.title,
      "image": blog.coverImage,
      "datePublished": blog.publishedAt,
      "dateModified": blog.publishedAt,
      "author": {
        "@type": "Person",
        "name": blog.author.name
      },
      "publisher": {
        "@type": "Organization",
        "name": "PawFi",
        "logo": {
          "@type": "ImageObject",
          "url": "https://pawfi.app/icon.svg"
        }
      },
      "description": blog.excerpt,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": pageUrl
      },
      "keywords": blog.tags.map(tag => tag.name).join(", ")
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

function BlogDetailPage() {
  const { blog } = Route.useLoaderData();
  const navigate = useNavigate();
  const [relatedBlogs, setRelatedBlogs] = useState<Blog[]>([]);
  
  // Scroll to top when the page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // Find related blogs based on tags
  useEffect(() => {
    const tagIds = blog.tags.map(tag => tag.id);
    
    const related = blogs
      .filter(b => 
        b.id !== blog.id && 
        b.tags.some(tag => tagIds.includes(tag.id))
      )
      .slice(0, 3);
      
    setRelatedBlogs(related);
  }, [blog]);

  // Share functionality
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  
  const shareOnTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };
  
  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };
  
  const shareOnLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <button
          onClick={() => navigate({ to: "/blogs", resetScroll: false })}
          className="mb-8 flex items-center gap-2 text-purple-600 transition-colors hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" aria-hidden="true" />
          <span>Back to blogs</span>
        </button>

        <div className="mb-8 flex flex-wrap gap-2">
          {blog.tags.map(tag => (
            <Link
              key={tag.id}
              to="/blogs"
              className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800 transition-colors hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800"
            >
              <FontAwesomeIcon icon={faTag} className="mr-1.5 h-3 w-3" aria-hidden="true" />
              {tag.name}
            </Link>
          ))}
        </div>

        <h1 className="mb-6 text-3xl font-bold leading-tight text-gray-900 dark:text-white md:text-4xl lg:text-5xl">
          {blog.title}
        </h1>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-6 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <img
              src={blog.author.avatar}
              alt={blog.author.name}
              className="h-12 w-12 rounded-full"
            />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{blog.author.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{blog.author.title}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div>{formatDate(blog.publishedAt)}</div>
            <div className="flex items-center">
              <FontAwesomeIcon icon={faClock} className="mr-1.5" aria-hidden="true" />
              <span>{blog.readTime} min read</span>
            </div>
          </div>
        </div>

        <div className="relative mb-10 aspect-video w-full overflow-hidden rounded-2xl">
          <img
            src={blog.coverImage}
            alt={`Cover image for ${blog.title}`}
            className="h-full w-full object-cover"
          />
        </div>

        <article className="prose prose-purple mx-auto max-w-none dark:prose-invert lg:prose-lg">
          <ReactMarkdown>{blog.content}</ReactMarkdown>
        </article>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-6 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <img
              src={blog.author.avatar}
              alt={blog.author.name}
              className="h-16 w-16 rounded-full"
            />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{blog.author.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{blog.author.bio}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Share:</span>
            <button
              onClick={shareOnTwitter}
              aria-label="Share on Twitter"
              className="rounded-full bg-gray-100 p-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <FontAwesomeIcon icon={faTwitter} className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={shareOnFacebook}
              aria-label="Share on Facebook"
              className="rounded-full bg-gray-100 p-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <FontAwesomeIcon icon={faFacebook} className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              onClick={shareOnLinkedIn}
              aria-label="Share on LinkedIn"
              className="rounded-full bg-gray-100 p-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <FontAwesomeIcon icon={faLinkedin} className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </motion.div>

      {relatedBlogs.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Related Articles</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedBlogs.map((relatedBlog, index) => (
              <motion.div
                key={relatedBlog.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Link
                  to="/blogs/$blogId"
                  params={{ blogId: relatedBlog.slug }}
                  className="group block h-full overflow-hidden rounded-xl bg-white shadow-md transition-all hover:shadow-lg dark:bg-gray-800"
                >
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={relatedBlog.coverImage}
                      alt={`Cover image for ${relatedBlog.title}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="mb-2 line-clamp-2 text-lg font-bold text-gray-900 transition-colors group-hover:text-purple-600 dark:text-white dark:group-hover:text-purple-400">
                      {relatedBlog.title}
                    </h3>
                    <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
                      {relatedBlog.excerpt}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
