import { useState } from "react";
import faqData from "@/data/home/home-faq.json";
import { motion, Variants } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = faqData;

export interface FAQSectionProps {
  items?: FAQItem[];
  eyebrowText?: string;
  title?: string;
  subtitle?: string;
  sectionClassName?: string;
}

export default function FAQSection({
  items,
  eyebrowText = "Frequently Asked Questions",
  title = "Budgeting app questions, answered",
  subtitle = "Quick answers about tracking expenses, shared budgets, and getting started with Moneko.",
  sectionClassName,
}: FAQSectionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const prefersReducedMotion = usePrefersReducedMotion();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.5,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <motion.section
      className={`relative z-10 flex min-h-screen items-center justify-center px-4 py-16 sm:px-6 lg:px-8${sectionClassName ? ` ${sectionClassName}` : ""}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={containerVariants}
    >
      <div className="mx-auto w-full max-w-4xl">
        {/* Section Header */}
        <motion.div className="mb-12 text-center" variants={itemVariants}>
          <div className="text-primary mb-4 text-sm font-medium">
            {eyebrowText}
          </div>

          <h2 className="text-foreground font-lato mb-4 text-3xl leading-tight font-bold sm:text-4xl md:text-5xl">
            {title}
          </h2>

          <p className="text-muted-foreground font-lato mx-auto max-w-2xl text-lg leading-relaxed">
            {subtitle}
          </p>
        </motion.div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {(items ?? faqItems).map((item, index) => (
            <motion.div
              key={item.id}
              className="cursor-pointer rounded-2xl border border-white/20 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl"
              onClick={() => toggleItem(item.id)}
              variants={itemVariants}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-foreground font-lato flex-1 text-lg leading-tight font-semibold">
                  {item.question}
                </h4>
                <div
                  className={`ml-4 transition-transform duration-200 ${
                    openItems.has(item.id) ? "rotate-180" : ""
                  }`}
                >
                  <svg
                    className="text-muted-foreground h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
              <>
                {openItems.has(item.id) && (
                  <div className="mt-4">
                    <p className="text-muted-foreground font-lato leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                )}
              </>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
