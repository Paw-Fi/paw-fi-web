import { createFileRoute, Link } from "@tanstack/react-router";
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
import { Helmet } from "@dr.pogodin/react-helmet";
import passiveIncomeVariants from "@/data/home/passive-income-variants.json";


export const Route = createFileRoute("/budgeting-app/$slug")({
  // Use Streaming SSR for dynamic personalized content
  ssr: true,
  component: BudgetingApp,

  head: () => {
    const pageUrl = getCanonicalUrl("/budgeting-app/");

    // Create SEO metadata
    const meta = seo({
      title: "Moneko | AI-Powered Budgeting App for Smart Financial Planning",
      description:
        "Discover how Moneko's AI-powered budgeting app delivers personalized financial education, smart budgeting tools, and investing courses tailored to your specific needs.",
      keywords:
        "AI budgeting app, financial learning, personalized budget, investing courses, financial planning tools",
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
            height: "512"
          },
          image: "https://moneko.io/og-img.png",
          foundingDate: "2024",
          location: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressCountry: "US"
            }
          },
          areaServed: [
            {
              "@type": "Country",
              name: "United States"
            },
            {
              "@type": "Country", 
              name: "Canada"
            }
          ],
          sameAs: [
            "https://www.facebook.com/monekoai/",
            "https://www.instagram.com/moneko_ai",
            "https://x.com/moneko_ai",
            "https://www.linkedin.com/company/moneko-ai"
          ],
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            url: "https://moneko.io/contact",
            availableLanguage: ["English"],
            serviceArea: {
              "@type": "GeoShape",
              addressCountry: "US"
            }
          },
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "AI Financial Planning Services",
            itemListElement: [
              {
                "@type": "Offer",
                itemOffered: {
                  "@type": "Service",
                  name: "AI Budgeting Tools"
                }
              },
              {
                "@type": "Offer", 
                itemOffered: {
                  "@type": "Service",
                  name: "Financial Education Courses"
                }
              }
            ]
          }
        },
        {
          "@type": "WebSite",
          "@id": "https://moneko.io/#website",
          name: "Moneko",
          alternateName: "Moneko AI Financial Platform",
          url: "https://moneko.io",
          publisher: {
            "@id": "https://moneko.io/#organization"
          },
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: "https://moneko.io/search?q={search_term_string}"
            },
            "query-input": "required name=search_term_string"
          },
          mainEntity: {
            "@id": pageUrl + "#software"
          }
        },
        {
          "@type": "WebPage",
          "@id": pageUrl,
          url: pageUrl,
          name: "Moneko | AI-Powered Budgeting App for Smart Financial Planning",
          description:
            "Discover how Moneko's AI-powered budgeting app delivers personalized financial education, smart budgeting tools, and investing courses tailored to your specific needs.",
          isPartOf: {
            "@id": "https://moneko.io/#website"
          },
          about: [
            {
              "@type": "Thing",
              name: "Personal Finance Management"
            },
            {
              "@type": "Thing",
              name: "AI Financial Planning"
            },
            {
              "@type": "Thing", 
              name: "Budgeting Education"
            }
          ],
          inLanguage: "en-US",
          datePublished: "2024-01-01",
          dateModified: "2025-09-08T00:00:00Z",
          author: {
            "@type": "Organization",
            "@id": "https://moneko.io/#organization"
          },
          publisher: {
            "@type": "Organization",
            "@id": "https://moneko.io/#organization"
          },
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://moneko.io"
              },
              {
                "@type": "ListItem", 
                position: 2,
                name: "AI Budgeting App",
                item: pageUrl
              }
            ]
          },
          mainEntity: {
            "@id": pageUrl + "#software"
          }
        },
        {
          "@type": "SoftwareApplication",
          "@id": pageUrl + "#software",
          name: "Moneko AI Financial Coach",
          alternateName: "Moneko Budgeting App",
          applicationCategory: "FinanceApplication",
          applicationSubCategory: "BudgetingApplication",
          operatingSystem: ["Web", "iOS", "Android"],
          requirements: "Web Browser with JavaScript enabled, Internet connection",
          description: "AI-powered personalized financial learning platform with custom budgeting tools, calculators, and investing courses designed for all life stages and financial goals",
          url: pageUrl,
          downloadUrl: "https://moneko.io/dashboard",
          screenshot: [
            "https://moneko.io/screenshots/budgeting-app.jpg",
            "https://moneko.io/screenshots/dashboard.jpg",
            "https://moneko.io/screenshots/mobile-app.jpg"
          ],
          softwareVersion: "2.1",
          releaseNotes: "Enhanced AI coaching, improved mobile experience, new GEO-based recommendations",
          dateCreated: "2024-01-01",
          dateModified: "2025-09-08T00:00:00Z",
          datePublished: "2024-01-01",
          author: {
            "@id": "https://moneko.io/#organization"
          },
          publisher: {
            "@id": "https://moneko.io/#organization"  
          },
          creator: {
            "@id": "https://moneko.io/#organization"
          },
          maintainer: {
            "@id": "https://moneko.io/#organization"
          },
          offers: [
            {
              "@type": "Offer",
              "@id": pageUrl + "#free-offer",
              price: "0",
              priceCurrency: "USD",
              name: "Basic Plan",
              description: "Free access to financial calculators and basic budgeting tools",
              availability: "https://schema.org/InStock",
              validFrom: "2024-01-01",
              itemCondition: "https://schema.org/NewCondition",
              category: "Financial Software",
              eligibleRegion: {
                "@type": "GeoShape",
                addressCountry: ["US", "CA"]
              }
            },
            {
              "@type": "Offer", 
              "@id": pageUrl + "#premium-offer",
              price: "9.99",
              priceCurrency: "USD",
              name: "Premium Plan",
              description: "Full access to AI coaching, advanced courses, and personalized recommendations",
              availability: "https://schema.org/InStock",
              validFrom: "2024-01-01",
              itemCondition: "https://schema.org/NewCondition",
              category: "Financial Software",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: "9.99",
                priceCurrency: "USD",
                unitText: "month",
                billingIncrement: 1,
                eligibleQuantity: {
                  "@type": "QuantitativeValue",
                  "minValue": 1,
                  "maxValue": 1,
                  unitCode: "MON"
                }
              },
              eligibleRegion: {
                "@type": "GeoShape",
                addressCountry: ["US", "CA"]
              }
            }
          ],
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.7",
            bestRating: "5",
            worstRating: "1", 
            ratingCount: "2193",
            reviewCount: "1547",
            itemReviewed: {
              "@id": pageUrl + "#software"
            }
          },
          review: [
            {
              "@type": "Review",
              reviewRating: {
                "@type": "Rating",
                ratingValue: "5",
                bestRating: "5"
              },
              author: {
                "@type": "Person",
                name: "Sarah M."
              },
              reviewBody: "Moneko transformed my financial life. The AI recommendations are spot-on and helped me save $500 in my first month!"
            },
            {
              "@type": "Review",
              reviewRating: {
                "@type": "Rating", 
                ratingValue: "5",
                bestRating: "5"
              },
              author: {
                "@type": "Person",
                name: "Mike K."
              },
              reviewBody: "Finally, a budgeting app that understands my goals as a young professional. The education component is incredible."
            }
          ],
          featureList: [
            "AI-powered financial coaching",
            "Personalized budgeting recommendations", 
            "Interactive financial calculators",
            "Investment education courses",
            "Spending pattern analysis",
            "Goal tracking and progress monitoring",
            "Multi-platform accessibility",
            "Real-time financial insights",
            "Automated savings recommendations",
            "Life-stage specific guidance",
            "GEO-optimized financial advice",
            "Voice-enabled money management"
          ],
          installUrl: "https://moneko.io/dashboard",
          permissions: "camera, notifications, location",
          storageRequirements: "50MB",
          memoryRequirements: "512MB RAM",
          processorRequirements: "Modern web browser",
          supportingData: {
            "@type": "DataFeed",
            name: "Financial Data Integration",
            "description": "Secure integration with banks and financial institutions"
          }
        },
        {
          "@type": "Course",
          name: "Personal Finance Mastery with AI",
          description: "Comprehensive financial education course covering budgeting, investing, and wealth building with AI-powered personalization",
          provider: {
            "@id": "https://moneko.io/#organization"
          },
          courseCode: "MONEKO-PF-101",
          educationalLevel: "Beginner to Advanced",
          teaches: [
            "Budget creation and management",
            "Investment fundamentals",
            "Debt reduction strategies", 
            "Retirement planning",
            "Tax optimization",
            "Emergency fund building"
          ],
          timeRequired: "PT20H",
          coursePrerequisites: "None - suitable for all experience levels",
          isAccessibleForFree: true,
          inLanguage: "en-US"
        },
        {
          "@type": "ItemList",
          name: "AI Financial Learning Features",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Personalized Budget Analysis",
              description: "AI analyzes spending patterns and provides customized budget recommendations"
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Smart Financial Calculators", 
              description: "Interactive tools for mortgage, retirement, investment, and loan calculations"
            },
            {
              "@type": "ListItem",
              position: 3,
              name: "Adaptive Learning Courses",
              description: "Financial education that adapts to your knowledge level and learning pace"
            },
            {
              "@type": "ListItem",
              position: 4,
              name: "Goal-Based Planning",
              description: "Set and track financial goals with AI-powered progress monitoring"
            },
            {
              "@type": "ListItem",
              position: 5,
              name: "Life Stage Customization",
              description: "Tailored advice for students, professionals, parents, retirees, and more"
            }
          ]
        }
      ]
    };

    return {
      title: "Moneko | AI-Powered Budgeting App for Smart Financial Planning",
      meta,
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});

