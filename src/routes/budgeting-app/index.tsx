import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, Variants } from "framer-motion";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faChartLine,
  faUserGroup,
  faMoneyBillWave,
  faArrowTrendUp,
  faHome,
  faPiggyBank,
} from "@fortawesome/free-solid-svg-icons";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { HomeHeader } from "@/components/index/header";
import { StructuredData } from "@/components/seo/structured-data";
import { KeyTakeaways, QuickFacts, AtAGlance, FinancialTips } from "@/components/seo/content-blocks";

// Define animation variants
const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.25,
    },
  },
};

const gridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// Target group categories
const targetGroups = [
  { id: "students", label: "Students", icon: faUserGroup },
  {
    id: "young-professionals",
    label: "Young Professionals",
    icon: faChartLine,
  },
  { id: "parents", label: "Parents", icon: faUserGroup },
  { id: "couples", label: "Couples", icon: faUserGroup },
  { id: "freelancers", label: "Freelancers", icon: faMoneyBillWave },
  { id: "entrepreneurs", label: "Entrepreneurs", icon: faArrowTrendUp },
  { id: "retirees", label: "Retirees", icon: faPiggyBank },
];

// Financial goal categories
const financialGoals = [
  { id: "budgeting", label: "Budgeting", icon: faMoneyBillWave },
  { id: "saving", label: "Saving", icon: faPiggyBank },
  { id: "debt-repayment", label: "Debt Repayment", icon: faMoneyBillWave },
  { id: "investing", label: "Investing", icon: faArrowTrendUp },
  { id: "retirement", label: "Retirement", icon: faPiggyBank },
  { id: "home-buying", label: "Home Buying", icon: faHome },
];

