import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import React, { useState } from "react";

interface FAQSectionProps {
  prefersReducedMotion?: boolean;
}

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQSection({ prefersReducedMotion }: FAQSectionProps) {
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const faqItems: FAQItem[] = [
    {
      question: "Can I upgrade or downgrade my plan later?",
      answer: "Yes! You can upgrade or downgrade your plan at any time. When you upgrade, you'll be charged the prorated amount for the remainder of your billing cycle. When you downgrade, the change will take effect at your next billing cycle."
    },
    {
      question: "What happens at the end of my free trial?",
      answer: "Your free trial automatically converts to a paid subscription unless you cancel before it ends. We'll send you email reminders before your trial expires, and you can cancel anytime during the trial with no charges."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, MasterCard, American Express, Discover) and PayPal. All payments are processed securely through Stripe with bank-level encryption."
    },
    {
      question: "Is my financial data secure?",
      answer: "Absolutely. We use bank-level 256-bit SSL encryption and are SOC 2 compliant. We only access your accounts in read-only mode and never store your banking credentials. Your data is protected with the same security standards used by major financial institutions."
    },
    {
      question: "What is your cancellation and refund policy?",
      answer: "You can cancel your subscription anytime with no cancellation fees. We offer a 30-day money-back guarantee - if you're not satisfied within the first 30 days, we'll provide a full refund. After cancellation, you'll retain access until the end of your current billing period."
    },
    {
      question: "How do the AI-personalized lessons work?",
      answer: "Our AI analyzes your financial goals, experience level, and learning preferences to create custom lessons just for you. You can chat with the AI about specific topics you want to learn, and it will generate comprehensive, personalized content tailored to your situation."
    },
    {
      question: "Do you offer student or educator discounts?",
      answer: "Yes! We offer a 50% discount for verified students and educators. Contact us at hello@moneko.io with your .edu email address to get started with your discounted plan."
    },
    {
      question: "Can I connect multiple brokerage accounts?",
      answer: "With the Investor plan, you can connect 1 brokerage account. Wealth Builder subscribers can connect unlimited accounts from all major brokerages including Fidelity, Charles Schwab, Vanguard, TD Ameritrade, and more."
    }
  ];

  const toggleExpanded = (index: number) => {
    setExpandedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const staggerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  // Generate structured data for FAQ
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  return (
    <>
      {/* Add FAQ Schema to head */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      
      <motion.section
        className="mt-16"
        variants={prefersReducedMotion ? undefined : staggerVariants}
        initial={prefersReducedMotion ? undefined : "hidden"}
        whileInView={prefersReducedMotion ? undefined : "visible"}
        viewport={{ once: true }}
      >
        <motion.div
          className="text-center mb-8"
          variants={prefersReducedMotion ? undefined : cardVariants}
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Everything you need to know about our plans and features. Can't find what you're looking for? 
            <a href="mailto:hello@moneko.io" className="text-purple-600 hover:text-purple-700 dark:text-purple-400"> Contact us</a>.
          </p>
        </motion.div>

        <motion.div 
          className="max-w-3xl mx-auto space-y-4"
          variants={prefersReducedMotion ? undefined : staggerVariants}
        >
          {faqItems.map((item, index) => (
            <motion.div
              key={index}
              className="border border-gray-200 rounded-lg bg-white dark:bg-slate-800 dark:border-gray-700"
              variants={prefersReducedMotion ? undefined : cardVariants}
            >
              <button
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
                onClick={() => toggleExpanded(index)}
                aria-expanded={expandedItems.includes(index)}
              >
                <span className="font-semibold text-gray-900 dark:text-white pr-4">
                  {item.question}
                </span>
                <FontAwesomeIcon
                  icon={expandedItems.includes(index) ? faChevronUp : faChevronDown}
                  className="h-4 w-4 text-gray-500 flex-shrink-0"
                />
              </button>
              
              {expandedItems.includes(index) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-t border-gray-200 dark:border-gray-700"
                >
                  <div className="px-6 py-4 text-gray-700 dark:text-gray-300">
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </motion.section>
    </>
  );
}