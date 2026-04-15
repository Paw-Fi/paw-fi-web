import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
  faBullseye,
  faFlag,
  faTrophy,
  faRocket,
  faWandSparkles,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";
import { Link, useLocation } from "@tanstack/react-router";
import logo from "@assets/images/icon.svg";
import { OptimizedImage } from "@/components/seo/optimized-image";
import dashboardHomeImage from "@assets/images/dashboard/dashboard-home.png";
import dashboardLearningImage from "@assets/images/dashboard/dashboard-learning.png";
import dashboardEssentialsImage from "@assets/images/dashboard/dashboard-essentials.png";
import dashboardCalculatorsImage from "@assets/images/dashboard/dashboard-calculators.png";
import { useAuth } from "@/contexts/auth-context";
import { Modal } from "../ui/modal";

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
    { icon: faLightbulb, text: "Smart Investment Tips" },
  ];

  // Default configuration
  let config: PageConfig = {
    backgroundImage: dashboardHomeImage,
    title: "Unlock Your Financial Portfolio",
    description: user
      ? "Subscribe to unlock your financial portfolio"
      : "Sign in to access your personalized financial command center",
    features: baseFeatures,
    ctaText: user ? "View our plans" : "Sign In to Access Your Portfolio",
    ctaLink: user ? "/pricing" : "/login",
  };
  if (path.startsWith("/dashboard/learning")) {
    config = {
      ...config,
      backgroundImage: dashboardLearningImage,
      title: "Unlock Personalized Learning",
      description: user
        ? "Subscribe to access AI-generated learning courses"
        : "Sign in to create custom financial education courses",
      features: [
        { icon: faChessKnight, text: "AI-Generated Learning Courses" },
        { icon: faLightbulb, text: "Personalized Curriculum" },
        { icon: faChartLine, text: "Progress Tracking & Analytics" },
        { icon: faComments, text: "Interactive Learning Sessions" },
        { icon: faClipboardList, text: "Knowledge Assessments" },
        { icon: faHeartbeat, text: "Adaptive Learning Paths" },
      ],
      ctaText: user
        ? "Upgrade for Custom Courses"
        : "Sign In to Start Learning",
    };
  } else if (path.startsWith("/dashboard/tracker")) {
    config = {
      ...config,
      backgroundImage: dashboardHomeImage, // Could use a tracker-specific image if available
      title: "Unlock AI-Powered Goal Tracking",
      description: user
        ? "Subscribe to access advanced goal tracking with AI insights and milestone management"
        : "Sign in to create and track your financial goals with AI-powered recommendations",
      features: [
        { icon: faBullseye, text: "Smart Goal Creation & Management" },
        { icon: faWandSparkles, text: "AI-Generated Milestones" },
        { icon: faChartLine, text: "Interactive Progress Projections" },
        { icon: faTrophy, text: "Spotlight Goal Prioritization" },
        { icon: faFlag, text: "Advanced Milestone Tracking" },
        { icon: faCheckCircle, text: "Progress Analytics & Insights" },
      ],
      ctaText: user
        ? "Upgrade for AI Goal Tracking"
        : "Sign In to Track Your Goals",
    };
  } else if (path.startsWith("/dashboard/essentials")) {
    config = {
      ...config,
      backgroundImage: dashboardEssentialsImage,
      title: "Access Financial Education Library",
      description: user
        ? "Subscribe to unlock our complete financial education library"
        : "Sign in to access curated financial education content",
      features: [
        { icon: faBookOpen, text: "Comprehensive Financial Guides" },
        { icon: faLightbulb, text: "Expert-Curated Content" },
        { icon: faChartLine, text: "Investment Fundamentals" },
        { icon: faMoneyBill, text: "Budgeting & Saving Strategies" },
        { icon: faChartPie, text: "Portfolio Management Basics" },
        { icon: faClipboardList, text: "Financial Planning Checklists" },
      ],
      ctaText: user ? "Unlock Full Library" : "Sign In for Financial Education",
    };
  } else if (path.startsWith("/calculators")) {
    config = {
      ...config,
      backgroundImage: dashboardCalculatorsImage,
      title: "Unlock Financial Calculators Suite",
      description: user
        ? "Subscribe to access our complete suite of financial calculators"
        : "Sign in to use powerful financial planning tools",
      features: [
        { icon: faCalculator, text: "Advanced Financial Calculators" },
        { icon: faChartLine, text: "Retirement Planning Tools" },
        { icon: faMoneyBill, text: "Mortgage & Loan Calculators" },
        { icon: faChartPie, text: "Investment Growth Projections" },
        { icon: faHeartbeat, text: "Financial Health Assessments" },
        { icon: faLightbulb, text: "Savings Goal Planners" },
      ],
      ctaText: user ? "Upgrade for All Calculators" : "Sign In to Calculate",
    };
  }

  return config;
};

