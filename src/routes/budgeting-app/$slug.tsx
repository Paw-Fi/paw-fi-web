import React, { useState, useRef } from 'react';
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { motion, Variants, useAnimation } from 'framer-motion';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowRight, 
  faCheck, 
  faCircleInfo, 
  faArrowLeft,
  faStar,
  faQuoteLeft,
  faCalculator,
  faUsers,
  faChartLine,
  faHeart,
  faHandSparkles,
  faBullseye,
  faShieldAlt
} from '@fortawesome/free-solid-svg-icons';
import { fetchSEOPageBySlug, fetchRelatedPages } from '@/services/pseo-service';
import type { SEOPageData, RelatedPage } from '@/types/seo-types';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { AISearchInput } from '@/components/ui/ai-search-input';

// Enhanced animation variants for 2025 standards
const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 40,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.19, 1, 0.22, 1],
      staggerChildren: 0.15,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.4,
      ease: [0.19, 1, 0.22, 1],
    },
  },
};

const sectionVariants: Variants = {
  initial: { opacity: 0, y: 30, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.19, 1, 0.22, 1],
    } 
  },
};

const cardVariants: Variants = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.19, 1, 0.22, 1],
    }
  },
  hover: {
    scale: 1.02,
    y: -5,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  }
};

const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    }
  }
};

// Helper functions for text formatting
const capitalizeWords = (text: string): string => {
  return text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Define route with loader and head
export const Route = createFileRoute('/budgeting-app/$slug')({
  loader: async ({ params }) => {
    try {
      const pageData = await fetchSEOPageBySlug(params.slug);
      if (!pageData) return notFound();
      
      const relatedPages = await fetchRelatedPages(params.slug);
      
      return { pageData, relatedPages };
    } catch (error) {
      console.error('Error loading SEO page data:', error);
      throw error;
    }
  },
  
  head: ({ loaderData }) => {
    if (!loaderData) return { title: 'Loading...' };
    
    const { pageData } = loaderData as { pageData: SEOPageData, relatedPages: RelatedPage[] };
    const pageUrl = getCanonicalUrl(`/budgeting-app/${pageData.slug}`);
    
    const meta = seo({
      title: pageData.title,
      description: pageData.meta_description,
      keywords: pageData.keywords,
      url: pageUrl,
      image: 'https://moneko.io/og-img.png',
    });
    
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "name": "Moneko",
          "url": "https://moneko.io",
          "logo": "https://moneko.io/icon.svg",
        },
        {
          "@type": "WebSite",
          "name": "Moneko",
          "url": "https://moneko.io",
        },
        {
          "@type": "WebPage",
          "@id": pageUrl,
          "url": pageUrl,
          "name": pageData.title,
          "description": pageData.meta_description,
          "isPartOf": {
            "@id": "https://moneko.io/#website"
          },
          "inLanguage": "en-US"
        },
        {
          "@type": "FAQPage",
          "mainEntity": pageData.faqs?.map((faq) => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.answer
            }
          })) || [],
        },
        {
          "@type": "SoftwareApplication",
          "name": "Moneko AI Financial Coach",
          "applicationCategory": "FinanceApplication",
          "operatingSystem": "iOS, Android, Web",
          "description": "AI-powered personalized financial learning platform with custom budgeting tools",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          }
        }
      ],
    };
    
    return {
      title: pageData.title,
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
  
  component: BudgetingAppPage,
  
  pendingComponent: () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-purple-400 rounded-full animate-ping mx-auto"></div>
        </div>
        <p className="text-lg text-slate-700 dark:text-slate-300 font-medium">
          Creating your personalized financial journey...
        </p>
      </div>
    </div>
  ),
  
  errorComponent: ({ error }) => {
    const is404 = (error as any)?.cause?.status === 404;
    
    return (
      <AmbientHaloLayout>
        <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[60vh]">
          <motion.div 
            className="text-center max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FontAwesomeIcon icon={faCircleInfo} className="text-3xl text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-4">
              {is404 ? "Page Not Found" : "Something went wrong"}
            </h1>
            <p className="text-lg text-slate-700 dark:text-slate-300 mb-8 leading-relaxed">
              {is404
                ? "We couldn't find the budgeting advice page you were looking for. Let's get you back on track!"
                : "We encountered an error while loading this page. Please try again later."}
            </p>
            <a 
              href="/budgeting-app"
              className="inline-flex items-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 px-8 rounded-full text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-3" />
              Back to Budgeting Solutions
            </a>
          </motion.div>
        </div>
      </AmbientHaloLayout>
    );
  }
});

