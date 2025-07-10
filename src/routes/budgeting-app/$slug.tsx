import React from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { motion, Variants } from 'framer-motion';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faCheck, faCircleInfo, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { fetchSEOPageBySlug, fetchRelatedPages } from '@/services/pseo-service';
import type { SEOPageData, RelatedPage } from '@/types/seo-types';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import BreadCrumbsHeader from '@/components/ui/breadcrumbs';

// Define animation variants
const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
    },
  },
};

const sectionVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
    } 
  },
};

const cardVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
};

// Helper functions for text formatting
const capitalizeWords = (text: string): string => {
  return text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const highlightKeywords = (text: string, keywords: string): React.ReactNode[] => {
  if (!keywords) return [text];
  
  const keywordList = keywords.split(',').map(k => k.trim().toLowerCase());
  return text.split(' ').map((word, index) => {
    const cleanWord = word.toLowerCase().replace(/[.,!?;:]/g, '');
    if (keywordList.includes(cleanWord)) {
      return <strong key={index}>{word} </strong>;
    }
    return <React.Fragment key={index}>{word} </React.Fragment>;
  });
};

// Define route with loader and head
export const Route = createFileRoute('/budgeting-app/$slug')({
  loader: async ({ params }) => {
    try {
      // Fetch page data by slug
      const pageData = await fetchSEOPageBySlug(params.slug);
      console.log('pageData', pageData);
      if (!pageData) return notFound();
      
      // Fetch related pages
      const relatedPages = await fetchRelatedPages(params.slug);
      
      return { pageData, relatedPages };
    } catch (error) {
      console.error('Error loading SEO page data:', error);
      throw error;
    }
  },
  
  head: ({ loaderData }) => {
    // If no loader data, return basic metadata
    if (!loaderData) return { title: 'Loading...' };
    
    const { pageData } = loaderData as { pageData: SEOPageData, relatedPages: RelatedPage[] };
    const pageUrl = getCanonicalUrl(`/budgeting-app/${pageData.slug}`);
    
    // Create SEO metadata
    const meta = seo({
      title: pageData.title,
      description: pageData.meta_description,
      keywords: pageData.keywords,
      url: pageUrl,
      image: 'https://moneko.io/og-img.png',
    });
    
    // Create structured data
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
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mb-4"></div>
        <p className="text-lg text-slate-700 dark:text-slate-300">Loading personalized budgeting advice...</p>
      </div>
    </div>
  ),
  
  errorComponent: ({ error }) => {
    const is404 = (error as any)?.cause?.status === 404;
    
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-2xl">
          <h1 className="text-3xl font-bold text-red-600 mb-4">
            {is404 ? "Page Not Found" : "Something went wrong"}
          </h1>
          <p className="text-lg text-slate-700 dark:text-slate-300 mb-6">
            {is404
              ? "We couldn't find the budgeting advice page you were looking for."
              : "We encountered an error while loading this page. Please try again later."}
          </p>
          <a 
            href="/budgeting-app"
            className="inline-flex items-center text-purple-600 hover:text-purple-800 font-medium"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" aria-hidden="true" />
            Back to Budgeting Solutions
          </a>
        </div>
      </div>
    );
  }
});