export const DashboardBlockModal = ({
  onClose,
  isVisible,
}: {
  onClose: () => void;
  isVisible: boolean;
}) => {
  const location = useLocation();
  const { user } = useAuth();
  const config = getPageConfig(location.pathname, user);

  return (
    <Modal isOpen={isVisible} onClose={onClose} width="wide">
      {/* Modal Content */}
      <div className="py-9">
        {/* Logo and Glow Effect */}
        <div className="relative mb-8 flex justify-center">
          <div className="bg-primary/30 absolute -top-4 size-20 rounded-full opacity-70 blur-xl" />
          <motion.div
            className="from-primary relative z-10 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br to-purple-500 shadow-lg shadow-purple-500/30"
            initial={{ rotateY: 0 }}
            animate={{ rotateY: 360 }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
          >
            <OptimizedImage src={logo} className="size-16" alt="Moneko Logo" />
          </motion.div>
        </div>

        <motion.h2
          className="from-primary mb-4 bg-gradient-to-r to-purple-500 bg-clip-text text-center text-3xl font-bold text-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {config.title}
        </motion.h2>

        <motion.p
          className="text-muted-foreground mb-6 text-center text-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {config.description}
        </motion.p>

        {/* Feature List */}
        <motion.div
          className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {config.features.map((feature, index) => (
            <motion.div
              key={index}
              className="bg-card/50 border-border/20 flex items-center rounded-2xl border p-4 shadow-sm"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
            >
              <div className="bg-primary text-primary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm">
                <FontAwesomeIcon icon={feature.icon} className="h-5 w-5" />
              </div>
              <span className="text-foreground ml-4 text-sm font-medium md:text-base">
                {feature.text}
              </span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="flex flex-col items-center justify-center space-x-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          {/* Primary CTA */}
          <Link to="/download" className="group w-full sm:w-auto">
            <motion.div
              className="bg-primary text-primary-foreground flex w-full items-center justify-center space-x-3 rounded-full px-8 py-4 shadow-sm transition-all duration-200 hover:shadow-md sm:w-auto"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
              }}
            >
              <span className="text-lg font-medium">Download the App</span>
              <span className="bg-primary-foreground/20 rounded-full px-3 py-1 text-sm">
                FREE
              </span>
            </motion.div>
          </Link>

          {/* Secondary CTA - Original Action */}
          <Link
            to={config.ctaLink}
            search={!user ? { redirect: "/dashboard" } : undefined}
            className="group"
          >
            <span className="text-muted-foreground hover:text-foreground mt-3 text-sm font-medium transition-colors duration-200">
              {config.ctaText}
            </span>
          </Link>
        </motion.div>
        {/* Free Trial Banner */}
        <motion.div
          className="bg-success/10 border-success/20 mt-8 rounded-3xl border p-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <Link to="/download" className="text-center">
            <div className="text-success mb-2 text-lg font-semibold">
              🚀 FREE TRIAL AVAILABLE
            </div>
            <div className="text-muted-foreground text-sm">
              We're currently offering a{" "}
              <span className="text-primary font-semibold">free trial</span> to
              the first{" "}
              <span className="text-primary font-semibold">100 users</span>!
            </div>
          </Link>
        </motion.div>
      </div>
    </Modal>
  );
};
