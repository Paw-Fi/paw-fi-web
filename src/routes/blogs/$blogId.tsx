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
import { getCanonicalUrl } from "@/utils/canonical";
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { OptimizedImage } from "@/components/seo/optimized-image";
import { StructuredData } from "@/components/seo/structured-data";

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
    const keywords = blog.seo?.keywords || blog.tags?.map(tag => tag.name).join(", ") || "";
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
      link: [
        {
          rel: "canonical",
          href: pageUrl
        }
      ]
    };
  }
});

function BlogDetailPage() {
  const { blog } = Route.useLoaderData();
  const navigate = useNavigate();
  const [relatedBlogs, setRelatedBlogs] = useState<Blog[]>([]);
  
  // Calculate word count for schema
  const wordCount = blog.content.trim().split(/\s+/).length;
  
  // Find related blogs based on tags
  useEffect(() => {
    const tagIds = blog.tags?.map(tag => tag.id) || [];
    
    const related = blogs
      .filter(b => 
        b.id !== blog.id && 
        b.tags?.some(tag => tagIds.includes(tag.id))
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
            "@id": `https://moneko.io/blogs/${blog.slug}`
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
              "Asset Allocation"
            ],
            hasCredential: blog.author.title.includes("CFA") ? "Chartered Financial Analyst" : 
                           blog.author.title.includes("CFP") ? "Certified Financial Planner" : 
                           "Financial Professional"
          },
          image: {
            "@type": "ImageObject",
            url: blog.coverImage,
            width: 1200,
            height: 675
          },
          publisher: {
            "@type": "Organization",
            name: "Moneko",
            url: "https://moneko.io",
            logo: {
              "@type": "ImageObject",
              url: "https://moneko.io/logo192.png",
              width: 192,
              height: 192
            },
            sameAs: [
              "https://twitter.com/moneko_ai",
              "https://linkedin.com/company/moneko",
              "https://facebook.com/moneko"
            ]
          },
          wordCount,
          timeRequired: `PT${blog.readTime}M`,
          educationalLevel: "Beginner",
          isAccessibleForFree: true,
          inLanguage: "en-US",
          keywords: blog.seo?.keywords || blog.tags?.map(tag => tag.name).join(", ") || "",
          articleSection: "Financial Education",
          genre: "Educational Content",
          audience: {
            "@type": "Audience",
            audienceType: "Financial Learners"
          },
          teaches: blog.tags?.map(tag => tag.name) || [],
          about: blog.tags?.map(tag => ({
            "@type": "Thing",
            name: tag.name,
            sameAs: `https://moneko.io/blogs?tag=${tag.slug}`
          })) || [],
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: ["h1", "h2", "h3", ".prose p"]
          },
          potentialAction: {
            "@type": "ReadAction",
            target: `https://moneko.io/blogs/${blog.slug}`
          }
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
            logo: "https://moneko.io/logo192.png"
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
            "Debt Management"
          ],
          expertise: blog.author.title,
          hasCredential: blog.author.title.includes("CFA") ? "Chartered Financial Analyst" : 
                         blog.author.title.includes("CFP") ? "Certified Financial Planner" : 
                         "Financial Professional",
          alumniOf: blog.author.title.includes("CFA") ? "CFA Institute" : undefined,
          memberOf: {
            "@type": "Organization",
            name: "Financial Planning Association"
          }
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
          description: "AI-powered financial education and budgeting platform providing personalized financial learning, calculators, and expert guidance",
          url: "https://moneko.io",
          logo: {
            "@type": "ImageObject",
            url: "https://moneko.io/logo192.png",
            width: 192,
            height: 192
          },
          foundingDate: "2023",
          founder: {
            "@type": "Person",
            name: "Moneko Team"
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
            "Emergency Fund Planning"
          ],
          offers: [
            {
              "@type": "Service",
              name: "Financial Education Platform",
              description: "Comprehensive financial education with AI-powered personalization"
            },
            {
              "@type": "Service", 
              name: "Financial Calculators",
              description: "Interactive calculators for retirement, mortgage, investment planning"
            }
          ],
          sameAs: [
            "https://twitter.com/moneko_ai",
            "https://linkedin.com/company/moneko",
            "https://facebook.com/moneko"
          ],
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "Customer Support",
            email: "hello@moneko.io"
          }
        }}
      />

      {/* FAQ Schema for Common Financial Questions */}
      <StructuredData
        type="faqpage"
        data={{
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: `What is ${blog.title.toLowerCase().replace(/[?]/g, '')}?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: blog.excerpt
              }
            },
            {
              "@type": "Question",
              name: "How can Moneko help with financial planning?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Moneko provides AI-powered financial education, interactive calculators, and personalized guidance to help you achieve your financial goals through expert-validated content and tools."
              }
            },
            {
              "@type": "Question",
              name: "Is this financial advice suitable for beginners?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes, all Moneko content is designed to be accessible for beginners while providing valuable insights for more experienced investors. Our expert authors break down complex topics into easy-to-understand concepts."
              }
            }
          ]
        }}
      />

      {/* HowTo Schema for Financial Guides */}
      {blog.title.toLowerCase().includes('how') && (
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
              value: "0"
            },
            supply: [
              {
                "@type": "HowToSupply",
                name: "Financial Calculator",
                requiredQuantity: "1"
              },
              {
                "@type": "HowToSupply", 
                name: "Financial Information",
                requiredQuantity: "1"
              }
            ],
            tool: [
              {
                "@type": "HowToTool",
                name: "Moneko Financial Calculators",
                url: "https://moneko.io/calculators"
              }
            ],
            steps: [
              {
                "@type": "HowToStep",
                text: "Read the comprehensive guide",
                name: "Learn the Concepts"
              },
              {
                "@type": "HowToStep", 
                text: "Use Moneko's calculators to apply the concepts",
                name: "Apply the Knowledge"
              },
              {
                "@type": "HowToStep",
                text: "Track your progress with Moneko's tools", 
                name: "Monitor Results"
              }
            ]
          }}
        />
      )}

      {/* EducationalOrganization Schema */}
      <StructuredData
        type="educationalorganization"
        data={{
          "@type": "EducationalOrganization",
          name: "Moneko Financial Education",
          description: "Professional financial education platform with CFA and CFP certified instructors",
          url: "https://moneko.io",
          logo: "https://moneko.io/logo192.png",
          hasCredential: ["CFA Institute Member", "CFP Board Member"],
          educationalCredentialAwarded: "Financial Literacy Certificate",
          offers: {
            "@type": "EducationalOccupationalProgram",
            name: "Personal Finance Mastery",
            description: "Comprehensive financial education covering budgeting, investing, and retirement planning",
            provider: {
              "@type": "Organization",
              name: "Moneko"
            }
          }
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <button
          onClick={() => navigate({ to: "/blogs" })}
          className="mb-8 flex items-center gap-2 text-primary dark:text-dark-primary transition-colors hover:text-secondary dark:hover:text-dark-secondary"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" aria-hidden="true" />
          <span>Back to blogs</span>
        </button>

        <div className="mb-8 flex flex-wrap gap-2">
          {blog.tags?.map(tag => (
            <Link
              key={tag.id}
              to="/blogs"
              className="inline-flex items-center rounded-full bg-primary/10 dark:bg-dark-primary/10 px-3 py-1 text-sm font-medium text-primary dark:text-dark-primary transition-colors hover:bg-primary/20 dark:hover:bg-dark-primary/20"
            >
              <FontAwesomeIcon icon={faTag} className="mr-1.5 h-3 w-3" aria-hidden="true" />
              {tag.name}
            </Link>
          ))}
        </div>

        <h1 className="mb-6 text-3xl font-bold leading-tight text-foreground dark:text-dark-foreground md:text-4xl lg:text-5xl">
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
              <p className="font-medium text-foreground dark:text-dark-foreground">{blog.author.name}</p>
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
          <a href={blog.coverImage} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2 rounded-sm bg-black bg-opacity-50 px-1 py-0.5 text-xs text-white">
            Image from Unsplash
          </a>
        </div>

        <article className="prose prose-lg prose-slate mx-auto max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-4xl prose-h1:mb-8 prose-h1:mt-12 prose-h2:text-3xl prose-h2:mb-6 prose-h2:mt-10 prose-h3:text-2xl prose-h3:mb-4 prose-h3:mt-8 prose-h4:text-xl prose-h4:mb-3 prose-h4:mt-6 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-6 prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-li:leading-relaxed prose-li:mb-2 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:font-medium prose-a:no-underline hover:prose-a:text-blue-800 dark:hover:prose-a:text-blue-300 hover:prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-900/20 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:my-8 prose-blockquote:rounded-r-lg prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-6 prose-pre:overflow-x-auto prose-table:border-collapse prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600 prose-th:bg-gray-50 dark:prose-th:bg-gray-800 prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-semibold prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600 prose-td:px-4 prose-td:py-3 prose-ul:space-y-2 prose-ol:space-y-2 prose-img:rounded-lg prose-img:shadow-lg prose-img:my-8">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]} 
            rehypePlugins={[rehypeRaw]}
            components={{
              // Custom heading components with better spacing
              h1: ({ children }) => (
                <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-8 mt-12 leading-tight border-b border-gray-200 dark:border-gray-700 pb-4">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6 mt-10 leading-tight">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 mt-8 leading-tight">
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6 leading-tight">
                  {children}
                </h4>
              ),
              // Enhanced paragraph styling
              p: ({ children }) => (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-lg">
                  {children}
                </p>
              ),
              // Better link styling
              a: ({ href, children }) => (
                <a 
                  href={href} 
                  className="text-blue-600 dark:text-blue-400 font-medium hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors duration-200 border-b border-blue-200 dark:border-blue-600 hover:border-blue-400 dark:hover:border-blue-300"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              // Enhanced list styling
              ul: ({ children }) => (
                <ul className="space-y-3 mb-6 pl-6">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="space-y-3 mb-6 pl-6">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {children}
                </li>
              ),
              // Enhanced blockquote
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 py-4 px-6 my-8 rounded-r-lg italic text-gray-800 dark:text-gray-200">
                  {children}
                </blockquote>
              ),
              // Better code styling
              code: ({ children, className }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
                      {children}
                    </code>
                  );
                }
                return (
                  <code className={className}>
                    {children}
                  </code>
                );
              },
              // Enhanced table styling
              table: ({ children }) => (
                <div className="overflow-x-auto my-8">
                  <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden shadow-sm">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-700 dark:text-gray-300">
                  {children}
                </td>
              ),
              // Enhanced image styling
              img: ({ src, alt }) => (
                <div className="my-8">
                  <img 
                    src={src} 
                    alt={alt} 
                    className="rounded-lg shadow-lg w-full h-auto"
                    loading="lazy"
                  />
                </div>
              ),
              // Strong text enhancement
              strong: ({ children }) => (
                <strong className="font-semibold text-gray-900 dark:text-gray-100">
                  {children}
                </strong>
              ),
              // Emphasis enhancement
              em: ({ children }) => (
                <em className="italic text-gray-800 dark:text-gray-200">
                  {children}
                </em>
              )
            }}
          >
            {blog.content}
          </ReactMarkdown>
        </article>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-6 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <img
              src={blog.author.avatar}
              alt={blog.author.name}
              className="h-16 w-16 rounded-full"
            />
            <div>
              <p className="font-medium text-foreground dark:text-dark-foreground">{blog.author.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{blog.author.bio}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground dark:text-dark-foreground">Share:</span>
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
          <h2 className="mb-6 text-2xl font-bold text-foreground dark:text-dark-foreground">Related Articles</h2>
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
                  className="group block h-full overflow-hidden rounded-xl bg-white shadow-md transition-all hover:shadow-lg dark:bg-gray-800"
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
                    <h3 className="mb-2 line-clamp-2 text-lg font-bold text-foreground dark:text-dark-foreground transition-colors group-hover:text-primary dark:group-hover:text-dark-primary">
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
