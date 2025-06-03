import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faTag } from "@fortawesome/free-solid-svg-icons";
import { Blog } from "@/components/blogs/blogs.typing";
import { formatDate } from "@/utils/date-utils";

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
          <img
            src={blog.coverImage}
            alt={`Cover image for ${blog.title}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute left-4 top-4 bg-purple-500 px-3 py-1 text-sm font-semibold text-white">
            Featured
          </div>
        </div>

        <div className="flex flex-col justify-center gap-4 p-6">
          <div className="flex flex-wrap gap-2">
            {blog.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200"
              >
                <FontAwesomeIcon icon={faTag} className="mr-1.5 h-3 w-3" aria-hidden="true" />
                {tag.name}
              </span>
            ))}
          </div>

          <h2 className="text-2xl font-bold leading-tight text-gray-900 transition-colors group-hover:text-purple-600 dark:text-white dark:group-hover:text-purple-400 md:text-3xl">
            {blog.title}
          </h2>

          <p className="line-clamp-3 text-gray-600 dark:text-gray-300 md:text-lg">
            {blog.excerpt}
          </p>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={blog.author.avatar}
                alt={blog.author.name}
                className="h-10 w-10 rounded-full"
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{blog.author.name}</p>
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
