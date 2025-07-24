"use client";

import { motion, Variants, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faTrophy,
  faCrown,
  faDiamond,
  faRocket,
} from "@fortawesome/free-solid-svg-icons";
import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import { useRemainingSpots } from "@/hooks/use-early-access";
import { DISCORD_URL } from "@/routes";

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
      className="relative overflow-hidden px-4 sm:px-6 md:px-12 lg:px-24"
    >
   

      {/* Header Section */}
      <motion.div
        className="relative z-10 mb-16 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div
          className="mb-8 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-accent-pink/90 to-primary/90 dark:from-dark-accent-pink/90 dark:to-dark-primary/90 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-primary/20 dark:shadow-dark-primary/20 backdrop-blur-xl"
          variants={badgeVariants}
        >
          <FontAwesomeIcon icon={faRocket} className="mr-2" />
          Limited Time Offer
        </motion.div>

        {/* Heading */}
        <motion.h1
          id="early-access-heading"
          className="mb-6 text-5xl font-bold text-foreground dark:text-dark-foreground md:text-6xl"
          variants={itemVariants}
        >
          Free Trial Giveaway
        </motion.h1>

        {/* Paragraph */}
        <motion.p
          className="mx-auto max-w-2xl text-xl text-gray-700 dark:text-gray-300"
          variants={itemVariants}
        >
          Be among the first{" "}
          <span className="font-semibold text-primary dark:text-dark-primary">
            100 pioneers
          </span>{" "}
          to experience the future of investing for beginners.
        </motion.p>
      </motion.div>

      {/* Main Content Card */}
      <motion.div
        className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/20 bg-white/20 shadow-2xl shadow-primary/10 dark:shadow-dark-primary/10 backdrop-blur-xl dark:border-gray-700/20 dark:bg-gray-900/20"
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Feature Grid */}
        <div className="grid grid-cols-1 gap-8 p-8 sm:p-10 md:grid-cols-3 md:p-12">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center rounded-2xl border border-white/30 bg-white/30 p-6 shadow-lg backdrop-blur-sm transition-all hover:-translate-y-1 hover:bg-white/40 hover:shadow-primary/10 dark:hover:shadow-dark-primary/10 dark:border-gray-700/30 dark:bg-gray-800/20 dark:hover:bg-gray-800/30"
              variants={itemVariants}
              custom={index * 0.1}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              <span className="text-2xl text-white">{benefit.icon}</span>

              <h3 className="text-center text-lg font-semibold text-foreground dark:text-dark-foreground">
                {benefit.title}
              </h3>
            </motion.div>
          ))}
        </div>

        {/* CTA Button & Spots Left */}
        <div className="px-8 pb-12 sm:px-10 md:px-12">
          <AnimatePresence mode="wait">
            <Link to="/early-access" className="block w-full">
              <motion.button
                className="mb-6 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-primary to-secondary dark:from-dark-primary dark:to-dark-secondary px-6 py-5 font-semibold text-white shadow-lg shadow-primary/30 dark:shadow-dark-primary/30"
                variants={buttonVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                whileTap="tap"
              >
                Claim Your Membership
                <FontAwesomeIcon
                  icon={faArrowRight}
                  className="ml-3 text-sm transition-transform group-hover:translate-x-1"
                />
              </motion.button>
            </Link>
          </AnimatePresence>

          {/* Spots Left Counter */}
          <motion.p
            className="text-center font-medium text-primary dark:text-dark-primary"
            variants={itemVariants}
          >
            {isLoading ? (
              <span className="mr-2 inline-block rounded-full bg-primary/10 dark:bg-dark-primary/20 px-3 py-1 text-sm">
                Loading...
              </span>
            ) : (
              <span className="mr-2 inline-block bg-gradient-to-r from-primary via-secondary to-icon bg-clip-text text-transparent dark:from-dark-primary dark:via-dark-secondary dark:to-dark-icon">
                {remainingSpots} spots left - Hurry up!
              </span>
            )}
          </motion.p>
        </div>
      </motion.div>

      {/* Footer Section - Discord Link */}
      <motion.div
        className="relative z-10 mt-16 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.p
          className="mb-4 text-gray-700 dark:text-gray-300"
          variants={itemVariants}
        >
          Join our vibrant community on Discord
        </motion.p>

        <motion.a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-indigo/90 dark:bg-dark-accent-indigo/90 px-6 py-3 font-semibold text-white backdrop-blur-lg transition-all hover:-translate-y-1 hover:bg-accent-indigo dark:hover:bg-dark-accent-indigo hover:shadow-lg hover:shadow-accent-indigo/30 dark:hover:shadow-dark-accent-indigo/30"
          variants={itemVariants}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          aria-label="Connect on Discord"
        >
          <FontAwesomeIcon icon={faDiscord} />
          Connect on Discord
        </motion.a>
      </motion.div>
    </section>
  );
};
