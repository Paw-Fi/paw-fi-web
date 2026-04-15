import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { HomeHeader } from "@/components/index/header";
import { DashboardShowcase } from "@/components/homepage/dashboard-showcase";
import { FeaturesBentoGrid } from "@/components/homepage/features-bento-grid";
import { Footer } from "@/components/homepage/footer";
import ExpertLessonsSection from "@/components/homepage/new/expert-lessons-section";
import HeroSection from "@/components/homepage/new/hero-section";
import ThreeStepsSection from "@/components/homepage/new/three-steps-section";
import VideoSection from "@/components/homepage/new/video-section";
import FAQSection from "@/components/homepage/new/faq-section";
import AmbientHalo from "@/components/ui/ambient-halo";
import passiveIncomeVariants from "@/data/home/passive-income-variants.json";

export const Route = createFileRoute("/budgeting-app/$slug")({
  // Use Streaming SSR for dynamic personalized content
  ssr: true,
  loader: ({ params }) => {
    const pageData =
      passiveIncomeVariants[params.slug as keyof typeof passiveIncomeVariants];

    if (!pageData) {
      throw notFound();
    }

    return pageData as any;
  },
  component: BudgetingApp,

  head: ({ params, loaderData }) => {
    const pageUrl = getCanonicalUrl(`/budgeting-app/${params.slug}`);
    const pageTitle =
      loaderData?.meta?.title ??
      "Moneko | AI-Powered Budgeting App for Smart Financial Planning";
    const pageDescription =
      loaderData?.meta?.description ??
      "Discover how Moneko's AI-powered budgeting app delivers personalized financial education, smart budgeting tools, and investing courses tailored to your specific needs.";
    const pageKeywords =
      loaderData?.meta?.keywords ??
      "AI budgeting app, financial learning, personalized budget, investing courses, financial planning tools";

    // Create SEO metadata
    const meta = seo({
      title: pageTitle,
      description: pageDescription,
      keywords: pageKeywords,
      url: pageUrl,
      image: "https://moneko.io/og-img.png",
    });

    // Create comprehensive structured data with enhanced SEO
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://moneko.io/#organization",
          name: "Moneko",
          alternateName: "Moneko AI Financial Platform",
          url: "https://moneko.io",
          logo: {
            "@type": "ImageObject",
            url: "https://moneko.io/icon.svg",
            width: "512",
            height: "512",
          },
          image: "https://moneko.io/og-img.png",
          foundingDate: "2024",
          location: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressCountry: "US",
            },
          },
          areaServed: [
            {
              "@type": "Country",
              name: "United States",
            },
            {
              "@type": "Country",
              name: "Canada",
            },
          ],
          sameAs: [
            "https://www.facebook.com/monekoai/",
            "https://www.instagram.com/moneko_ai",
            "https://x.com/moneko_ai",
            "https://www.linkedin.com/company/moneko-ai",
          ],
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            url: "https://moneko.io/contact",
            availableLanguage: ["English"],
            serviceArea: {
              "@type": "GeoShape",
              addressCountry: "US",
            },
          },
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "AI Financial Planning Services",
            itemListElement: [
              {
                "@type": "Offer",
                itemOffered: {
                  "@type": "Service",
                  name: "AI Budgeting Tools",
                },
              },
              {
                "@type": "Offer",
                itemOffered: {
                  "@type": "Service",
                  name: "Financial Education Courses",
                },
              },
            ],
          },
        },
        {
          "@type": "WebSite",
          "@id": "https://moneko.io/#website",
          name: "Moneko",
          alternateName: "Moneko AI Financial Platform",
          url: "https://moneko.io",
          publisher: {
            "@id": "https://moneko.io/#organization",
          },
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: "https://moneko.io/search?q={search_term_string}",
            },
            "query-input": "required name=search_term_string",
          },
          mainEntity: {
            "@id": pageUrl + "#software",
          },
        },
        {
          "@type": "WebPage",
          "@id": pageUrl,
          url: pageUrl,
          name: pageTitle,
          description: pageDescription,
          isPartOf: {
            "@id": "https://moneko.io/#website",
          },
          about: [
            {
              "@type": "Thing",
              name: "Personal Finance Management",
            },
            {
              "@type": "Thing",
              name: "AI Financial Planning",
            },
            {
              "@type": "Thing",
              name: "Budgeting Education",
            },
          ],
          inLanguage: "en-US",
          author: {
            "@type": "Organization",
            "@id": "https://moneko.io/#organization",
          },
          publisher: {
            "@type": "Organization",
            "@id": "https://moneko.io/#organization",
          },
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://moneko.io",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "AI Budgeting App",
                item: pageUrl,
              },
            ],
          },
          mainEntity: {
            "@id": pageUrl + "#software",
          },
        },
        {
          "@type": "SoftwareApplication",
          "@id": pageUrl + "#software",
          name: "Moneko",
          alternateName: "Moneko Budgeting App",
          applicationCategory: "FinanceApplication",
          applicationSubCategory: "BudgetingApplication",
          operatingSystem: ["Web"],
          description:
            "Budgeting and personal finance tools with guidance and education.",
          url: pageUrl,
          dateCreated: "2024-01-01",
          author: {
            "@id": "https://moneko.io/#organization",
          },
          publisher: {
            "@id": "https://moneko.io/#organization",
          },
          featureList: [
            "Budgeting",
            "Financial calculators",
            "Personal finance education",
          ],
        },
      ],
    };

    const articleSchema = loaderData?.article
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": pageUrl,
          },
          headline: loaderData.article.title,
          description: pageDescription,
          keywords: loaderData.article.tags,
          author: {
            "@type": "Organization",
            "@id": "https://moneko.io/#organization",
          },
          publisher: {
            "@type": "Organization",
            "@id": "https://moneko.io/#organization",
          },
          image: "https://moneko.io/og-img.png",
        }
      : undefined;

    return {
      title: pageTitle,
      meta,
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        },
        ...(articleSchema
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify(articleSchema).replace(
                  /</g,
                  "\\u003c",
                ),
              },
            ]
          : []),
      ],
    };
  },
});

