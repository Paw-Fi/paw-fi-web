"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar,
  faUserCheck,
  faClock,
  faGift,
  faRocket,
  faTrophy,
  faChartLine,
  faUsers,
  faArrowRight,
  faCheckCircle,
  faX,
  faWandSparkles,
  faEnvelope,
} from "@fortawesome/free-solid-svg-icons";
import {
  getRemainingSpots,
  claimEarlyAccessSpot,
  type EarlyAccessClaim,
} from "@/lib/early-access";
import {
  fadeInUp,
  fadeInDown,
  staggerContainer,
  elasticScale,
} from "@/lib/motion-variants";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { useCookie } from "@/utils/use-cookie";

const SPOTS = 100;

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

const benefits = [
  "Free premium features for life",
  "Direct input on new features",
  "Exclusive community access",
  "Personal finance consultation",
  "Early access to all future tools",
  "No setup fees or hidden costs",
];

function CountdownTimer({ targetCount = SPOTS }: { targetCount?: number }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 7,
    hours: 23,
    minutes: 45,
    seconds: 12,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return {
            ...prev,
            days: prev.days - 1,
            hours: 23,
            minutes: 59,
            seconds: 59,
          };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex justify-center gap-4">
      {Object.entries(timeLeft).map(([unit, value]) => (
        <motion.div
          key={unit}
          className="flex flex-col items-center rounded-2xl border border-white/30 bg-white/20 p-4 backdrop-blur-xl"
          variants={elasticScale}
          initial="hidden"
          animate="visible"
          custom={Math.random() * 0.5}
        >
          <div className="text-3xl font-bold text-white">{value}</div>
          <div className="text-sm text-purple-100 capitalize">{unit}</div>
        </motion.div>
      ))}
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const percentage = ((total - current) / total) * 100;

  return (
    <div className="w-full">
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-purple-200">Progress</span>
        <span className="text-white font-medium">
          {total - current} / {total} claimed
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-white/20 backdrop-blur-sm">
        <motion.div
          className="h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      <div className="mt-2 text-center text-xs text-purple-200">
        {current} spots remaining - Hurry up!
      </div>
    </div>
  );
}

