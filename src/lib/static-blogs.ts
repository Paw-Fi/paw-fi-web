import type { Blog } from "@/components/blogs/blogs.typing";

let staticBlogsPromise: Promise<Blog[]> | null = null;

export async function loadStaticBlogs(): Promise<Blog[]> {
  if (!staticBlogsPromise) {
    staticBlogsPromise = import("@/data/blogs/blogs").then(
      (module) => module.blogs,
    );
  }

  return staticBlogsPromise;
}

export async function findStaticBlogBySlug(
  slug: string,
): Promise<Blog | undefined> {
  const blogs = await loadStaticBlogs();
  return blogs.find((blog) => blog.slug === slug);
}
