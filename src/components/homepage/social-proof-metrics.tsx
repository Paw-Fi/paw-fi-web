import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

const metrics = [
  {
    value: "50,000+",
    label: "Active Users",
    description: "Trust Moneko with their finances"
  },
  {
    value: "$2.3M+",
    label: "Total Saved",
    description: "By our users in the last year"
  },
  {
    value: "4.9★",
    label: "User Rating",
    description: "Based on 10,000+ reviews"
  },
  {
    value: "127%",
    label: "Better Returns",
    description: "Vs traditional savings accounts"
  }
];

export function SocialProofMetrics() {
  return (
    <section className="relative z-10 min-h-screen flex items-center px-4 py-16 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50/30 to-gray-50/20 dark:from-slate-900/30 dark:to-gray-900/20">
      <div className="mx-auto max-w-6xl w-full">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold text-foreground mb-6 sm:text-4xl md:text-5xl">
            Trusted by Thousands, Proven by Results
          </h2>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Real metrics from real users who've transformed their financial lives
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center p-8 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="text-4xl font-bold text-primary mb-4 sm:text-5xl">
                {metric.value}
              </div>
              <div className="text-xl font-semibold text-foreground mb-2">
                {metric.label}
              </div>
              <div className="text-muted-foreground">
                {metric.description}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
