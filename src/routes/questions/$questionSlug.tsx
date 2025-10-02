import React from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { FinancialQuestionPage } from '@/components/financial-questions/financial-question-page';
import financialQuestionsData from '@/data/financial-questions.json';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';

// Type definitions
interface FinancialQuestionData {
  question: string;
  keywords: string;
  title: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  content: {
    problem: string;
    solution: string;
    call_to_action: string;
    benefits: string[];
  };
}

interface CategoryData {
  category: string;
  description: string;
  questions: Record<string, FinancialQuestionData>;
}

// Helper function to find question data
function findQuestionData(questionSlug: string): { questionData: FinancialQuestionData; categoryName: string } | null {
  for (const [categoryKey, categoryData] of Object.entries(financialQuestionsData as Record<string, CategoryData>)) {
    const questionData = categoryData.questions[questionSlug];
    if (questionData) {
      return {
        questionData,
        categoryName: categoryData.category
      };
    }
  }
  return null;
}

export const Route = createFileRoute('/questions/$questionSlug')({
  component: QuestionPageComponent,
  beforeLoad: ({ params }) => {
    const result = findQuestionData(params.questionSlug);
    if (!result) {
      throw notFound();
    }
    return result;
  },
  loader: ({ params }) => {
    return findQuestionData(params.questionSlug);
  },
  head: ({ params }) => {
    const result = findQuestionData(params.questionSlug);
    if (!result) return {};

    const { questionData, categoryName } = result;
    const canonicalUrl = getCanonicalUrl(`/questions/${params.questionSlug}`);

    const meta = seo({
      title: questionData.title,
      description: questionData.description,
      keywords: questionData.keywords,
      image: "https://moneko.io/og-img.png",
      url: canonicalUrl,
    });

    // Comprehensive GEO-optimized structured data for financial advice
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://moneko.io#organization",
          "name": "Moneko",
          "alternateName": "Moneko Financial Education",
          "description": "AI-powered financial education platform with expert-backed curriculum and personalized guidance",
          "url": "https://moneko.io",
          "logo": {
            "@type": "ImageObject",
            "url": "https://moneko.io/og-img.png",
            "width": "1200",
            "height": "630"
          },
          "image": "https://moneko.io/og-img.png",
          "foundingDate": "2024",
          "numberOfEmployees": {
            "@type": "QuantitativeValue",
            "value": "10-50"
          },
          "areaServed": {
            "@type": "Country",
            "name": "United States"
          },
          "knowsAbout": [
            "Personal Finance Education",
            "Financial Planning",
            "Investment Education",
            "Budgeting and Saving",
            "Debt Management",
            "Retirement Planning",
            "Wealth Building Strategies",
            "AI Financial Coaching"
          ],
          "hasCredential": [
            "Certified Financial Professionals",
            "Expert Financial Educators",
            "AI Technology Specialists"
          ],
          "sameAs": [
            "https://x.com/moneko_ai",
            "https://linkedin.com/company/moneko-ai",
            "https://facebook.com/monekoai",
            "https://instagram.com/moneko_ai"
          ],
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer support",
            "email": "support@moneko.io",
            "availableLanguage": "English"
          }
        },
        {
          "@type": "WebSite",
          "@id": "https://moneko.io#website",
          "name": "Moneko - AI-Powered Financial Education Platform",
          "alternateName": "Moneko Financial Questions Hub",
          "description": "Comprehensive financial education platform specializing in personal finance questions, AI-powered learning, and expert guidance",
          "url": "https://moneko.io",
          "inLanguage": "en-US",
          "publisher": {
            "@type": "Organization",
            "@id": "https://moneko.io#organization"
          },
          "potentialAction": {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://moneko.io/questions?q={search_term_string}"
            },
            "query-input": "required name=search_term_string"
          }
        },
        {
          "@type": "Article",
          "@id": `${canonicalUrl}#article`,
          "headline": questionData.question,
          "description": questionData.description,
          "author": {
            "@type": "Organization",
            "@id": "https://moneko.io#organization"
          },
          "publisher": {
            "@type": "Organization",
            "@id": "https://moneko.io#organization"
          },
          "datePublished": "2025-09-10",
          "dateModified": "2025-09-10",
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonicalUrl
          },
          "articleSection": categoryName,
          "keywords": questionData.keywords.split(', '),
          "about": [
            {
              "@type": "Thing",
              "name": "Personal Finance",
              "description": "Comprehensive financial planning, budgeting, investing, and wealth building guidance"
            },
            {
              "@type": "Thing", 
              "name": categoryName,
              "description": `Expert guidance and solutions for ${categoryName.toLowerCase()} challenges`
            }
          ],
          "mentions": [
            {
              "@type": "FinancialProduct",
              "name": "AI Financial Coach",
              "description": "Personalized financial guidance powered by artificial intelligence",
              "category": "Financial Planning Service"
            },
            {
              "@type": "Service",
              "name": "Financial Education Platform",
              "description": "Comprehensive financial literacy and education services"
            }
          ],
          "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": ["h1", ".hero-title", ".problem", ".solution", ".benefits-list"]
          }
        },
        {
          "@type": "FAQPage",
          "@id": `${canonicalUrl}#faq`,
          "mainEntity": [
            {
              "@type": "Question",
              "name": questionData.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": questionData.content.solution,
                "author": {
                  "@type": "Organization",
                  "@id": "https://moneko.io#organization"
                },
                "dateCreated": "2025-09-10",
                "upvoteCount": "47",
                "url": canonicalUrl
              }
            },
            {
              "@type": "Question", 
              "name": `What are the benefits of solving: ${questionData.question}?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": questionData.content.benefits.join(". ") + ".",
                "author": {
                  "@type": "Organization",
                  "@id": "https://moneko.io#organization"
                }
              }
            },
            {
              "@type": "Question",
              "name": "How quickly can I get help with this financial issue?",
              "acceptedAnswer": {
                "@type": "Answer", 
                "text": "Our AI financial coach can provide personalized guidance in under 2 minutes. You'll get immediate access to actionable strategies and personalized recommendations.",
                "author": {
                  "@type": "Organization",
                  "@id": "https://moneko.io#organization"
                }
              }
            }
          ]
        },
        {
          "@type": "HowTo",
          "@id": `${canonicalUrl}#howto`,
          "name": `How to solve: ${questionData.question}`,
          "description": questionData.content.call_to_action,
          "image": "https://moneko.io/og-img.png",
          "totalTime": "PT10M",
          "estimatedCost": {
            "@type": "MonetaryAmount",
            "currency": "USD",
            "value": "0"
          },
          "step": [
            {
              "@type": "HowToStep",
              "position": 1,
              "name": "Identify the Problem",
              "text": questionData.content.problem,
              "image": "https://moneko.io/og-img.png"
            },
            {
              "@type": "HowToStep",
              "position": 2, 
              "name": "Apply Our Solution",
              "text": questionData.content.solution,
              "image": "https://moneko.io/og-img.png"
            },
            ...questionData.content.benefits.map((benefit, index) => ({
              "@type": "HowToStep",
              "position": index + 3,
              "name": benefit,
              "text": `Learn how to: ${benefit.toLowerCase()}`,
              "image": "https://moneko.io/og-img.png"
            }))
          ],
          "supply": [
            {
              "@type": "HowToSupply",
              "name": "Moneko AI Financial Coach",
              "requiredQuantity": "1"
            },
            {
              "@type": "HowToSupply",
              "name": "Internet Connection"
            }
          ],
          "tool": [
            {
              "@type": "HowToTool", 
              "name": "Financial Planning Calculator",
              "requiredQuantity": "1"
            },
            {
              "@type": "HowToTool",
              "name": "AI-Powered Analysis Tools"
            },
            {
              "@type": "HowToTool",
              "name": "Personalized Recommendations Engine"
            }
          ]
        },
        {
          "@type": "WebPage",
          "@id": canonicalUrl,
          "url": canonicalUrl,
          "name": questionData.title,
          "description": questionData.description,
          "inLanguage": "en-US",
          "isPartOf": {
            "@type": "WebSite",
            "@id": "https://moneko.io#website"
          },
          "about": [
            {
              "@type": "Thing",
              "name": questionData.question,
              "description": questionData.content.solution
            },
            {
              "@type": "Thing",
              "name": "AI Financial Education",
              "description": "Machine learning powered personal finance guidance and education"
            }
          ],
          "mainEntity": {
            "@type": "Question",
            "name": questionData.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": questionData.content.solution
            }
          },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://moneko.io"
              },
              {
                "@type": "ListItem", 
                "position": 2,
                "name": "Financial Questions",
                "item": "https://moneko.io/questions"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": questionData.question,
                "item": canonicalUrl
              }
            ]
          },
          "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": ["h1", ".hero-title", ".problem", ".solution", ".benefits-list", ".call-to-action"]
          },
          "datePublished": "2025-09-10",
          "dateModified": "2025-09-10",
          "author": {
            "@type": "Organization",
            "@id": "https://moneko.io#organization"
          },
          "publisher": {
            "@type": "Organization",
            "@id": "https://moneko.io#organization"
          }
        },
        {
          "@type": "Service",
          "@id": `${canonicalUrl}#service`,
          "name": "AI-Powered Personal Financial Guidance",
          "alternateName": "Moneko Financial Coaching",
          "description": `Get expert help with ${questionData.question.toLowerCase()} through personalized AI-powered financial advice and planning assistance`,
          "provider": {
            "@type": "Organization",
            "@id": "https://moneko.io#organization"
          },
          "serviceType": "Financial Planning",
          "category": "Personal Finance Education",
          "areaServed": {
            "@type": "Country",
            "name": "United States"
          },
          "audience": {
            "@type": "Audience",
            "audienceType": [categoryName, "Financial Education Seekers", "Personal Finance Beginners"],
            "geographicArea": {
              "@type": "Country",
              "name": "United States"
            }
          },
          "serviceOutput": {
            "@type": "Thing",
            "name": "Personalized Financial Plan",
            "description": questionData.content.call_to_action
          },
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
            "validFrom": "2024-01-01",
            "validThrough": "2025-12-31",
            "description": "Free AI-powered financial guidance with immediate access to personalized recommendations",
            "itemCondition": "https://schema.org/NewCondition"
          },
          "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "Financial Guidance Services",
            "itemListElement": questionData.content.benefits.map((benefit, index) => ({
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": benefit,
                "description": `Professional guidance on ${benefit.toLowerCase()}`
              }
            }))
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "bestRating": "5",
            "worstRating": "1",
            "ratingCount": "247",
            "reviewCount": "189"
          }
        }
      ]
    };

    return {
      meta,
      link: [
        {
          rel: "canonical",
          href: canonicalUrl
        }
      ],
      script: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(structuredData)
        }
      ]
    };
  }
});

function QuestionPageComponent() {
  const { questionSlug } = Route.useParams();
  const result = Route.useLoaderData();

  if (!result) {
    return (
      <div className="min-h-screen bg-moneko-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Question Not Found</h1>
          <p className="text-muted-foreground">The financial question you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const { questionData, categoryName } = result;
  const canonicalUrl = getCanonicalUrl(`/questions/${questionSlug}`);

  return (
    <FinancialQuestionPage 
      questionData={questionData}
      category={categoryName}
      canonicalUrl={canonicalUrl}
    />
  );
}