import { createFileRoute, Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHammer, 
  faArrowRight,
  faBullseye,
  faCalculator,
  faGraduationCap,
  faRocket
} from '@fortawesome/free-solid-svg-icons';
import { Card, CardContent } from '@/components/ui/card';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';

export const Route = createFileRoute('/dashboard/income-builder/')({
  component: IncomeBuilderPage,
  head: () => {
    const canonicalUrl = getCanonicalUrl('/dashboard/income-builder/');
    const title = 'Passive Income Portfolio Builder - Coming Soon | Moneko';
    const description = 'Build high-interest passive income portfolios with AI guidance. Our income builder is currently in development. Explore other features while you wait.';
    const keywords = 'passive income builder, portfolio builder, high-interest investments, income investing, dividend portfolio, AI investing';

    const meta = seo({
      title,
      description,
      keywords,
      image: "https://moneko.io/og-img.png",
      url: canonicalUrl,
    });

    return {
      meta,
      link: [
        {
          rel: "canonical",
          href: canonicalUrl,
        },
      ],
    };
  },
});

function IncomeBuilderPage() {
  const features = [
    {
      title: 'Goal Tracker with AI',
      description: 'Set and track your passive income goals with intelligent insights and milestone planning.',
      icon: faBullseye,
      route: '/dashboard/tracker',
      available: true
    },
    {
      title: 'Financial Calculators',
      description: 'Use our compound interest, retirement, and investment calculators to plan your portfolio.',
      icon: faCalculator,
      route: '/calculators',
      available: true
    },
    {
      title: 'Learning Platform',
      description: 'Master passive income strategies through our comprehensive financial education courses.',
      icon: faGraduationCap,
      route: '/dashboard/learning',
      available: true
    },
    {
      title: 'AI Financial Coach',
      description: 'Get personalized advice on building passive income streams from our AI advisor.',
      icon: faRocket,
      route: '/dashboard',
      available: true
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with Apple-inspired clean design */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center">
            <motion.div
              className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-orange-500 flex items-center justify-center"
              animate={{ 
                rotate: [0, 2, 0, -2, 0]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <FontAwesomeIcon 
                icon={faHammer} 
                className="w-8 h-8 text-white"
              />
            </motion.div>
            
            <motion.h1 
              className="text-4xl font-semibold text-gray-900 dark:text-white mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Passive Income Builder
            </motion.h1>
            
            <motion.p 
              className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              We're building something amazing! Our AI-powered passive income portfolio builder 
              is currently in development. Soon you'll be able to create high-interest portfolios 
              tailored to your financial goals.
            </motion.p>

            <motion.div
              className="inline-flex items-center px-6 py-3 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded-2xl font-medium"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <FontAwesomeIcon icon={faHammer} className="w-4 h-4 mr-3" />
              Coming Soon
            </motion.div>
          </div>
        </div>
      </div>

      {/* What's Coming Section with clean design */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-6">
            What's Coming
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Our passive income builder will help you create portfolios focused on high-yield 
            investments, dividend stocks, and compound interest strategies.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              title: "AI Portfolio Recommendations",
              description: "Get personalized high-yield investment suggestions based on your risk tolerance and income goals."
            },
            {
              title: "High-Interest Focus",
              description: "Discover dividend stocks, REITs, and bonds that generate consistent passive income."
            },
            {
              title: "Live on Interest Calculator",
              description: "Calculate exactly how much you need to invest to live entirely on passive income."
            },
            {
              title: "Automated Rebalancing",
              description: "Keep your portfolio optimized with intelligent rebalancing suggestions."
            }
          ].map((item, index) => (
            <motion.div
              key={index}
              className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-8 rounded-3xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 + (index * 0.1) }}
            >
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {item.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
