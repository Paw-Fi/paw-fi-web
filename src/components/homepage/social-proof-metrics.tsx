import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

const metrics = [
  {
    value: "Chat-first",
    label: "Budgeting",
    description: "Log and review spending from messaging",
  },
  {
    value: "Faster",
    label: "Capture",
    description: "Receipts, voice notes, and notifications",
  },
  {
    value: "Pockets",
    label: "System",
    description: "Envelope-style budgeting that stays usable",
  },
  {
    value: "Shared",
    label: "Households",
    description: "Couples and family budgeting workflows",
  },
];

export function SocialProofMetrics() {
  return (
    <section className="relative z-10 flex min-h-screen items-center bg-gradient-to-br from-slate-50/30 to-gray-50/20 px-4 py-16 sm:px-6 lg:px-8 dark:from-slate-900/30 dark:to-gray-900/20">
      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-foreground mb-6 text-3xl font-bold sm:text-4xl md:text-5xl">
            A simpler way to stay on budget
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-xl">
            Capture spending quickly, plan with pockets, and keep your budget up
            to date.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="rounded-2xl bg-white/60 p-8 text-center shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl dark:bg-slate-900/60"
            >
              <div className="text-primary mb-4 text-4xl font-bold sm:text-5xl">
                {metric.value}
              </div>
              <div className="text-foreground mb-2 text-xl font-semibold">
                {metric.label}
              </div>
              <div className="text-muted-foreground">{metric.description}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
