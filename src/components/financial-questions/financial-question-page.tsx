"use client";

import React from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import AmbientHalo from "@/components/ui/ambient-halo";
import {
  getRelatedResourcesForQuestion,
  RelatedResources,
} from "@/components/seo/related-resources";
import {
  faRocket,
  faCheckCircle,
  faLightbulb,
  faChartLine,
  faBullhorn,
  faGraduationCap,
  faArrowRight,
  faQuestionCircle,
  faStar,
  faShield,
} from "@fortawesome/free-solid-svg-icons";

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

interface FinancialQuestionPageProps {
  questionData: FinancialQuestionData;
  category: string;
  canonicalUrl: string;
  questionSlug: string;
}

export function FinancialQuestionPage({
  questionData,
  category,
  canonicalUrl,
  questionSlug,
}: FinancialQuestionPageProps) {
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "from-red-500 to-orange-500";
      case "medium":
        return "from-orange-500 to-yellow-500";
      case "low":
        return "from-green-500 to-blue-500";
      default:
        return "from-blue-500 to-purple-500";
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "high":
        return faBullhorn;
      case "medium":
        return faChartLine;
      case "low":
        return faLightbulb;
      default:
        return faQuestionCircle;
    }
  };

  return (
    <motion.div
      className="relative min-h-screen bg-transparent"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <AmbientHalo />
      {/* Hero Section */}
      <section className="relative z-10 overflow-hidden px-4 pt-16 pb-20 sm:px-6 lg:px-8">
        {/* Background Elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 h-48 w-48 rounded-full bg-purple-200/20 blur-3xl dark:bg-purple-600/10"></div>
          <div className="absolute right-10 bottom-10 h-64 w-64 rounded-full bg-indigo-200/20 blur-3xl dark:bg-indigo-600/10"></div>
          <div className="absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-pink-200/15 blur-3xl dark:bg-pink-600/8"></div>
        </div>

        <div className="relative mx-auto max-w-7xl text-center">
          {/* Category Badge */}
          <motion.div
            className="bg-moneko-background/80 border-border/50 text-muted-foreground mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-sm"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <FontAwesomeIcon
              icon={getUrgencyIcon(questionData.urgency)}
              className={`h-4 w-4 bg-gradient-to-r bg-clip-text text-transparent ${getUrgencyColor(questionData.urgency)}`}
            />
            {category}
          </motion.div>

          {/* Main Question/Title - GEO Optimized */}
          <motion.h1
            className="hero-title text-foreground mb-6 text-4xl leading-tight font-bold md:text-5xl lg:text-6xl"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {questionData.question}
          </motion.h1>

          {/* Description */}
          <motion.p
            className="text-muted-foreground mx-auto mb-8 max-w-4xl text-xl md:text-2xl"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {questionData.description.replace(" | Moneko", "")}
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Link
              to="/download"
              search={{ q: questionData.question }}
              className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <FontAwesomeIcon icon={faRocket} className="h-5 w-5" />
              Get Personalized Help Now
              <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Problem & Solution Section */}
      <section className="relative z-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Problem - GEO Optimized with semantic markup */}
            <motion.div
              className="problem bg-moneko-background/90 border-border/50 rounded-2xl border p-8 shadow-lg backdrop-blur-sm"
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className={`rounded-full bg-gradient-to-r p-3 ${getUrgencyColor(questionData.urgency)}`}
                >
                  <FontAwesomeIcon
                    icon={faQuestionCircle}
                    className="h-6 w-6 text-white"
                  />
                </div>
                <h2 className="text-foreground text-2xl font-bold">
                  The Challenge
                </h2>
              </div>
              {/* TL;DR Summary for AI parsing */}
              <div className="bg-muted/50 mb-4 rounded-lg border-l-4 border-orange-500 p-4">
                <p className="text-muted-foreground mb-2 text-sm font-semibold">
                  TL;DR:
                </p>
                <p className="text-foreground font-medium">
                  {questionData.content.problem.split(".")[0]}.
                </p>
              </div>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {questionData.content.problem}
              </p>
            </motion.div>

            {/* Solution - GEO Optimized with semantic markup */}
            <motion.div
              className="solution rounded-2xl border border-green-200/50 bg-gradient-to-br from-green-50 to-emerald-50 p-8 shadow-lg dark:border-green-800/50 dark:from-green-900/20 dark:to-emerald-900/20"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-full bg-gradient-to-r from-green-500 to-emerald-500 p-3">
                  <FontAwesomeIcon
                    icon={faLightbulb}
                    className="h-6 w-6 text-white"
                  />
                </div>
                <h2 className="text-foreground text-2xl font-bold">
                  Our Solution
                </h2>
              </div>
              {/* AI-friendly summary */}
              <div className="mb-4 rounded-lg border-l-4 border-green-500 bg-green-50 p-4 dark:bg-green-900/30">
                <p className="mb-2 text-sm font-semibold text-green-700 dark:text-green-400">
                  In Summary:
                </p>
                <p className="font-medium text-green-800 dark:text-green-300">
                  {questionData.content.call_to_action}
                </p>
              </div>
              <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
                {questionData.content.solution}
              </p>
              <div className="call-to-action">
                <Link
                  to="/download"
                  search={{ q: questionData.question }}
                  className="inline-flex items-center gap-2 font-semibold text-green-600 hover:underline dark:text-green-400"
                >
                  Start solving this now
                  <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section - GEO Optimized */}
      <section className="benefits-section bg-muted/30 relative z-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="mb-12 text-center"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <h2 className="text-foreground mb-4 text-3xl font-bold md:text-4xl">
              What You'll Get
            </h2>
            <p className="text-muted-foreground text-xl">
              {questionData.content.call_to_action}
            </p>

            {/* Key Benefits Summary for AI parsing */}
            <div className="bg-moneko-background/80 border-border/50 mx-auto mt-6 max-w-3xl rounded-lg border p-4">
              <p className="text-muted-foreground mb-2 text-sm font-semibold">
                Key Benefits:
              </p>
              <p className="text-foreground text-base">
                {questionData.content.benefits
                  .slice(0, 3)
                  .join(", ")
                  .toLowerCase()}
                , and more personalized solutions.
              </p>
            </div>
          </motion.div>

          <div className="benefits-list grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {questionData.content.benefits.map((benefit, index) => (
              <motion.div
                key={index}
                className="benefit-item bg-moneko-background border-border/50 rounded-xl border p-6 shadow-lg transition-all duration-300 hover:shadow-xl"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9 + index * 0.1 }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 p-2">
                    <FontAwesomeIcon
                      icon={faCheckCircle}
                      className="h-5 w-5 text-white"
                    />
                  </div>
                  <p className="text-foreground font-medium">{benefit}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Additional structured summary for AI platforms */}
          <div className="mx-auto mt-12 max-w-4xl text-center">
            <div className="rounded-lg border border-blue-200/50 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 dark:border-blue-800/50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <h3 className="text-foreground mb-3 text-lg font-bold">
                Complete Solution Package
              </h3>
              <p className="text-muted-foreground">
                Get {questionData.content.benefits.length} specific benefits
                including {questionData.content.benefits[0].toLowerCase()},
                {questionData.content.benefits[1]
                  ? ` ${questionData.content.benefits[1].toLowerCase()},`
                  : ""}
                and comprehensive support for{" "}
                {questionData.question.toLowerCase()}.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Social Proof */}
      <section className="relative z-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <div className="mb-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div className="flex flex-col items-center">
                <div className="mb-4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 p-4">
                  <FontAwesomeIcon
                    icon={faShield}
                    className="h-8 w-8 text-white"
                  />
                </div>
                <h3 className="text-foreground mb-2 font-bold">
                  Privacy-focused
                </h3>
                <p className="text-muted-foreground text-sm">
                  We use modern security practices to protect your data.
                </p>
              </div>

              <div className="flex flex-col items-center">
                <div className="mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-4">
                  <FontAwesomeIcon
                    icon={faStar}
                    className="h-8 w-8 text-white"
                  />
                </div>
                <h3 className="text-foreground mb-2 font-bold">
                  Loved by users
                </h3>
                <p className="text-muted-foreground text-sm">
                  Built for people working toward their financial goals
                </p>
              </div>

              <div className="flex flex-col items-center">
                <div className="mb-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 p-4">
                  <FontAwesomeIcon
                    icon={faGraduationCap}
                    className="h-8 w-8 text-white"
                  />
                </div>
                <h3 className="text-foreground mb-2 font-bold">Expert-Led</h3>
                <p className="text-muted-foreground text-sm">
                  Built to help you make clearer money decisions.
                </p>
              </div>
            </div>

            <div className="mt-10 text-left">
              <RelatedResources
                title="Related guides and calculators"
                resources={getRelatedResourcesForQuestion({
                  questionSlug,
                  keywords: questionData.keywords,
                  category,
                })}
              />
            </div>

            {/* Final CTA */}
            <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 p-8 text-white">
              <h3 className="mb-4 text-2xl font-bold md:text-3xl">
                Ready to Solve This Financial Challenge?
              </h3>
              <p className="mb-6 text-xl opacity-90">
                Get personalized guidance from our AI financial coach in under 2
                minutes.
              </p>
              <Link
                to="/download"
                search={{ q: questionData.question }}
                className="inline-flex items-center gap-3 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-purple-600 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <FontAwesomeIcon icon={faRocket} className="h-5 w-5" />
                Start Your Financial Journey
                <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
              </Link>
              <p className="mt-4 text-sm opacity-75">
                Free to start • No credit card required • Get results in minutes
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}
