import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faChevronRight,
  faExclamationTriangle,
  faChartLine,
  faLightbulb,
  faGraduationCap,
  faArrowUp,
  faCalculator,
  faBookOpen,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import financialQuestionsData from "@/data/financial-questions.json";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";

interface FinancialQuestionData {
  question: string;
  keywords: string;
  title: string;
  description: string;
  urgency: "high" | "medium" | "low";
  content: {
    problem: string;
    solution: string;
    call_to_action: string;
    benefits: string[];
  };
}

interface CategoryData {
  category: string;
  description: string;
  questions: Record<string, FinancialQuestionData>;
}

export const Route = createFileRoute("/questions/")({
  component: QuestionsIndexComponent,
  head: () => {
    const canonicalUrl = getCanonicalUrl("/questions");
    const title =
      "Financial Questions Hub - Get Answers to All Your Money Questions | Moneko";
    const description =
      "Find answers to your financial questions. Get expert guidance on debt, investing, budgeting, retirement planning, and more. Free AI-powered financial advice.";
    const keywords =
      "financial questions, money advice, personal finance help, financial guidance, budgeting questions, investing questions, debt help, retirement planning";

    const meta = seo({
      title,
      description,
      keywords,
      image: "https://moneko.io/og-img.png",
      url: canonicalUrl,
    });

    return {
      meta,
      links: [
        {
          rel: "canonical",
          href: canonicalUrl,
        },
      ],
    };
  },
});

