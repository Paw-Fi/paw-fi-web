import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faTag } from "@fortawesome/free-solid-svg-icons";
import { Blog } from "@/components/blogs/blogs.typing";
import { formatDate } from "@/utils/date-utils";

interface BlogCardProps {
  blog: Blog & {
    isExtraFeatured?: boolean;
  };
  index: number;
}

export function BlogCard({ blog, index }: BlogCardProps) {
  // Determine if this is an extra featured blog
  const isExtraFeatured = blog.isExtraFeatured;
  
  return (
    <motion.article
      className={`flex h-full flex-col overflow-hidden rounded-2xl ${isExtraFeatured ? 'bg-gradient-to-br from-primary/5 to-primary/10 shadow-xl dark:from-dark-primary/10 dark:to-gray-800' : 'bg-white shadow-md dark:bg-gray-800'} transition-all hover:shadow-lg`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Link
        to="/blogs/$blogId"
        params={{ blogId: blog.slug }}
        className="group block overflow-hidden"
      >
        <div className="relative overflow-hidden" style={{ aspectRatio: blog.isExtraFeatured ? '21/9' : blog.featured ? '16/9' : '4/3' }}>
          <img
            src={blog.coverImage}
            alt={`Cover image for ${blog.title}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {blog.featured && (
            <div className="absolute left-0 top-0 bg-primary dark:bg-dark-primary px-3 py-1 text-sm font-semibold text-white">
              Featured
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex items-center gap-2">
            {blog.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center rounded-full bg-primary/10 dark:bg-dark-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary dark:text-dark-primary"
              >
                <FontAwesomeIcon icon={faTag} className="mr-1 h-3 w-3" aria-hidden="true" />
                {tag.name}
              </span>
            ))}
          </div>

          <h2 className={` ${blog.isExtraFeatured ? 'text-2xl md:text-3xl' : 'text-xl'} font-bold leading-tight text-foreground dark:text-dark-foreground transition-colors group-hover:text-primary dark:group-hover:text-dark-primary`}>
            {blog.title}
          </h2>

          <p className="line-clamp-3 text-sm text-gray-600 dark:text-gray-300">
            {blog.excerpt}
          </p>

          <div className="mt-auto flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              <img
                src={blog.author.avatar}
                alt={blog.author.name}
                className="h-8 w-8 rounded-full"
                loading="lazy"
              />
              <span className="text-sm font-medium text-foreground dark:text-dark-foreground">
                {blog.author.name}
              </span>
            </div>
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <FontAwesomeIcon icon={faClock} className="mr-1" aria-hidden="true" />
              <span>{blog.readTime} min read</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
