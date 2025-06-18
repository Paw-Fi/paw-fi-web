import { MortgageCalculator } from '@/components/calculators/mortgage/mortgage';
import { MortgageCalculatorSEOContent } from '@/components/calculators/mortgage/mortgage-seo-contents';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { seo } from '@/utils/seo';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5 } }, // Removed 'ease' property
};

export const Route = createFileRoute('/calculators/mortgage-calculator')({
  component: MortgageCalculatorPage,
  head: () => {
    const pageUrl = 'https://moneko.io/calculators/mortgage-calculator';
    const meta = seo({
      title: 'Mortgage Calculator | Moneko',
      description: 'Estimate your monthly mortgage payments, including principal, interest, taxes, and insurance (PITI). Analyze your home loan with Moneko.',
      keywords: 'mortgage calculator, home loan calculator, PITI calculator, amortization schedule, Moneko',
      image: 'https://moneko.io/og-images/mortgage-calculator.png', // Updated OG image path
      url: pageUrl,
    });
    
    // Add structured data for the mortgage calculator
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "FinancialProduct",
      "name": "Mortgage Calculator",
      "description": "Interactive calculator to estimate monthly mortgage payments and view amortization schedules",
      "url": pageUrl,
      "provider": {
        "@type": "Organization",
        "name": "Moneko",
        "url": "https://moneko.io/"
      },
      "category": "Financial Education Tool"
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
function MortgageCalculatorPage() {
  // const navigate = useNavigate(); // useNavigate might not be needed if not used
  return (
    <AmbientHaloLayout>
      <motion.div
        className="container mx-auto px-4 py-12 md:py-16 lg:py-20 min-h-[calc(100vh-var(--header-height))]"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <motion.h1 
          variants={itemVariants}
          className="mb-6 md:mb-8 text-4xl md:text-5xl font-bold tracking-tight text-center bg-gradient-to-br from-purple-600 to-indigo-700 dark:from-purple-500 dark:to-indigo-600 bg-clip-text text-transparent"
        >
          Mortgage Calculator
        </motion.h1>
        <motion.p 
          variants={itemVariants} 
          className="mb-8 md:mb-10 text-base md:text-lg text-slate-700 dark:text-slate-300 text-center max-w-2xl mx-auto"
        >
          Estimate your monthly mortgage payments, including principal, interest, taxes, and insurance (PITI). Analyze your home loan details and visualize your payment schedule.
        </motion.p>
        <motion.div variants={itemVariants} className="max-w-5xl mx-auto">
          <MortgageCalculator />
        </motion.div>
        <motion.div variants={itemVariants} className="mt-12 md:mt-16">
          <MortgageCalculatorSEOContent />
        </motion.div>
      </motion.div>
    </AmbientHaloLayout>
  );
}
