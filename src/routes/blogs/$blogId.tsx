"use client";

import { Suspense, lazy, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faClock,
  faTag,
  faX,
} from "@fortawesome/free-solid-svg-icons";
import {
  faTwitter,
  faFacebook,
  faLinkedin,
} from "@fortawesome/free-brands-svg-icons";
import { formatDate } from "@/utils/date-utils";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { HomeHeader } from "@/components/index/header";
import { OptimizedImage } from "@/components/seo/optimized-image";
import { StructuredData } from "@/components/seo/structured-data";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/Breadcrumb";
import { findStaticBlogBySlug, loadStaticBlogs } from "@/lib/static-blogs";
import {
  fetchSubredditBlogBySlug,
  fetchSubredditBlogs,
} from "@/services/reddit-blog-service";

const Markdown = lazy(() =>
  import("@/components/ui/markdown").then((module) => ({
    default: module.Markdown,
  })),
);

export const Route = createFileRoute("/blogs/$blogId")({
  component: BlogDetailPage,
  loader: async ({ params }) => {
    try {
      const redditBlogs = await fetchSubredditBlogs();
      const redditBlog = redditBlogs.find(
        (blog) => blog.slug === params.blogId,
      );
      if (redditBlog) {
        return { blog: redditBlog, allBlogs: redditBlogs };
      }

      const fallbackRedditBlog = await fetchSubredditBlogBySlug(params.blogId);
      if (fallbackRedditBlog) {
        return { blog: fallbackRedditBlog, allBlogs: redditBlogs };
      }
    } catch (_error) {
      // Fall through to static content if Reddit API is unavailable.
    }

    const [staticBlogs, staticBlog] = await Promise.all([
      loadStaticBlogs(),
      findStaticBlogBySlug(params.blogId),
    ]);
    if (!staticBlog) {
      throw new Response("Not Found", { status: 404 });
    }

    return { blog: staticBlog, allBlogs: staticBlogs };
  },
  head: ({ loaderData }) => {
    const blog = loaderData?.blog;

    if (!blog) {
      return { title: "Blog Not Found" };
    }

    const title = blog.seo?.metaTitle || blog.title;
    const description = blog.seo?.metaDescription || blog.excerpt;
    const keywords =
      blog.seo?.keywords || blog.tags?.map((tag) => tag.name).join(", ") || "";
    const imageUrl = blog.coverImage;
    const pageUrl = getCanonicalUrl(`/blogs/${blog.slug}`);

    const meta = seo({
      title,
      description,
      keywords,
      image: imageUrl,
      url: pageUrl,
    });

    return {
      meta,
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
    };
  },
});

