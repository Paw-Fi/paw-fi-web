import { Navigate, createFileRoute } from "@tanstack/react-router";
import { LearningPage } from "../learning";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import basicLessonsData from "@/data/basic-lessons.json";


export const Route = createFileRoute("/dashboard/essentials/")({
  component: Essentials,
  head: () => {
    const canonicalUrl = getCanonicalUrl('/dashboard/essentials/');
    const title = 'Financial Education - Expert Fundamentals Course | Moneko';
    const description = 'Master personal finance fundamentals with expert essentials course. Learn budgeting, investing & money management basics.';
    const keywords = 'financial essentials course, personal finance fundamentals, money basics, budgeting basics, investing fundamentals, financial literacy, expert financial education, essential money skills';

    const meta = seo({
      title,
      description,
      keywords,
      image: "https://moneko.io/og-img.png",
      url: canonicalUrl,
    });

    // Comprehensive structured data for essentials course
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Course",
          "@id": `${canonicalUrl}#course`,
          "name": "Financial Essentials - Fundamental Personal Finance Course",
          "description": "Comprehensive foundational course covering all essential personal finance topics including budgeting, saving, investing, and financial planning",
          "provider": {
            "@type": "EducationalOrganization",
            "@id": "https://moneko.io#organization",
            "name": "Moneko",
            "description": "Leading AI-powered personal finance education platform",
            "url": "https://moneko.io",
            "logo": "https://moneko.io/og-img.png"
          },
          "courseMode": ["online", "self-paced"],
          "educationalLevel": "beginner",
          "teaches": [
            "Personal Finance Fundamentals",
            "Budgeting Essentials",
            "Saving Strategies",
            "Investment Basics",
            "Emergency Fund Planning",
            "Debt Management",
            "Financial Goal Setting",
            "Money Management Skills"
          ],
          "learningResourceType": [
            "Interactive Lessons",
            "Practical Exercises",
            "Real-world Examples",
            "Expert Guidance"
          ],
          "timeRequired": "PT3H",
          "totalTime": "PT3H",
          "educationalCredentialAwarded": "Financial Fundamentals Certificate",
          "coursePrerequisites": "None - designed for beginners",
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "reviewCount": "5247",
            "bestRating": "5",
            "worstRating": "1"
          },
          "hasCourseInstance": {
            "@type": "CourseInstance",
            "courseMode": "online",
            "instructor": {
              "@type": "Person",
              "name": "Moneko Expert Team",
              "description": "Team of certified financial educators and industry professionals"
            }
          }
        },
        {
          "@type": "EducationalOrganization",
          "@id": "https://moneko.io#organization",
          "name": "Moneko",
          "alternateName": "Moneko Financial Education",
          "description": "Premier AI-powered personal finance education platform providing expert-led courses, AI tutoring, and comprehensive financial tools",
          "url": "https://moneko.io",
          "logo": {
            "@type": "ImageObject",
            "url": "https://moneko.io/og-img.png",
            "width": "1200",
            "height": "630"
          },
          "image": "https://moneko.io/og-img.png",
          "foundingDate": "2024",
          "areaServed": ["United States", "Canada", "United Kingdom", "Australia"],
          "educationalCredentialAwarded": [
            "Financial Fundamentals Certificate",
            "Investment Basics Certificate",
            "Budgeting Mastery Certificate"
          ],
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer support",
            "email": "support@moneko.io",
            "availableLanguage": "English"
          },
          "sameAs": [
            "https://twitter.com/moneko_io",
            "https://linkedin.com/company/moneko"
          ]
        },
        {
          "@type": "WebApplication",
          "@id": `${canonicalUrl}#webapp`,
          "name": "Moneko Financial Essentials Platform",
          "description": "Interactive financial education platform providing essential personal finance training",
          "url": canonicalUrl,
          "applicationCategory": "EducationalApplication",
          "applicationSubCategory": "Financial Education",
          "operatingSystem": "Web Browser",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
            "validFrom": "2024-01-01"
          },
          "featureList": [
            "Expert-Crafted Curriculum",
            "Interactive Learning Modules",
            "Progress Tracking",
            "Practical Exercises",
            "Real-world Applications",
            "Beginner-Friendly Content",
            "Self-Paced Learning",
            "Certificate Awards"
          ],
          "screenshot": "https://moneko.io/og-img.png",
          "softwareVersion": "2.0",
          "audience": {
            "@type": "Audience",
            "audienceType": ["Finance Beginners", "Students", "Young Adults", "Career Starters", "Financial Literacy Seekers"]
          }
        },
        {
          "@type": "ItemList",
          "@id": `${canonicalUrl}#topics`,
          "name": "Essential Financial Topics",
          "description": "Core topics covered in the financial essentials course",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "item": {
                "@type": "Course",
                "name": "Budgeting Fundamentals",
                "description": "Learn to create and maintain effective budgets for financial control"
              }
            },
            {
              "@type": "ListItem",
              "position": 2,
              "item": {
                "@type": "Course",
                "name": "Saving Strategies",
                "description": "Master the art of saving money and building emergency funds"
              }
            },
            {
              "@type": "ListItem",
              "position": 3,
              "item": {
                "@type": "Course",
                "name": "Investment Basics",
                "description": "Introduction to investing principles and getting started with investments"
              }
            },
            {
              "@type": "ListItem",
              "position": 4,
              "item": {
                "@type": "Course",
                "name": "Debt Management",
                "description": "Strategies for managing and eliminating debt effectively"
              }
            },
            {
              "@type": "ListItem",
              "position": 5,
              "item": {
                "@type": "Course",
                "name": "Financial Goal Setting",
                "description": "Learn to set and achieve meaningful financial objectives"
              }
            }
          ]
        },
        {
          "@type": "BreadcrumbList",
          "@id": `${canonicalUrl}#breadcrumb`,
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Dashboard",
              "item": {
                "@type": "WebPage",
                "@id": "https://moneko.io/dashboard"
              }
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Learning",
              "item": {
                "@type": "WebPage",
                "@id": "https://moneko.io/dashboard/learning"
              }
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": "Essentials",
              "item": {
                "@type": "WebPage",
                "@id": canonicalUrl
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
  },
});

function Essentials() {
  // Pass source='local' as a prop to LearningPage
  return <Navigate to={`/dashboard/learning/${basicLessonsData.course_id}/lesson/${basicLessonsData.lessons[0].lesson_id}`} />
}
