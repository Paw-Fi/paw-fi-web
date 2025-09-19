"use client";

import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Users, Clock, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useRemainingSpots } from "@/hooks/use-early-access";
import { FreeTrialGiveawayForm } from "@/components/forms/FreeTrialGiveawayForm";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import icon from "@/assets/images/pawfi-icon.png"
import { OptimizedImage } from "@/components/seo/optimized-image";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BorderBeam } from "@/components/ui/border-beam";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import { cn } from "@/lib/utils";

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

// Apple-like easing curves following design system

const features = [
  {
    title: "AI-Powered Personal Coach",
    description: "Get personalized financial advice tailored to your unique goals and situation",
    icon: Zap,
    premium: true,
  },
  {
    title: "Advanced Analytics", 
    description: "Track your progress with detailed insights and predictions",
    icon: Shield,
    premium: true,
  },
  {
    title: "Exclusive Rewards",
    description: "Unlock premium badges and achievements as you learn", 
    icon: Users,
    premium: true,
  },
  {
    title: "Priority Support",
    description: "Direct access to our financial experts when you need help",
    icon: Clock,
    premium: true,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as any,
    },
  },
};

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const campaignEnd = CAMPAIGN_END_DATE.getTime();
      const difference = campaignEnd - now;

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        };
      }
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());
    return () => clearInterval(timer);
  }, []);

  if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
    return (
      <motion.div 
        className="text-center p-8 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700"
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-2">Campaign Ended</div>
        <div className="text-slate-600 dark:text-slate-400">
          Thanks for your interest! Stay tuned for updates.
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="flex justify-center gap-3 sm:gap-4"
      variants={itemVariants}
      initial="hidden"
      animate="visible"
    >
      {Object.entries(timeLeft).filter(([unit]) => unit !== "seconds").map(([unit, value], index) => (
        <motion.div
          key={unit}
          className="flex flex-col items-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 sm:p-5 min-w-[70px] sm:min-w-[80px] shadow-sm border border-slate-200/50 dark:border-slate-700/50"
          variants={itemVariants}
          transition={{ delay: index * 0.05 }}
        >
          <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-1">
            {String(value).padStart(2, '0')}
          </div>
          <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 capitalize font-medium">
            {unit}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const percentage = ((total - current) / total) * 100;

  return (
    <motion.div 
      className="w-full max-w-md mx-auto"
      variants={itemVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="mb-4 flex justify-between items-center">
        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Progress</span>
        <span className="text-sm text-slate-800 dark:text-slate-200 font-semibold">
          {total - current} of {total} claimed
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-slate-800 dark:bg-slate-300"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </div>
      <div className="mt-3 text-center">
        <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{current}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">spots remaining</span>
      </div>
    </motion.div>
  );
}

export default function EarlyAccessPage() {
  const navigate = useNavigate();
  const { data: remainingSpots = 0, isLoading: spotsLoading } = useRemainingSpots();

  return (
    <div className="min-h-screen relative bg-white dark:bg-gray-900 overflow-hidden">
      {/* Background Beams with Collision - Rotated for meteor effect */}
      <BackgroundBeamsWithCollision className="fixed inset-0 z-0 h-screen">
        </BackgroundBeamsWithCollision>
     
      
      {/* Dotted grid pattern overlay - exactly like Uninbox */}
      <DotPattern
        className={cn(
          "fixed inset-0 opacity-30 dark:opacity-15 pointer-events-none z-[1]",
          "[mask-image:radial-gradient(1200px_circle_at_center,white,transparent)]"
        )}
        cr={1}
        cx={20}
        cy={20}
      />

      {/* Header - Exact Uninbox style */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
           <Link to="/">
           <motion.div 
              className="flex items-center space-x-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <OptimizedImage src={icon} alt="Moneko" className="size-7 rounded-lg" />
              <span className="text-lg font-semibold text-slate-800 dark:text-slate-200">Moneko</span>
            </motion.div>
           </Link>
            <motion.button
              onClick={() => navigate({ to: "/" })}
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all duration-200 px-3 py-2 rounded-md hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ x: -2 }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section - Exact Uninbox style */}
        <section className="px-6 py-24 pt-32">
          <motion.div 
            className="max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="text-center">
              <motion.div 
                className="mb-8 inline-flex items-center rounded-full bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm px-5 py-2 text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                variants={itemVariants}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">
                    Limited spots • Only {remainingSpots} left
                  </span>
                </div>
              </motion.div>

              <motion.div className="mb-8" variants={itemVariants}>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-800 dark:text-slate-200 leading-tight tracking-tight">
                  Free Trial
                  <br />
                  <span className="bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">Giveaway</span>
                </h1>
              </motion.div>

              <motion.p 
                className="mb-16 text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto"
                variants={itemVariants}
              >
                Be among the first 100 pioneers to experience the future of investing for beginners.
                <br className="hidden sm:block" />
                <span className="text-slate-500 dark:text-slate-500">Your journey starts here.</span>
              </motion.p>

              <motion.div className="mb-16" variants={itemVariants}>
                <ProgressBar current={spotsLoading ? SPOTS : remainingSpots} total={SPOTS} />
              </motion.div>

              <motion.div className="mb-16" variants={itemVariants}>
                <CountdownTimer />
              </motion.div>

              <motion.div className="max-w-xl mx-auto" variants={itemVariants}>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-100/30 via-white/50 to-slate-100/30 dark:from-slate-800/30 dark:via-slate-900/50 dark:to-slate-800/30 rounded-2xl blur-3xl" />
                  <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
                    <FreeTrialGiveawayForm />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>
  
        {/* Features Section - Exact Uninbox style */}
        <section className="px-6 py-20 bg-slate-50/50 dark:bg-slate-800/50">
          <motion.div 
            className="max-w-5xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <motion.h2 
              className="mb-16 text-center text-4xl sm:text-5xl font-bold text-slate-800 dark:text-slate-200 tracking-tight"
              variants={itemVariants}
            >
              Exclusive Premium Features
            </motion.h2>

            <div className="grid gap-6 md:grid-cols-2">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200"
                    variants={itemVariants}
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                        <Icon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                        PREMIUM
                      </div>
                    </div>
                    <h3 className="mb-3 text-xl font-semibold text-slate-800 dark:text-slate-200">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>

        {/* Social Proof - Exact Uninbox style */}
        <section className="px-6 py-20">
          <motion.div 
            className="max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <motion.div 
              className="bg-white dark:bg-slate-800 rounded-2xl p-8 sm:p-12 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
              variants={itemVariants}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                  { value: "5000+", label: "People Waiting" },
                  { value: String(SPOTS - remainingSpots), label: "Already Joined" },
                  { value: "98%", label: "Satisfaction Rate" }
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    className="text-center p-4"
                    variants={itemVariants}
                  >
                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">{stat.value}</div>
                    <div className="text-slate-600 dark:text-slate-400 font-medium text-sm">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
              <motion.p 
                className="text-center text-slate-600 dark:text-slate-400 leading-relaxed"
                variants={itemVariants}
              >
                Join thousands of users already improving their financial future with Moneko
              </motion.p>
            </motion.div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}