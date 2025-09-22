import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { USFinancialFAQSection } from '@/components/homepage/us-financial-faq-section';

export const Route = createFileRoute('/help/$region')({
  component: USHelpCenter,
  loader: async ({ params }) => {
    const { region } = params;
    
    // Only allow 'us' region for now
    if (region !== 'us') {
      throw notFound();
    }
    
    return { region };
  },
  meta: () => [
    {
      title: 'US Financial Help Center - Moneko | American Financial Guidance',
      description: 'Comprehensive financial help for the United States. US-specific FAQs, calculators, and guidance tailored to American regulations and opportunities.'
    }
  ]
});

// Apple-inspired animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94], // Apple-like easing
    },
  },
};

const usFinancialTools = [
  {
    title: '401(k) & IRA Planning',
    description: 'Maximize your retirement accounts with our expert guidance',
    path: '/calculators/retirement-calculator',
    bgColor: 'bg-blue-50/50 dark:bg-blue-950/30'
  },
  {
    title: 'Homebuying Guide',
    description: 'FHA, VA loans, and first-time buyer programs',
    path: '/calculators/mortgage-calculator',
    bgColor: 'bg-green-50/50 dark:bg-green-950/30'
  },
  {
    title: 'Tax Planning',
    description: 'Federal and state tax optimization strategies',
    path: '/calculators',
    bgColor: 'bg-purple-50/50 dark:bg-purple-950/30'
  },
  {
    title: 'Investment Strategy',
    description: 'Build wealth with index funds and diversified portfolios',
    path: '/calculators/investment-calculator',
    bgColor: 'bg-orange-50/50 dark:bg-orange-950/30'
  },
  {
    title: 'Debt Management',
    description: 'Student loans, credit cards, and debt payoff strategies',
    path: '/calculators/debt-payoff-calculator',
    bgColor: 'bg-amber-50/50 dark:bg-amber-950/30'
  },
  {
    title: 'Emergency Fund',
    description: 'Build financial security with smart savings strategies',
    path: '/calculators/savings-calculator',
    bgColor: 'bg-indigo-50/50 dark:bg-indigo-950/30'
  }
];

const usFinancialChallenges = [
  'Rising healthcare costs and insurance premiums',
  'Student loan debt management and forgiveness programs',
  'Social Security benefits optimization',
  'State and federal tax complexity',
  'Housing affordability and mortgage rates',
  'Retirement savings adequacy (401k, IRA limits)',
  'Credit score improvement and debt management',
  'Financial planning for economic uncertainty'
];

const officialResources = [
  { 
    name: 'IRS - Internal Revenue Service', 
    description: 'Official tax guidance and forms',
    url: 'https://www.irs.gov/'
  },
  { 
    name: 'SEC - Securities and Exchange Commission', 
    description: 'Investment and securities regulation',
    url: 'https://www.sec.gov/'
  },
  { 
    name: 'Consumer Financial Protection Bureau', 
    description: 'Consumer financial rights and protection',
    url: 'https://www.consumerfinance.gov/'
  },
  { 
    name: 'FDIC - Federal Deposit Insurance Corporation', 
    description: 'Bank safety and deposit insurance',
    url: 'https://www.fdic.gov/'
  },
  { 
    name: 'Social Security Administration', 
    description: 'Retirement and disability benefits',
    url: 'https://www.ssa.gov/'
  },
  { 
    name: 'Department of Labor', 
    description: 'Workplace retirement plans and benefits',
    url: 'https://www.dol.gov/'
  }
];

