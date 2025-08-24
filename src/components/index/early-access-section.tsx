"use client";

import { motion, Variants, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faRocket,
} from "@fortawesome/free-solid-svg-icons";
import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import { useRemainingSpots } from "@/hooks/use-early-access";
import { DISCORD_URL } from "@/routes";
import { Button } from "@/components/ui/button";

const benefits = [
  {
    icon: "🏆",
    title: "Founder Profile Badge",
    color: "from-warning to-warning-light",
  },
  {
    icon: "👑",
    title: "1 Month Free of Premium",
    color: "from-warning to-warning-light",
  },
  {
    icon: "💎",
    title: "30% Off Premium for 1 Year after trial",
    color: "from-primary to-secondary",
  },
];

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const badgeVariants: Variants = {
  hidden: { opacity: 0, y: -20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const buttonVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  hover: {
    scale: 1.03,
    boxShadow: "0 10px 25px -5px rgba(116, 88, 255, 0.5)",
    transition: {
      duration: 0.2,
      ease: "easeInOut",
    },
  },
  tap: {
    scale: 0.97,
  },
};

export const EarlyAccessSection = () => {
  // Use TanStack Query to fetch remaining spots with caching
  const { data: remainingSpots = 98, isLoading } = useRemainingSpots();

  return (
    <section
      aria-labelledby="early-access-heading"
      className="py-20 px-6 lg:px-8"
    >
      <div className="mx-auto max-w-4xl">
        {/* Header Section */}
        <motion.div
          className="text-center mb-16"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div variants={badgeVariants}>
            <div className="mb-8 inline-flex items-center justify-center px-4 py-2 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
              <FontAwesomeIcon icon={faRocket} className="mr-2 h-4 w-4" />
              <span className="text-sm font-semibold">Limited Time Offer</span>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h2
            id="early-access-heading"
            className="mb-6 text-4xl md:text-5xl font-bold text-gray-900 dark:text-white"
            variants={itemVariants}
          >
            Free Trial Giveaway
          </motion.h2>

          {/* Paragraph */}
          <motion.p
            className="mx-auto max-w-2xl text-xl text-muted-foreground"
            variants={itemVariants}
          >
            Be among the first{" "}
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              100 pioneers
            </span>{" "}
            to experience the future of financial learning.
          </motion.p>
        </motion.div>

        {/* Main Content */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Benefits Grid */}
          <div className="grid grid-cols-1 gap-6 mb-12 md:grid-cols-3">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                className="text-center p-6 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-blue-200 dark:hover:border-blue-700 transition-colors duration-200"
                variants={itemVariants}
                custom={index * 0.1}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
              >
                <div className="text-3xl mb-4">{benefit.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {benefit.title}
                </h3>
              </motion.div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="text-center space-y-6">
            <AnimatePresence mode="wait">
              <Link to="/early-access" className="block">
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg font-semibold rounded-2xl transition-colors duration-200 inline-flex items-center gap-3"
                  asChild
                >
                  <motion.button
                    variants={buttonVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    whileTap="tap"
                  >
                    Claim Your Free Trial
                    <FontAwesomeIcon
                      icon={faArrowRight}
                      className="h-4 w-4"
                    />
                  </motion.button>
                </Button>
              </Link>
            </AnimatePresence>

            {/* Spots Left Counter */}
            <motion.p
              className="text-center font-medium text-gray-600 dark:text-gray-400"
              variants={itemVariants}
            >
              {isLoading ? (
                <span className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-sm">
                  Loading...
                </span>
              ) : (
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  Only {remainingSpots} spots remaining
                </span>
              )}
            </motion.p>
          </div>
        </motion.div>

        {/* Discord CTA */}
        <motion.div
          className="mt-16 text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            className="mb-4 text-muted-foreground"
            variants={itemVariants}
          >
            Join our vibrant community
          </motion.p>

          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors duration-200"
            asChild
          >
            <motion.a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label="Connect on Discord"
              className="inline-flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faDiscord} className="h-4 w-4" />
              Join Discord
            </motion.a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};