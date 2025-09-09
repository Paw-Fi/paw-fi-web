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
      className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-4xl">
        {/* Header Section */}
        <motion.div
          className="text-center mb-8 sm:mb-12 md:mb-16"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div variants={badgeVariants}>
            <div className="mb-6 sm:mb-8 inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
              <FontAwesomeIcon icon={faRocket} className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm font-semibold">Limited Time Offer</span>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h2
            id="early-access-heading"
            className="mb-4 sm:mb-6 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight"
            variants={itemVariants}
          >
            Free Trial Giveaway
          </motion.h2>

          {/* Paragraph */}
          <motion.p
            className="mx-auto max-w-2xl text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed dark:text-moneko-foreground"
            variants={itemVariants}
          >
            Be among the first{" "}
            <span className="font-semibold text-blue-600 dark:text-blue-600">
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
          <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-8 sm:mb-10 md:mb-12 md:grid-cols-3">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                className="text-center p-4 sm:p-6 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl sm:rounded-2xl hover:border-blue-200 dark:hover:border-blue-700 transition-colors duration-200 touch-manipulation active:scale-[0.98]"
                variants={itemVariants}
                custom={index * 0.1}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
              >
                <div className="text-2xl sm:text-3xl mb-3 sm:mb-4">{benefit.icon}</div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2 leading-tight">
                  {benefit.title}
                </h3>
              </motion.div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="text-center space-y-4 sm:space-y-6">
            <AnimatePresence mode="wait">
              <Link to="/early-access" className="block">
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-xl sm:rounded-2xl transition-colors duration-200 inline-flex items-center gap-2 sm:gap-3 touch-manipulation active:scale-95"
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
                      className="h-3 w-3 sm:h-4 sm:w-4"
                    />
                  </motion.button>
                </Button>
              </Link>
            </AnimatePresence>

            {/* Spots Left Counter */}
            <motion.p
              className="text-center font-medium text-gray-600 dark:text-gray-400 text-sm sm:text-base"
              variants={itemVariants}
            >
              {isLoading ? (
                <span className="inline-flex items-center px-2.5 sm:px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-xs sm:text-sm">
                  Loading...
                </span>
              ) : (
                <span className="font-semibold text-blue-600 dark:text-blue-600">
                  Only {remainingSpots} spots remaining
                </span>
              )}
            </motion.p>
          </div>
        </motion.div>

        {/* Discord CTA */}
        <motion.div
          className="mt-12 sm:mt-14 md:mt-16 text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            className="mb-3 sm:mb-4 text-sm sm:text-base text-muted-foreground dark:text-moneko-foreground"
            variants={itemVariants}
          >
            Join our vibrant community
          </motion.p>

          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium transition-colors duration-200 touch-manipulation active:scale-95"
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
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2"
            >
              <FontAwesomeIcon icon={faDiscord} className="h-3 w-3 sm:h-4 sm:w-4" />
              Join Discord
            </motion.a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};