export default function EarlyAccessPage() {
  const navigate = useNavigate();
  const { getCookie, setCookie } = useCookie();
  const [remainingSpots, setRemainingSpots] = useState<number>(0);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    referralSource: "",
    interests: [] as string[],
  });
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
  }>({});

  const interestOptions = [
    { id: "investing", label: "Investing", icon: faChartLine },
    { id: "saving", label: "Saving", icon: faGift },
    { id: "budgeting", label: "Budgeting", icon: faClock },
    { id: "debt", label: "Debt Management", icon: faTrophy },
  ];

  useEffect(() => {
    const fetchRemainingSpots = async () => {
      const spots = await getRemainingSpots();
      setRemainingSpots(spots);
    };
    fetchRemainingSpots();

    // Check if user has already claimed
    const claimed = getCookie('early-access-claimed');
    if (claimed) {
      setHasClaimed(true);
    }
  }, [getCookie]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleInterestChange = (interest: string) => {
    setFormData((prev) => {
      const newInterests = prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest];
      return { ...prev, interests: newInterests };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult({});

    const claim: EarlyAccessClaim = {
      email: formData.email,
      firstName: formData.firstName || undefined,
      lastName: formData.lastName || undefined,
      referralSource: formData.referralSource || undefined,
      interests:
        formData.interests.length > 0 ? formData.interests : undefined,
    };

    const response = await claimEarlyAccessSpot(claim);
    
    if (response.success && response.remainingSpots !== undefined) {
      // Update remaining spots immediately (subtract 1)
      setRemainingSpots(response.remainingSpots);
      
      // Set success message with email check instruction
      setResult({
        success: true,
        message: "🎉 Congratulations! Your spot has been claimed successfully. Please check your email for your exclusive MONEKO25 promo code and next steps!"
      });
      
      // Save to cookie that user has claimed (expires in 30 days)
      setCookie('early-access-claimed', 'true');
      setHasClaimed(true);
      
      // Clear form data
      setFormData({
        email: "",
        firstName: "",
        lastName: "",
        referralSource: "",
        interests: [],
      });
      
      // Auto-close modal after showing success message for 4 seconds
      setTimeout(() => {
        setShowForm(false);
      }, 4000);
    } else {
      setResult(response);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-2 w-2 rounded-full bg-white/20"
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
            }}
            transition={{
              duration: 10 + i * 0.5,
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
        className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-xl"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <motion.div
                className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              />
              <span className="text-xl font-bold text-white">Moneko</span>
            </div>
            <motion.button
              onClick={() => navigate({ to: "/" })}
              className="text-purple-200 hover:text-white transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ← Back to Home
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section */}
        <section className="px-6 py-20 text-center">
          <div className="mx-auto max-w-4xl">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {hasClaimed ? (
                <motion.div
                  className="mb-6 inline-flex items-center rounded-full border border-green-400/50 bg-green-500/20 px-4 py-2 text-green-300 backdrop-blur-sm"
                  variants={fadeInDown}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                  ✅ Spot Claimed Successfully - Check Your Email for MONEKO25!
                </motion.div>
              ) : (
                <motion.div
                  className="mb-6 inline-flex items-center rounded-full border border-amber-400/50 bg-amber-500/20 px-4 py-2 text-amber-300 backdrop-blur-sm"
                  variants={fadeInDown}
                >
                  <FontAwesomeIcon icon={faStar} className="mr-2" />
                  Limited Time Offer - Only {remainingSpots} Spots Left!
                </motion.div>
              )}

              <motion.h1
                className="mb-6 text-5xl font-bold text-white md:text-7xl"
                variants={fadeInUp}
                custom={0.1}
              >
                Get{" "}
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Early Access
                </span>
              </motion.h1>

              <motion.p
                className="mb-8 text-xl text-purple-100 md:text-2xl"
                variants={fadeInUp}
                custom={0.2}
              >
                Join the exclusive group of{" "}
                <span className="font-bold text-white">{SPOTS} pioneers</span>{" "}
                shaping the future of financial education
              </motion.p>

              <motion.div
                className="mb-12"
                variants={fadeInUp}
                custom={0.3}
              >
                <ProgressBar current={remainingSpots} total={SPOTS} />
              </motion.div>

              <motion.div
                className="mb-8"
                variants={fadeInUp}
                custom={0.4}
              >
                <CountdownTimer />
              </motion.div>

              <motion.button
                onClick={() => setShowForm(true)}
                disabled={remainingSpots <= 0 || hasClaimed}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 px-12 py-6 text-xl font-bold text-white shadow-2xl shadow-purple-500/50 transition-all duration-300 hover:shadow-purple-500/70 disabled:cursor-not-allowed disabled:opacity-50"
                variants={fadeInUp}
                custom={0.5}
                whileHover={{ scale: hasClaimed ? 1 : 1.05 }}
                whileTap={{ scale: hasClaimed ? 1 : 0.95 }}
              >
                <span className="relative z-10 flex items-center">
                  {hasClaimed ? (
                    <>
                      ✅ Already Claimed - Check Your Email!
                      <FontAwesomeIcon icon={faCheckCircle} className="ml-3" />
                    </>
                  ) : remainingSpots > 0 ? (
                    <>
                      Claim Your FREE Spot Now
                      <FontAwesomeIcon icon={faRocket} className="ml-3" />
                    </>
                  ) : (
                    "All Spots Claimed"
                  )}
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: hasClaimed ? "-100%" : "0%" }}
                  transition={{ duration: 0.3 }}
                />
              </motion.button>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <motion.h2
              className="mb-12 text-center text-4xl font-bold text-white"
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
                  className="group relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-xl transition-all duration-300 hover:border-purple-400/50 hover:bg-white/20"
                  variants={fadeInUp}
                  custom={index * 0.1}
                  whileHover={{ y: -5 }}
                >
                  <div className="absolute top-4 right-4">
                    <div className="rounded-full bg-gradient-to-br from-purple-400 to-pink-400 px-3 py-1 text-xs font-bold text-white">
                      PREMIUM
                    </div>
                  </div>
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm">
                    <FontAwesomeIcon
                      icon={feature.icon}
                      className="text-2xl text-purple-300"
                    />
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-white">
                    {feature.title}
                  </h3>
                  <p className="text-purple-200">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <motion.div
              className="rounded-3xl border border-white/20 bg-white/10 p-12 backdrop-blur-xl"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="mb-8 text-center text-3xl font-bold text-white">
                What You Get as an Early Access Member
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center space-x-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                      <FontAwesomeIcon
                        icon={faCheckCircle}
                        className="text-white text-sm"
                      />
                    </div>
                    <span className="text-purple-100">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              className="rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="mb-6 flex justify-center space-x-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">5000+</div>
                  <div className="text-purple-200">People Waiting</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">
                    {SPOTS - remainingSpots}
                  </div>
                  <div className="text-purple-200">Already Joined</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">98%</div>
                  <div className="text-purple-200">Satisfaction Rate</div>
                </div>
              </div>
              <p className="text-purple-100">
                Join thousands of users who are already improving their
                financial future with Moneko
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Sign-up Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-3xl border border-white/20 bg-white/95 p-8 shadow-2xl backdrop-blur-xl dark:bg-slate-900/95"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.3 }}
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Claim Your Spot
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <FontAwesomeIcon icon={faX} />
                </button>
              </div>

              {result.error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                  {result.error}
                </div>
              )}
              {result.success && (
                <motion.div
                  className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700"
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.3 }}
                >
                  <div className="text-center">
                    <div className="mb-3 flex items-center justify-center">
                      <FontAwesomeIcon icon={faCheckCircle} className="mr-2 text-2xl text-green-600" />
                      <h4 className="text-lg font-bold text-green-800">Success! 🎉</h4>
                    </div>
                    <p className="mb-3 text-green-700">
                      Your early access spot has been claimed successfully!
                    </p>
                    <div className="rounded-lg bg-green-100 p-3 border border-green-300">
                      <div className="flex items-center justify-center mb-2">
                        <FontAwesomeIcon icon={faEnvelope} className="mr-2 text-green-600" />
                        <span className="font-semibold text-green-800">Check Your Inbox</span>
                      </div>
                      <p className="text-sm text-green-700">
                        We've sent you an email with detailed instructions on how to claim your free trial.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

