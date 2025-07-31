"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faCalculator,
  faComments,
  faGraduationCap,
  faChartLine,
  faCog,
  faBookOpen,
  faMobile,
  faRocket,
  faShieldAlt,
} from "@fortawesome/free-solid-svg-icons";
import { fadeInUp, staggerContainer } from "@/lib/motion-variants";
import { Button } from "@/components/ui/button";
import catCoin from "@/assets/images/icon.svg";
import AmbientHalo from "../components/ui/ambient-halo";

import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";

export const Route = createFileRoute("/intro")({
  component: IntroPage,
  head: () => {
    const pageUrl = getCanonicalUrl("/intro");
    const title = "Moneko: Your Complete Financial Education Platform";
    const description = "Discover all the powerful features that make Moneko the ultimate destination for financial education, from AI-powered guidance to expert-led courses and professional-grade calculators.";
    const keywords = "financial education, personal finance, AI financial advisor, financial calculators, investment education, budgeting tools, Moneko";
    const imageUrl = "https://moneko.io/og-img.png"; // Replace with actual OG image URL

    return {
      meta: seo({
        title,
        description,
        keywords,
        image: imageUrl,
        url: pageUrl,
      }),
      link: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
    };
  },
});

interface FeatureCardProps {
  icon: any;
  title: string;
  description: string;
  features: string[];
  linkTo: string;
  color: string;
}

