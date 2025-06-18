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
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';

export const Route = createFileRoute('/calculators/')({
  component: CalculatorsPage,
  head: () => {
    const pageUrl = 'https://moneko.io/calculators';
    const meta = seo({
      title: 'Financial Calculators | Moneko',
      description: 'Explore our suite of financial calculators to help you make informed decisions about your money, investments, loans, and more.',
      keywords: 'financial calculators, investment, mortgage, savings, auto loan, retirement, compound interest, loan amortization, moneko, moneko',
      image: 'https://paw-fi.app/og-img.png', // Ensure this OG image is updated for the new design if needed
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
          "url": "https://moneko.io/calculators/compound-calculator"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Mortgage Calculator",
          "url": "https://moneko.io/calculators/mortgage-calculator"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Investment Calculator",
          "url": "https://moneko.io/calculators/investment-calculator"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "Auto Loan Calculator",
          "url": "https://moneko.io/calculators/auto-loan-calculator"
        },
        {
          "@type": "ListItem",
          "position": 5,
          "name": "Retirement Calculator",
          "url": "https://moneko.io/calculators/retirement-calculator"
        },
        {
          "@type": "ListItem",
          "position": 6,
          "name": "Savings Goal Calculator",
          "url": "https://moneko.io/calculators/saving-goals-calculator"
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
      duration: 0.5,
    },
  },
};

const gridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1.0], // Smooth cubic bezier
    },
  },
};

function CalculatorsPage() {
  const calculators: CalculatorCardData[] = [
    {
      title: 'Compound Interest',
      description: 'See your investments snowball with the magic of compound interest.',
      icon: faChartLine,
      path: '/calculators/compound-calculator',
      available: true
    },
    {
      title: 'Mortgage',
      description: 'Estimate monthly payments and understand your home loan better.',
      icon: faHome,
      path: '/calculators/mortgage-calculator',
      available: true
    },
    {
      title: 'Savings Goal',
      description: 'Chart a course to your financial dreams, one saving step at a time.',
      icon: faPiggyBank,
      path: '/calculators/saving-goals-calculator',
      available: true
    },
    {
      title: 'Investment Growth',
      description: 'Project potential returns and explore different investment scenarios.',
      icon: faPercent, // Could use faSeedling or faChartPie for more visual variety if desired
      path: '/calculators/investment-calculator',
      available: true
    },
    {
      title: 'Auto Loan',
      description: 'Calculate car loan payments and total costs, including taxes and fees.',
      icon: faMoneyBillWave, // Could use faCar
      path: '/calculators/auto-loan-calculator',
      available: true
    },
    {
      title: 'Retirement Planner',
      description: 'Map out your golden years with retirement savings and withdrawal estimates.',
      icon: faCreditCard, // Could use faUmbrellaBeach or faMountainSun
      path: '/calculators/retirement-calculator',
      available: true
    },
  ];

  return (
    <AmbientHaloLayout>

    <motion.div 
      className="container mx-auto px-4 py-12 md:py-20"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="text-center mb-12 md:mb-16">
        <motion.h1 
          className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400 text-transparent bg-clip-text"
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Financial Calculators
        </motion.h1>
        <motion.p 
          className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Empower your financial journey. Explore our suite of intuitive calculators to make informed decisions about your money, investments, and future plans.
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
                className="block h-full bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:border-white/30 dark:hover:border-slate-600/70 hover:-translate-y-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-opacity-75"
                aria-label={`Try the ${calculator.title} calculator`}
              >
                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-start mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md group-hover:shadow-purple-500/30 transition-all duration-300 mr-4 shrink-0">
                      <FontAwesomeIcon icon={calculator.icon} size="lg" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300 leading-tight">
                      {calculator.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex-grow leading-relaxed mb-5">
                    {calculator.description}
                  </p>
                  <div className="mt-auto pt-2">
                    <span className="inline-flex items-center text-sm font-semibold text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors duration-300">
                      Try Calculator
                      <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="h-full p-6 bg-slate-100/40 dark:bg-slate-800/40 backdrop-blur-lg border border-slate-200/50 dark:border-slate-700/30 rounded-2xl shadow-md flex flex-col opacity-70">
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