function BudgetingAppPage() {
  const { pageData, relatedPages } = Route.useLoaderData() as { 
    pageData: SEOPageData; 
    relatedPages: RelatedPage[] 
  };
  
  const [activeTab, setActiveTab] = useState<'benefits' | 'calculators' | 'success'>('benefits');
  
  // Format display text
  const displayTargetGroup = pageData.target_group.split('-').map(
    word => word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  const displayFinancialGoal = pageData.financial_goal.split('-').map(
    word => word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  // Dynamic calculator data
  const getCalculators = () => {
    const calculators = [];
    
    if (pageData.financial_goal.includes('retirement') || pageData.financial_goal.includes('investing')) {
      calculators.push(
        {
          name: 'Retirement Calculator',
          description: 'Plan your retirement with AI-powered projections',
          url: '/dashboard/calculators/retirement-calculator',
          icon: '🏦',
          gradient: 'from-blue-500 to-cyan-500'
        },
        {
          name: 'Investment Calculator',
          description: 'Calculate potential returns on your investments',
          url: '/dashboard/calculators/investment-calculator',
          icon: '📈',
          gradient: 'from-green-500 to-emerald-500'
        }
      );
    }
    
    if (pageData.financial_goal.includes('home-buying') || pageData.financial_goal.includes('mortgage')) {
      calculators.push({
        name: 'Mortgage Calculator',
        description: 'Calculate monthly payments and total costs',
        url: '/dashboard/calculators/mortgage-calculator',
        icon: '🏠',
        gradient: 'from-orange-500 to-red-500'
      });
    }
    
    if (pageData.financial_goal.includes('saving') || pageData.financial_goal.includes('emergency') || pageData.financial_goal.includes('budgeting')) {
      calculators.push(
        {
          name: 'Saving Goals Calculator',
          description: 'Plan how to reach your savings targets',
          url: '/dashboard/calculators/saving-goals-calculator',
          icon: '🎯',
          gradient: 'from-purple-500 to-pink-500'
        },
        {
          name: 'Compound Interest Calculator',
          description: 'See how your money grows over time',
          url: '/dashboard/calculators/compound-calculator',
          icon: '💰',
          gradient: 'from-yellow-500 to-orange-500'
        }
      );
    }
    
    if (pageData.financial_goal.includes('debt') || pageData.target_group.includes('students') || pageData.target_group.includes('young-professionals')) {
      calculators.push({
        name: 'Auto Loan Calculator',
        description: 'Calculate car loan payments and costs',
        url: '/dashboard/calculators/auto-loan-calculator',
        icon: '🚗',
        gradient: 'from-indigo-500 to-purple-500'
      });
    }
    
    if (!calculators.some(calc => calc.name.includes('Compound'))) {
      calculators.push({
        name: 'Compound Interest Calculator',
        description: 'See how your money grows over time',
        url: '/dashboard/calculators/compound-calculator',
        icon: '💰',
        gradient: 'from-yellow-500 to-orange-500'
      });
    }
    
    return calculators.slice(0, 4);
  };

  const calculators = getCalculators();

  // Use database suggestions or fallback to dynamic ones
  const customSuggestions = pageData.suggestions?.length > 0 
    ? pageData.suggestions 
    : [
        `Help me create a budget for ${displayTargetGroup.toLowerCase()}`,
        `How to achieve ${displayFinancialGoal.toLowerCase()}?`,
        `Best saving strategies for ${displayTargetGroup.toLowerCase()}`,
        `${displayFinancialGoal} planning tips`,
        "Calculate my financial goals",
        "Show me investment options"
      ];

  return (
    <AmbientHaloLayout>
      <motion.div 
        className="min-h-screen"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
       

        {/* Hero Section - Completely Redesigned */}
        <motion.section 
          className="relative overflow-hidden pt-20 pb-32"
          variants={sectionVariants}
        >
          {/* Floating Elements Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 left-10 w-20 h-20 bg-purple-500/10 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute top-40 right-20 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
            <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-pink-500/10 rounded-full blur-xl animate-pulse delay-2000"></div>
          </div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-6xl mx-auto">
              {/* Status Badge */}
              <motion.div 
                className="flex justify-center mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 backdrop-blur-xl border border-purple-200/30 rounded-full px-6 py-2">
                  <FontAwesomeIcon icon={faHandSparkles} className="text-purple-600 text-sm" />
                  <span className="text-sm font-medium text-purple-700">
                    AI-Powered Financial Coach
                  </span>
                </div>
              </motion.div>

              {/* Main Heading */}
              <motion.h1 
                className="text-5xl md:text-7xl font-bold text-center mb-8 leading-tight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                <span className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 bg-clip-text text-transparent">
                  Smart Investment for
                </span>
                <br />
                <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
                  {displayTargetGroup}
                </span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p 
                className="text-xl md:text-2xl text-center text-slate-600 mb-12 max-w-4xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {pageData.intro_content || `Transform your financial future with AI-powered budgeting designed specifically for ${displayTargetGroup.toLowerCase()} pursuing ${displayFinancialGoal.toLowerCase()}.`}
              </motion.p>

              {/* AI Search Input */}
              <AISearchInput 
                placeholder={`Ask Moneko about ${displayFinancialGoal.toLowerCase()} for ${displayTargetGroup.toLowerCase()}...`}
                suggestions={customSuggestions}
                className="mb-16"
              />

              {/* CTA Buttons */}
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <a 
                  href="/dashboard" 
                  className="group inline-flex items-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 px-8 rounded-full text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                >
                  <FontAwesomeIcon icon={faHandSparkles} className="mr-3 group-hover:animate-pulse" />
                  Start Your Journey
                  <FontAwesomeIcon icon={faArrowRight} className="ml-3 group-hover:translate-x-1 transition-transform" />
                </a>
                
                <button 
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center bg-white/80 backdrop-blur-sm text-purple-700 font-semibold py-4 px-8 rounded-full border border-purple-200 hover:bg-white hover:shadow-lg transition-all duration-300"
                >
                  <FontAwesomeIcon icon={faCircleInfo} className="mr-3" />
                  Learn More
                </button>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Features Section - Tabbed Interface */}
        <motion.section 
          id="features"
          className="py-20 "
          variants={sectionVariants}
        >
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              {/* Section Header */}
              <motion.div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-6">
                  <span className="bg-gradient-to-r from-purple-900 to-indigo-900 bg-clip-text text-transparent">
                    How Moneko Empowers {displayTargetGroup}
                  </span>
                </h2>
                <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                  Discover personalized financial tools and insights designed specifically for your {displayFinancialGoal.toLowerCase()} journey.
                </p>
              </motion.div>

              {/* Tab Navigation */}
              <motion.div className="flex justify-center mb-12">
                <div className="inline-flex bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-2 shadow-lg">
                  {[
                    { id: 'benefits', label: 'Key Benefits', icon: faCheck },
                    { id: 'calculators', label: 'Tools & Calculators', icon: faCalculator },
                    { id: 'success', label: 'Success Stories', icon: faStar }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                          : 'text-slate-600 hover:text-purple-600'
                      }`}
                    >
                      <FontAwesomeIcon icon={tab.icon} className="text-sm" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Tab Content */}
              <motion.div 
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {activeTab === 'benefits' && (
                  <div className="grid md:grid-cols-2 gap-8">
                    {[
                      {
                        icon: faBullseye,
                        title: 'Personalized Budget Categories',
                        description: `Smart categories based on ${displayTargetGroup.toLowerCase()} spending patterns and ${displayFinancialGoal.toLowerCase()} objectives.`,
                        gradient: 'from-purple-500 to-pink-500'
                      },
                      {
                        icon: faChartLine,
                        title: 'AI-Powered Insights',
                        description: 'Get intelligent recommendations to identify savings opportunities and optimize your financial strategy.',
                        gradient: 'from-indigo-500 to-blue-500'
                      },
                      {
                        icon: faShieldAlt,
                        title: 'Goal Tracking',
                        description: `Specialized tracking tools designed specifically for ${displayFinancialGoal.toLowerCase()} with milestone celebrations.`,
                        gradient: 'from-green-500 to-emerald-500'
                      },
                      {
                        icon: faUsers,
                        title: 'Community Insights',
                        description: `Connect with other ${displayTargetGroup.toLowerCase()} sharing similar financial goals and learn from their experiences.`,
                        gradient: 'from-orange-500 to-red-500'
                      }
                    ].map((benefit, index) => (
                      <motion.div
                        key={index}
                        className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300"
                        variants={cardVariants}
                        whileHover="hover"
                      >
                        <div className={`w-16 h-16 bg-gradient-to-br ${benefit.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                          <FontAwesomeIcon icon={benefit.icon} className="text-2xl text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">{benefit.title}</h3>
                        <p className="text-slate-600 leading-relaxed">{benefit.description}</p>
                      </motion.div>
                    ))}
                  </div>
                )}

                {activeTab === 'calculators' && (
                  <div className="grid md:grid-cols-2 gap-6">
                    {calculators.map((calculator, index) => (
                      <motion.a
                        key={index}
                        href={calculator.url}
                        className="group block bg-white/80 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300"
                        variants={cardVariants}
                        whileHover="hover"
                      >
                        <div className="flex items-start gap-6">
                          <div className={`w-16 h-16 bg-gradient-to-br ${calculator.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                            <span className="text-2xl">{calculator.icon}</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">
                              {calculator.name}
                            </h3>
                            <p className="text-slate-600 mb-4">{calculator.description}</p>
                            <div className="flex items-center text-purple-600 font-semibold">
                              <span>Try Calculator</span>
                              <FontAwesomeIcon icon={faArrowRight} className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </div>
                      </motion.a>
                    ))}
                  </div>
                )}

                {activeTab === 'success' && (
                  <div className="grid md:grid-cols-2 gap-8">
                    {[
                      {
                        quote: `Moneko completely transformed my approach to finances. As a ${displayTargetGroup.toLowerCase()}, I was struggling with financial planning. Now I'm ahead of schedule on my ${displayFinancialGoal.toLowerCase()} goals!`,
                        author: 'Alex M.',
                        role: `${displayTargetGroup} • Moneko User`,
                        rating: 5,
                        gradient: 'from-purple-500 to-pink-500'
                      },
                      {
                        quote: `The personalized advice Moneko provides for ${displayTargetGroup.toLowerCase()} is incredible. It's like having a financial advisor who understands my unique situation perfectly.`,
                        author: 'Jamie S.',
                        role: `${displayTargetGroup} • Moneko User`,
                        rating: 5,
                        gradient: 'from-indigo-500 to-blue-500'
                      },
                      {
                        quote: `I never thought budgeting could be this intuitive. The AI insights helped me find savings I didn't even know existed. Highly recommend for anyone serious about ${displayFinancialGoal.toLowerCase()}.`,
                        author: 'Morgan L.',
                        role: `${displayTargetGroup} • Moneko User`,
                        rating: 5,
                        gradient: 'from-green-500 to-emerald-500'
                      },
                      {
                        quote: `The calculators and planning tools are game-changers. Finally, a platform that speaks to ${displayTargetGroup.toLowerCase()} and our specific financial challenges.`,
                        author: 'Casey R.',
                        role: `${displayTargetGroup} • Moneko User`,
                        rating: 5,
                        gradient: 'from-orange-500 to-red-500'
                      }
                    ].map((testimonial, index) => (
                      <motion.div
                        key={index}
                        className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-3xl p-8 shadow-lg"
                        variants={cardVariants}
                      >
                        <div className="flex items-center gap-2 mb-6">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <FontAwesomeIcon key={i} icon={faStar} className="text-yellow-500" />
                          ))}
                        </div>
                        <div className="relative mb-6">
                          <FontAwesomeIcon icon={faQuoteLeft} className="absolute -top-2 -left-2 text-3xl text-purple-200" />
                          <p className="text-slate-700 italic leading-relaxed pl-6">
                            "{testimonial.quote}"
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 bg-gradient-to-br ${testimonial.gradient} rounded-full flex items-center justify-center shadow-lg`}>
                            <FontAwesomeIcon icon={faHeart} className="text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{testimonial.author}</p>
                            <p className="text-sm text-slate-600">{testimonial.role}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* FAQ Section - Modern Accordion */}
        {pageData.faqs && pageData.faqs.length > 0 && (
          <motion.section 
            className="py-20 "
            variants={sectionVariants}
          >
            <div className="container mx-auto px-6">
              <div className="max-w-4xl mx-auto">
                <motion.div className="text-center mb-16">
                  <h2 className="text-4xl md:text-5xl font-bold mb-6">
                  <span className="bg-gradient-to-r from-purple-900 to-indigo-900 bg-clip-text text-transparent">
                  Frequently Asked Questions
                    </span>
                  </h2>
                  <p className="text-xl text-slate-600 leading-relaxed">
                    Get answers to common questions about budgeting for {displayTargetGroup.toLowerCase()}.
                  </p>
                </motion.div>

                <motion.div className="space-y-4" variants={staggerContainer}>
                  {pageData.faqs.map((faq, index) => (
                    <motion.div
                      key={index}
                      className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl overflow-hidden shadow-lg"
                      variants={cardVariants}
                    >
                      <details className="group">
                        <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                          <h3 className="text-lg font-bold text-slate-900 pr-4">{faq.question}</h3>
                          <FontAwesomeIcon 
                            icon={faArrowRight} 
                            className="text-purple-600 group-open:rotate-90 transition-transform duration-300" 
                          />
                        </summary>
                        <div className="px-6 pb-6">
                          <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                        </div>
                      </details>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Related Pages - Modern Grid */}
        {relatedPages.length > 0 && (
          <motion.section 
            className="py-20 "
            variants={sectionVariants}
          >
            <div className="container mx-auto px-6">
              <div className="max-w-6xl mx-auto">
                <motion.div className="text-center mb-16">
                  <h2 className="text-4xl md:text-5xl font-bold mb-6">
                    <span className="bg-gradient-to-r from-purple-900 to-indigo-900 bg-clip-text text-transparent">
                      Explore Related Solutions
                    </span>
                  </h2>
                  <p className="text-xl text-slate-600 leading-relaxed">
                    Discover personalized financial guidance for different goals and life stages.
                  </p>
                </motion.div>

                <motion.div 
                  className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                  variants={staggerContainer}
                >
                  {relatedPages.slice(0, 6).map((page, index) => {
                    const displayTitle = `${page.target_group.split('-').map(
                      word => word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')} ${page.financial_goal.split('-').map(
                      word => word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}`;
                    
                    const gradients = [
                      'from-purple-500 to-pink-500',
                      'from-indigo-500 to-blue-500',
                      'from-green-500 to-emerald-500',
                      'from-orange-500 to-red-500',
                      'from-blue-500 to-cyan-500',
                      'from-pink-500 to-rose-500'
                    ];

                    return (
                      <motion.a
                        key={page.slug}
                        href={`/budgeting-app/${page.slug}`}
                        className="group block bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
                        variants={cardVariants}
                        whileHover="hover"
                      >
                        <div className={`w-12 h-12 bg-gradient-to-br ${gradients[index % gradients.length]} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                          <FontAwesomeIcon icon={faBullseye} className="text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">
                          {displayTitle}
                        </h3>
                        <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                          Specialized budgeting guidance for this unique financial journey.
                        </p>
                        <div className="flex items-center text-purple-600 font-semibold text-sm">
                          <span>Explore Solution</span>
                          <FontAwesomeIcon icon={faArrowRight} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </motion.a>
                    );
                  })}
                </motion.div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Final CTA Section */}
        <motion.section 
          className="py-20 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 relative overflow-hidden"
          variants={sectionVariants}
        >
          {/* Background Effects */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20"></div>
            <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-xl animate-pulse delay-1000"></div>
          </div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center text-white">
              <motion.h2 
                className="text-4xl md:text-5xl font-bold mb-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                Ready to Transform Your Financial Future?
              </motion.h2>
              <motion.p 
                className="text-xl md:text-2xl mb-12 opacity-90 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                Join thousands of {displayTargetGroup.toLowerCase()} who are already achieving their {displayFinancialGoal.toLowerCase()} goals with Moneko's AI-powered platform.
              </motion.p>
              
              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <a 
                  href="/dashboard" 
                  className="group inline-flex items-center bg-white text-purple-600 font-bold py-4 px-8 rounded-full text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                >
                  <FontAwesomeIcon icon={faHandSparkles} className="mr-3 group-hover:animate-pulse" />
                  Start Free Today
                  <FontAwesomeIcon icon={faArrowRight} className="ml-3 group-hover:translate-x-1 transition-transform" />
                </a>
                
                <div className="text-white/80 text-sm">
                  ✨ No credit card required • Cancel anytime
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </AmbientHaloLayout>
  );
}

export default BudgetingAppPage;