function QuestionsIndexComponent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categoryIcons = {
    debt_and_crisis: faExclamationTriangle,
    budgeting_and_saving: faCalculator,
    investing_and_wealth: faChartLine,
    advanced_planning: faGraduationCap,
    trending_2025: faArrowUp,
  };

  const categoryColors = {
    debt_and_crisis: "from-red-500 to-orange-500",
    budgeting_and_saving: "from-green-500 to-emerald-500",
    investing_and_wealth: "from-blue-500 to-indigo-500",
    advanced_planning: "from-purple-500 to-pink-500",
    trending_2025: "from-orange-500 to-red-500",
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "text-red-500 bg-red-50 dark:bg-red-900/20";
      case "medium":
        return "text-orange-500 bg-orange-50 dark:bg-orange-900/20";
      case "low":
        return "text-green-500 bg-green-50 dark:bg-green-900/20";
      default:
        return "text-blue-500 bg-blue-50 dark:bg-blue-900/20";
    }
  };

  // Filter questions based on search query
  const filteredCategories = Object.entries(
    financialQuestionsData as Record<string, CategoryData>,
  ).filter(([categoryKey, categoryData]) => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    const categoryMatch =
      categoryData.category.toLowerCase().includes(searchLower) ||
      categoryData.description.toLowerCase().includes(searchLower);

    const questionsMatch = Object.values(categoryData.questions).some(
      (question) =>
        question.question.toLowerCase().includes(searchLower) ||
        question.keywords.toLowerCase().includes(searchLower) ||
        question.description.toLowerCase().includes(searchLower),
    );

    return categoryMatch || questionsMatch;
  });

  return (
    <motion.div
      className="from-background via-background/80 to-primary/5 min-h-screen bg-gradient-to-br"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pt-16 pb-12 sm:px-6 lg:px-8">
        {/* Background Elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 h-48 w-48 rounded-full bg-purple-200/20 blur-3xl dark:bg-purple-600/10"></div>
          <div className="absolute right-10 bottom-10 h-64 w-64 rounded-full bg-indigo-200/20 blur-3xl dark:bg-indigo-600/10"></div>
          <div className="absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-pink-200/15 blur-3xl dark:bg-pink-600/8"></div>
        </div>

        <div className="relative mx-auto max-w-7xl text-center">
          <motion.h1
            className="text-foreground mb-6 text-4xl leading-tight font-bold md:text-5xl lg:text-6xl"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Financial Questions Hub
          </motion.h1>

          <motion.p
            className="text-muted-foreground mx-auto mb-8 max-w-4xl text-xl md:text-2xl"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Get expert answers to all your money questions. From debt management
            to wealth building, find the guidance you need.
          </motion.p>

          {/* Search Bar */}
          <motion.div
            className="relative mx-auto max-w-2xl"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="relative">
              <FontAwesomeIcon
                icon={faSearch}
                className="text-muted-foreground absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 transform"
              />
              <input
                type="text"
                placeholder="Search financial questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-moneko-background/90 border-border/50 w-full rounded-2xl border py-4 pr-4 pl-12 text-lg backdrop-blur-sm focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:outline-none"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <AnimatePresence mode="popLayout">
            {filteredCategories.map(
              ([categoryKey, categoryData], categoryIndex) => (
                <motion.div
                  key={categoryKey}
                  className="mb-12"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: categoryIndex * 0.1 }}
                >
                  {/* Category Header */}
                  <div
                    className="mb-6 flex cursor-pointer items-center gap-4"
                    onClick={() =>
                      setSelectedCategory(
                        selectedCategory === categoryKey ? null : categoryKey,
                      )
                    }
                  >
                    <div
                      className={`rounded-xl bg-gradient-to-r p-4 ${categoryColors[categoryKey as keyof typeof categoryColors] || "from-blue-500 to-purple-500"}`}
                    >
                      <FontAwesomeIcon
                        icon={
                          categoryIcons[
                            categoryKey as keyof typeof categoryIcons
                          ] || faBookOpen
                        }
                        className="h-6 w-6 text-white"
                      />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-foreground text-2xl font-bold md:text-3xl">
                        {categoryData.category}
                      </h2>
                      <p className="text-muted-foreground">
                        {categoryData.description}
                      </p>
                    </div>
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className={`text-muted-foreground h-5 w-5 transition-transform duration-200 ${
                        selectedCategory === categoryKey ? "rotate-90" : ""
                      }`}
                    />
                  </div>

                  {/* Questions Grid */}
                  <AnimatePresence>
                    {(selectedCategory === categoryKey ||
                      selectedCategory === null) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                      >
                        {Object.entries(categoryData.questions)
                          .filter(([questionSlug, questionData]) => {
                            if (!searchQuery) return true;
                            const searchLower = searchQuery.toLowerCase();
                            return (
                              questionData.question
                                .toLowerCase()
                                .includes(searchLower) ||
                              questionData.keywords
                                .toLowerCase()
                                .includes(searchLower) ||
                              questionData.description
                                .toLowerCase()
                                .includes(searchLower)
                            );
                          })
                          .map(
                            ([questionSlug, questionData], questionIndex) => (
                              <motion.div
                                key={questionSlug}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: questionIndex * 0.05 }}
                              >
                                <Link
                                  to="/questions/$questionSlug"
                                  params={{ questionSlug }}
                                  className="block h-full"
                                >
                                  <div className="bg-moneko-background/90 border-border/50 group h-full rounded-xl border p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-xl">
                                    {/* Urgency Badge */}
                                    <div className="mb-4 flex items-start justify-between">
                                      <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getUrgencyColor(questionData.urgency)}`}
                                      >
                                        {questionData.urgency.toUpperCase()}
                                      </span>
                                      <FontAwesomeIcon
                                        icon={faChevronRight}
                                        className="text-muted-foreground group-hover:text-foreground h-4 w-4 transition-all duration-200 group-hover:translate-x-1"
                                      />
                                    </div>

                                    {/* Question */}
                                    <h3 className="text-foreground mb-3 line-clamp-2 text-lg font-bold transition-colors duration-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                                      {questionData.question}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
                                      {questionData.description.replace(
                                        " | Moneko",
                                        "",
                                      )}
                                    </p>

                                    {/* Benefits Preview */}
                                    <div className="border-border/30 mt-4 border-t pt-4">
                                      <p className="text-muted-foreground text-xs">
                                        {questionData.content.benefits.length}{" "}
                                        solutions included
                                      </p>
                                    </div>
                                  </div>
                                </Link>
                              </motion.div>
                            ),
                          )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ),
            )}
          </AnimatePresence>

          {/* No Results */}
          {filteredCategories.length === 0 && (
            <motion.div
              className="py-20 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="bg-muted mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="text-muted-foreground h-10 w-10"
                />
              </div>
              <h3 className="text-foreground mb-3 text-xl font-bold">
                No questions found
              </h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search terms or browse all categories.
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3 font-medium text-white shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                Show All Questions
              </button>
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 p-8 text-white">
              <h3 className="mb-4 text-2xl font-bold md:text-3xl">
                Can't Find Your Question?
              </h3>
              <p className="mb-6 text-xl opacity-90">
                Get personalized answers from our AI financial coach in under 2
                minutes.
              </p>
              <Link
                to="/download"
                search={{ q: undefined }}
                className="inline-flex items-center gap-3 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-purple-600 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <FontAwesomeIcon icon={faUsers} className="h-5 w-5" />
                Ask Our AI Coach
                <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4" />
              </Link>
              <p className="mt-4 text-sm opacity-75">
                Download the app to get personalized guidance
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}
