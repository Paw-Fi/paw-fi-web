import { motion } from "framer-motion";
import { AISearchInput } from "@/components/ui/ai-search-input";

const chatSuggestions = [
  "Help me save my first $1,000",
  "Create a budget that actually works",
  "Start investing with just $100",
  "Pay off my debt faster", 
  "Build my emergency fund",
  "Best Mint alternative features"
];

export function HeroDashboardPreview() {
  return (
    <section className="relative z-10 min-h-screen flex items-center px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center w-full">       

        <motion.h1
          className="text-4xl font-bold leading-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Master Your Money with{" "}
          <span className="text-primary">Moneko</span>
        </motion.h1>

        <motion.h2
          className="text-lg text-muted-foreground leading-relaxed sm:text-xl md:text-2xl mb-12 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          The best <strong>Mint alternative</strong> that helps you save your first $1,000 in 90 days
        </motion.h2>

        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <AISearchInput
            placeholder="Ask Moneko AI: 'Help me save $1,000' or 'Create my first budget' or 'Best investment for beginners'"
            suggestions={chatSuggestions}
          />
        </motion.div>


        <motion.div
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          No credit card required • Bank-level security • Free financial education
        </motion.div>
      </div>
    </section>
  );
}
