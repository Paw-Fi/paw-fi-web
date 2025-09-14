"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar,
  faClock,
  faGift,
  faTrophy,
  faChartLine,
  faUsers,
  faCheckCircle,
  faWandSparkles,
  faRocket,
} from "@fortawesome/free-solid-svg-icons";
import { useRemainingSpots } from "@/hooks/use-early-access";
import { FreeTrialGiveawayForm } from "@/components/forms/FreeTrialGiveawayForm";
import {
  fadeInUp,
  fadeInDown,
  staggerContainer,
  elasticScale,
} from "@/lib/motion-variants";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import icon from "@/assets/images/pawfi-icon.png"
import { OptimizedImage } from "@/components/seo/optimized-image";

const SPOTS = 100;
const CAMPAIGN_END_DATE = new Date('2025-09-30T23:59:59.999Z');

export const Route = createFileRoute("/early-access")({
  component: EarlyAccessPage,
  head: () => {
    const pageUrl = getCanonicalUrl("/early-access");
    const title = "Get Early Access to Moneko - Limited Spots Available!";
    const description =
      `Join the exclusive early access program for Moneko! Only ${SPOTS} spots available. Get premium features, personalized financial guidance, and be part of shaping the future of financial education.`;
    const keywords =
      "early access, financial education, premium features, limited spots, financial planning, investing app, personal finance";

    const meta = seo({
      title: title,
      description: description,
      keywords: keywords,
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });

    return {
      meta,
      link: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
    };
  },
});

const features = [
  {
    icon: faWandSparkles,
    title: "AI-Powered Personal Coach",
    description: "Get personalized financial advice tailored to your goals",
    premium: true,
  },
  {
    icon: faChartLine,
    title: "Advanced Analytics",
    description: "Track your progress with detailed insights and predictions",
    premium: true,
  },
  {
    icon: faTrophy,
    title: "Exclusive Rewards",
    description: "Unlock premium badges and achievements",
    premium: true,
  },
  {
    icon: faUsers,
    title: "Priority Support",
    description: "Direct access to our financial experts",
    premium: true,
  },
];

