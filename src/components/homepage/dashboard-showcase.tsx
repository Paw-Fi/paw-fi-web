import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

const features = [
  {
    id: "ai-coach",
    title: "AI Financial Coach",
    description: "Get personalized financial advice and insights powered by certified CFA professionals. Your AI coach learns your habits and provides tailored recommendations.",
    image: "/src/assets/images/home-showcase/moneko-ai.png",
    stats: "95% accuracy rate"
  },
  {
    id: "goal-tracking",
    title: "Smart Goal Tracking",
    description: "Set, monitor, and achieve your financial goals with intelligent progress tracking and automated milestone celebrations.",
    image: "/src/assets/images/home-showcase/dashboard-goal-tracker.png",
    stats: "Average $15K saved"
  },
  {
    id: "portfolio",
    title: "Portfolio Analytics",
    description: "Track your investments with real-time performance insights, risk analysis, and automated rebalancing recommendations.",
    image: "/src/assets/images/home-showcase/dashboard-porfolio.png",
    stats: "127% better returns"
  },
  {
    id: "learning",
    title: "Financial Education Hub",
    description: "Learn from expert-led courses, interactive lessons, and personalized learning paths designed by certified professionals.",
    image: "/src/assets/images/home-showcase/dashboard-learning.png",
    stats: "50+ expert courses"
  }
];

export function DashboardShowcase() {
  const [selectedFeature, setSelectedFeature] = useState(features[0]);

  return (
    <section className="relative z-10 min-h-screen flex items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl w-full">
        {/* Section Header */}
        <div className="mb-12 text-center">
          <motion.h2
            className="text-foreground mb-4 text-3xl leading-tight font-bold sm:text-4xl md:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Your Complete Financial Command Center
          </motion.h2>
          
          <motion.p
            className="text-muted-foreground mx-auto max-w-2xl text-lg leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            Explore the powerful tools that have helped 50,000+ users take control of their financial future
          </motion.p>
        </div>

        {/* Interactive Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Feature List */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`p-6 rounded-2xl cursor-pointer transition-all duration-300 ${
                  selectedFeature.id === feature.id
                    ? 'bg-primary/10'
                    : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/30'
                }`}
                onClick={() => setSelectedFeature(feature)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className={`text-lg font-bold transition-colors ${
                    selectedFeature.id === feature.id
                      ? 'text-primary'
                      : 'text-foreground'
                  }`}>
                    {feature.title}
                  </h3>
                  <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full ml-4 flex-shrink-0">
                    {feature.stats}
                  </div>
                </div>
                
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Right Side - Dashboard Image */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedFeature.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="relative"
              >
                <div className="relative overflow-hidden rounded-2xl shadow-xl">
                  <img
                    src={selectedFeature.image}
                    alt={selectedFeature.title}
                    className="w-full h-auto object-cover"
                  />                 
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
       
      </div>
    </section>
  );
}
