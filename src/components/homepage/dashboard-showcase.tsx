import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

const features = [
  {
    id: "ai-coach",
    title: "AI Personal Finance Coach",
    description: "Get personalized budgeting advice, investment recommendations, and money-saving insights from CFA-certified AI that learns your spending habits and financial goals.",
    image: "/src/assets/images/home-showcase/finni-ai.png",
    stats: "95% accuracy rate"
  },  
  {
    id: "ai-assistant",
    title: "Smart Budgeting App",
    description: "Create budgets that actually work with AI-powered spending analysis, bill tracking, and automated savings recommendations. Better than Mint's basic categorization.",
    image: "/src/assets/images/home-showcase/moneko-ai.png",
    stats: "Users save $15K+ annually"
  },  
  {
    id: "goal-tracking",
    title: "Financial Goal Tracker",
    description: "Set and achieve specific savings goals like emergency funds, vacation money, or debt payoff. Track progress automatically and celebrate milestones with gamified rewards.",
    image: "/src/assets/images/home-showcase/dashboard-goal-tracker.png",
    stats: "Average $15K saved in year 1"
  },
  {
    id: "portfolio",
    title: "Investment Portfolio Manager",
    description: "Build diversified investment portfolios with AI-guided asset allocation, automatic rebalancing, and risk management. Outperform traditional robo-advisors.",
    image: "/src/assets/images/home-showcase/dashboard-porfolio.png",
    stats: "127% better returns than savings"
  },
  {
    id: "learning",
    title: "Financial Education Platform",
    description: "Master personal finance with interactive courses on budgeting, investing, retirement planning, and debt management. Learn from MBA and CFA-certified instructors.",
    image: "/src/assets/images/home-showcase/dashboard-learning.png",
    stats: "50+ courses from financial experts"
  }
];

export function DashboardShowcase() {
  const [selectedFeature, setSelectedFeature] = useState(features[0]);

  return (
    <section className="relative z-10 px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <motion.h2
            className="text-foreground mb-6 text-4xl leading-tight font-bold sm:text-5xl md:text-6xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            The Best Mint Alternative: Your AI-Powered Financial Dashboard
          </motion.h2>
          
          <motion.p
            className="text-muted-foreground mx-auto max-w-3xl text-xl leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            Discover why 50,000+ former Mint users chose Moneko's AI finance coach to save $2.3M+ and achieve 127% better investment returns
          </motion.p>
        </div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <div className="flex flex-wrap justify-center gap-2 p-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/20">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setSelectedFeature(feature)}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  selectedFeature.id === feature.id
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-800/50'
                }`}
              >
                {feature.title}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Dashboard Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="relative"
        >
          {/* Browser Frame */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Browser Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/20">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1 mx-6">
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg px-4 py-2 text-sm text-muted-foreground">
                  moneko.io/dashboard
                </div>
              </div>
              <div className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                {selectedFeature.stats}
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="relative bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedFeature.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="relative"
                >
                  <img
                    src={selectedFeature.image}
                    alt={selectedFeature.title}
                    className="w-full h-auto object-cover"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Feature Description */}
          <motion.div
            key={selectedFeature.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-8 text-center"
          >
            <h3 className="text-2xl font-bold text-foreground mb-4">
              {selectedFeature.title}
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mx-auto mb-8">
              {selectedFeature.description}
            </p>
            <Button 
              asChild
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-semibold"
            >
              <Link to="/dashboard">
                Try {selectedFeature.title}
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
