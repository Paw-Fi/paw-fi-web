import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import ReusableHomePage from '@/components/index/reusable-home-page';
import passiveIncomeVariants from '@/data/home/passive-income-variants.json';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';

const passiveIncomeSearchSchema = z.object({
  variant: z.string().optional().default('high-interest-portfolios'),
});

export const Route = createFileRoute('/passive-income/$slugId')({
  validateSearch: passiveIncomeSearchSchema,
  component: PassiveIncomeHomePage,
  head: ({ params }) => {
    const slugId = params.slugId;
    const variantKey = slugId as keyof typeof passiveIncomeVariants;
    const variant = passiveIncomeVariants[variantKey] || passiveIncomeVariants['high-interest-portfolios'];
    const canonicalUrl = getCanonicalUrl(`/passive-income/${slugId}`);

    const meta = seo({
      title: variant.meta.title,
      description: variant.meta.description,
      keywords: variant.meta.keywords,
      image: "https://moneko.io/og-img.png",
      url: canonicalUrl,
    });

    // Comprehensive GEO-optimized structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://moneko.io#organization",
          name: "Moneko",
          alternateName: "Moneko Financial",
          description: "AI-powered financial education and passive income platform with expert-backed curriculum",
          url: "https://moneko.io",
          logo: {
            "@type": "ImageObject",
            url: "https://moneko.io/og-img.png",
            width: "1200",
            height: "630"
          },
          image: "https://moneko.io/og-img.png",
          founder: {
            "@type": "Person",
            name: "Moneko Team",
            description: "Certified financial professionals with CFA, CSC, and MBA credentials"
          },
          foundingDate: "2024",
          numberOfEmployees: {
            "@type": "QuantitativeValue",
            value: "10-50"
          },
          areaServed: {
            "@type": "Country",
            name: "United States"
          },
          knowsAbout: [
            "Passive Income Strategies",
            "High-Interest Portfolios",
            "Compound Interest Investment",
            "Financial Independence",
            "Retirement Planning",
            "Investment Education",
            "Wealth Building",
            "Portfolio Optimization"
          ],
          hasCredential: [
            "CFA (Chartered Financial Analyst)",
            "CSC (Canadian Securities Course)", 
            "MBA (Master of Business Administration)"
          ],
          sameAs: [
            "https://twitter.com/moneko_io",
            "https://linkedin.com/company/moneko"
          ],
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "support@moneko.io",
            availableLanguage: "English"
          }
        },
        {
          "@type": "WebSite", 
          "@id": "https://moneko.io#website",
          name: "Moneko - AI-Powered Financial Education Platform",
          alternateName: "Moneko Passive Income Platform",
          description: "Comprehensive financial education platform specializing in passive income, high-interest portfolios, and AI-powered learning",
          url: "https://moneko.io",
          inLanguage: "en-US",
          publisher: {
            "@type": "Organization",
            "@id": "https://moneko.io#organization"
          },
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: "https://moneko.io/search?q={search_term_string}"
            },
            "query-input": "required name=search_term_string"
          },
          about: [
            {
              "@type": "Thing",
              name: "Passive Income Education",
              description: "Comprehensive education on building sustainable passive income streams"
            },
            {
              "@type": "Thing",
              name: "Financial Independence",
              description: "Strategies and tools for achieving financial independence through passive income"
            }
          ]
        },
        {
          "@type": "WebPage",
          "@id": `${canonicalUrl}#webpage`,
          url: canonicalUrl,
          name: variant.meta.title,
          description: variant.meta.description,
          inLanguage: "en-US",
          isPartOf: {
            "@type": "WebSite",
            "@id": "https://moneko.io#website"
          },
          about: [
            {
              "@type": "FinancialProduct",
              name: "Passive Income Portfolio",
              description: "High-interest investment portfolios designed for passive income generation",
              category: "Investment Portfolio",
              featureList: [
                "High-dividend stocks",
                "Real Estate Investment Trusts (REITs)", 
                "Bond investments",
                "Automated rebalancing",
                "Tax optimization"
              ]
            },
            {
              "@type": "Thing",
              name: "Compound Interest Strategy",
              description: "Mathematical principle where earnings generate additional earnings over time"
            },
            {
              "@type": "Thing",
              name: "Financial Independence Retire Early (FIRE)",
              description: "Movement focused on extreme saving and investing to achieve early retirement"
            }
          ],
          mainEntity: {
            "@type": "Service",
            "@id": `${canonicalUrl}#service`,
            name: "AI-Powered Passive Income Builder",
            description: "Personalized passive income portfolio construction with AI optimization and expert guidance",
            provider: {
              "@type": "Organization",
              "@id": "https://moneko.io#organization"
            },
            serviceType: "Financial Planning Service",
            areaServed: {
              "@type": "Country",
              name: "United States"
            },
            audience: {
              "@type": "Audience",
              audienceType: ["Beginner Investors", "Passive Income Seekers", "Early Retirement Planners"]
            },
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
              validFrom: "2024-01-01",
              description: "Free passive income education and AI-powered portfolio recommendations"
            },
            hasOfferCatalog: {
              "@type": "OfferingCatalog",
              name: "Passive Income Services",
              itemListElement: [
                {
                  "@type": "Offer",
                  itemOffered: {
                    "@type": "Service",
                    name: "High-Interest Portfolio Builder",
                    description: "AI-powered tool for creating passive income portfolios"
                  }
                },
                {
                  "@type": "Offer", 
                  itemOffered: {
                    "@type": "Service",
                    name: "Compound Interest Calculator",
                    description: "Advanced calculator for compound interest projections"
                  }
                },
                {
                  "@type": "Offer",
                  itemOffered: {
                    "@type": "Service",
                    name: "Financial Independence Planner",
                    description: "Tools for FIRE movement and early retirement planning"
                  }
                }
              ]
            }
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
                name: "Passive Income",
                item: "https://moneko.io/passive-income"
              },
              {
                "@type": "ListItem",
                position: 3,
                name: variant.hero?.title || "Passive Income Strategy",
                item: canonicalUrl
              }
            ]
          },
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".hero-title", ".hero-subtitle", ".benefits-list", ".features-section"]
          },
          datePublished: "2025-09-10",
          dateModified: "2025-09-10",
          author: {
            "@type": "Organization",
            "@id": "https://moneko.io#organization"
          },
          publisher: {
            "@type": "Organization", 
            "@id": "https://moneko.io#organization"
          }
        },
        {
          "@type": "HowTo",
          "@id": `${canonicalUrl}#howto`,
          name: `How to Build ${variant.hero?.title || 'Passive Income Portfolios'}`,
          description: "Step-by-step guide to building sustainable passive income through high-interest portfolios",
          image: "https://moneko.io/og-img.png",
          totalTime: "PT30M",
          estimatedCost: {
            "@type": "MonetaryAmount",
            currency: "USD",
            value: "0"
          },
          supply: [
            {
              "@type": "HowToSupply",
              name: "Investment Capital",
              requiredQuantity: "100"
            },
            {
              "@type": "HowToSupply", 
              name: "Moneko Platform Access"
            }
          ],
          tool: [
            {
              "@type": "HowToTool",
              name: "Passive Income Calculator"
            },
            {
              "@type": "HowToTool",
              name: "Portfolio Builder Tool"
            },
            {
              "@type": "HowToTool",
              name: "Risk Assessment Tool"
            }
          ],
          step: [
            {
              "@type": "HowToStep",
              position: 1,
              name: "Set Financial Goals",
              text: "Define your passive income targets and timeline for financial independence",
              image: "https://moneko.io/og-img.png"
            },
            {
              "@type": "HowToStep", 
              position: 2,
              name: "Choose Investment Strategy",
              text: "Select between high-dividend stocks, REITs, bonds, or mixed portfolio approach",
              image: "https://moneko.io/og-img.png"
            },
            {
              "@type": "HowToStep",
              position: 3,
              name: "Build Diversified Portfolio", 
              text: "Create balanced portfolio using AI-powered recommendations and expert guidance",
              image: "https://moneko.io/og-img.png"
            },
            {
              "@type": "HowToStep",
              position: 4,
              name: "Monitor and Optimize",
              text: "Track performance and adjust portfolio for maximum passive income generation",
              image: "https://moneko.io/og-img.png"
            }
          ]
        },
        {
          "@type": "FAQPage",
          "@id": `${canonicalUrl}#faq`,
          mainEntity: [
            {
              "@type": "Question",
              name: "What is a high-interest passive income portfolio?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "A high-interest passive income portfolio is a collection of investments specifically chosen to generate regular income with minimal active management. These typically include dividend-paying stocks, REITs, bonds, and other income-generating assets that compound over time."
              }
            },
            {
              "@type": "Question",
              name: "How much money do I need to start building passive income?",
              acceptedAnswer: {
                "@type": "Answer", 
                text: "You can start building passive income with as little as $100. Our platform uses fractional shares and low-cost ETFs to make passive income investing accessible to beginners. The key is consistency and compound growth over time."
              }
            },
            {
              "@type": "Question",
              name: "How long does it take to build significant passive income?", 
              acceptedAnswer: {
                "@type": "Answer",
                text: "Building significant passive income typically takes 5-15 years depending on your investment amount, consistency, and market conditions. With compound interest and regular contributions, many investors see meaningful monthly income within 5-7 years."
              }
            },
            {
              "@type": "Question",
              name: "Is passive income investing safe?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Passive income investing carries market risks but can be managed through diversification, focusing on established dividend-paying companies, and maintaining a long-term perspective. Our platform provides risk assessment tools and expert guidance to help minimize risk."
              }
            }
          ]
        }
      ]
    };

    return {
      meta,
      link: [
        {
          rel: "canonical",
          href: canonicalUrl,
        },
      ],
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});

function PassiveIncomeHomePage() {
  const { slugId } = Route.useParams();
  
  // Get the variant data based on the slug
  const variantKey = slugId as keyof typeof passiveIncomeVariants;
  const variant = passiveIncomeVariants[variantKey] || passiveIncomeVariants['high-interest-portfolios'];
  
  const canonicalUrl = getCanonicalUrl(`/passive-income/${slugId}`);

  return (
    <ReusableHomePage 
      variant={variant} 
      canonicalUrl={canonicalUrl}
    />
  );
}
