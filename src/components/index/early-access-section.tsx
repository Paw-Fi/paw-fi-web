"use client";

import { motion, Variants, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faRocket } from "@fortawesome/free-solid-svg-icons";
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
      className="px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-4xl">
        {/* Header Section */}
        <motion.div
          className="mb-8 text-center sm:mb-12 md:mb-16"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div variants={badgeVariants}>
            <div className="mb-6 inline-flex items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700 sm:mb-8 sm:px-4 sm:py-2 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
              <FontAwesomeIcon
                icon={faRocket}
                className="mr-1.5 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4"
              />
              <span className="text-xs font-semibold sm:text-sm">
                Limited Time Offer
              </span>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h2
            id="early-access-heading"
            className="mb-4 text-2xl leading-tight font-bold text-gray-900 sm:mb-6 sm:text-3xl md:text-4xl lg:text-5xl dark:text-white"
            variants={itemVariants}
          >
            Free Trial Giveaway
          </motion.h2>

          {/* Paragraph */}
          <motion.p
            className="text-muted-foreground dark:text-moneko-foreground mx-auto max-w-2xl text-base leading-relaxed sm:text-lg md:text-xl"
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
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          {/* Benefits Grid */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:mb-10 sm:gap-6 md:mb-12 md:grid-cols-3">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                className="touch-manipulation rounded-xl border border-gray-200 bg-white p-4 text-center transition-colors duration-200 hover:border-blue-200 active:scale-[0.98] sm:rounded-2xl sm:p-6 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-blue-700"
                variants={itemVariants}
                custom={index * 0.1}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
              >
                <div className="mb-3 text-2xl sm:mb-4 sm:text-3xl">
                  {benefit.icon}
                </div>
                <h3 className="mb-2 text-base leading-tight font-semibold text-gray-900 sm:text-lg dark:text-white">
                  {benefit.title}
                </h3>
              </motion.div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="space-y-4 text-center sm:space-y-6">
            <AnimatePresence mode="wait">
              <Link to="/download" className="block">
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground inline-flex touch-manipulation items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold transition-colors duration-200 active:scale-95 sm:gap-3 sm:rounded-2xl sm:px-8 sm:py-4 sm:text-lg"
                  asChild
                >
                  <motion.button
                    variants={buttonVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    whileTap="tap"
                  >
                    Download to Claim Your Trial
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
              className="text-center text-sm font-medium text-gray-600 sm:text-base dark:text-gray-400"
              variants={itemVariants}
            >
              {isLoading ? (
                <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs text-gray-600 sm:px-3 sm:text-sm dark:bg-gray-800 dark:text-gray-400">
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
          className="mt-12 text-center sm:mt-14 md:mt-16"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            className="text-muted-foreground dark:text-moneko-foreground mb-3 text-sm sm:mb-4 sm:text-base"
            variants={itemVariants}
          >
            Join our vibrant community
          </motion.p>

          <Button
            className="touch-manipulation rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-indigo-700 active:scale-95 sm:rounded-xl sm:px-6 sm:py-3 sm:text-base"
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
              <FontAwesomeIcon
                icon={faDiscord}
                className="h-3 w-3 sm:h-4 sm:w-4"
              />
              Join Discord
            </motion.a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
