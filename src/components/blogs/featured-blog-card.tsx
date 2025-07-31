import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faTag } from "@fortawesome/free-solid-svg-icons";
import { Blog } from "@/components/blogs/blogs.typing";
import { formatDate } from "@/utils/date-utils";
import { OptimizedImage } from "@/components/seo/optimized-image";

interface FeaturedBlogCardProps {
  blog: Blog;
}

export function FeaturedBlogCard({ blog }: FeaturedBlogCardProps) {
  return (
    <motion.article
      className="relative overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-gray-800"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Link
        to="/blogs/$blogId"
        params={{ blogId: blog.slug }}
        className="group grid grid-cols-1 md:grid-cols-2"
      >
        <div className="relative aspect-video md:aspect-auto md:h-full">
          <OptimizedImage
            src={blog.coverImage}
            alt={`Cover image for ${blog.title}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute left-4 top-4 bg-primary dark:bg-dark-primary px-3 py-1 text-sm font-semibold text-white">
            Featured
          </div>
        </div>

        <div className="flex flex-col justify-center gap-4 p-6">
          <div className="flex flex-wrap gap-2">
            {blog.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center rounded-full bg-primary/10 dark:bg-dark-primary/10 px-3 py-1 text-sm font-medium text-primary dark:text-dark-primary"
              >
                <FontAwesomeIcon icon={faTag} className="mr-1.5 h-3 w-3" aria-hidden="true" />
                {tag.name}
              </span>
            ))}
          </div>

          <h2 className="text-2xl font-bold leading-tight text-foreground dark:text-dark-foreground transition-colors group-hover:text-primary dark:group-hover:text-dark-primary md:text-3xl">
            {blog.title}
          </h2>

          <p className="line-clamp-3 text-gray-600 dark:text-gray-300 md:text-lg">
            {blog.excerpt}
          </p>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <OptimizedImage
                src={blog.author.avatar}
                alt={blog.author.name}
                className="h-10 w-10 rounded-full"
              />
              <div>
                <p className="font-medium text-foreground dark:text-dark-foreground">{blog.author.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{blog.author.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{formatDate(blog.publishedAt)}</span>
              <span>•</span>
              <FontAwesomeIcon icon={faClock} className="mr-1" aria-hidden="true" />
              <span>{blog.readTime} min read</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
