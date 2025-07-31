import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSignInAlt,
  faChartLine,
  faHeartbeat,
  faMoneyBill,
  faChartPie,
  faClipboardList,
  faLightbulb,
  faComments,
  faChessKnight,
  faBookOpen,
  faCalculator,
} from '@fortawesome/free-solid-svg-icons';
import { Link, useLocation } from '@tanstack/react-router';
import logo from '@assets/images/icon.svg';
import { OptimizedImage } from "@/components/seo/optimized-image";
import dashboardHomeImage from '@assets/images/dashboard/dashboard-home.png';
import dashboardLearningImage from '@assets/images/dashboard/dashboard-learning.png';
import dashboardEssentialsImage from '@assets/images/dashboard/dashboard-essentials.png';
import dashboardCalculatorsImage from '@assets/images/dashboard/dashboard-calculators.png';
import { useAuth } from '@/contexts/auth-context';

interface PageConfig {
  backgroundImage: string;
  title: string;
  description: string;
  features: Array<{
    icon: any;
    text: string;
  }>;
  ctaText: string;
  ctaLink: string;
}

const getPageConfig = (path: string, user: any): PageConfig => {
  const baseFeatures = [
    { icon: faChartLine, text: "Retirement Goal Tracker" },
    { icon: faHeartbeat, text: "Financial Health Snapshot" },
    { icon: faMoneyBill, text: "Cash Flow Summary" },
    { icon: faChartPie, text: "Suggested Asset Allocation (Beta)" },
    { icon: faClipboardList, text: "Recommended Actions" },
    { icon: faLightbulb, text: "Smart Investment Tips" }
  ];

  // Default configuration
  let config: PageConfig = {
    backgroundImage: dashboardHomeImage,
    title: "Unlock Your Financial Portfolio",
    description: user ? "Subscribe to unlock your financial portfolio" : "Sign in to access your personalized financial command center",
    features: baseFeatures,
    ctaText: user ? "View our plans" : "Sign In to Access Your Portfolio",
    ctaLink: user ? "/pricing" : "/login"
  };

  // Customize based on path
  if (path === "/dashboard/chat") {
    config = {
      ...config,
      backgroundImage: dashboardHomeImage,
      title: "Unlock AI Financial Coaching",
      description: user ? "Subscribe to chat with our AI financial advisor" : "Sign in to get personalized financial guidance from our AI",
      features: [
        { icon: faComments, text: "Personalized AI Financial Advisor" },
        { icon: faLightbulb, text: "Custom Investment Strategies" },
        { icon: faChartLine, text: "Goal-Based Financial Planning" },
        { icon: faHeartbeat, text: "Real-time Financial Health Check" },
        { icon: faClipboardList, text: "Action-oriented Recommendations" },
        { icon: faMoneyBill, text: "Budgeting & Spending Insights" }
      ],
      ctaText: user ? "Upgrade to Chat with AI" : "Sign In to Start Chatting"
    };
  } else if (path.startsWith("/dashboard/learning")) {
    config = {
      ...config,
      backgroundImage: dashboardLearningImage,
      title: "Unlock Personalized Learning",
      description: user ? "Subscribe to access AI-generated learning courses" : "Sign in to create custom financial education courses",
      features: [
        { icon: faChessKnight, text: "AI-Generated Learning Courses" },
        { icon: faLightbulb, text: "Personalized Curriculum" },
        { icon: faChartLine, text: "Progress Tracking & Analytics" },
        { icon: faComments, text: "Interactive Learning Sessions" },
        { icon: faClipboardList, text: "Knowledge Assessments" },
        { icon: faHeartbeat, text: "Adaptive Learning Paths" }
      ],
      ctaText: user ? "Upgrade for Custom Courses" : "Sign In to Start Learning"
    };
  } else if (path.startsWith("/dashboard/essentials")) {
    config = {
      ...config,
      backgroundImage: dashboardEssentialsImage,
      title: "Access Financial Education Library",
      description: user ? "Subscribe to unlock our complete financial education library" : "Sign in to access curated financial education content",
      features: [
        { icon: faBookOpen, text: "Comprehensive Financial Guides" },
        { icon: faLightbulb, text: "Expert-Curated Content" },
        { icon: faChartLine, text: "Investment Fundamentals" },
        { icon: faMoneyBill, text: "Budgeting & Saving Strategies" },
        { icon: faChartPie, text: "Portfolio Management Basics" },
        { icon: faClipboardList, text: "Financial Planning Checklists" }
      ],
      ctaText: user ? "Unlock Full Library" : "Sign In for Financial Education"
    };
  } else if (path.startsWith("/calculators")) {
    config = {
      ...config,
      backgroundImage: dashboardCalculatorsImage,
      title: "Unlock Financial Calculators Suite",
      description: user ? "Subscribe to access our complete suite of financial calculators" : "Sign in to use powerful financial planning tools",
      features: [
        { icon: faCalculator, text: "Advanced Financial Calculators" },
        { icon: faChartLine, text: "Retirement Planning Tools" },
        { icon: faMoneyBill, text: "Mortgage & Loan Calculators" },
        { icon: faChartPie, text: "Investment Growth Projections" },
        { icon: faHeartbeat, text: "Financial Health Assessments" },
        { icon: faLightbulb, text: "Savings Goal Planners" }
      ],
      ctaText: user ? "Upgrade for All Calculators" : "Sign In to Calculate"
    };
  }

  return config;
};