{!result.success ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white/70 p-4 outline-none backdrop-blur-sm transition-all duration-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-slate-600 dark:bg-slate-800/70"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-slate-300 bg-white/70 p-4 outline-none backdrop-blur-sm transition-all duration-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-slate-600 dark:bg-slate-800/70"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-slate-300 bg-white/70 p-4 outline-none backdrop-blur-sm transition-all duration-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-slate-600 dark:bg-slate-800/70"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      How did you hear about us?
                    </label>
                    <select
                      name="referralSource"
                      value={formData.referralSource}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-slate-300 bg-white/70 p-4 outline-none backdrop-blur-sm transition-all duration-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-slate-600 dark:bg-slate-800/70"
                    >
                      <option value="">Select an option</option>
                      <option value="search">Search Engine</option>
                      <option value="social">Social Media</option>
                      <option value="friend">Friend/Referral</option>
                      <option value="blog">Blog/Article</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      What interests you most?
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {interestOptions.map((option) => (
                        <motion.button
                          key={option.id}
                          type="button"
                          onClick={() => handleInterestChange(option.id)}
                          className={`flex items-center justify-center rounded-xl border-2 p-3 text-sm font-medium transition-all duration-200 ${
                            formData.interests.includes(option.id)
                              ? "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                              : "border-slate-200 bg-white/50 text-slate-700 hover:border-purple-300 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300"
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <FontAwesomeIcon
                            icon={option.icon}
                            className="mr-2 text-xs"
                          />
                          {option.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-6">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 rounded-xl border border-slate-300 px-6 py-3 font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Claiming...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          Claim My Spot
                          <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                        </div>
                      )}
                    </motion.button>
                  </div>
                </form>
              ) : (
                <div className="text-center pt-4">
                  <motion.button
                    onClick={() => setShowForm(false)}
                    className="rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-8 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:shadow-xl"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-center">
                      Close
                      <FontAwesomeIcon icon={faCheckCircle} className="ml-2" />
                    </div>
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}