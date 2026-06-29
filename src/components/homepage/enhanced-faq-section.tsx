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
  faHeadset,
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "@tanstack/react-router";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category:
    | "security"
    | "ai"
    | "pricing"
    | "education"
    | "investing"
    | "support";
  icon: any;
  popular: boolean;
}

const faqCategories = {
  security: {
    name: "Security & Privacy",
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  ai: {
    name: "AI Technology",
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  pricing: {
    name: "Pricing & Plans",
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  education: {
    name: "Learning & Education",
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  investing: {
    name: "Investing & Portfolio",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
  },
  support: {
    name: "Support & Help",
    color: "text-gray-600",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
  },
};

const faqItems: FAQItem[] = [
  {
    id: "security-data",
    question: "How secure is my financial data with Moneko?",
    answer:
      "Security is a priority. We use industry-standard encryption in transit and apply security best practices to protect your data. For specific questions about security controls or data handling, contact support.",
    category: "security",
    icon: faShieldAlt,
    popular: true,
  },
  {
    id: "ai-accuracy",
    question: "How accurate are Moneko's AI recommendations?",
    answer:
      "Moneko's AI helps you plan and stay organized by summarizing patterns in your activity and suggesting next steps. Recommendations are guidance for budgeting and planning, not a guarantee of outcomes.",
    category: "ai",
    icon: faRobot,
    popular: true,
  },
  {
    id: "pricing-free",
    question: "Is Moneko really free to use?",
    answer:
      "Moneko offers a free tier and optional paid plans. See the pricing page for current details on what's included.",
    category: "pricing",
    icon: faDollarSign,
    popular: true,
  },
  {
    id: "education-beginner",
    question: "I'm a complete beginner with finances. Can Moneko help me?",
    answer:
      "Yes. Moneko is designed for all experience levels. You'll find beginner-friendly lessons on budgeting basics, saving, and investing concepts, plus step-by-step workflows to apply what you learn.",
    category: "education",
    icon: faGraduationCap,
    popular: true,
  },
  {
    id: "investing-minimum",
    question: "What's the minimum amount needed to start investing?",
    answer:
      "Minimums depend on the broker or platform you use. Some allow fractional shares. Moneko focuses on planning and tracking, not executing trades.",
    category: "investing",
    icon: faChartLine,
    popular: false,
  },
  {
    id: "ai-human-advisors",
    question: "How does AI coaching compare to human financial advisors?",
    answer:
      "AI coaching can be useful for day-to-day budgeting, reminders, and organization. For complex personal situations, a licensed professional can be a better fit. Moneko is designed to help with planning and tracking, not to replace professional advice.",
    category: "ai",
    icon: faRobot,
    popular: false,
  },
  {
    id: "security-bank-connection",
    question: "Is it safe to connect my bank accounts?",
    answer:
      "Bank sync is optional and is powered by Plaid for supported US and Canadian banks. You can disconnect accounts at any time, and you can also use Moneko without bank sync through text, receipt, WhatsApp, Telegram, email, and manual wallet workflows.",
    category: "security",
    icon: faLock,
    popular: false,
  },
  {
    id: "education-time-commitment",
    question: "How much time do I need to spend learning?",
    answer:
      "It depends on your goals. Many people start with a few minutes at a time and build consistency over weeks.",
    category: "education",
    icon: faGraduationCap,
    popular: false,
  },
  {
    id: "investing-risk-management",
    question: "How does Moneko manage investment risk?",
    answer:
      "Moneko can help you think through risk and diversification concepts, but it doesn't manage or rebalance investments on your behalf.",
    category: "investing",
    icon: faChartLine,
    popular: false,
  },
  {
    id: "support-help",
    question: "What if I need help or have questions?",
    answer:
      "You can reach support by email and use in-app help resources. Premium plans may include additional support options.",
    category: "support",
    icon: faHeadset,
    popular: false,
  },
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
    ? faqItems.filter((item) => item.category === selectedCategory)
    : faqItems;

  const popularFAQs = faqItems.filter((item) => item.popular);

  return (
    <section className="relative z-10 bg-gradient-to-br from-slate-50/30 to-gray-50/20 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8 dark:from-slate-900/30 dark:to-gray-900/20">
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
              className="bg-primary/10 text-primary border-primary/20 mb-4 px-4 py-2 text-sm font-medium"
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
            Everything you need to know about Moneko's AI-powered financial
            coaching platform
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
          <h3 className="text-foreground mb-6 flex items-center text-xl font-bold">
            <span className="mr-3">🔥</span>
            Most Popular Questions
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {popularFAQs.map((item, index) => (
              <Card
                key={item.id}
                className="cursor-pointer border-white/20 bg-white/60 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-900/60"
                onClick={() => toggleItem(item.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white to-slate-50 shadow-md dark:from-slate-800 dark:to-slate-700 ${faqCategories[item.category].color}`}
                    >
                      <FontAwesomeIcon icon={item.icon} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-foreground text-base leading-tight font-semibold">
                          {item.question}
                        </h4>
                        <FontAwesomeIcon
                          icon={faChevronDown}
                          className={`text-muted-foreground ml-2 h-4 w-4 flex-shrink-0 transition-transform duration-200 ${
                            openItems.has(item.id) ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${faqCategories[item.category].bgColor} ${faqCategories[item.category].color} mb-3 border-0`}
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
              className="cursor-pointer border-white/20 bg-white/40 shadow-md backdrop-blur-sm transition-all duration-300 hover:shadow-lg dark:border-slate-700/50 dark:bg-slate-900/40"
              onClick={() => toggleItem(item.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 flex-1 items-center space-x-4">
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-white to-slate-50 shadow-sm dark:from-slate-800 dark:to-slate-700 ${faqCategories[item.category].color}`}
                    >
                      <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
                    </div>
                    <h4 className="text-foreground text-base leading-tight font-semibold">
                      {item.question}
                    </h4>
                  </div>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`text-muted-foreground ml-4 h-4 w-4 flex-shrink-0 transition-transform duration-200 ${
                      openItems.has(item.id) ? "rotate-180" : ""
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
          <div className="from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 rounded-2xl bg-gradient-to-r p-8 sm:p-12">
            <h3 className="text-foreground mb-4 text-2xl font-bold sm:text-3xl">
              Still Have Questions?
            </h3>
            <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg">
              Our support team is here to help you succeed on your financial
              journey
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-semibold"
              >
                <Link to="/pricing">See Pricing</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="px-8 py-3 text-lg font-semibold"
              >
                <a href="mailto:support@moneko.io">Contact Support</a>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
