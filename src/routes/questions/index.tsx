import React, { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch, 
  faChevronRight, 
  faExclamationTriangle,
  faChartLine,
  faLightbulb,
  faGraduationCap,
  faArrowUp,
  faCalculator,
  faBookOpen,
  faUsers
} from '@fortawesome/free-solid-svg-icons';
import financialQuestionsData from '@/data/financial-questions.json';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';

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

export const Route = createFileRoute('/questions/')({
  component: QuestionsIndexComponent,
  head: () => {
    const canonicalUrl = getCanonicalUrl('/questions');
    const title = 'Financial Questions Hub - Get Answers to All Your Money Questions | Moneko';
    const description = 'Find answers to your financial questions. Get expert guidance on debt, investing, budgeting, retirement planning, and more. Free AI-powered financial advice.';
    const keywords = 'financial questions, money advice, personal finance help, financial guidance, budgeting questions, investing questions, debt help, retirement planning';

    const meta = seo({
      title,
      description,
      keywords,
      image: "https://moneko.io/og-img.png",
      url: canonicalUrl,
    });

    // GEO-Optimized structured data for the questions hub
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://moneko.io#organization",
          "name": "Moneko",
          "alternateName": "Moneko Financial Education Hub",
          "description": "AI-powered financial education platform with comprehensive question database and expert guidance",
          "url": "https://moneko.io",
          "logo": {
            "@type": "ImageObject",
            "url": "https://moneko.io/og-img.png",
            "width": "1200",
            "height": "630"
          },
          "foundingDate": "2024",
          "areaServed": {
            "@type": "Country",
            "name": "United States"
          },
          "knowsAbout": [
            "Personal Finance Questions",
            "Financial Planning Guidance",
            "Investment Education", 
            "Debt Management Solutions",
            "Budgeting and Saving Strategies",
            "Retirement Planning",
            "AI Financial Coaching"
          ],
          "sameAs": [
            "https://twitter.com/moneko_io",
            "https://linkedin.com/company/moneko",
            "https://facebook.com/monekoai"
          ]
        },
        {
          "@type": "CollectionPage",
          "@id": `${canonicalUrl}#collection`,
          "name": "Financial Questions & Answers Hub",
          "alternateName": "Comprehensive Financial Guidance Center",
          "description": "Complete collection of financial questions with AI-powered answers covering debt, investing, budgeting, and wealth building",
          "url": canonicalUrl,
          "inLanguage": "en-US",
          "isPartOf": {
            "@type": "WebSite",
            "@id": "https://moneko.io#website"
          },
          "about": [
            {
              "@type": "Thing",
              "name": "Personal Finance Education",
              "description": "Comprehensive financial literacy and education resources"
            },
            {
              "@type": "Thing",
              "name": "AI Financial Assistance",
              "description": "Artificial intelligence powered financial guidance and support"
            }
          ],
          "mainEntity": {
            "@type": "ItemList",
            "name": "Financial Questions by Category",
            "description": "Organized collection of financial questions across major personal finance topics",
            "numberOfItems": Object.values(financialQuestionsData).reduce((total, category) => 
              total + Object.keys(category.questions).length, 0
            ),
            "itemListElement": Object.entries(financialQuestionsData).map(([categoryKey, categoryData], index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "Article",
                "name": categoryData.category,
                "description": categoryData.description,
                "author": {
                  "@type": "Organization",
                  "@id": "https://moneko.io#organization"
                },
                "publisher": {
                  "@type": "Organization", 
                  "@id": "https://moneko.io#organization"
                }
              }
            }))
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
                "item": canonicalUrl
              }
            ]
          },
          "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": ["h1", ".category-header", ".question-summary", ".search-instructions"]
          }
        },
        {
          "@type": "WebSite",
          "@id": "https://moneko.io#website",
          "name": "Moneko - AI Financial Education Platform",
          "alternateName": "Moneko Financial Questions Hub",
          "description": "Comprehensive AI-powered personal finance education platform with expert question database",
          "url": "https://moneko.io",
          "inLanguage": "en-US",
          "publisher": {
            "@type": "Organization",
            "@id": "https://moneko.io#organization"
          },
          "potentialAction": [
            {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://moneko.io/questions?q={search_term_string}"
              },
              "query-input": "required name=search_term_string"
            },
            {
              "@type": "ReadAction",
              "target": canonicalUrl,
              "object": {
                "@type": "WebPage",
                "name": "Browse Financial Questions by Category"
              }
            }
          ]
        },
        {
          "@type": "Service",
          "@id": `${canonicalUrl}#service`,
          "name": "Financial Questions Database",
          "description": "Comprehensive database of personal finance questions with expert AI-powered answers and guidance",
          "provider": {
            "@type": "Organization",
            "@id": "https://moneko.io#organization"
          },
          "serviceType": "Financial Education Service",
          "areaServed": {
            "@type": "Country",
            "name": "United States"
          },
          "audience": {
            "@type": "Audience",
            "audienceType": ["Personal Finance Beginners", "Investment Learners", "Debt Management Seekers", "Retirement Planners"]
          },
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
            "description": "Free access to comprehensive financial questions database with AI-powered guidance"
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

function QuestionsIndexComponent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categoryIcons = {
    'debt_and_crisis': faExclamationTriangle,
    'budgeting_and_saving': faCalculator, 
    'investing_and_wealth': faChartLine,
    'advanced_planning': faGraduationCap,
    'trending_2025': faArrowUp
  };

  const categoryColors = {
    'debt_and_crisis': 'from-red-500 to-orange-500',
    'budgeting_and_saving': 'from-green-500 to-emerald-500',
    'investing_and_wealth': 'from-blue-500 to-indigo-500', 
    'advanced_planning': 'from-purple-500 to-pink-500',
    'trending_2025': 'from-orange-500 to-red-500'
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'low': return 'text-green-500 bg-green-50 dark:bg-green-900/20';
      default: return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  // Filter questions based on search query
  const filteredCategories = Object.entries(financialQuestionsData as Record<string, CategoryData>)
    .filter(([categoryKey, categoryData]) => {
      if (!searchQuery) return true;
      
      const searchLower = searchQuery.toLowerCase();
      const categoryMatch = categoryData.category.toLowerCase().includes(searchLower) ||
                          categoryData.description.toLowerCase().includes(searchLower);
      
      const questionsMatch = Object.values(categoryData.questions).some(question =>
        question.question.toLowerCase().includes(searchLower) ||
        question.keywords.toLowerCase().includes(searchLower) ||
        question.description.toLowerCase().includes(searchLower)
      );

      return categoryMatch || questionsMatch;
    });

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-background via-background/80 to-primary/5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero Section */}
      <section className="relative pt-16 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-48 h-48 bg-purple-200/20 dark:bg-purple-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-indigo-200/20 dark:bg-indigo-600/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-200/15 dark:bg-pink-600/8 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto text-center">
          <motion.h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Financial Questions Hub
          </motion.h1>

          <motion.p 
            className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto mb-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Get expert answers to all your money questions. From debt management to wealth building, find the guidance you need.
          </motion.p>

          {/* Search Bar */}
          <motion.div 
            className="max-w-2xl mx-auto relative"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="relative">
              <FontAwesomeIcon 
                icon={faSearch} 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5"
              />
              <input
                type="text"
                placeholder="Search financial questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-background/90 backdrop-blur-sm border border-border/50 rounded-2xl text-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="popLayout">
            {filteredCategories.map(([categoryKey, categoryData], categoryIndex) => (
              <motion.div
                key={categoryKey}
                className="mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: categoryIndex * 0.1 }}
              >
                {/* Category Header */}
                <div 
                  className="flex items-center gap-4 mb-6 cursor-pointer"
                  onClick={() => setSelectedCategory(selectedCategory === categoryKey ? null : categoryKey)}
                >
                  <div className={`p-4 rounded-xl bg-gradient-to-r ${categoryColors[categoryKey as keyof typeof categoryColors] || 'from-blue-500 to-purple-500'}`}>
                    <FontAwesomeIcon 
                      icon={categoryIcons[categoryKey as keyof typeof categoryIcons] || faBookOpen} 
                      className="h-6 w-6 text-white" 
                    />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">{categoryData.category}</h2>
                    <p className="text-muted-foreground">{categoryData.description}</p>
                  </div>
                  <FontAwesomeIcon 
                    icon={faChevronRight} 
                    className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                      selectedCategory === categoryKey ? 'rotate-90' : ''
                    }`}
                  />
                </div>

                {/* Questions Grid */}
                <AnimatePresence>
                  {(selectedCategory === categoryKey || selectedCategory === null) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                      {Object.entries(categoryData.questions)
                        .filter(([questionSlug, questionData]) => {
                          if (!searchQuery) return true;
                          const searchLower = searchQuery.toLowerCase();
                          return (
                            questionData.question.toLowerCase().includes(searchLower) ||
                            questionData.keywords.toLowerCase().includes(searchLower) ||
                            questionData.description.toLowerCase().includes(searchLower)
                          );
                        })
                        .map(([questionSlug, questionData], questionIndex) => (
                          <motion.div
                            key={questionSlug}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: questionIndex * 0.05 }}
                          >
                            <Link
                              to={`/questions/${questionSlug}`}
                              className="block h-full"
                            >
                              <div className="h-full bg-background/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-border/50 hover:shadow-xl hover:scale-105 transition-all duration-300 group">
                                {/* Urgency Badge */}
                                <div className="flex justify-between items-start mb-4">
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getUrgencyColor(questionData.urgency)}`}>
                                    {questionData.urgency.toUpperCase()}
                                  </span>
                                  <FontAwesomeIcon 
                                    icon={faChevronRight} 
                                    className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-200"
                                  />
                                </div>

                                {/* Question */}
                                <h3 className="text-lg font-bold text-foreground mb-3 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200">
                                  {questionData.question}
                                </h3>

                                {/* Description */}
                                <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
                                  {questionData.description.replace(' | Moneko', '')}
                                </p>

                                {/* Benefits Preview */}
                                <div className="mt-4 pt-4 border-t border-border/30">
                                  <p className="text-xs text-muted-foreground">
                                    {questionData.content.benefits.length} solutions included
                                  </p>
                                </div>
                              </div>
                            </Link>
                          </motion.div>
                        ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* No Results */}
          {filteredCategories.length === 0 && (
            <motion.div 
              className="text-center py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                <FontAwesomeIcon icon={faSearch} className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">No questions found</h3>
              <p className="text-muted-foreground mb-6">Try adjusting your search terms or browse all categories.</p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Show All Questions
              </button>
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-8 text-white">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                Can't Find Your Question?
              </h3>
              <p className="text-xl opacity-90 mb-6">
                Get personalized answers from our AI financial coach in under 2 minutes.
              </p>
              <Link
                to="/onboarding"
                search={{}}
                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-purple-600 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <FontAwesomeIcon icon={faUsers} className="h-5 w-5" />
                Ask Our AI Coach
                <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4" />
              </Link>
              <p className="text-sm opacity-75 mt-4">
                Free personalized guidance • No signup required • Get instant answers
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}