import CompoundCalculator from '@/components/calculators/compound/compound-calculator';
import { CompoundCalculatorSEOContent } from '@/components/calculators/compound/compound-seo-contents';
import { createFileRoute } from '@tanstack/react-router';
import { motion, Variants } from 'framer-motion';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';
import { seo } from '@/utils/seo';
import { useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/calculators/compound-calculator')({
  component: CompoundCalculatorPage,
  head: () => {
    const pageUrl = 'https://moneko.io/calculators/compound-calculator';
    const meta = seo({
      title: 'Compound Interest Calculator | Moneko',
      description: 'Visualize the power of compound interest. Calculate how your investments can grow over time with our compound interest calculator.',
      keywords: 'compound interest calculator, investment growth, financial planning, compounding, Moneko',
      image: 'https://paw-fi.app/og-img.png',
      url: pageUrl,
    });
    
    // Add structured data for the calculator
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "FinancialProduct",
      "name": "Compound Interest Calculator",
      "description": "Interactive calculator to visualize how investments grow with compound interest over time",
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

const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

function CompoundCalculatorPage() {
  const navigate = useNavigate();
  // const prefersReducedMotion = usePrefersReducedMotion(); // If needed for specific animation control

  return (
    <AmbientHaloLayout>
      <motion.div
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1 
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent"
          variants={itemVariants}
        >
          Compound Interest Calculator
        </motion.h1>
        <motion.p 
          className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-700 dark:text-gray-300 mb-10 md:mb-12"
          variants={itemVariants}
        >
          Discover the power of compound interest and see how your investments can grow over time. Input your details below to get started.
        </motion.p>

        {/* Calculator component will be wrapped in its own styled motion.div later if needed */}
        <motion.div variants={itemVariants}>
          <CompoundCalculator />
        </motion.div>

        {/* SEO Content - consider styling if it's more than just text */}
        <motion.div variants={itemVariants} className="mt-12 md:mt-16">
          <CompoundCalculatorSEOContent />
        </motion.div>
      </motion.div>
    </AmbientHaloLayout>
  );
}
