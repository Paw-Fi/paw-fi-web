"use client";

import { createFileRoute, Link } from '@tanstack/react-router';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRocket,
  faUserCheck,
  faGraduationCap,
  faChartLine,
  faComments,
  faCalculator,
  faShieldAlt,
  faFire,
  faBolt,
  faMagicWandSparkles,
  faBrain,
  faHeartbeat,
  faWallet,
  faPiggyBank,
  faArrowRight,
  faCheckCircle,
  faQuestionCircle,
  faCalendarCheck,
  faTrophy,
  faCoins,
  faBullseye,
  faHome,
  faMoneyBillWave,
  faPercent,
  faCreditCard,
  faBookOpen,
  faEye,
  faUser,
  faChartBar,
  faLightbulb,
  faPlay,
  faHandHoldingDollar,
  faArrowUp,
  faWandMagicSparkles
} from '@fortawesome/free-solid-svg-icons';
import { AmbientHaloLayout } from '@/layouts/ambient-halo-layout';

export const Route = createFileRoute('/how-it-works')({
  component: HowItWorks,
  head: () => ({
    meta: [
      {
        title: 'How It Works - AI Personal Finance Coach & Financial Education Platform | Moneko',
      },
      {
        name: 'description',
        content: 'Learn how Moneko\'s AI personal finance coach works. Discover our step-by-step approach to budgeting, investing education, goal tracking, and personalized financial planning.',
      },
      {
        name: 'keywords',
        content: 'how Moneko works, AI personal finance coach, financial education platform, budgeting app tutorial, investment learning, financial planning process',
      },
    ],
  }),
});

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
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
      ease: "easeOut",
    },
  },
};

const featureCardVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function HowItWorks() {
  return (
    <AmbientHaloLayout>
        <div className="min-h-screen bg-gradient-to-br from-background via-purple-50/30 to-blue-50/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5"></div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.div variants={itemVariants} className="mb-8">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-600 shadow-xl mb-6">
                <FontAwesomeIcon icon={faRocket} className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                How <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Moneko</span> Works
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600 max-w-3xl mx-auto">
                Your complete financial education platform that combines AI-powered learning, gamification, 
                portfolio tracking, and powerful calculators to transform how you understand and manage money.
              </p>
            </motion.div>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <FontAwesomeIcon icon={faRocket} className="mr-2 h-5 w-5" />
                Get Started Free
              </Link>
              <Link
                to="/dashboard/learning"
                className="inline-flex items-center px-8 py-4 bg-white/80 backdrop-blur-sm text-gray-700 font-semibold rounded-xl hover:bg-white transition-all duration-200 shadow-md hover:shadow-lg border border-gray-200"
              >
                <FontAwesomeIcon icon={faPlay} className="mr-2 h-5 w-5" />
                Watch Demo
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Overview Section */}
      <AnimatedSection className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Four Powerful Components, One Platform
            </h2>
            <p className="mt-6 text-lg text-gray-600 max-w-3xl mx-auto">
              Moneko integrates everything you need to master your finances in one seamless experience.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: faFire,
                title: "Daily Briefing",
                description: "Start each day with personalized financial insights, streaks, and challenges",
                color: "from-orange-500 to-red-500",
                accent: "orange"
              },
              {
                icon: faGraduationCap,
                title: "AI Learning",
                description: "Custom courses and lessons tailored to your financial goals and knowledge level",
                color: "from-green-500 to-emerald-500",
                accent: "green"
              },
              {
                icon: faWallet,
                title: "Portfolio Tracking",
                description: "Comprehensive financial health monitoring with real-time insights",
                color: "from-blue-500 to-cyan-500",
                accent: "blue"
              },
              {
                icon: faCalculator,
                title: "Smart Calculators",
                description: "Professional-grade financial tools for investments, loans, and planning",
                color: "from-purple-500 to-pink-500",
                accent: "purple"
              }
            ].map((component, index) => (
              <motion.div
                key={component.title}
                variants={featureCardVariants}
                className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 via-transparent to-gray-100/50 group-hover:opacity-80 transition-opacity"></div>
                <div className="relative p-8 text-center">
                  <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br ${component.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <FontAwesomeIcon icon={component.icon} className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{component.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{component.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Daily Briefing Section */}
      <AnimatedSection className="py-20 sm:py-32 bg-gradient-to-br from-orange-50/50 via-red-50/30 to-pink-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div variants={itemVariants}>
              <div className="flex items-center mb-6">
                <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg">
                  <FontAwesomeIcon icon={faFire} className="h-6 w-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Daily Financial Fitness</h2>
              </div>
              <p className="text-lg text-gray-600 mb-8">
                Your personalized dashboard that gamifies financial learning with Duolingo-inspired engagement mechanics.
              </p>
              
              <div className="space-y-6">
                {[
                  {
                    icon: faFire,
                    title: "Streak Tracking",
                    description: "Maintain daily learning streaks to build consistent financial habits"
                  },
                  {
                    icon: faQuestionCircle,
                    title: "Question of the Day",
                    description: "Test your knowledge with AI-generated financial questions"
                  },
                  {
                    icon: faBullseye,
                    title: "Next Step Recommendations",
                    description: "AI analyzes your progress to suggest personalized learning paths"
                  },
                  {
                    icon: faCalendarCheck,
                    title: "Daily Quests",
                    description: "Complete challenges to earn XP and unlock achievements"
                  }
                ].map((feature) => (
                  <div key={feature.title} className="flex items-start">
                    <div className="mr-4 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-red-100 text-orange-600">
                      <FontAwesomeIcon icon={feature.icon} className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{feature.title}</h4>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="relative">
              <div className="rounded-2xl bg-gradient-to-br from-white via-orange-50/30 to-red-50/20 border border-orange-200/50 shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Good morning, Sarah!</h3>
                    <p className="text-gray-600">Your daily financial fitness briefing</p>
                  </div>
                  <div className="flex items-center bg-gradient-to-r from-orange-100 to-red-100 rounded-xl px-3 py-2 border border-orange-200">
                    <FontAwesomeIcon icon={faFire} className="h-5 w-5 text-orange-500 mr-2" />
                    <div>
                      <div className="text-xl font-bold text-orange-600">7</div>
                      <div className="text-xs text-orange-700">day streak</div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/60 rounded-xl p-4 border border-blue-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Question of the Day</h4>
                    <p className="text-sm text-gray-600 mb-3">What's the most important factor when choosing an ETF?</p>
                    <div className="flex items-center text-green-600 text-sm">
                      <FontAwesomeIcon icon={faCoins} className="h-3 w-3 mr-1" />
                      +25 XP earned!
                    </div>
                  </div>
                  
                  <div className="bg-white/60 rounded-xl p-4 border border-purple-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Your Next Step</h4>
                    <p className="text-sm text-gray-600 mb-3">Ready for a 5-minute lesson on risk vs. return?</p>
                    <button className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg">
                      Start Lesson
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50/50 rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Daily Progress</span>
                    <span className="text-gray-900 font-semibold">2/3 completed</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* AI Learning Section */}
      <AnimatedSection className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div variants={itemVariants} className="order-2 lg:order-1">
              <div className="rounded-2xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-2 border-green-200 shadow-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md">
                    <FontAwesomeIcon icon={faGraduationCap} className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">AI Learning Coach</h3>
                    <p className="text-sm text-gray-600">Get personalized help with your financial education</p>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-end">
                    <div className="bg-white rounded-lg px-4 py-2 shadow-sm max-w-xs">
                      <p className="text-sm text-gray-700">I want to learn about investing in ETFs</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-green-100 rounded-lg px-4 py-2 max-w-xs">
                      <p className="text-sm text-green-800">Great choice! I'll create a personalized ETF course based on your risk profile and goals. This will cover:</p>
                      <ul className="text-xs text-green-700 mt-2 space-y-1">
                        <li>• ETF fundamentals</li>
                        <li>• Expense ratio analysis</li>
                        <li>• Portfolio allocation</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex items-center text-green-600 text-sm">
                  <FontAwesomeIcon icon={faBolt} className="h-3 w-3 mr-1" />
                  Course created! Ready to start learning?
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="order-1 lg:order-2">
              <div className="flex items-center mb-6">
                <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg">
                  <FontAwesomeIcon icon={faBrain} className="h-6 w-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">AI-Powered Learning</h2>
              </div>
              <p className="text-lg text-gray-600 mb-8">
                Our AI creates personalized courses, lessons, and explanations tailored to your knowledge level and financial goals.
              </p>
              
              <div className="space-y-6">
                {[
                  {
                    icon: faMagicWandSparkles,
                    title: "Custom Course Creation",
                    description: "AI generates courses based on your specific interests and learning objectives"
                  },
                  {
                    icon: faBrain,
                    title: "Adaptive Learning",
                    description: "Content difficulty adjusts to your pace and comprehension level"
                  },
                  {
                    icon: faBullseye,
                    title: "Goal-Oriented",
                    description: "Lessons align with your financial priorities and timeline"
                  },
                  {
                    icon: faComments,
                    title: "Interactive Q&A",
                    description: "Ask questions and get instant, contextual explanations"
                  }
                ].map((feature) => (
                  <div key={feature.title} className="flex items-start">
                    <div className="mr-4 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 text-green-600">
                      <FontAwesomeIcon icon={feature.icon} className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{feature.title}</h4>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* Portfolio Tracking Section */}
      <AnimatedSection className="py-20 sm:py-32 bg-gradient-to-br from-blue-50/50 via-cyan-50/30 to-teal-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div variants={itemVariants}>
              <div className="flex items-center mb-6">
                <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg">
                  <FontAwesomeIcon icon={faHeartbeat} className="h-6 w-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Financial Health Tracking</h2>
              </div>
              <p className="text-lg text-gray-600 mb-8">
                Comprehensive portfolio monitoring with real-time insights into your financial wellness and progress toward goals.
              </p>
              
              <div className="space-y-6">
                {[
                  {
                    icon: faHeartbeat,
                    title: "Health Score",
                    description: "AI-calculated score based on multiple financial factors and benchmarks"
                  },
                  {
                    icon: faChartLine,
                    title: "Portfolio Analytics",
                    description: "Track investments, savings, debt, and cash flow in one unified view"
                  },
                  {
                    icon: faBullseye,
                    title: "Goal Monitoring",
                    description: "Visual progress tracking for retirement, savings, and investment targets"
                  },
                  {
                    icon: faEye,
                    title: "Risk Assessment",
                    description: "Continuous monitoring of portfolio risk and diversification"
                  }
                ].map((feature) => (
                  <div key={feature.title} className="flex items-start">
                    <div className="mr-4 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-600">
                      <FontAwesomeIcon icon={feature.icon} className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{feature.title}</h4>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="relative">
              <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Financial Health</h3>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">85</div>
                    <div className="text-sm text-gray-600">Excellent</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-3 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
                    <FontAwesomeIcon icon={faHandHoldingDollar} className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                    <div className="text-lg font-bold text-blue-600">$75,000</div>
                    <div className="text-xs text-blue-700">Monthly Income</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                    <FontAwesomeIcon icon={faPiggyBank} className="h-5 w-5 text-green-600 mx-auto mb-2" />
                    <div className="text-lg font-bold text-green-600">$15,000</div>
                    <div className="text-xs text-green-700">Monthly Savings</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Emergency Fund</span>
                    <span className="text-green-600 font-semibold">6 months ✓</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Debt-to-Income</span>
                    <span className="text-blue-600 font-semibold">15%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Retirement Progress</span>
                    <span className="text-purple-600 font-semibold">On track</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* Calculators Section */}
      <AnimatedSection className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div variants={itemVariants} className="order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: faChartLine, title: "Compound Interest", color: "from-purple-500 to-pink-500" },
                  { icon: faHome, title: "Mortgage", color: "from-blue-500 to-cyan-500" },
                  { icon: faPiggyBank, title: "Savings Goals", color: "from-green-500 to-emerald-500" },
                  { icon: faPercent, title: "Investment", color: "from-orange-500 to-red-500" },
                  { icon: faMoneyBillWave, title: "Auto Loan", color: "from-red-500 to-pink-500" },
                  { icon: faCreditCard, title: "Retirement", color: "from-indigo-500 to-purple-500" }
                ].map((calc) => (
                  <div key={calc.title} className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-md p-4 text-center hover:shadow-lg transition-shadow">
                    <div className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${calc.color} text-white shadow-sm`}>
                      <FontAwesomeIcon icon={calc.icon} className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900">{calc.title}</h4>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="order-1 lg:order-2">
              <div className="flex items-center mb-6">
                <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg">
                  <FontAwesomeIcon icon={faCalculator} className="h-6 w-6" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Professional Calculators</h2>
              </div>
              <p className="text-lg text-gray-600 mb-8">
                Access sophisticated financial calculators that provide professional-grade analysis for all your planning needs.
              </p>
              
              <div className="space-y-6">
                {[
                  {
                    icon: faChartBar,
                    title: "Advanced Analytics",
                    description: "Detailed projections with charts, graphs, and scenario analysis"
                  },
                  {
                    icon: faMagicWandSparkles,
                    title: "Interactive Results",
                    description: "Adjust parameters in real-time to see instant impact on outcomes"
                  },
                  {
                    icon: faBookOpen,
                    title: "Educational Context",
                    description: "Learn the theory behind calculations with built-in explanations"
                  },
                  {
                    icon: faArrowUp,
                    title: "Export & Share",
                    description: "Save calculations and share results with advisors or family"
                  }
                ].map((feature) => (
                  <div key={feature.title} className="flex items-start">
                    <div className="mr-4 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 text-purple-600">
                      <FontAwesomeIcon icon={feature.icon} className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{feature.title}</h4>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* How It All Works Together */}
      <AnimatedSection className="py-20 sm:py-32 bg-gradient-to-br from-gray-50/50 via-white to-purple-50/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Your Complete Financial Education Journey
            </h2>
            <p className="mt-6 text-lg text-gray-600 max-w-3xl mx-auto">
              See how all components work together to create a comprehensive learning experience.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              {
                step: "01",
                title: "Start Your Day",
                description: "Begin with your Daily Briefing - check your streak, answer the question of the day, and see personalized recommendations.",
                icon: faFire,
                color: "orange"
              },
              {
                step: "02", 
                title: "Learn & Explore",
                description: "Use AI to create custom lessons, explore essential courses, or dive deep into specific topics you're curious about.",
                icon: faGraduationCap,
                color: "green"
              },
              {
                step: "03",
                title: "Track & Plan",
                description: "Monitor your financial health, use calculators for planning, and apply your learning to real-world decisions.",
                icon: faChartLine,
                color: "blue"
              }
            ].map((step, index) => (
              <motion.div
                key={step.step}
                variants={featureCardVariants}
                className="relative"
              >
                <div className="text-center">
                  <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${
                    step.color === 'orange' ? 'from-orange-500 to-red-500' :
                    step.color === 'green' ? 'from-green-500 to-emerald-500' :
                    'from-blue-500 to-cyan-500'
                  } text-white shadow-lg`}>
                    <FontAwesomeIcon icon={step.icon} className="h-8 w-8" />
                  </div>
                  <div className="text-sm font-semibold text-gray-500 mb-2">{step.step}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </div>
                
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-full w-8 h-0.5 bg-gradient-to-r from-gray-300 to-transparent"></div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* CTA Section */}
      <AnimatedSection className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={itemVariants}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 px-8 py-16 shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10"></div>
            <div className="relative text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to Transform Your Financial Future?
              </h2>
              <p className="mt-6 text-lg text-white/90 max-w-2xl mx-auto">
                Join thousands of users who are building stronger financial foundations with Moneko's comprehensive platform.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center px-8 py-4 bg-white text-purple-600 font-semibold rounded-xl hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <FontAwesomeIcon icon={faRocket} className="mr-2 h-5 w-5" />
                  Start Free Today
                </Link>
                <Link
                  to="/dashboard/learning"
                  className="inline-flex items-center px-8 py-4 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/30 transition-all duration-200 border border-white/30"
                >
                  <FontAwesomeIcon icon={faPlay} className="mr-2 h-5 w-5" />
                  Explore Features
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>
    </div>
    </AmbientHaloLayout>
  );
}