export const Route = createFileRoute("/budgeting-app/")({
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
            "https://www.instagram.com/moneko_ai/",
            "https://x.com/moneko_ai",
            "https://www.linkedin.com/company/moneko"
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
          description: "Discover how Moneko's AI-powered budgeting app delivers personalized financial education, smart budgeting tools, and investing courses tailored to your specific needs.",
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
      link: [
        {
          rel: "canonical",
          href: pageUrl,
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

function BudgetingApp() {
  return (
    <AmbientHaloLayout>
      <HomeHeader />
      <motion.div
        className="container mx-auto px-4 py-12"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="mb-16 text-center">
          <motion.h1
            className="mb-6 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl md:text-5xl lg:text-5xl  dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Moneko: AI-Powered Financial Learning
          </motion.h1>

          <motion.p
            className="mx-auto max-w-3xl text-lg text-slate-600 md:text-xl dark:text-slate-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Find personalized budgeting advice, AI-generated financial lessons,
            and investing courses designed specifically for your unique
            financial situation and goals.
          </motion.p>
        </div>

        {/* Target Groups Section */}
        <section className="mb-16">
          <motion.h2
            className="mb-8 text-center text-2xl font-bold text-slate-800 md:text-3xl dark:text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Find Budgeting Solutions For You
          </motion.h2>

          <motion.div
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
          >
            {targetGroups.map((group) => (
              <motion.div
                key={group.id}
                variants={cardVariants}
                className="group overflow-hidden rounded-2xl border border-white/20 bg-slate-50/50 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-900/50"
              >
                <a
                  href={`/budgeting-app/${group.id}-budgeting`}
                  className="block p-6"
                >
                  <div className="mb-4 flex items-start">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/20">
                      <FontAwesomeIcon
                        icon={group.icon}
                        className="text-xl"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-xl font-bold text-slate-800 transition-colors group-hover:text-purple-600 dark:text-slate-100 dark:group-hover:text-purple-400">
                        {group.label}
                      </h3>
                      <p className="mt-1 text-slate-600 dark:text-slate-400">
                        Personalized financial learning for{" "}
                        {group.label.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      Learn more
                    </span>
                    <span className="transform transition-transform group-hover:translate-x-1">
                      <FontAwesomeIcon
                        icon={faArrowRight}
                        className="text-purple-600 dark:text-purple-400"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </a>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Financial Goals Section */}
        <section className="mb-16">
          <motion.h2
            className="mb-8 text-center text-2xl font-bold text-slate-800 md:text-3xl dark:text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Achieve Your Financial Goals
          </motion.h2>

          <motion.div
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
          >
            {financialGoals.map((goal) => (
              <motion.div
                key={goal.id}
                variants={cardVariants}
                className="group overflow-hidden rounded-2xl border border-white/20 bg-slate-50/50 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-900/50"
              >
                <a
                  href={`/budgeting-app/young-professionals-${goal.id}`}
                  className="block p-6"
                >
                  <div className="mb-4 flex items-start">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/20">
                      <FontAwesomeIcon
                        icon={goal.icon}
                        className="text-xl"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-xl font-bold text-slate-800 transition-colors group-hover:text-purple-600 dark:text-slate-100 dark:group-hover:text-purple-400">
                        {goal.label}
                      </h3>
                      <p className="mt-1 text-slate-600 dark:text-slate-400">
                        AI-driven tools and courses for{" "}
                        {goal.label.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      Learn more
                    </span>
                    <span className="transform transition-transform group-hover:translate-x-1">
                      <FontAwesomeIcon
                        icon={faArrowRight}
                        className="text-purple-600 dark:text-purple-400"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </a>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Educational Content Section for SEO */}
        <section className="mb-16">
          <div className="rounded-2xl bg-white p-8 shadow-lg dark:bg-slate-800">
            <h2 className="mb-6 text-2xl font-bold text-slate-800 md:text-3xl dark:text-white">
              AI-Powered Financial Learning with Moneko
            </h2>

            <div className="prose prose-lg max-w-none text-slate-700 dark:text-slate-300">
              <p>
                Moneko's budgeting app is more than just another financial
                tool—it's an AI-powered learning platform designed to improve
                your financial literacy while helping you manage your money more
                effectively. Our unique approach combines personalized budgeting
                tools with adaptive learning content that grows with you.
              </p>

              <h3 className="mb-3 mt-6 text-xl font-bold text-slate-800 dark:text-white">
                Personalized Financial Education
              </h3>
              <p>
                Our AI analyzes your spending patterns, income sources, and
                financial goals to create custom learning modules that address
                your specific needs. Whether you're a student looking to manage
                limited funds, a young professional wanting to balance student
                loan payments with saving for the future, or a parent planning
                for your family's financial security, Moneko adapts to deliver
                the most relevant education.
              </p>

              <h3 className="mb-3 mt-6 text-xl font-bold text-slate-800 dark:text-white">
                Smart Budgeting Tools
              </h3>
              <p>
                Alongside educational content, Moneko provides intelligent
                budgeting tools that make financial management simple and
                intuitive. Our AI identifies spending patterns and suggests
                optimizations to help you reach your goals faster. With
                real-time insights and actionable recommendations, you'll always
                know exactly where your money is going and how to make it work
                harder for you.
              </p>

              <h3 className="mb-3 mt-6 text-xl font-bold text-slate-800 dark:text-white">
                Essential Investing Courses
              </h3>
              <p>
                Building wealth requires more than just budgeting—it means
                making your money grow. Moneko offers beginner-friendly
                investing courses that demystify the stock market, retirement
                accounts, and other investment vehicles. Our step-by-step
                lessons adapt to your knowledge level, gradually introducing
                more complex concepts as you become more confident with the
                basics.
              </p>
            </div>
          </div>
        </section>

        {/* AI-Optimized Content Blocks */}
        <div className="mt-12 space-y-8">
          <KeyTakeaways
            title="AI Budgeting App Key Benefits"
            points={[
              "Personalized financial education adapts to your specific situation and learning pace",
              "AI analyzes spending patterns to provide actionable budgeting recommendations",
              "Interactive calculators help plan major financial decisions like home buying and retirement",
              "Content tailored for different life stages from students to retirees",
              "Smart goal tracking with progress monitoring and milestone celebrations",
              "Free access to essential financial tools with premium AI coaching available"
            ]}
          />
          
          <QuickFacts
            title="Moneko Platform Statistics"
            facts={[
              {
                label: "User Satisfaction Rating",
                value: "4.7/5",
                description: "Based on user reviews and platform feedback across all calculators"
              },
              {
                label: "Financial Education Focus",
                value: "500+ lessons",
                description: "Comprehensive course library covering personal finance fundamentals"
              },
              {
                label: "Platform Accessibility",
                value: "Free + Premium",
                description: "Free basic tools with premium AI coaching at $9.99/month"
              },
              {
                label: "Educational Content Library",
                value: "500+ lessons",
                description: "Comprehensive courses covering all aspects of personal finance"
              }
            ]}
          />
          
          <AtAGlance
            title="Moneko AI Budgeting App at a Glance"
            items={[
              {
                category: "Best For",
                details: "Anyone wanting to improve their financial literacy and budgeting skills with AI guidance"
              },
              {
                category: "Key Features",
                details: "Personalized budgeting, smart calculators, investment courses, spending analysis"
              },
              {
                category: "Learning Format",
                details: "Interactive lessons, video tutorials, hands-on calculators, progress tracking"
              },
              {
                category: "Pricing",
                details: "Free basic access with premium AI coaching at $9.99/month"
              },
              {
                category: "Accessibility",
                details: "Web-based platform accessible on all devices with responsive design"
              }
            ]}
          />
          
          <FinancialTips
            title="Getting Started with AI-Powered Budgeting"
            level="beginner"
            tips={[
              "Begin by connecting your accounts to get an accurate picture of your spending patterns",
              "Set 2-3 realistic financial goals to focus your budgeting efforts effectively",
              "Use the 50/30/20 rule as a starting framework: 50% needs, 30% wants, 20% savings",
              "Review your AI-generated insights weekly to stay on track with recommendations",
              "Start with one area of improvement rather than trying to change everything at once",
              "Take advantage of free courses to build financial literacy alongside budgeting"
            ]}
          />
        </div>

        {/* Enhanced FAQ Schema with GEO and Voice Search Optimization */}
        <StructuredData
          type="faq"
          data={[
            {
              question: "How does Moneko's AI personalize my financial education?",
              answer: "Moneko's AI analyzes your spending patterns, income sources, financial goals, location, and current knowledge level to create customized learning paths. It adapts content difficulty, suggests relevant topics, and provides recommendations specific to your situation, whether you're a student, professional, parent, or retiree. Our GEO-optimized recommendations consider local cost of living and regional financial opportunities."
            },
            {
              question: "What makes Moneko different from other budgeting apps?",
              answer: "Unlike traditional budgeting apps that only track expenses, Moneko combines budgeting with comprehensive financial education. Our AI provides personalized learning experiences, explains the 'why' behind financial decisions, offers interactive courses that grow with your knowledge level, and includes location-based insights for better financial planning."
            },
            {
              question: "Can I use Moneko if I'm a complete beginner to personal finance?",
              answer: "Absolutely! Moneko is designed for all experience levels. The AI assesses your financial knowledge and starts with fundamentals if needed. Our content explains concepts in plain English, provides practical examples, and builds complexity gradually. We include voice search capabilities for easy navigation and mobile-optimized interfaces for learning on-the-go."
            },
            {
              question: "How much does Moneko cost and what's included?",
              answer: "Moneko offers free access to basic financial calculators and introductory courses available globally. Premium subscription at $9.99/month includes full AI coaching, advanced budgeting tools, personalized recommendations, comprehensive course library, GEO-based insights, priority support, and access to exclusive financial planning resources."
            },
            {
              question: "Is my financial information secure with Moneko?",
              answer: "Yes, Moneko uses bank-level security with 256-bit encryption, secure data storage, and never stores your login credentials. We're read-only, meaning we can analyze your data for insights but cannot make transactions. Our security measures comply with international standards including GDPR and CCPA. Your privacy and security are our top priorities."
            },
            {
              question: "How quickly can I see improvements in my financial situation?",
              answer: "Most users report seeing positive changes within 30 days of using Moneko consistently. This includes better spending awareness, improved saving habits, and clearer financial goals. Long-term wealth building and debt reduction typically show significant results within 3-6 months of following AI recommendations. Our mobile app provides daily insights and progress tracking to keep you motivated."
            },
            {
              question: "Does Moneko work in my area?",
              answer: "Moneko is available in the United States, Canada, United Kingdom, and Australia, with GEO-optimized content that considers local financial regulations, cost of living, and regional opportunities. Our AI adapts recommendations based on your specific location to provide the most relevant financial advice."
            },
            {
              question: "Can I access Moneko on my mobile device?",
              answer: "Yes! Moneko is fully optimized for mobile devices with responsive design, fast loading times, and voice search capabilities. You can access all features through your mobile browser or our progressive web app, making financial planning convenient wherever you are."
            },
            {
              question: "What types of financial goals can Moneko help me achieve?",
              answer: "Moneko helps with all major financial goals including budgeting, saving, debt repayment, investing, retirement planning, and home buying. Our AI creates personalized action plans based on your specific situation, timeline, and location. Whether you're a student, young professional, parent, couple, freelancer, entrepreneur, or retiree, we have tailored strategies for your life stage."
            },
            {
              question: "How does Moneko's voice search feature work?",
              answer: "Our voice search allows you to ask questions naturally, like 'How should I budget as a college student?' or 'What's the best way to save for retirement?' The AI understands your intent and provides personalized, actionable answers based on your profile and goals."
            }
          ]}
        />

        {/* Local Business Schema for Enhanced GEO SEO */}
        <StructuredData
          type="organization"
          data={{
            "@type": "FinancialService",
            "@id": "https://moneko.io/#financial-service",
            "name": "Moneko AI Financial Planning",
            "alternateName": "Moneko Financial Education Platform",
            "description": "AI-powered financial planning and education service providing personalized budgeting, investing, and wealth-building strategies",
            "url": "https://moneko.io",
            "telephone": "+1-800-MONEKO-1",
            "email": "support@moneko.io",
            "foundingDate": "2024",
            "areaServed": [
              {
                "@type": "Country",
                "name": "United States"
              },
              {
                "@type": "Country", 
                "name": "Canada"
              },
              {
                "@type": "Country",
                "name": "United Kingdom"
              },
              {
                "@type": "Country",
                "name": "Australia"
              }
            ],
            "serviceType": ["Financial Planning", "Investment Education", "Budgeting Services", "Debt Management", "Retirement Planning"],
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Financial Services",
              "itemListElement": [
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "AI Financial Coaching",
                    "description": "Personalized AI-powered financial coaching and recommendations"
                  },
                  "areaServed": {
                    "@type": "GeoShape",
                    "addressCountry": ["US", "CA", "GB", "AU"]
                  }
                },
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service", 
                    "name": "Financial Education Courses",
                    "description": "Comprehensive courses covering personal finance fundamentals"
                  },
                  "areaServed": {
                    "@type": "GeoShape",
                    "addressCountry": ["US", "CA", "GB", "AU"]
                  }
                }
              ]
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.7",
              "reviewCount": "1547",
              "bestRating": "5"
            },
            "review": [
              {
                "@type": "Review",
                "reviewRating": {
                  "@type": "Rating",
                  "ratingValue": "5"
                },
                "author": {
                  "@type": "Person", 
                  "name": "Jennifer L."
                },
                "reviewBody": "The best financial education platform I've ever used. The AI recommendations are incredibly accurate and location-specific.",
                "datePublished": "2024-12-01"
              }
            ],
            "openingHoursSpecification": {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
              "opens": "00:00",
              "closes": "23:59"
            },
            "availableLanguage": "English"
          }}
        />

        {/* CTA Section */}
        <motion.section
          className="rounded-3xl bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-center text-white shadow-xl md:p-12"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Ready to Transform Your Finances?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg md:text-xl">
            Join thousands of people who have already discovered the power of
            AI-driven financial learning with Moneko.
          </p>
          <a
            href="/dashboard"
            className="inline-block transform rounded-full bg-white px-8 py-3 text-lg font-bold text-purple-600 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            Visit Moneko Now
          </a>
        </motion.section>
      </motion.div>
    </AmbientHaloLayout>
  );
}

export default BudgetingApp;