function FeatureCard({ icon, title, description, features, linkTo, color }: FeatureCardProps) {
  return (
    <motion.div
      className="group h-full rounded-3xl border border-slate-300/30 bg-white/70 p-8 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl dark:border-slate-700/30 dark:bg-slate-900/70"
      variants={fadeInUp}
      whileHover={{ y: -5 }}
    >
      <div className="flex h-full flex-col">
        <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${color} shadow-lg`}>
          <FontAwesomeIcon icon={icon} className="text-2xl text-white" />
        </div>
        
        <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">
          {title}
        </h3>
        
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          {description}
        </p>
        
        <ul className="mb-6 flex-grow space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start text-sm text-slate-700 dark:text-slate-300">
              <span className="mr-2 mt-1.5 h-1.5 w-1.5 rounded-full bg-purple-500 flex-shrink-0"></span>
              {feature}
            </li>
          ))}
        </ul>
        
        <Link to={linkTo} className="group/link inline-flex items-center text-purple-600 font-medium hover:text-purple-800 dark:text-purple-400">
          Explore Feature
          <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-4 w-4 transition-transform group-hover/link:translate-x-1" />
        </Link>
      </div>
    </motion.div>
  );
}

function IntroPage() {
  const features = [
    {
      icon: faComments,
      title: "AI-Powered Chat Assistant",
      description: "Get personalized financial guidance from our advanced AI assistant, available 24/7 to answer your questions.",
      features: [
        "Real-time financial advice",
        "Personalized recommendations",
        "Custom learning path creation",
        "Query history tracking"
      ],
      linkTo: "/dashboard/chat",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: faCalculator,
      title: "Financial Calculators Suite",
      description: "Professional-grade calculators to help you plan, analyze, and optimize your financial decisions.",
      features: [
        "Compound interest calculator",
        "Mortgage & auto loan calculators",
        "Retirement planning tools",
        "Investment growth projections"
      ],
      linkTo: "/calculators",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: faGraduationCap,
      title: "Expert-Led Learning",
      description: "Comprehensive courses created by certified financial professionals with real-world experience.",
      features: [
        "CFA & MBA certified instructors",
        "Structured lesson progression",
        "Interactive content",
        "Progress tracking with XP rewards"
      ],
      linkTo: "/dashboard/essentials",
      color: "from-purple-500 to-violet-500"
    },
    {
      icon: faChartLine,
      title: "Personalized Dashboard",
      description: "Track your financial health with customizable widgets and personalized insights.",
      features: [
        "Financial health snapshot",
        "Retirement goal tracking",
        "Cash flow analysis",
        "Asset allocation recommendations"
      ],
      linkTo: "/dashboard",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: faBookOpen,
      title: "Financial Education Blog",
      description: "Stay updated with expert articles and insights on personal finance topics.",
      features: [
        "Expert-written articles",
        "Multiple categories",
        "Search and filtering",
        "Regular updates"
      ],
      linkTo: "/blogs",
      color: "from-teal-500 to-blue-500"
    },
    {
      icon: faCog,
      title: "User Management",
      description: "Comprehensive account management with secure authentication and personalized settings.",
      features: [
        "Secure login/registration",
        "Profile customization",
        "Progress tracking",
        "Subscription management"
      ],
      linkTo: "/dashboard/user-settings",
      color: "from-gray-500 to-slate-500"
    }
  ];

  const quickStats = [
    { number: "7+", label: "Financial Calculators" },
    { number: "20+", label: "Expert Lessons" },
    { number: "3", label: "Pricing Tiers" },
    { number: "24/7", label: "AI Support" }
  ];

  return (
    <div className="relative min-h-screen bg-[#f5f3ff]">
      <AmbientHalo />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20 md:px-12">
        <div className="relative z-10 mx-auto max-w-7xl text-center">
          <motion.div
            className="mb-8 flex items-center justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <OptimizedImage src={catCoin} alt="Moneko Logo" className="h-16 w-16" />
            <span className="ml-4 text-4xl font-bold text-slate-900">Moneko</span>
          </motion.div>
          
          <motion.h1
            className="mb-6 text-5xl font-bold text-slate-900 md:text-6xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Your Complete Financial
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent"> Education Platform</span>
          </motion.h1>
          
          <motion.p
            className="mb-8 text-xl text-slate-600 md:mx-auto md:max-w-3xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Discover all the powerful features that make Moneko the ultimate destination for financial education, 
            from AI-powered guidance to expert-led courses and professional-grade calculators.
          </motion.p>
          
          <motion.div
            className="flex flex-col gap-4 sm:flex-row sm:justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Button as="link" to="/dashboard" size="lg" className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              Get Started
              <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-4 w-4" />
            </Button>
            <Button as="link" to="/pricing" variant="outline" size="lg">
              View Pricing
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="relative px-6 py-16 md:px-12">
        <motion.div
          className="mx-auto max-w-6xl"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {quickStats.map((stat, index) => (
              <motion.div
                key={index}
                className="text-center"
                variants={fadeInUp}
                custom={index * 0.1}
              >
                <div className="text-4xl font-bold text-purple-600">{stat.number}</div>
                <div className="text-slate-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="relative px-6 py-20 md:px-12">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="mb-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-4 text-4xl font-bold text-slate-900">
              Everything You Need for Financial Success
            </h2>
            <p className="text-lg text-slate-600 md:mx-auto md:max-w-2xl">
              Explore our comprehensive suite of tools, resources, and educational content 
              designed to empower your financial journey at every step.
            </p>
          </motion.div>
          
          <motion.div
            className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="relative bg-slate-50/50 px-6 py-20 md:px-12">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="mb-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-4 text-4xl font-bold text-slate-900">
              Why Choose Moneko?
            </h2>
          </motion.div>
          
          <motion.div
            className="grid gap-8 md:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div className="text-center" variants={fadeInUp}>
              <FontAwesomeIcon icon={faRocket} className="mb-4 h-12 w-12 text-purple-600" />
              <h3 className="mb-2 text-xl font-bold text-slate-900">AI-First Approach</h3>
              <p className="text-slate-600">Personalized financial guidance through advanced AI technology</p>
            </motion.div>
            
            <motion.div className="text-center" variants={fadeInUp}>
              <FontAwesomeIcon icon={faShieldAlt} className="mb-4 h-12 w-12 text-purple-600" />
              <h3 className="mb-2 text-xl font-bold text-slate-900">Expert-Created Content</h3>
              <p className="text-slate-600">Courses developed by certified financial professionals</p>
            </motion.div>
            
            <motion.div className="text-center" variants={fadeInUp}>
              <FontAwesomeIcon icon={faMobile} className="mb-4 h-12 w-12 text-purple-600" />
              <h3 className="mb-2 text-xl font-bold text-slate-900">Mobile-First Design</h3>
              <p className="text-slate-600">Fully responsive and optimized for all devices</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="relative px-6 py-20 md:px-12">
        <motion.div
          className="mx-auto max-w-4xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="rounded-3xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-8 md:p-12">
            <h2 className="mb-4 text-3xl font-bold text-slate-900 md:text-4xl">
              Ready to Transform Your Financial Future?
            </h2>
            <p className="mb-8 text-lg text-slate-600">
              Join thousands of users who are already building better financial habits with Moneko's 
              comprehensive platform. Start your journey today with our free tier.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button as="link" to="/register" size="lg" className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                Start Free Today
                <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-4 w-4" />
              </Button>
              <Button as="link" to="/team" variant="outline" size="lg">
                Meet Our Team
              </Button>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

export default IntroPage;