function BudgetingApp() {
  const params = Route.useParams();
  const pageData =
    passiveIncomeVariants[
      params.slug as keyof typeof passiveIncomeVariants
    ] as any;
  const pageUrl = getCanonicalUrl(`/budgeting-app/${params.slug}`);

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
            height: "512"
          },
          image: "https://moneko.io/og-img.png",
          foundingDate: "2024",
          location: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressCountry: "US"
            }
          },
          areaServed: [
            {
              "@type": "Country",
              name: "United States"
            },
            {
              "@type": "Country", 
              name: "Canada"
            }
          ],
          sameAs: [
            "https://www.facebook.com/monekoai/",
            "https://www.instagram.com/moneko_ai",
            "https://x.com/moneko_ai",
            "https://www.linkedin.com/company/moneko-ai"
          ],
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            url: "https://moneko.io/contact",
            availableLanguage: ["English"],
            serviceArea: {
              "@type": "GeoShape",
              addressCountry: "US"
            }
          },
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "AI Financial Planning Services",
            itemListElement: [
              {
                "@type": "Offer",
                itemOffered: {
                  "@type": "Service",
                  name: "AI Budgeting Tools"
                }
              },
              {
                "@type": "Offer", 
                itemOffered: {
                  "@type": "Service",
                  name: "Financial Education Courses"
                }
              }
            ]
          }
        },
        {
          "@type": "WebSite",
          "@id": "https://moneko.io/#website",
          name: "Moneko",
          alternateName: "Moneko AI Financial Platform",
          url: "https://moneko.io",
          publisher: {
            "@id": "https://moneko.io/#organization"
          },
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: "https://moneko.io/search?q={search_term_string}"
            },
            "query-input": "required name=search_term_string"
          },
          mainEntity: {
            "@id": pageUrl + "#software"
          }
        },
        {
          "@type": "WebPage",
          "@id": pageUrl,
          url: pageUrl,
          name: pageData.meta.title,
          description: pageData.meta.description,
          isPartOf: {
            "@id": "https://moneko.io/#website"
          },
          about: [
            {
              "@type": "Thing",
              name: "Personal Finance Management"
            },
            {
              "@type": "Thing",
              name: "AI Financial Planning"
            },
            {
              "@type": "Thing", 
              name: "Budgeting Education"
            }
          ],
          inLanguage: "en-US",
          datePublished: "2024-01-01",
          dateModified: "2025-09-08T00:00:00Z",
          author: {
            "@type": "Organization",
            "@id": "https://moneko.io/#organization"
          },
          publisher: {
            "@type": "Organization",
            "@id": "https://moneko.io/#organization"
          },
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://moneko.io"
              },
              {
                "@type": "ListItem", 
                position: 2,
                name: "AI Budgeting App",
                item: pageUrl
              }
            ]
          },
          mainEntity: {
            "@id": pageUrl + "#software"
          }
        },
        {
          "@type": "SoftwareApplication",
          "@id": pageUrl + "#software",
          name: "Moneko AI Financial Coach",
          alternateName: "Moneko Budgeting App",
          applicationCategory: "FinanceApplication",
          applicationSubCategory: "BudgetingApplication",
          operatingSystem: ["Web", "iOS", "Android"],
          requirements: "Web Browser with JavaScript enabled, Internet connection",
          description: "AI-powered personalized financial learning platform with custom budgeting tools, calculators, and investing courses designed for all life stages and financial goals",
          url: pageUrl,
          downloadUrl: "https://moneko.io/dashboard",
          screenshot: [
            "https://moneko.io/screenshots/budgeting-app.jpg",
            "https://moneko.io/screenshots/dashboard.jpg",
            "https://moneko.io/screenshots/mobile-app.jpg"
          ],
          softwareVersion: "2.1",
          releaseNotes: "Enhanced AI coaching, improved mobile experience, new GEO-based recommendations",
          dateCreated: "2024-01-01",
          dateModified: "2025-09-08T00:00:00Z",
          datePublished: "2024-01-01",
          author: {
            "@id": "https://moneko.io/#organization"
          },
          publisher: {
            "@id": "https://moneko.io/#organization"  
          },
          creator: {
            "@id": "https://moneko.io/#organization"
          },
          maintainer: {
            "@id": "https://moneko.io/#organization"
          },
          offers: [
            {
              "@type": "Offer",
              "@id": pageUrl + "#free-offer",
              price: "0",
              priceCurrency: "USD",
              name: "Basic Plan",
              description: "Free access to financial calculators and basic budgeting tools",
              availability: "https://schema.org/InStock",
              validFrom: "2024-01-01",
              itemCondition: "https://schema.org/NewCondition",
              category: "Financial Software",
              eligibleRegion: {
                "@type": "GeoShape",
                addressCountry: ["US", "CA"]
              }
            },
            {
              "@type": "Offer", 
              "@id": pageUrl + "#premium-offer",
              price: "9.99",
              priceCurrency: "USD",
              name: "Premium Plan",
              description: "Full access to AI coaching, advanced courses, and personalized recommendations",
              availability: "https://schema.org/InStock",
              validFrom: "2024-01-01",
              itemCondition: "https://schema.org/NewCondition",
              category: "Financial Software",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: "9.99",
                priceCurrency: "USD",
                unitText: "month",
                billingIncrement: 1,
                eligibleQuantity: {
                  "@type": "QuantitativeValue",
                  "minValue": 1,
                  "maxValue": 1,
                  unitCode: "MON"
                }
              },
              eligibleRegion: {
                "@type": "GeoShape",
                addressCountry: ["US", "CA"]
              }
            }
          ],
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.7",
            bestRating: "5",
            worstRating: "1", 
            ratingCount: "2193",
            reviewCount: "1547",
            itemReviewed: {
              "@id": pageUrl + "#software"
            }
          },
          review: [
            {
              "@type": "Review",
              reviewRating: {
                "@type": "Rating",
                ratingValue: "5",
                bestRating: "5"
              },
              author: {
                "@type": "Person",
                name: "Sarah M."
              },
              reviewBody: "Moneko transformed my financial life. The AI recommendations are spot-on and helped me save $500 in my first month!"
            },
            {
              "@type": "Review",
              reviewRating: {
                "@type": "Rating", 
                ratingValue: "5",
                bestRating: "5"
              },
              author: {
                "@type": "Person",
                name: "Mike K."
              },
              reviewBody: "Finally, a budgeting app that understands my goals as a young professional. The education component is incredible."
            }
          ],
          featureList: [
            "AI-powered financial coaching",
            "Personalized budgeting recommendations", 
            "Interactive financial calculators",
            "Investment education courses",
            "Spending pattern analysis",
            "Goal tracking and progress monitoring",
            "Multi-platform accessibility",
            "Real-time financial insights",
            "Automated savings recommendations",
            "Life-stage specific guidance",
            "GEO-optimized financial advice",
            "Voice-enabled money management"
          ],
          installUrl: "https://moneko.io/dashboard",
          permissions: "camera, notifications, location",
          storageRequirements: "50MB",
          memoryRequirements: "512MB RAM",
          processorRequirements: "Modern web browser",
          supportingData: {
            "@type": "DataFeed",
            name: "Financial Data Integration",
            "description": "Secure integration with banks and financial institutions"
          }
        },
        {
          "@type": "Course",
          name: "Personal Finance Mastery with AI",
          description: "Comprehensive financial education course covering budgeting, investing, and wealth building with AI-powered personalization",
          provider: {
            "@id": "https://moneko.io/#organization"
          },
          courseCode: "MONEKO-PF-101",
          educationalLevel: "Beginner to Advanced",
          teaches: [
            "Budget creation and management",
            "Investment fundamentals",
            "Debt reduction strategies", 
            "Retirement planning",
            "Tax optimization",
            "Emergency fund building"
          ],
          timeRequired: "PT20H",
          coursePrerequisites: "None - suitable for all experience levels",
          isAccessibleForFree: true,
          inLanguage: "en-US"
        },
        {
          "@type": "ItemList",
          name: "AI Financial Learning Features",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Personalized Budget Analysis",
              description: "AI analyzes spending patterns and provides customized budget recommendations"
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Smart Financial Calculators", 
              description: "Interactive tools for mortgage, retirement, investment, and loan calculations"
            },
            {
              "@type": "ListItem",
              position: 3,
              name: "Adaptive Learning Courses",
              description: "Financial education that adapts to your knowledge level and learning pace"
            },
            {
              "@type": "ListItem",
              position: 4,
              name: "Goal-Based Planning",
              description: "Set and track financial goals with AI-powered progress monitoring"
            },
            {
              "@type": "ListItem",
              position: 5,
              name: "Life Stage Customization",
              description: "Tailored advice for students, professionals, parents, retirees, and more"
            }
          ]
        }
      ]
    };
    const articleStructuredData = pageData.article
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": pageUrl,
          },
          headline: pageData.article.title,
          description: pageData.meta.description,
          articleBody: pageData.article.body,
          keywords: pageData.article.tags,
          author: {
            "@type": "Organization",
            "@id": "https://moneko.io/#organization",
          },
          publisher: {
            "@type": "Organization",
            "@id": "https://moneko.io/#organization",
          },
          image: "https://moneko.io/og-img.png",
          datePublished: "2024-01-01",
          dateModified: "2025-09-08T00:00:00Z",
        }
      : undefined;
  return (
    <div className="relative min-h-screen bg-moneko-background">
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
        {pageData.article && articleStructuredData && (
          <script type="application/ld+json">
            {JSON.stringify(articleStructuredData)}
          </script>
        )}
      </Helmet>

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
    <section className="relative bg-section-bg-light">        <VideoSection data={pageData} />
      </section>


      {/* Features Bento Grid Section */}
<section className="relative bg-section-bg-light">        <FeaturesBentoGrid />
      </section>

  
         {/* DashboardShowcase Section */}
   <section className="relative bg-section-bg-light">        <DashboardShowcase />
      </section>

      {/* Three Steps Section */}
<section className="relative bg-section-bg-light">        <ThreeStepsSection data={pageData} />
      </section>

      {/* Expert-Led Lessons Section */}
      <section className="relative bg-section-bg-light">
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
};

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
    <section className="relative bg-section-bg-light">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900">
          {article.title}
        </h2>
        {article.tags && article.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-moneko-soft px-3 py-1 text-xs font-medium text-moneko-dark"
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
      const data =
        passiveIncomeVariants[slug as keyof typeof passiveIncomeVariants] as any;
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
    <section className="relative bg-section-bg-light">
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
              className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-moneko-primary hover:shadow-md"
            >
              <h3 className="text-sm font-medium text-gray-900 group-hover:text-moneko-primary">
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