export const DashboardBlockModal = () => {
  const location = useLocation();
  const {user} = useAuth();
  const config = getPageConfig(location.pathname, user);

  return (
    <div className="relative w-full h-full z-20 flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">                   
        <OptimizedImage src={config.backgroundImage} alt="Dashboard Background" className="w-full h-full object-cover blur-sm" />                 
      </div>
      <div className="absolute inset-0 w-full h-full overflow-hidden bg-gray-300/30"/>
                           
      {/* Modal Content */}
      <motion.div
        className="relative z-10 max-w-2xl w-full mx-4 p-8 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-2xl"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo and Glow Effect */}
        <div className="relative flex justify-center mb-8">
          <div className="absolute -top-4 opacity-70 w-24 h-24 bg-primary/30 rounded-full blur-xl" />
          <motion.div
            className="relative z-10 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-500 shadow-lg shadow-purple-500/30"
            initial={{ rotateY: 0 }}
            animate={{ rotateY: 360 }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
          >
            <OptimizedImage src={logo} className="size-16" alt="Moneko Logo" />
          </motion.div>
        </div>

      
        <motion.h2
          className="mb-4 text-center bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-3xl font-bold text-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {config.title}
        </motion.h2>

        <motion.p
          className="mb-6 text-center text-lg text-gray-700 dark:text-gray-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {config.description}
        </motion.p>
        
        {/* Feature List */}
        <motion.div
          className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {config.features.map((feature, index) => (
            <motion.div 
              key={index}
              className="flex items-center p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700/30"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + (index * 0.1), duration: 0.4 }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/80 to-purple-500/80 text-white shadow-md">
                <FontAwesomeIcon icon={feature.icon} className="h-5 w-5" />
              </div>
              <span className="ml-3 text-sm md:text-base font-medium text-gray-700 dark:text-gray-200">
                {feature.text}
              </span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="flex justify-center items-center flex-col space-x-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          {/* Primary CTA - Get Early Access */}
          <Link to="/early-access" className="group w-full sm:w-auto">
            <motion.div
              className="flex w-full sm:w-auto items-center justify-center space-x-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-8 py-4 text-white shadow-lg shadow-purple-500/30 transition-all duration-200"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
              }}
            >
              <span className="text-lg font-medium">
                Get Early Access
              </span>
              <span className="text-sm bg-white/20 px-2 py-1 rounded-full">
                FREE
              </span>
            </motion.div>
          </Link>
          
          {/* Secondary CTA - Original Action */}
          <Link to={config.ctaLink} search={!user ? { redirect: "/dashboard" } : undefined} className="group">
                 
              <span className="text-sm font-medium mt-2 underline">
                {config.ctaText}
              </span>
          </Link>
        </motion.div>
          {/* Free Trial Banner */}
          <motion.div
          className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <Link to="/early-access" className="text-center">
            <div className="text-lg font-bold text-green-600 dark:text-green-400 mb-1">
            🚀 FREE TRIAL AVAILABLE
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              We're currently offering a <span className="font-bold text-primary">free trial</span> to the first{' '}
              <span className="font-bold text-primary">100 users</span>!
            </div>
          </Link>
        </motion.div>

      </motion.div>
    </div>
  );
};