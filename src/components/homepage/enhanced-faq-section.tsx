import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faChevronDown,
  faShieldAlt,
  faRobot,
  faDollarSign,
  faGraduationCap,
  faChartLine,
  faLock,
  faHeadset
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "@tanstack/react-router";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: "security" | "ai" | "pricing" | "education" | "investing" | "support";
  icon: any;
  popular: boolean;
}

const faqCategories = {
  security: { name: "Security & Privacy", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  ai: { name: "AI Technology", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  pricing: { name: "Pricing & Plans", color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  education: { name: "Learning & Education", color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
  investing: { name: "Investing & Portfolio", color: "text-indigo-600", bgColor: "bg-indigo-100 dark:bg-indigo-900/30" },
  support: { name: "Support & Help", color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-900/30" }
};

const faqItems: FAQItem[] = [
  {
    id: "security-data",
    question: "How secure is my financial data with Moneko?",
    answer: "Your financial security is our top priority. We use bank-level 256-bit encryption, are SOC 2 Type II certified, and never store your banking credentials. All data is encrypted both in transit and at rest, and we partner only with FDIC-insured institutions. Our security infrastructure is regularly audited by third-party security firms.",
    category: "security",
    icon: faShieldAlt,
    popular: true
  },
  {
    id: "ai-accuracy",
    question: "How accurate are Moneko's AI recommendations?",
    answer: "Our AI is trained by certified financial professionals (CFA, CSC, MBA) and uses advanced machine learning algorithms. The system analyzes thousands of data points including your spending patterns, financial goals, and market conditions. Our recommendations have helped users save an average of $15,000+ and achieve 127% better portfolio performance compared to traditional savings accounts.",
    category: "ai",
    icon: faRobot,
    popular: true
  },
  {
    id: "pricing-free",
    question: "Is Moneko really free to use?",
    answer: "Yes! Moneko offers a comprehensive free tier that includes AI financial coaching, basic budgeting tools, educational courses, and portfolio tracking. Our premium features include advanced AI insights, unlimited goal tracking, and priority support. We believe everyone deserves access to quality financial guidance regardless of their income level.",
    category: "pricing",
    icon: faDollarSign,
    popular: true
  },
  {
    id: "education-beginner",
    question: "I'm a complete beginner with finances. Can Moneko help me?",
    answer: "Absolutely! Moneko is designed for all experience levels. Our AI adapts to your knowledge level and provides personalized learning paths. We offer beginner-friendly courses covering budgeting basics, investment fundamentals, and debt management. Over 95% of our users report improved financial literacy within their first month.",
    category: "education",
    icon: faGraduationCap,
    popular: true
  },
  {
    id: "investing-minimum",
    question: "What's the minimum amount needed to start investing?",
    answer: "You can start investing with as little as $1! Our AI creates diversified portfolios using fractional shares, making investing accessible to everyone. We recommend starting with whatever amount you're comfortable with - even $25/month can grow significantly over time through compound interest and our AI optimization.",
    category: "investing",
    icon: faChartLine,
    popular: false
  },
  {
    id: "ai-human-advisors",
    question: "How does AI coaching compare to human financial advisors?",
    answer: "Our AI provides 24/7 availability, personalized insights, and costs significantly less than traditional advisors (who typically charge 1-2% annually). While human advisors are valuable for complex situations, our AI handles 90% of common financial questions and is trained by certified professionals. You get expert-level guidance at a fraction of the cost.",
    category: "ai",
    icon: faRobot,
    popular: false
  },
  {
    id: "security-bank-connection",
    question: "Is it safe to connect my bank accounts?",
    answer: "Yes, it's completely safe. We use Plaid, the same technology trusted by major financial institutions like Venmo, Robinhood, and American Express. We never store your banking credentials - connections are read-only and encrypted. You can disconnect your accounts at any time, and we're fully compliant with financial data protection regulations.",
    category: "security",
    icon: faLock,
    popular: false
  },
  {
    id: "education-time-commitment",
    question: "How much time do I need to spend learning?",
    answer: "Our courses are designed for busy lifestyles. Most lessons are 5-15 minutes long, and you can learn at your own pace. Many users spend just 10-20 minutes per week and see significant improvements in their financial knowledge. Our AI also provides bite-sized daily tips that take less than 2 minutes to read.",
    category: "education",
    icon: faGraduationCap,
    popular: false
  },
  {
    id: "investing-risk-management",
    question: "How does Moneko manage investment risk?",
    answer: "Our AI continuously monitors your portfolio and market conditions, automatically rebalancing to maintain your target risk level. We use modern portfolio theory, diversification across asset classes, and real-time risk assessment. You can adjust your risk tolerance anytime, and our AI will adapt your portfolio accordingly while maintaining optimal diversification.",
    category: "investing",
    icon: faChartLine,
    popular: false
  },
  {
    id: "support-help",
    question: "What if I need help or have questions?",
    answer: "We offer multiple support channels: 24/7 AI chat support, email support with response times under 4 hours, and an extensive knowledge base. Premium users get priority support and access to live chat with our financial experts. Our community forum is also active with helpful users and expert moderators.",
    category: "support",
    icon: faHeadset,
    popular: false
  }
];

export function EnhancedFAQSection() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  const filteredFAQs = selectedCategory 
    ? faqItems.filter(item => item.category === selectedCategory)
    : faqItems;

  const popularFAQs = faqItems.filter(item => item.popular);

  return (
    <section className="relative z-10 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8 bg-gradient-to-br from-slate-50/30 to-gray-50/20 dark:from-slate-900/30 dark:to-gray-900/20">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="mb-12 text-center sm:mb-16">
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Badge 
              variant="secondary" 
              className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm font-medium"
            >
              Frequently Asked Questions
            </Badge>
          </motion.div>
          
          <motion.h2
            className="text-foreground mb-4 text-3xl leading-tight font-bold sm:mb-6 sm:text-4xl md:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            Got Questions? We've Got Answers
          </motion.h2>
          
          <motion.p
            className="text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed sm:text-xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Everything you need to know about Moneko's AI-powered financial coaching platform
          </motion.p>
        </div>

        {/* Popular Questions */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <h3 className="text-xl font-bold text-foreground mb-6 flex items-center">
            <span className="mr-3">🔥</span>
            Most Popular Questions
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {popularFAQs.map((item, index) => (
              <Card 
                key={item.id}
                className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                onClick={() => toggleItem(item.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 shadow-md flex-shrink-0 ${faqCategories[item.category].color}`}>
                      <FontAwesomeIcon icon={item.icon} className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-foreground text-base leading-tight">
                          {item.question}
                        </h4>
                        <FontAwesomeIcon 
                          icon={faChevronDown} 
                          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ml-2 ${
                            openItems.has(item.id) ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${faqCategories[item.category].bgColor} ${faqCategories[item.category].color} border-0 mb-3`}
                      >
                        {faqCategories[item.category].name}
                      </Badge>
                      <AnimatePresence>
                        {openItems.has(item.id) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <p className="text-muted-foreground text-sm leading-relaxed">
                              {item.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="text-sm"
            >
              All Questions
            </Button>
            {Object.entries(faqCategories).map(([key, category]) => (
              <Button
                key={key}
                variant={selectedCategory === key ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(key)}
                className="text-sm"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* All Questions */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
        >
          {filteredFAQs.map((item, index) => (
            <Card 
              key={item.id}
              className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border-white/20 dark:border-slate-700/50 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
              onClick={() => toggleItem(item.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 shadow-sm flex-shrink-0 ${faqCategories[item.category].color}`}>
                      <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
                    </div>
                    <h4 className="font-semibold text-foreground text-base leading-tight">
                      {item.question}
                    </h4>
                  </div>
                  <FontAwesomeIcon 
                    icon={faChevronDown} 
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ml-4 ${
                      openItems.has(item.id) ? 'rotate-180' : ''
                    }`}
                  />
                </div>
                <AnimatePresence>
                  {openItems.has(item.id) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 pl-12"
                    >
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 rounded-2xl p-8 sm:p-12">
            <h3 className="text-2xl font-bold text-foreground mb-4 sm:text-3xl">
              Still Have Questions?
            </h3>
            <p className="text-muted-foreground mb-8 text-lg max-w-2xl mx-auto">
              Our support team is here to help you succeed on your financial journey
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-semibold"
              >
                <Link to="/dashboard">
                  Start Free Trial
                </Link>
              </Button>
              <Button 
                asChild
                variant="outline" 
                size="lg"
                className="px-8 py-3 text-lg font-semibold"
              >
                <a href="mailto:support@moneko.io">
                  Contact Support
                </a>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
