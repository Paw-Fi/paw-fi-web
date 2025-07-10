import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, Variants } from "framer-motion";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faChartLine,
  faUserGroup,
  faMoneyBillWave,
  faArrowTrendUp,
  faHome,
  faPiggyBank,
} from "@fortawesome/free-solid-svg-icons";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { HomeHeader } from "@/components/index/header";

// Define animation variants
const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.25,
    },
  },
};

const gridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// Target group categories
const targetGroups = [
  { id: "students", label: "Students", icon: faUserGroup },
  {
    id: "young-professionals",
    label: "Young Professionals",
    icon: faChartLine,
  },
  { id: "parents", label: "Parents", icon: faUserGroup },
  { id: "couples", label: "Couples", icon: faUserGroup },
  { id: "freelancers", label: "Freelancers", icon: faMoneyBillWave },
  { id: "entrepreneurs", label: "Entrepreneurs", icon: faArrowTrendUp },
  { id: "retirees", label: "Retirees", icon: faPiggyBank },
];

// Financial goal categories
const financialGoals = [
  { id: "budgeting", label: "Budgeting", icon: faMoneyBillWave },
  { id: "saving", label: "Saving", icon: faPiggyBank },
  { id: "debt-repayment", label: "Debt Repayment", icon: faMoneyBillWave },
  { id: "investing", label: "Investing", icon: faArrowTrendUp },
  { id: "retirement", label: "Retirement", icon: faPiggyBank },
  { id: "home-buying", label: "Home Buying", icon: faHome },
];

export const Route = createFileRoute("/budgeting-app/")({
  component: BudgetingApp,

  head: () => {
    const pageUrl = getCanonicalUrl("/budgeting-app/");

    // Create SEO metadata
    const meta = seo({
      title: "Moneko | AI-Powered Budgeting App for Smart Financial Planning",
      description:
        "Discover how Moneko's AI-powered budgeting app delivers personalized financial education, smart budgeting tools, and investing courses tailored to your specific needs.",
      keywords:
        "AI budgeting app, financial learning, personalized budget, investing courses, financial planning tools",
      url: pageUrl,
      image: "https://moneko.io/og-img.png",
    });

    // Create structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          name: "Moneko",
          url: "https://moneko.io",
          logo: "https://moneko.io/icon.svg",
        },
        {
          "@type": "WebSite",
          name: "Moneko",
          url: "https://moneko.io",
        },
        {
          "@type": "WebPage",
          "@id": pageUrl,
          url: pageUrl,
          name: "Moneko | AI-Powered Budgeting App for Smart Financial Planning",
          description:
            "Discover how Moneko's AI-powered budgeting app delivers personalized financial education, smart budgeting tools, and investing courses tailored to your specific needs.",
          isPartOf: {
            "@id": "https://moneko.io/#website",
          },
          inLanguage: "en-US",
        },
        {
          "@type": "SoftwareApplication",
          name: "Moneko AI Financial Coach",
          applicationCategory: "FinanceApplication",
          operatingSystem: "iOS, Android, Web",
          description:
            "AI-powered personalized financial learning platform with custom budgeting tools",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            ratingCount: "1024",
          },
        },
        {
          "@type": "ItemList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "AI Financial Learning",
              description: "Personalized financial education and lessons",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Smart Budgeting Tools",
              description: "Intelligent budget tracking and recommendations",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: "Essential Investing Courses",
              description:
                "Learn investing fundamentals tailored to your experience level",
            },
          ],
        },
      ],
    };

    return {
      title: "Moneko | AI-Powered Budgeting App for Smart Financial Planning",
      meta,
      link: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});