function BudgetingApp() {
  const pageData = Route.useLoaderData() as any;
  return (
    <div className="bg-moneko-background relative min-h-screen">
      <AmbientHalo />

      {/* Header */}
      <nav className="border-border sticky top-0 z-50 border-b bg-white/10 backdrop-blur-md">
        <HomeHeader />
      </nav>

      {/* Hero Section - Transparent background with halo */}
      <section className="relative">
        <HeroSection data={pageData} />
      </section>

      {/* Video Section */}
      <section className="bg-section-bg-light relative">
        {" "}
        <VideoSection data={pageData} />
      </section>

      {/* Features Bento Grid Section */}
      <section className="bg-section-bg-light relative">
        {" "}
        <FeaturesBentoGrid />
      </section>

      {/* DashboardShowcase Section */}
      <section className="bg-section-bg-light relative">
        {" "}
        <DashboardShowcase />
      </section>

      {/* Three Steps Section */}
      <section className="bg-section-bg-light relative">
        {" "}
        <ThreeStepsSection data={pageData} />
      </section>

      {/* Expert-Led Lessons Section */}
      <section className="bg-section-bg-light relative">
        <ExpertLessonsSection data={pageData} />
      </section>

      {/* FAQ Section */}
      <section className="relative">
        <FAQSection />
      </section>

      {/* Competitor Article Section */}
      <CompetitorArticleSection article={pageData.article} />

      {/* Footer */}
      <Footer />
    </div>
  );
}

interface CompetitorArticleSectionProps {
  article?: {
    title: string;
    tags?: string[];
    body: string;
  };
}

function CompetitorArticleSection({ article }: CompetitorArticleSectionProps) {
  if (!article) {
    return null;
  }

  const paragraphs = article.body.split("\n\n");

  return (
    <section className="bg-section-bg-light relative">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900">
          {article.title}
        </h2>
        {article.tags && article.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="bg-moneko-soft text-moneko-dark rounded-full px-3 py-1 text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="prose prose-slate mt-6 max-w-none">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

interface RelatedAlternativesSectionProps {
  currentSlug: string;
}

function RelatedAlternativesSection({
  currentSlug,
}: RelatedAlternativesSectionProps) {
  const competitorSlugs = [
    "pocketguard-alternative",
    "ynab-alternative",
    "goodbudget-alternative",
    "monarch-money-alternative",
    "plum-alternative",
    "everydollar-alternative",
    "snoop-alternative",
    "fudget-alternative",
    "nerdwallet-alternative",
    "mobills-alternative",
    "mint-legacy-alternative",
    "expense-iq-alternative",
    "bluecoins-alternative",
    "andromoney-alternative",
    "bills-reminder-alternative",
    "budget-planner-alternative",
  ];

  if (!competitorSlugs.includes(currentSlug)) {
    return null;
  }

  const related = competitorSlugs
    .filter((slug) => slug !== currentSlug)
    .map((slug) => {
      const data = passiveIncomeVariants[
        slug as keyof typeof passiveIncomeVariants
      ] as any;
      return {
        slug,
        title: data?.meta?.title as string | undefined,
      };
    })
    .filter((item) => item.title)
    .slice(0, 4);

  if (related.length === 0) {
    return null;
  }

  return (
    <section className="bg-section-bg-light relative">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
          More budgeting app alternatives
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Explore other comparisons to see how Moneko stacks up against popular
          budgeting apps.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {related.map((item) => (
            <Link
              key={item.slug}
              to="/budgeting-app/$slug"
              params={{ slug: item.slug }}
              className="group hover:border-moneko-primary rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <h3 className="group-hover:text-moneko-primary text-sm font-medium text-gray-900">
                {item.title}
              </h3>
              <p className="mt-1 text-xs text-gray-600">
                Read the full comparison and see why Moneko is a strong
                alternative.
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default BudgetingApp;
