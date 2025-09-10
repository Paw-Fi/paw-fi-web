"use client";

import React from 'react';
import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AmbientHalo from '@/components/ui/ambient-halo';
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
  faShield
} from '@fortawesome/free-solid-svg-icons';

interface FinancialQuestionData {
  question: string;
  keywords: string;
  title: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
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
}

export function FinancialQuestionPage({ 
  questionData, 
  category, 
  canonicalUrl 
}: FinancialQuestionPageProps) {
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'from-red-500 to-orange-500';
      case 'medium': return 'from-orange-500 to-yellow-500';
      case 'low': return 'from-green-500 to-blue-500';
      default: return 'from-blue-500 to-purple-500';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return faBullhorn;
      case 'medium': return faChartLine;
      case 'low': return faLightbulb;
      default: return faQuestionCircle;
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
      <section className="relative z-10 pt-16 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-48 h-48 bg-purple-200/20 dark:bg-purple-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-indigo-200/20 dark:bg-indigo-600/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-200/15 dark:bg-pink-600/8 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto text-center">
          {/* Category Badge */}
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur-sm border border-border/50 rounded-full text-sm font-medium text-muted-foreground mb-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <FontAwesomeIcon 
              icon={getUrgencyIcon(questionData.urgency)} 
              className={`h-4 w-4 text-transparent bg-clip-text bg-gradient-to-r ${getUrgencyColor(questionData.urgency)}`}
            />
            {category}
          </motion.div>

          {/* Main Question/Title - GEO Optimized */}
          <motion.h1 
            className="hero-title text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {questionData.question}
          </motion.h1>

          {/* Description */}
          <motion.p 
            className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto mb-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {questionData.description.replace(' | Moneko', '')}
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Link
              to="/onboarding"
              search={{ q: questionData.question }}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <FontAwesomeIcon icon={faRocket} className="h-5 w-5" />
              Get Personalized Help Now
              <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Problem & Solution Section */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Problem - GEO Optimized with semantic markup */}
            <motion.div 
              className="problem bg-background/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-border/50"
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-full bg-gradient-to-r ${getUrgencyColor(questionData.urgency)}`}>
                  <FontAwesomeIcon icon={faQuestionCircle} className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">The Challenge</h2>
              </div>
              {/* TL;DR Summary for AI parsing */}
              <div className="mb-4 p-4 bg-muted/50 rounded-lg border-l-4 border-orange-500">
                <p className="text-sm font-semibold text-muted-foreground mb-2">TL;DR:</p>
                <p className="text-foreground font-medium">
                  {questionData.content.problem.split('.')[0]}.
                </p>
              </div>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {questionData.content.problem}
              </p>
            </motion.div>

            {/* Solution - GEO Optimized with semantic markup */}
            <motion.div 
              className="solution bg-gradient-to-br from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20 rounded-2xl p-8 shadow-lg border border-green-200/50 dark:border-green-800/50"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500">
                  <FontAwesomeIcon icon={faLightbulb} className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Our Solution</h2>
              </div>
              {/* AI-friendly summary */}
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border-l-4 border-green-500">
                <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">In Summary:</p>
                <p className="text-green-800 dark:text-green-300 font-medium">
                  {questionData.content.call_to_action}
                </p>
              </div>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                {questionData.content.solution}
              </p>
              <div className="call-to-action">
                <Link
                  to="/onboarding"
                  search={{ q: questionData.question }}
                  className="inline-flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold hover:underline"
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
      <section className="benefits-section relative z-10 py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-12"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What You'll Get
            </h2>
            <p className="text-xl text-muted-foreground">
              {questionData.content.call_to_action}
            </p>
            
            {/* Key Benefits Summary for AI parsing */}
            <div className="mt-6 p-4 bg-background/80 rounded-lg border border-border/50 max-w-3xl mx-auto">
              <p className="text-sm font-semibold text-muted-foreground mb-2">Key Benefits:</p>
              <p className="text-foreground text-base">
                {questionData.content.benefits.slice(0, 3).join(", ").toLowerCase()}, and more personalized solutions.
              </p>
            </div>
          </motion.div>

          <div className="benefits-list grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {questionData.content.benefits.map((benefit, index) => (
              <motion.div
                key={index}
                className="benefit-item bg-background rounded-xl p-6 shadow-lg border border-border/50 hover:shadow-xl transition-all duration-300"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9 + index * 0.1 }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                    <FontAwesomeIcon icon={faCheckCircle} className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-foreground font-medium">{benefit}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Additional structured summary for AI platforms */}
          <div className="mt-12 text-center max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200/50 dark:border-blue-800/50">
              <h3 className="text-lg font-bold text-foreground mb-3">Complete Solution Package</h3>
              <p className="text-muted-foreground">
                Get {questionData.content.benefits.length} specific benefits including {questionData.content.benefits[0].toLowerCase()}, 
                {questionData.content.benefits[1] ? ` ${questionData.content.benefits[1].toLowerCase()},` : ''} 
                and comprehensive support for {questionData.question.toLowerCase()}.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Social Proof */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12">
              <div className="flex flex-col items-center">
                <div className="p-4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 mb-4">
                  <FontAwesomeIcon icon={faShield} className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-foreground mb-2">Bank-Level Security</h3>
                <p className="text-muted-foreground text-sm">Your financial data is protected with industry-leading encryption</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="p-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mb-4">
                  <FontAwesomeIcon icon={faStar} className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-foreground mb-2">4.8/5 Rating</h3>
                <p className="text-muted-foreground text-sm">Trusted by thousands of users achieving their financial goals</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="p-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 mb-4">
                  <FontAwesomeIcon icon={faGraduationCap} className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-foreground mb-2">Expert-Led</h3>
                <p className="text-muted-foreground text-sm">All advice backed by certified financial professionals</p>
              </div>
            </div>

            {/* Final CTA */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-8 text-white">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                Ready to Solve This Financial Challenge?
              </h3>
              <p className="text-xl opacity-90 mb-6">
                Get personalized guidance from our AI financial coach in under 2 minutes.
              </p>
              <Link
                to="/onboarding"
                search={{ q: questionData.question }}
                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-purple-600 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <FontAwesomeIcon icon={faRocket} className="h-5 w-5" />
                Start Your Financial Journey
                <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
              </Link>
              <p className="text-sm opacity-75 mt-4">
                Free to start • No credit card required • Get results in minutes
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}