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
    color: "from-amber-300 to-amber-500",
  },
  {
    icon: "👑",
    title: "1 Month Free of Premium",
    color: "from-amber-300 to-amber-500",
  },
  {
    icon: "💎",
    title: "30% Off Premium for 1 Year after trial",
    color: "from-blue-300 to-blue-500",
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
    boxShadow: "0 10px 25px -5px rgba(124, 58, 237, 0.5)",
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
      className="relative overflow-hidden px-4 py-24 sm:px-6 md:px-12 lg:px-24"
    >
      {/* Ambient background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-[20%] -top-[30%] h-[70%] w-[70%] rounded-full bg-gradient-to-r from-purple-200/30 to-purple-400/30 blur-3xl" />
        <div className="absolute -bottom-[30%] -left-[20%] h-[70%] w-[70%] rounded-full bg-gradient-to-r from-blue-200/30 to-purple-300/30 blur-3xl" />
      </div>

      {/* Header Section */}
      <motion.div
        className="relative z-10 mb-16 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div
          className="mb-8 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-pink-500/90 to-purple-600/90 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-purple-500/20 backdrop-blur-xl"
          variants={badgeVariants}
        >
          <FontAwesomeIcon icon={faRocket} className="mr-2" />
          Limited Time Offer
        </motion.div>

        {/* Heading */}
        <motion.h1
          id="early-access-heading"
          className="mb-6 text-5xl font-bold text-black md:text-6xl"
          variants={itemVariants}
        >
          Free Trial Giveaway
        </motion.h1>

        {/* Paragraph */}
        <motion.p
          className="mx-auto max-w-2xl text-xl text-slate-700 dark:text-slate-300"
          variants={itemVariants}
        >
          Be among the first{" "}
          <span className="font-semibold text-purple-700 dark:text-purple-300">
            100 pioneers
          </span>{" "}
          to experience the future of investing for beginners.
        </motion.p>
      </motion.div>

      {/* Main Content Card */}
      <motion.div
        className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/20 bg-white/20 shadow-2xl shadow-purple-500/10 backdrop-blur-xl dark:border-slate-700/20 dark:bg-slate-900/20"
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Feature Grid */}
        <div className="grid grid-cols-1 gap-8 p-8 sm:p-10 md:grid-cols-3 md:p-12">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center rounded-2xl border border-white/30 bg-white/30 p-6 shadow-lg backdrop-blur-sm transition-all hover:-translate-y-1 hover:bg-white/40 hover:shadow-purple-400/10 dark:border-slate-700/30 dark:bg-slate-800/20 dark:hover:bg-slate-800/30"
              variants={itemVariants}
              custom={index * 0.1}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              <span className="text-2xl text-white">{benefit.icon}</span>

              <h3 className="text-center text-lg font-semibold text-slate-800 dark:text-white">
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
                className="mb-6 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-purple-700 px-6 py-5 font-semibold text-white shadow-lg shadow-purple-500/30"
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
            className="text-center font-medium text-purple-600 dark:text-purple-300"
            variants={itemVariants}
          >
            {isLoading ? (
              <span className="mr-2 inline-block rounded-full bg-purple-100 px-3 py-1 text-sm dark:bg-purple-900/30">
                Loading...
              </span>
            ) : (
              <span className="mr-2 inline-block	bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 bg-clip-text text-transparent dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400">
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
          className="mb-4 text-slate-700 dark:text-slate-300"
          variants={itemVariants}
        >
          Join our vibrant community on Discord
        </motion.p>

        <motion.a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600/90 px-6 py-3 font-semibold text-white backdrop-blur-lg transition-all hover:-translate-y-1 hover:bg-indigo-700/90 hover:shadow-lg hover:shadow-indigo-500/30"
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