function CountdownTimer({ targetCount = SPOTS }: { targetCount?: number }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const calculateTimeLeft = () => {
    const now = new Date().getTime();
    const endTime = CAMPAIGN_END_DATE.getTime();
    const difference = endTime - now;

    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      };
    } else {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
  };

  useEffect(() => {
    // Set initial time
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  if (isExpired) {
    return (
      <div className="text-center">
        <div className="rounded-2xl bg-red-100/20 p-8 backdrop-blur-xl">
          <div className="text-2xl font-bold text-red-200 mb-3">Campaign Ended</div>
          <div className="text-red-300">The early access period has concluded.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-4 sm:gap-6">
      {Object.entries(timeLeft).filter(([unit]) => unit !== "seconds").map(([unit, value]) => (
        <motion.div
          key={unit}
          className="flex flex-col items-center rounded-2xl bg-white/20 p-4 sm:p-6 backdrop-blur-xl min-w-[70px] sm:min-w-[90px]"
          variants={elasticScale}
          initial="hidden"
          animate="visible"
          custom={Math.random() * 0.5}
        >
          <div className="text-2xl sm:text-3xl font-bold text-white">{String(value).padStart(2, '0')}</div>
          <div className="text-xs sm:text-sm text-purple-100 capitalize">{unit}</div>
        </motion.div>
      ))}
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const percentage = ((total - current) / total) * 100;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-3 flex justify-between text-sm">
        <span className="text-purple-200">Progress</span>
        <span className="text-white font-medium">
          {total - current} / {total} claimed
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/20 backdrop-blur-sm">
        <motion.div
          className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      <div className="mt-3 text-center text-sm text-purple-200">
        {current} spots remaining
      </div>
    </div>
  );
}

export default function EarlyAccessPage() {
  const navigate = useNavigate();

  // Use TanStack Query hooks
  const { data: remainingSpots = 0, isLoading: spotsLoading } = useRemainingSpots();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#7e46eb] via-[#6d28d9] to-[#5b21b6]">
      {/* Subtle animated background */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white/30"
            animate={{
              x: [0, 50, 0],
              y: [0, -50, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 15 + i * 0.8,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.header
        className="relative z-10 bg-black/10 backdrop-blur-xl"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <OptimizedImage src={icon} alt="Moneko" className="size-8 rounded-lg" />
              <span className="text-xl font-bold text-white">Moneko</span>
            </div>
            <motion.button
              onClick={() => navigate({ to: "/" })}
              className="text-purple-200 hover:text-white transition-colors duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Back to Home
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section */}
        <section className="px-6 min-h-screen text-center pt-32">
          <div className="mx-auto max-w-4xl">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
             
                <motion.div
                  className="mb-8 inline-flex items-center rounded-full bg-gradient-to-r from-[#ec4899] to-[#9333ea] px-6 py-3 text-white"
                  variants={fadeInDown}
                >
                  Limited Time Offer - Only {remainingSpots} Spots Left!
                </motion.div>
              

              <motion.h1
                className="mb-8 text-4xl font-bold text-white md:text-6xl leading-tight"
                variants={fadeInUp}
                custom={0.1}
              >
                Free Trial Giveaway
              </motion.h1>

              <motion.p
                className="mb-12 text-lg text-purple-100 md:text-xl leading-relaxed max-w-3xl mx-auto"
                variants={fadeInUp}
                custom={0.2}
              >
               Be among the first 100 pioneers to experience the future of investing for beginners. Your journey to building your first portfolio starts here.
              </motion.p>

              <motion.div
                className="mb-16"
                variants={fadeInUp}
                custom={0.3}
              >
                <ProgressBar current={spotsLoading ? SPOTS : remainingSpots} total={SPOTS} />
              </motion.div>

              <motion.div
                className="mb-12"
                variants={fadeInUp}
                custom={0.4}
              >
                <CountdownTimer />
              </motion.div>

              {/* Early Access Form */}
              <motion.div
                className="max-w-2xl mx-auto"
                variants={fadeInUp}
                custom={0.5}
              >
                <FreeTrialGiveawayForm />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <motion.h2
              className="mb-16 text-center text-4xl font-bold text-white"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              Exclusive Premium Features
            </motion.h2>

            <motion.div
              className="grid gap-8 md:grid-cols-2"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="group relative overflow-hidden rounded-3xl bg-white/10 p-8 backdrop-blur-xl transition-all duration-200 hover:bg-white/15"
                  variants={fadeInUp}
                  custom={index * 0.1}
                  whileHover={{ y: -2 }}
                >
                  <div className="absolute top-6 right-6">
                    <div className="rounded-full bg-gradient-to-br from-purple-400 to-pink-400 px-3 py-1 text-xs font-bold text-white">
                      PREMIUM
                    </div>
                  </div>
                  <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm">
                    <FontAwesomeIcon
                      icon={feature.icon}
                      className="text-xl text-purple-300"
                    />
                  </div>
                  <h3 className="mb-4 text-xl font-bold text-white">
                    {feature.title}
                  </h3>
                  <p className="text-purple-200 leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="px-6 py-24">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              className="rounded-3xl bg-white/10 p-12 backdrop-blur-xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">5000+</div>
                  <div className="text-purple-200">People Waiting</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">
                    {SPOTS - remainingSpots}
                  </div>
                  <div className="text-purple-200">Already Joined</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">98%</div>
                  <div className="text-purple-200">Satisfaction Rate</div>
                </div>
              </div>
              <p className="text-purple-100 leading-relaxed">
                Join thousands of users who are already improving their
                financial future with Moneko
              </p>
            </motion.div>
          </div>
        </section>
      </main>

    </div>
  );
}