function USHelpCenter() {
  const { region } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-0 sm:px-8 lg:px-8 py-20">
        
        {/* Breadcrumb */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-primary p-0">
            <Link to="/help" className="text-sm">
              ← Back to Help Center
            </Link>
          </Button>
        </motion.div>

        {/* Header */}
        <motion.div
          className="text-center mb-20"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div variants={itemVariants}>
            <Badge 
              variant="secondary" 
              className="mb-6 bg-primary/10 text-primary px-6 py-2 text-sm font-medium rounded-full"
            >
              🇺🇸 United States Financial Center
            </Badge>
          </motion.div>
          
          <motion.h1
            className="text-foreground mb-6 text-4xl leading-tight font-light sm:text-5xl md:text-6xl"
            variants={itemVariants}
          >
            US Financial Help
          </motion.h1>
          
          <motion.p
            className="text-muted-foreground mb-8 text-lg leading-relaxed sm:text-xl max-w-3xl mx-auto"
            variants={itemVariants}
          >
            Comprehensive financial guidance tailored to United States regulations, tax laws, and investment opportunities. 
            All information is current for 2024 tax year and USD currency.
          </motion.p>

          {/* Quick Stats */}
          <motion.div 
            className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground"
            variants={itemVariants}
          >
            <div className="flex flex-col items-center">
              <div className="text-2xl font-light text-foreground mb-1">50+</div>
              <div>US Financial FAQs</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl font-light text-foreground mb-1">USD</div>
              <div>Currency</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl font-light text-foreground mb-1">2024</div>
              <div>Tax Year</div>
            </div>
          </motion.div>
        </motion.div>

        {/* US Financial Tools & Guides */}
        <motion.div
          className="mb-20"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2
            className="text-2xl font-medium text-foreground mb-8 text-center"
            variants={itemVariants}
          >
            US Financial Tools & Guides
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {usFinancialTools.map((tool, index) => (
              <motion.div
                key={tool.title}
                variants={itemVariants}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Button asChild variant="ghost" className="h-auto p-0 w-full">
                  <Link to={tool.path}>
                    <Card className="bg-background rounded-3xl p-8 shadow-sm hover:shadow-md transition-all duration-200 h-full w-full">
                      <CardContent className="p-0">
                        <div className={`${tool.bgColor} rounded-2xl p-6 mb-6 text-center`}>
                          <div className="text-lg font-medium text-foreground">
                            {tool.title}
                          </div>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {tool.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Common US Financial Challenges */}
        <motion.div
          className="mb-20"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2
            className="text-2xl font-medium text-foreground mb-8 text-center"
            variants={itemVariants}
          >
            Common US Financial Challenges
          </motion.h2>
          
          <Card className="bg-background rounded-3xl p-8 shadow-sm max-w-4xl mx-auto">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {usFinancialChallenges.map((challenge, index) => (
                  <motion.div 
                    key={index}
                    variants={itemVariants}
                    className="flex items-start p-4 rounded-2xl bg-subtle-background/50"
                  >
                    <div className="w-2 h-2 bg-primary rounded-full mr-4 mt-2 flex-shrink-0"></div>
                    <span className="text-foreground font-medium">{challenge}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Official US Financial Resources */}
        <motion.div
          className="mb-20"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2
            className="text-2xl font-medium text-foreground mb-8 text-center"
            variants={itemVariants}
          >
            Official US Financial Resources
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {officialResources.map((resource, index) => (
              <motion.div
                key={resource.name}
                variants={itemVariants}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.2 }}
              >
                <Button asChild variant="ghost" className="h-auto p-0 w-full">
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Card className="bg-background rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200 w-full">
                      <CardContent className="p-0">
                        <div className="flex items-center justify-between">
                          <div className="text-left">
                            <h3 className="font-medium text-foreground mb-1">
                              {resource.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {resource.description}
                            </p>
                          </div>
                          <div className="text-muted-foreground ml-4">
                            ↗
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Contact US Support */}
        <motion.div
          className="mb-20"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div 
            variants={itemVariants}
            className="bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 rounded-3xl p-12 text-center max-w-4xl mx-auto"
          >
            <h3 className="text-3xl font-light text-foreground mb-6">
              Need Personalized US Financial Advice?
            </h3>
            <p className="text-muted-foreground mb-8 text-lg max-w-2xl mx-auto leading-relaxed">
              Get AI-powered financial coaching tailored to US regulations, tax laws, and investment opportunities
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-medium rounded-full"
              >
                <Link to="/dashboard">
                  Start Free US Coaching
                </Link>
              </Button>
              <Button 
                asChild
                variant="outline" 
                size="lg"
                className="px-8 py-3 text-lg font-medium rounded-full border-primary/20"
              >
                <a href="mailto:support@moneko.io?subject=US Financial Question">
                  Email US Support
                </a>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* US Financial FAQ Section */}
      <USFinancialFAQSection 
        maxFAQs={25}
        showCategoryFilter={true}
        showStructuredData={true}
      />
    </div>
  );
}