function BudgetingAppPage() {
  const { pageData, relatedPages } = Route.useLoaderData() as { 
    pageData: SEOPageData; 
    relatedPages: RelatedPage[] 
  };
  
  // Format display text
  const displayTargetGroup = pageData.target_group.split('-').map(
    word => word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  const displayFinancialGoal = pageData.financial_goal.split('-').map(
    word => word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  return (
    <AmbientHaloLayout>
      <motion.div 
      className="container mx-auto px-4 py-12"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
     <BreadCrumbsHeader/>
      
      {/* Hero Section */}
      <motion.section 
        className="mt-4 bg-gradient-to-r from-purple-600/10 to-indigo-600/10 dark:from-purple-900/20 dark:to-indigo-900/20 backdrop-blur-xl rounded-3xl p-8 md:p-12 mb-12"
        variants={sectionVariants}
      >
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-slate-800 dark:text-white">
          Moneko: Smart Budgeting App for {displayTargetGroup}
        </h1>
        
        <p className="text-lg md:text-xl text-slate-700 dark:text-slate-300 mb-8 max-w-3xl">
          {pageData.intro_content || pageData.meta_description}
        </p>
        
        <a 
          href="/dashboard" 
          className="inline-flex items-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-8 rounded-full text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
        >
         Start your journey to financial freedom
          <FontAwesomeIcon icon={faArrowRight} className="ml-2" aria-hidden="true" />
        </a>
      </motion.section>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2">
          {/* Key Benefits Section */}
          <motion.section 
            className="mb-12"
            variants={sectionVariants}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-slate-800 dark:text-white">
              How Moneko Helps {displayTargetGroup} with {displayFinancialGoal}
            </h2>
            
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                {pageData.intro_content || `Our AI-powered budgeting app is specifically designed for ${displayTargetGroup.toLowerCase()} who want to achieve ${displayFinancialGoal.toLowerCase()}.`}
              </p>
              
              <p className="text-slate-700 dark:text-slate-300 mb-6">
                {pageData.feature_benefit_snippet || `Moneko delivers personalized financial education, smart budgeting tools, and AI-driven insights tailored specifically to ${displayTargetGroup.toLowerCase()}.`}
              </p>
              
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-3 mt-0.5">
                    <FontAwesomeIcon icon={faCheck} className="text-xs text-purple-600 dark:text-purple-400" aria-hidden="true" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300">
                    Personalized budget categories based on {displayTargetGroup.toLowerCase()} spending patterns
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-3 mt-0.5">
                    <FontAwesomeIcon icon={faCheck} className="text-xs text-purple-600 dark:text-purple-400" aria-hidden="true" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300">
                    AI-powered insights to help you identify savings opportunities
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-3 mt-0.5">
                    <FontAwesomeIcon icon={faCheck} className="text-xs text-purple-600 dark:text-purple-400" aria-hidden="true" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300">
                    Goal tracking specifically designed for {displayFinancialGoal.toLowerCase()}
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-3 mt-0.5">
                    <FontAwesomeIcon icon={faCheck} className="text-xs text-purple-600 dark:text-purple-400" aria-hidden="true" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300">
                    Community tips from other {displayTargetGroup.toLowerCase()} achieving similar goals
                  </span>
                </li>
              </ul>
            </div>
          </motion.section>
          
          {/* Interactive Calculator Section */}
          <motion.section 
            className="mb-12"
            variants={sectionVariants}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-slate-800 dark:text-white">
              Financial Calculators for {displayTargetGroup}
            </h2>
            
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
                Use our free financial calculators to plan your {displayFinancialGoal.toLowerCase()} strategy and make informed decisions about your money.
              </p>
              
              {/* Dynamic Calculator Grid based on financial goal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  const calculators = [];
                  
                  // Add calculators based on financial goal
                  if (pageData.financial_goal.includes('retirement') || pageData.financial_goal.includes('investing')) {
                    calculators.push(
                      {
                        name: 'Retirement Calculator',
                        description: 'Plan how much you need to save for retirement',
                        url: '/dashboard/calculators/retirement-calculator',
                        icon: '🏦'
                      },
                      {
                        name: 'Investment Calculator',
                        description: 'Calculate potential returns on your investments',
                        url: '/dashboard/calculators/investment-calculator',
                        icon: '📈'
                      }
                    );
                  }
                  
                  if (pageData.financial_goal.includes('home-buying') || pageData.financial_goal.includes('mortgage')) {
                    calculators.push(
                      {
                        name: 'Mortgage Calculator',
                        description: 'Calculate monthly payments and total costs',
                        url: '/dashboard/calculators/mortgage-calculator',
                        icon: '🏠'
                      }
                    );
                  }
                  
                  if (pageData.financial_goal.includes('saving') || pageData.financial_goal.includes('emergency') || pageData.financial_goal.includes('budgeting')) {
                    calculators.push(
                      {
                        name: 'Saving Goals Calculator',
                        description: 'Plan how to reach your savings targets',
                        url: '/dashboard/calculators/saving-goals-calculator',
                        icon: '🎯'
                      },
                      {
                        name: 'Compound Interest Calculator',
                        description: 'See how your money grows over time',
                        url: '/dashboard/calculators/compound-calculator',
                        icon: '💰'
                      }
                    );
                  }
                  
                  if (pageData.financial_goal.includes('debt') || pageData.target_group.includes('students') || pageData.target_group.includes('young-professionals')) {
                    calculators.push(
                      {
                        name: 'Auto Loan Calculator',
                        description: 'Calculate car loan payments and costs',
                        url: '/dashboard/calculators/auto-loan-calculator',
                        icon: '🚗'
                      }
                    );
                  }
                  
                  // Always include compound calculator as it's universally useful
                  if (!calculators.some(calc => calc.name.includes('Compound'))) {
                    calculators.push(
                      {
                        name: 'Compound Interest Calculator',
                        description: 'See how your money grows over time',
                        url: '/dashboard/calculators/compound-calculator',
                        icon: '💰'
                      }
                    );
                  }
                  
                  // Limit to 4 calculators max
                  return calculators.slice(0, 4).map((calculator, index) => (
                    <a 
                      key={index}
                      href={calculator.url}
                      className="block p-4 bg-slate-50 dark:bg-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group"
                    >
                      <div className="flex items-start">
                        <div className="text-2xl mr-3 group-hover:scale-110 transition-transform">
                          {calculator.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {calculator.name}
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {calculator.description}
                          </p>
                        </div>
                        <FontAwesomeIcon 
                          icon={faArrowRight} 
                          className="text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all text-sm mt-1" 
                        />
                      </div>
                    </a>
                  ));
                })()}
              </div>
              
              <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <p className="text-sm text-purple-700 dark:text-purple-300 text-center">
                  💡 <strong>Pro Tip:</strong> Use multiple calculators together to create a comprehensive financial plan for your {displayFinancialGoal.toLowerCase()} goals.
                </p>
              </div>
            </div>
          </motion.section>
          
          {/* FAQ Section */}
          <motion.section 
            className="mb-12"
            variants={sectionVariants}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-slate-800 dark:text-white">
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-4">
              {pageData.faqs?.map((faq, index: number) => (
                <div key={index} className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg">
                  <h4 className="font-bold mb-2">{faq.question}</h4>
                  <p className="text-slate-600 dark:text-slate-400">{faq.answer}</p>
                </div>
              ))}
            </div>
          </motion.section>
          
          {/* User Success Stories - Social proof */}
          <motion.section 
            className="mb-12"
            variants={sectionVariants}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-slate-800 dark:text-white">
              Success Stories from {displayTargetGroup}
            </h2>
            
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
              <div className="border-l-4 border-purple-500 pl-4 py-2 mb-6">
                <p className="text-slate-700 dark:text-slate-300 italic mb-2">
                  "Moneko completely changed how I approach my finances. As a {displayTargetGroup.toLowerCase()}, I was struggling with financial planning. Now I'm on track to meet my {displayFinancialGoal.toLowerCase()} goals months ahead of schedule."
                </p>
                <p className="text-slate-600 dark:text-slate-400 font-medium">- Alex, Moneko User</p>
              </div>
              
              <div className="border-l-4 border-indigo-500 pl-4 py-2">
                <p className="text-slate-700 dark:text-slate-300 italic mb-2">
                  "The personalized advice Moneko provides for {displayTargetGroup.toLowerCase()} is incredible. It's like having a financial advisor in my pocket who actually understands my unique situation."
                </p>
                <p className="text-slate-600 dark:text-slate-400 font-medium">- Jamie, Moneko User</p>
              </div>
            </div>
          </motion.section>
        </div>
        
        {/* Right Column - Sidebar */}
        <div>
          {/* App Download CTA */}
          <motion.div 
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl p-6 shadow-lg mb-8"
            variants={sectionVariants}
          >
            <h3 className="text-xl font-bold mb-4">Ready to Start?</h3>
            <p className="mb-6">
              Join thousands of {displayTargetGroup.toLowerCase()} who are achieving their {displayFinancialGoal.toLowerCase()} goals with Moneko.
            </p>
            
            <a 
              href="/download" 
              className="inline-block w-full bg-white text-purple-600 font-bold py-3 px-6 rounded-xl text-center shadow-md hover:shadow-lg transition-all duration-300"
            >
              Download Free
            </a>
            
            <div className="mt-4 text-center">
              <span className="text-xs opacity-80">Available for iOS & Android</span>
            </div>
          </motion.div>
          
          {/* Info Card */}
          <motion.div 
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg mb-8"
            variants={sectionVariants}
          >
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-4">
                <FontAwesomeIcon icon={faCircleInfo} className="text-purple-600 dark:text-purple-400" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                Why {displayTargetGroup} Choose Moneko
              </h3>
            </div>
            
            <ul className="space-y-2 mb-0">
              <li className="text-slate-700 dark:text-slate-300 flex items-center">
                <span className="mr-2 text-purple-600">•</span>
                <span>Personalized for your unique financial situation</span>
              </li>
              <li className="text-slate-700 dark:text-slate-300 flex items-center">
                <span className="mr-2 text-purple-600">•</span>
                <span>Specific tools for {displayFinancialGoal.toLowerCase()}</span>
              </li>
              <li className="text-slate-700 dark:text-slate-300 flex items-center">
                <span className="mr-2 text-purple-600">•</span>
                <span>Community of similar users sharing tips</span>
              </li>
              <li className="text-slate-700 dark:text-slate-300 flex items-center">
                <span className="mr-2 text-purple-600">•</span>
                <span>Expert financial advice tailored to your goals</span>
              </li>
            </ul>
          </motion.div>
          
          {/* Related Pages - Internal Linking */}
          {relatedPages.length > 0 && (
            <motion.div 
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg"
              variants={sectionVariants}
            >
              <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">
                Explore Related Solutions
              </h3>
              
              <ul className="space-y-3">
                {relatedPages.map(page => {
                  const displayTitle = `${page.target_group.split('-').map(
                    word => word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')} ${page.financial_goal.split('-').map(
                    word => word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}`;
                  
                  return (
                    <li key={page.slug}>
                      <a 
                        href={`/budgeting-app/${page.slug}`}
                        className="group flex items-center text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400"
                      >
                        <span className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <FontAwesomeIcon icon={faArrowRight} className="text-sm" aria-hidden="true" />
                        </span>
                        <span>{displayTitle}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
    </AmbientHaloLayout>
  );
}

export default BudgetingAppPage;
