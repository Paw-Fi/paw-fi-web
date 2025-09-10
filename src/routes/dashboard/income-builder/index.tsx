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
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="text-center">
            <motion.div
              className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shadow-lg"
              animate={{ 
                rotate: [0, 5, 0, -5, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <FontAwesomeIcon 
                icon={faHammer} 
                className="w-10 h-10 text-white"
              />
            </motion.div>
            
            <motion.h1 
              className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Passive Income Builder
            </motion.h1>
            
            <motion.p 
              className="text-lg text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              We're building something amazing! Our AI-powered passive income portfolio builder 
              is currently in development. Soon you'll be able to create high-interest portfolios 
              tailored to your financial goals.
            </motion.p>

            <motion.div
              className="inline-flex items-center px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded-full text-sm font-medium"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <FontAwesomeIcon icon={faHammer} className="w-4 h-4 mr-2" />
              Coming Soon
            </motion.div>
          </div>
        </div>
      </div>

      {/* What's Coming Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            What's Coming
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Our passive income builder will help you create portfolios focused on high-yield 
            investments, dividend stocks, and compound interest strategies.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {[
            {
              title: "AI Portfolio Recommendations",
              description: "Get personalized high-yield investment suggestions based on your risk tolerance and income goals.",
              icon: "🤖"
            },
            {
              title: "High-Interest Focus",
              description: "Discover dividend stocks, REITs, and bonds that generate consistent passive income.",
              icon: "💰"
            },
            {
              title: "Live on Interest Calculator",
              description: "Calculate exactly how much you need to invest to live entirely on passive income.",
              icon: "🏖️"
            },
            {
              title: "Automated Rebalancing",
              description: "Keep your portfolio optimized with intelligent rebalancing suggestions.",
              icon: "⚖️"
            }
          ].map((item, index) => (
            <motion.div
              key={index}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 + (index * 0.1) }}
            >
              <div className="text-3xl mb-4">{item.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {item.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Available Features Section */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Explore Other Features
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              While we're building the income builder, check out these powerful tools 
              to get started on your passive income journey.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-200 border-gray-200 dark:border-gray-700">
                  <Link to={feature.route} className="block h-full">
                    <CardContent className="p-6 h-full">
                      <div className="flex items-start gap-4 h-full">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FontAwesomeIcon 
                            icon={feature.icon} 
                            className="w-6 h-6 text-white" 
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {feature.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 leading-relaxed">
                            {feature.description}
                          </p>
                          <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                            Explore Now
                            <FontAwesomeIcon 
                              icon={faArrowRight} 
                              className="ml-2 w-3 h-3 transform transition-transform group-hover:translate-x-1" 
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Stay Updated Section */}
      <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Stay Updated
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We'll notify you as soon as the Passive Income Builder is ready. In the meantime, 
              explore our other features to start building your financial knowledge.
            </p>
            <Link to="/dashboard">
              <button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 shadow-sm">
                Explore Dashboard
                <FontAwesomeIcon icon={faArrowRight} className="ml-2 w-4 h-4" />
              </button>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
