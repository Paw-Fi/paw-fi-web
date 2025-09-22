import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { USFinancialFAQSection } from '@/components/homepage/us-financial-faq-section';

export const Route = createFileRoute('/help/')({
  component: HelpCenter,
  meta: () => [
    {
      title: 'Help Center - Moneko | US Financial Guidance & Support',
      description: 'Get help with Moneko financial platform. US-focused financial guidance, FAQs, calculators, and personalized support for American users.'
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

const helpCategories = [
  {
    id: 'us-financial-guidance',
    title: 'US Financial Guidance',
    description: 'Comprehensive financial advice tailored to US regulations, tax laws, and opportunities',
    bgColor: 'bg-blue-50/50 dark:bg-blue-950/30',
    articles: 24,
    path: '/help/us-guidance'
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of using Moneko for budgeting, investing, and financial planning',
    bgColor: 'bg-green-50/50 dark:bg-green-950/30',
    articles: 18,
    path: '/dashboard'
  },
  {
    id: 'calculators',
    title: 'Financial Calculators',
    description: 'How to use our mortgage, investment, retirement, and other financial calculators',
    bgColor: 'bg-purple-50/50 dark:bg-purple-950/30',
    articles: 12,
    path: '/calculators'
  },
  {
    id: 'learning',
    title: 'Learning Platform',
    description: 'Navigate courses, track progress, and maximize your financial education',
    bgColor: 'bg-orange-50/50 dark:bg-orange-950/30',
    articles: 15,
    path: '/dashboard/learning'
  },
  {
    id: 'account-support',
    title: 'Account & Support',
    description: 'Manage your account, billing, security settings, and get technical support',
    bgColor: 'bg-indigo-50/50 dark:bg-indigo-950/30',
    articles: 10,
    path: '/dashboard/settings'
  }
];

const quickActions = [
  {
    title: 'Start Free Coaching',
    description: 'Get personalized AI financial advice',
    path: '/dashboard',
    bgColor: 'bg-green-50/50 dark:bg-green-950/30'
  },
  {
    title: 'Browse Calculators',
    description: 'Use our financial planning tools',
    path: '/calculators',
    bgColor: 'bg-blue-50/50 dark:bg-blue-950/30'
  },
  {
    title: 'Take Learning Courses',
    description: 'Improve your financial knowledge',
    path: '/dashboard/learning',
    bgColor: 'bg-purple-50/50 dark:bg-purple-950/30'
  }
];

const popularTopics = [
  'How to maximize your 401(k) employer match',
  'Roth vs Traditional IRA: Which should I choose?',
  'Setting up automated savings with high-yield accounts',
  'First-time homebuyer programs and FHA loans',
  'Should I pay off student loans or invest?',
  'Emergency fund: How much should I save?',
  'Setting up your first budget with Moneko',
  'Using the compound interest calculator effectively',
  'Understanding your financial health score'
];

function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Real search functionality would go here
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-0 sm:px-8 lg:px-8 py-20">
        
        {/* Header Section */}
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
              🇺🇸 US Financial Help Center
            </Badge>
          </motion.div>
          
          <motion.h1
            className="text-foreground mb-6 text-4xl leading-tight font-light sm:text-5xl md:text-6xl"
            variants={itemVariants}
          >
            How can we help you today?
          </motion.h1>
          
          <motion.p
            className="text-muted-foreground mb-12 text-lg leading-relaxed sm:text-xl max-w-3xl mx-auto"
            variants={itemVariants}
          >
            Get comprehensive US financial guidance tailored to American regulations and opportunities
          </motion.p>

          {/* Search Bar */}
          <motion.form 
            onSubmit={handleSearch} 
            className="max-w-2xl mx-auto"
            variants={itemVariants}
          >
            <div className="relative">
              <Input
                type="text"
                placeholder="Search for help articles, calculators, or FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-6 pr-32 py-6 text-lg rounded-full bg-subtle-background border-0 focus:ring-2 focus:ring-primary transition-all duration-200"
              />
              <Button 
                type="submit"
                className="absolute right-2 top-2 bottom-2 px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Search
              </Button>
            </div>
          </motion.form>
        </motion.div>

        {/* Quick Actions */}
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
            Quick Actions
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                variants={itemVariants}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Button asChild variant="ghost" className="h-auto p-0 w-full">
                  <Link to={action.path}>
                    <Card className={`${action.bgColor} rounded-3xl p-8 shadow-sm hover:shadow-md transition-all duration-200 w-full`}>
                      <CardContent className="p-0 text-center">
                        <h3 className="font-medium text-foreground text-lg mb-2">
                          {action.title}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          {action.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Help Categories */}
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
            Browse Help Categories
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {helpCategories.map((category) => (
              <motion.div
                key={category.id}
                variants={itemVariants}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Button asChild variant="ghost" className="h-auto p-0 w-full">
                  <Link to={category.path}>
                    <Card className="bg-background rounded-3xl p-8 shadow-sm hover:shadow-md transition-all duration-200 h-full w-full">
                      <CardContent className="p-0">
                        <div className={`${category.bgColor} rounded-2xl p-6 mb-6`}>
                          <div className="text-2xl font-light text-foreground mb-2">
                            {category.articles}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Articles
                          </div>
                        </div>
                        
                        <h3 className="font-medium text-foreground text-lg mb-3">
                          {category.title}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {category.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Popular Topics */}
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
            Popular Help Topics
          </motion.h2>
          
          <Card className="bg-background rounded-3xl p-8 shadow-sm max-w-4xl mx-auto">
            <CardContent className="p-0">
              <div className="space-y-4">
                {popularTopics.map((topic, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start p-4 rounded-2xl hover:bg-subtle-background/50 transition-all duration-200"
                    >
                      <span className="text-foreground text-left">
                        {topic}
                      </span>
                    </Button>
                    {index < popularTopics.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contact Support CTA */}
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
              Still Need Help?
            </h3>
            <p className="text-muted-foreground mb-8 text-lg max-w-2xl mx-auto leading-relaxed">
              Our support team is here to help you succeed on your financial journey
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-medium rounded-full"
              >
                <Link to="/dashboard">
                  Try AI Chat Support
                </Link>
              </Button>
              <Button 
                asChild
                variant="outline" 
                size="lg"
                className="px-8 py-3 text-lg font-medium rounded-full border-primary/20"
              >
                <a href="mailto:support@moneko.io">
                  Email Support
                </a>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* US Financial FAQ Section */}
      <USFinancialFAQSection 
        maxFAQs={12}
        showCategoryFilter={true}
        showStructuredData={true}
      />
    </div>
  );
}