function BudgetingApp() {
  return (
    <AmbientHaloLayout>
      <HomeHeader />
      <motion.div
        className="container mx-auto px-4 py-12"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="mb-16 text-center">
          <motion.h1
            className="mb-6 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl md:text-5xl lg:text-5xl  dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Moneko: AI-Powered Financial Learning
          </motion.h1>

          <motion.p
            className="mx-auto max-w-3xl text-lg text-slate-600 md:text-xl dark:text-slate-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Find personalized budgeting advice, AI-generated financial lessons,
            and investing courses designed specifically for your unique
            financial situation and goals.
          </motion.p>
        </div>

        {/* Target Groups Section */}
        <section className="mb-16">
          <motion.h2
            className="mb-8 text-center text-2xl font-bold text-slate-800 md:text-3xl dark:text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Find Budgeting Solutions For You
          </motion.h2>

          <motion.div
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
          >
            {targetGroups.map((group) => (
              <motion.div
                key={group.id}
                variants={cardVariants}
                className="group overflow-hidden rounded-2xl border border-white/20 bg-slate-50/50 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-900/50"
              >
                <a
                  href={`/budgeting-app/${group.id}-budgeting`}
                  className="block p-6"
                >
                  <div className="mb-4 flex items-start">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/20">
                      <FontAwesomeIcon
                        icon={group.icon}
                        className="text-xl"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-xl font-bold text-slate-800 transition-colors group-hover:text-purple-600 dark:text-slate-100 dark:group-hover:text-purple-400">
                        {group.label}
                      </h3>
                      <p className="mt-1 text-slate-600 dark:text-slate-400">
                        Personalized financial learning for{" "}
                        {group.label.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      Learn more
                    </span>
                    <span className="transform transition-transform group-hover:translate-x-1">
                      <FontAwesomeIcon
                        icon={faArrowRight}
                        className="text-purple-600 dark:text-purple-400"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </a>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Financial Goals Section */}
        <section className="mb-16">
          <motion.h2
            className="mb-8 text-center text-2xl font-bold text-slate-800 md:text-3xl dark:text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Achieve Your Financial Goals
          </motion.h2>

          <motion.div
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
          >
            {financialGoals.map((goal) => (
              <motion.div
                key={goal.id}
                variants={cardVariants}
                className="group overflow-hidden rounded-2xl border border-white/20 bg-slate-50/50 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-900/50"
              >
                <a
                  href={`/budgeting-app/young-professionals-${goal.id}`}
                  className="block p-6"
                >
                  <div className="mb-4 flex items-start">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/20">
                      <FontAwesomeIcon
                        icon={goal.icon}
                        className="text-xl"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-xl font-bold text-slate-800 transition-colors group-hover:text-purple-600 dark:text-slate-100 dark:group-hover:text-purple-400">
                        {goal.label}
                      </h3>
                      <p className="mt-1 text-slate-600 dark:text-slate-400">
                        AI-driven tools and courses for{" "}
                        {goal.label.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      Learn more
                    </span>
                    <span className="transform transition-transform group-hover:translate-x-1">
                      <FontAwesomeIcon
                        icon={faArrowRight}
                        className="text-purple-600 dark:text-purple-400"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </a>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Educational Content Section for SEO */}
        <section className="mb-16">
          <div className="rounded-2xl bg-white p-8 shadow-lg dark:bg-slate-800">
            <h2 className="mb-6 text-2xl font-bold text-slate-800 md:text-3xl dark:text-white">
              AI-Powered Financial Learning with Moneko
            </h2>

            <div className="prose prose-lg max-w-none text-slate-700 dark:text-slate-300">
              <p>
                Moneko's budgeting app is more than just another financial
                tool—it's an AI-powered learning platform designed to improve
                your financial literacy while helping you manage your money more
                effectively. Our unique approach combines personalized budgeting
                tools with adaptive learning content that grows with you.
              </p>

              <h3 className="mb-3 mt-6 text-xl font-bold text-slate-800 dark:text-white">
                Personalized Financial Education
              </h3>
              <p>
                Our AI analyzes your spending patterns, income sources, and
                financial goals to create custom learning modules that address
                your specific needs. Whether you're a student looking to manage
                limited funds, a young professional wanting to balance student
                loan payments with saving for the future, or a parent planning
                for your family's financial security, Moneko adapts to deliver
                the most relevant education.
              </p>

              <h3 className="mb-3 mt-6 text-xl font-bold text-slate-800 dark:text-white">
                Smart Budgeting Tools
              </h3>
              <p>
                Alongside educational content, Moneko provides intelligent
                budgeting tools that make financial management simple and
                intuitive. Our AI identifies spending patterns and suggests
                optimizations to help you reach your goals faster. With
                real-time insights and actionable recommendations, you'll always
                know exactly where your money is going and how to make it work
                harder for you.
              </p>

              <h3 className="mb-3 mt-6 text-xl font-bold text-slate-800 dark:text-white">
                Essential Investing Courses
              </h3>
              <p>
                Building wealth requires more than just budgeting—it means
                making your money grow. Moneko offers beginner-friendly
                investing courses that demystify the stock market, retirement
                accounts, and other investment vehicles. Our step-by-step
                lessons adapt to your knowledge level, gradually introducing
                more complex concepts as you become more confident with the
                basics.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <motion.section
          className="rounded-3xl bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-center text-white shadow-xl md:p-12"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Ready to Transform Your Finances?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg md:text-xl">
            Join thousands of people who have already discovered the power of
            AI-driven financial learning with Moneko.
          </p>
          <a
            href="/dashboard"
            className="inline-block transform rounded-full bg-white px-8 py-3 text-lg font-bold text-purple-600 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            Visit Moneko Now
          </a>
        </motion.section>
      </motion.div>
    </AmbientHaloLayout>
  );
}

export default BudgetingApp;
