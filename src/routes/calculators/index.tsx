import { createFileRoute, Link } from '@tanstack/react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { 
  faChartLine, 
  faHome, 
  faMoneyBillWave,
  faPercent,
  faPiggyBank,
  faCreditCard,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import { motion, Variants } from 'framer-motion';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { HomeHeader } from '@/components/index/header';

export const Route = createFileRoute('/calculators/')({
  component: CalculatorsPage,
  head: () => {
    const pageUrl = getCanonicalUrl('/calculators');
    const meta = seo({
      title: 'Financial Calculators - Investment & Planning Tools | Moneko',
      description: 'Calculate compound interest, mortgage payments, investment returns, retirement savings, and more with our comprehensive suite of free financial planning calculators.',
      keywords: 'financial calculators, compound interest calculator, mortgage calculator, retirement calculator, investment calculator, auto loan calculator, savings goal calculator, budgeting tools, financial planning',
      image: 'https://moneko.io/og-img.png',
      url: pageUrl,
    });
    
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Financial Calculators",
      "description": "Interactive financial calculators to help with money management and financial planning",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Compound Interest Calculator",
          "url": getCanonicalUrl('/calculators/compound-calculator')
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Mortgage Calculator",
          "url": getCanonicalUrl('/calculators/mortgage-calculator')
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Investment Calculator",
          "url": getCanonicalUrl('/calculators/investment-calculator')
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Auto Loan Calculator",
          "url": getCanonicalUrl('/calculators/auto-loan-calculator')
        },
        {
          "@type": "ListItem",
          "position": 5,
          "name": "Retirement Calculator",
          "url": getCanonicalUrl('/calculators/retirement-calculator')
        },
        {
          "@type": "ListItem",
          "position": 6,
          "name": "Savings Goal Calculator",
          "url": getCanonicalUrl('/calculators/saving-goals-calculator')
        }
      ]
    };
    
    return {
      meta,
      link: [
        {
          rel: 'canonical',
          href: pageUrl
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

interface CalculatorCardData {
  title: string;
  description: string;
  icon: IconDefinition;
  path: string;
  available: boolean;
}

const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.25,
    },
  },
};

const gridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1.0], // Smooth cubic bezier
    },
  },
};

function CalculatorsPage() {
  const calculators: CalculatorCardData[] = [
    {
      title: 'Compound Interest Calculator',
      description: 'Calculate how compound interest grows your investments over time with monthly contributions and annual returns.',
      icon: faChartLine,
      path: '/calculators/compound-calculator',
      available: true
    },
    {
      title: 'Mortgage Payment Calculator',
      description: 'Estimate monthly mortgage payments, total interest, and loan amortization schedules for home purchases.',
      icon: faHome,
      path: '/calculators/mortgage-calculator',
      available: true
    },
    {
      title: 'Savings Goal Calculator',
      description: 'Calculate how much to save monthly to reach your financial goals by your target date.',
      icon: faPiggyBank,
      path: '/calculators/saving-goals-calculator',
      available: true
    },
    {
      title: 'Investment Return Calculator',
      description: 'Project potential investment returns and analyze different portfolio scenarios with historical data.',
      icon: faPercent,
      path: '/calculators/investment-calculator',
      available: true
    },
    {
      title: 'Auto Loan Calculator',
      description: 'Calculate monthly car payments, total interest costs, and compare different loan terms and rates.',
      icon: faMoneyBillWave,
      path: '/calculators/auto-loan-calculator',
      available: true
    },
    {
      title: 'Retirement Planning Calculator',
      description: 'Plan your retirement savings strategy with 401(k), IRA, and Social Security projections.',
      icon: faCreditCard,
      path: '/calculators/retirement-calculator',
      available: true
    },
  ];

  return (
    <AmbientHaloLayout>
      <HomeHeader/>
      <motion.div 
      className="container mx-auto px-4 py-6"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="text-center mb-12 md:mb-16">
        <motion.h1 
          className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent-pink to-accent-indigo dark:from-dark-primary dark:via-dark-accent-pink dark:to-dark-accent-indigo text-transparent bg-clip-text"
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Free Financial Planning Calculators
        </motion.h1>
        <motion.p 
          className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Plan your financial future with powerful calculators for budgeting, investing, mortgage planning, and retirement savings. Get instant results to make informed money decisions.
        </motion.p>
      </div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10"
        variants={gridVariants}
      >
        {calculators.map((calculator) => (
          <motion.div
            key={calculator.title}
            variants={cardVariants}
            className="group relative flex flex-col"
          >
            {calculator.available ? (
              <Link 
                to={calculator.path} 
                className="block h-full bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:border-white/30 dark:hover:border-gray-600/70 hover:-translate-y-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:focus-visible:ring-dark-primary focus-visible:ring-opacity-75"
                aria-label={`Try the ${calculator.title} calculator`}
              >
                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-start mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary dark:from-dark-primary dark:to-dark-secondary rounded-xl flex items-center justify-center text-white shadow-md group-hover:shadow-primary/30 dark:group-hover:shadow-dark-primary/30 transition-all duration-300 mr-4 shrink-0">
                      <FontAwesomeIcon icon={calculator.icon} size="lg" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground dark:text-dark-foreground group-hover:text-primary dark:group-hover:text-dark-primary transition-colors duration-300 leading-tight">
                      {calculator.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex-grow leading-relaxed mb-5">
                    {calculator.description}
                  </p>
                  <div className="mt-auto pt-2">
                    <span className="inline-flex items-center text-sm font-semibold text-primary dark:text-dark-primary group-hover:text-secondary dark:group-hover:text-dark-secondary transition-colors duration-300">
                      Try Calculator
                      <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="h-full p-6 bg-gray-100/40 dark:bg-gray-800/40 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/30 rounded-2xl shadow-md flex flex-col opacity-70">
                <div className="flex items-start mb-4">
                  <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 mr-4 shrink-0">
                    <FontAwesomeIcon icon={calculator.icon} size="lg" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-500 dark:text-gray-400 leading-tight">
                    {calculator.title}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex-grow leading-relaxed mb-5">
                  {calculator.description}
                </p>
                <div className="mt-auto pt-2">
                  <span className="inline-flex items-center text-sm font-medium text-gray-400 dark:text-gray-500">
                    Coming Soon
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
    </AmbientHaloLayout>
  );
}