function BlogDetailPage() {
  const { blog, allBlogs } = Route.useLoaderData();
  const navigate = useNavigate();
  const pageUrl = getCanonicalUrl(`/blogs/${blog.slug}`);
  const relatedBlogs = useMemo(() => {
    const tagIds = blog.tags?.map((tag) => tag.id) || [];
    return allBlogs
      .filter(
        (candidate) =>
          candidate.id !== blog.id &&
          candidate.tags?.some((tag) => tagIds.includes(tag.id)),
      )
      .slice(0, 3);
  }, [allBlogs, blog]);

  // Calculate word count for schema
  const wordCount = blog.content.trim().split(/\s+/).length;

  // Share functionality
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const shareOnTwitter = () => {
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const shareOnFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const shareOnLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="bg-moneko-background h-full w-full">
      <HomeHeader />
      <div className="mx-auto max-w-4xl px-4 pt-28 pb-12 sm:px-6 lg:px-8">
        {/* Enhanced Article Schema with Financial Expert Knowledge */}
        <StructuredData
          type="article"
          data={{
            "@type": "Article",
            "@id": `https://moneko.io/blogs/${blog.slug}`,
            headline: blog.title,
            description: blog.excerpt,
            url: `https://moneko.io/blogs/${blog.slug}`,
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://moneko.io/blogs/${blog.slug}`,
            },
            datePublished: blog.publishedAt,
            dateModified: blog.publishedAt,
            author: {
              "@type": "Person",
              name: blog.author.name,
              url: `https://moneko.io/team#${blog.author.id}`,
              jobTitle: blog.author.title,
              image: blog.author.avatar,
              knowsAbout: [
                "Personal Finance",
                "Investment Strategy",
                "Financial Planning",
                "Portfolio Management",
                "Financial Education",
                "Risk Assessment",
                "Retirement Planning",
                "Asset Allocation",
              ],
              hasCredential: blog.author.title.includes("CFA")
                ? "Chartered Financial Analyst"
                : blog.author.title.includes("CFP")
                  ? "Certified Financial Planner"
                  : "Financial Professional",
            },
            image: {
              "@type": "ImageObject",
              url: blog.coverImage,
              width: 1200,
              height: 675,
            },
            publisher: {
              "@type": "Organization",
              name: "Moneko",
              url: "https://moneko.io",
              logo: {
                "@type": "ImageObject",
                url: "https://moneko.io/logo192.png",
                width: 192,
                height: 192,
              },
              sameAs: [
                "https://x.com/moneko_ai",
                "https://linkedin.com/company/moneko-ai",
                "https://facebook.com/moneko",
              ],
            },
            wordCount,
            timeRequired: `PT${blog.readTime}M`,
            educationalLevel: "Beginner",
            isAccessibleForFree: true,
            inLanguage: "en-US",
            keywords:
              blog.seo?.keywords ||
              blog.tags?.map((tag) => tag.name).join(", ") ||
              "",
            articleSection: "Financial Education",
            genre: "Educational Content",
            audience: {
              "@type": "Audience",
              audienceType: "Financial Learners",
            },
            teaches: blog.tags?.map((tag) => tag.name) || [],
            about:
              blog.tags?.map((tag) => ({
                "@type": "Thing",
                name: tag.name,
                sameAs: `https://moneko.io/blogs?tag=${tag.slug}`,
              })) || [],
            speakable: {
              "@type": "SpeakableSpecification",
              cssSelector: ["h1", "h2", "h3", ".prose p"],
            },
            potentialAction: {
              "@type": "ReadAction",
              target: `https://moneko.io/blogs/${blog.slug}`,
            },
          }}
        />

        {/* Enhanced Author Person Schema */}
        <StructuredData
          type="person"
          data={{
            "@type": "Person",
            "@id": `https://moneko.io/team#${blog.author.id}`,
            name: blog.author.name,
            jobTitle: blog.author.title,
            description: blog.author.bio,
            image: blog.author.avatar,
            url: `https://moneko.io/team#${blog.author.id}`,
            worksFor: {
              "@type": "Organization",
              name: "Moneko",
              url: "https://moneko.io",
              logo: "https://moneko.io/logo192.png",
            },
            knowsAbout: [
              "Personal Finance",
              "Investment Strategy",
              "Financial Planning",
              "Portfolio Management",
              "Financial Education",
              "Risk Assessment",
              "Retirement Planning",
              "Asset Allocation",
              "Budgeting",
              "Debt Management",
            ],
            expertise: blog.author.title,
            hasCredential: blog.author.title.includes("CFA")
              ? "Chartered Financial Analyst"
              : blog.author.title.includes("CFP")
                ? "Certified Financial Planner"
                : "Financial Professional",
            alumniOf: blog.author.title.includes("CFA")
              ? "CFA Institute"
              : undefined,
            memberOf: {
              "@type": "Organization",
              name: "Financial Planning Association",
            },
          }}
        />

        {/* Organization Schema for Moneko */}
        <StructuredData
          type="organization"
          data={{
            "@type": "Organization",
            "@id": "https://moneko.io/#organization",
            name: "Moneko",
            alternateName: "Moneko Financial Education Platform",
            description:
              "AI-powered financial education and budgeting platform providing personalized financial learning, calculators, and expert guidance",
            url: "https://moneko.io",
            logo: {
              "@type": "ImageObject",
              url: "https://moneko.io/logo192.png",
              width: 192,
              height: 192,
            },
            foundingDate: "2023",
            founder: {
              "@type": "Person",
              name: "Moneko Team",
            },
            numberOfEmployees: "10-50",
            industry: "Financial Technology",
            knowsAbout: [
              "Personal Finance Education",
              "AI-Powered Financial Planning",
              "Investment Education",
              "Budgeting Tools",
              "Financial Calculators",
              "Retirement Planning",
              "Emergency Fund Planning",
            ],
            offers: [
              {
                "@type": "Service",
                name: "Financial Education Platform",
                description:
                  "Comprehensive financial education with AI-powered personalization",
              },
              {
                "@type": "Service",
                name: "Financial Calculators",
                description:
                  "Interactive calculators for retirement, mortgage, investment planning",
              },
            ],
            sameAs: [
              "https://x.com/moneko_ai",
              "https://linkedin.com/company/moneko-ai",
              "https://facebook.com/moneko",
            ],
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "Customer Support",
              email: "hello@moneko.io",
            },
          }}
        />

        {/* FAQ Schema for Common Financial Questions */}
        <StructuredData
          type="faq"
          data={[
            {
              question: `What is ${blog.title.toLowerCase().replace(/[?]/g, "")}?`,
              answer: blog.excerpt,
            },
            {
              question: "How can Moneko help with financial planning?",
              answer:
                "Moneko provides AI-powered financial education, interactive calculators, and personalized guidance to help you achieve your financial goals through expert-validated content and tools.",
            },
            {
              question: "Is this financial advice suitable for beginners?",
              answer:
                "Yes, all Moneko content is designed to be accessible for beginners while providing valuable insights for more experienced investors. Our expert authors break down complex topics into easy-to-understand concepts.",
            },
          ]}
        />

        <StructuredData
          type="breadcrumb"
          data={[
            { name: "Blog", url: getCanonicalUrl("/blogs") },
            { name: blog.title, url: pageUrl },
          ]}
        />

        {/* HowTo Schema for Financial Guides */}
        {blog.title.toLowerCase().includes("how") && (
          <StructuredData
            type="howto"
            data={{
              "@type": "HowTo",
              name: blog.title,
              description: blog.excerpt,
              image: blog.coverImage,
              totalTime: `PT${blog.readTime}M`,
              estimatedCost: {
                "@type": "MonetaryAmount",
                currency: "USD",
                value: "0",
              },
              supply: [
                {
                  "@type": "HowToSupply",
                  name: "Financial Calculator",
                  requiredQuantity: "1",
                },
                {
                  "@type": "HowToSupply",
                  name: "Financial Information",
                  requiredQuantity: "1",
                },
              ],
              tool: [
                {
                  "@type": "HowToTool",
                  name: "Moneko Financial Calculators",
                  url: "https://moneko.io/calculators",
                },
              ],
              steps: [
                {
                  "@type": "HowToStep",
                  text: "Read the comprehensive guide",
                  name: "Learn the Concepts",
                },
                {
                  "@type": "HowToStep",
                  text: "Use Moneko's calculators to apply the concepts",
                  name: "Apply the Knowledge",
                },
                {
                  "@type": "HowToStep",
                  text: "Track your progress with Moneko's tools",
                  name: "Monitor Results",
                },
              ],
            }}
          />
        )}

        {/* EducationalOrganization Schema */}
        <StructuredData
          type="educationalorganization"
          data={{
            "@type": "EducationalOrganization",
            name: "Moneko Financial Education",
            description:
              "Professional financial education platform with CFA and CFP certified instructors",
            url: "https://moneko.io",
            logo: "https://moneko.io/logo192.png",
            hasCredential: ["CFA Institute Member", "CFP Board Member"],
            educationalCredentialAwarded: "Financial Literacy Certificate",
            offers: {
              "@type": "EducationalOccupationalProgram",
              name: "Personal Finance Mastery",
              description:
                "Comprehensive financial education covering budgeting, investing, and retirement planning",
              provider: {
                "@type": "Organization",
                name: "Moneko",
              },
            },
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
                  <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/blogs">Blog</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{blog.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        
          <div className="mb-8 flex flex-wrap gap-2">
            {blog.tags?.map((tag) => (
              <Link
                key={tag.id}
                to="/blogs"
                className="bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors"
              >
                <FontAwesomeIcon
                  icon={faTag}
                  className="mr-1.5 h-3 w-3"
                  aria-hidden="true"
                />
                {tag.name}
              </Link>
            ))}
          </div>

          <h1 className="text-foreground mb-6 text-3xl leading-tight font-bold md:text-4xl lg:text-5xl">
            {blog.title}
          </h1>

          <div className="border-border mb-8 flex flex-wrap items-center justify-between gap-4 border-b pb-6">
            <div className="flex items-center gap-4">
              <img
                src={blog.author.avatar}
                alt={blog.author.name}
                className="h-12 w-12 rounded-full"
              />
              <div>
                <p className="text-foreground font-medium">
                  {blog.author.name}
                </p>
                <p className="text-muted-foreground text-sm">
                  {blog.author.title}
                </p>
              </div>
            </div>

            <div className="text-muted-foreground flex items-center gap-4 text-sm">
              <div>{formatDate(blog.publishedAt)}</div>
              <div className="flex items-center">
                <FontAwesomeIcon
                  icon={faClock}
                  className="mr-1.5"
                  aria-hidden="true"
                />
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
            {!blog.hideCreditLabel && (
              <a
                href={blog.coverImage}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-background/80 text-muted-foreground border-border absolute right-2 bottom-2 rounded-sm border px-2 py-1 text-xs backdrop-blur-sm"
              >
                Image from Unsplash
              </a>
            )}
          </div>

          <article className="mx-auto max-w-none">
            <Suspense
              fallback={
                <div className="bg-muted/40 h-64 animate-pulse rounded-2xl" />
              }
            >
              <Markdown content={blog.content} className="prose-lg" />
            </Suspense>
          </article>

          <div className="border-border mt-12 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
            <div className="flex items-center gap-4">
              <img
                src={blog.author.avatar}
                alt={blog.author.name}
                className="h-16 w-16 rounded-full"
              />
              <div>
                <p className="text-foreground font-medium">
                  {blog.author.name}
                </p>
                <p className="text-muted-foreground text-sm">
                  {blog.author.bio}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-foreground text-sm font-medium">
                Share:
              </span>
              <button
                onClick={shareOnTwitter}
                aria-label="Share on X"
                className="bg-muted text-muted-foreground hover:bg-muted/80 rounded-full p-2 transition-colors"
              >
                <FontAwesomeIcon
                  icon={faX}
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </button>
              <button
                onClick={shareOnFacebook}
                aria-label="Share on Facebook"
                className="bg-muted text-muted-foreground hover:bg-muted/80 rounded-full p-2 transition-colors"
              >
                <FontAwesomeIcon
                  icon={faFacebook}
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </button>
              <button
                onClick={shareOnLinkedIn}
                aria-label="Share on LinkedIn"
                className="bg-muted text-muted-foreground hover:bg-muted/80 rounded-full p-2 transition-colors"
              >
                <FontAwesomeIcon
                  icon={faLinkedin}
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </motion.div>

        {relatedBlogs.length > 0 && (
          <div className="mt-16">
            <h2 className="text-foreground mb-6 text-2xl font-bold">
              Related Articles
            </h2>
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
                    resetScroll={true}
                    className="group bg-card block h-full overflow-hidden rounded-xl shadow-md transition-all hover:shadow-lg"
                  >
                    <div className="aspect-video overflow-hidden">
                      <OptimizedImage
                        src={relatedBlog.coverImage}
                        alt={`Cover image for ${relatedBlog.title}`}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="text-foreground group-hover:text-primary mb-2 line-clamp-2 text-lg font-bold transition-colors">
                        {relatedBlog.title}
                      </h3>
                      <p className="text-muted-foreground line-clamp-2 text-sm">
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
    </div>
  );
}
