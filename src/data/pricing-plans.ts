import { DISCORD_URL } from "@/routes";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faCheck,
  faGift,
  faRocket,
  faMoneyBillWave,
  faChartPie,
  faBullseye,
  faCalendarCheck,
  faStar,
} from "@fortawesome/free-solid-svg-icons";

// Basic plan option interface used in PlanSelector
export interface PlanOption {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  popular?: boolean;
}

// Feature item interface used in PricingPage
export interface FeatureItem {
  text: string;
  icon: IconDefinition;
}

// Detailed feature interface for comparison grid
export interface FeatureDetail {
  description: string;
  isIncluded: boolean;
  limit?: string;
  highlight?: boolean;
}

// Feature comparison structure
export interface FeatureComparison {
  basicLessons: FeatureDetail;
  advancedCourses: FeatureDetail;
  aiPersonalizedLessons: FeatureDetail;
  portfolioTracking: FeatureDetail;
  support: FeatureDetail;
  oneOnOneGuidance: FeatureDetail;
  communityAccess: FeatureDetail;
}

// Pricing tier interface used in PricingPage
export interface PricingTier {
  title: string;
  subtitle: string;
  priceMonthly: string;
  priceYearly?: string;
  annualTotal?: number;
  priceFrequencyText: string;
  description: string;
  features: FeatureItem[];
  actionText: string;
  actionLink: string;
  highlight?: boolean;
  trialText?: string;
  audienceText?: string;
  badgeText?: string;
  bgColor: string;
  textColor: string;
  borderColor?: string;
}

// Define the complete plan data type
export interface PlanData {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  annualTotal?: number;
  priceMonthly: string;
  priceYearly: string;
  priceFrequencyText: string;
  highlight: boolean;
  popular?: boolean;
  actionText: string;
  actionLink: string;
  audienceText?: string;
  badgeText?: string;
  trialText?: string;
  bgColor: string;
  textColor: string;
  borderColor?: string;
  features: string[];
  featureItems: FeatureItem[];
  featureComparison: FeatureComparison;
}

// Shared plan data that can be transformed for different components
export const planData: Record<string, PlanData> = {
  free: {
    id: "free",
    name: "Free",
    title: "Starter",
    subtitle: "Perfect for Financial Beginners",
    description: "Start your financial education journey with essential lessons",
    monthlyPrice: 0,
    yearlyPrice: 0,
    priceMonthly: "$0",
    priceYearly: "$0",
    priceFrequencyText: "/year",
    highlight: false,
    actionText: "Get Started",
    actionLink: "/signup",
    audienceText: "Perfect for those just starting their financial journey",
    bgColor: "bg-white dark:bg-slate-800",
    textColor: "text-gray-900 dark:text-white",
    features: [
      "Access to 3 of 10 basic lessons",
      "Standard community access",
      "Basic financial education content"
    ],
    featureItems: [
      { text: "Access to 3 of 10 basic lessons", icon: faBook },
      { text: "Standard community access", icon: faUsers },
      { text: "Basic financial education content", icon: faGraduationCap }
    ],
    featureComparison: {
      basicLessons: { description: "Core financial education lessons", isIncluded: true, limit: "3 of 10" },
      advancedCourses: { description: "Expert-generated advanced courses", isIncluded: false },
      aiPersonalizedLessons: { description: "AI-generated personalized lessons", isIncluded: false },
      portfolioTracking: { description: "Track your investments", isIncluded: false },
      support: { description: "Get help when needed", isIncluded: true, limit: "Standard Access" },
      oneOnOneGuidance: { description: "Personal financial guidance", isIncluded: false },
      communityAccess: { description: "Join our financial community", isIncluded: true, limit: "Standard Access" }
    }
  },
  
  plus: {
    id: "plus",
    name: "Plus",
    title: "Investor",
    subtitle: "For Serious Learners Ready to Invest",
    description: "Comprehensive education and tools for confident investing",
    monthlyPrice: 9.99,
    yearlyPrice: 4.17,
    annualTotal: 50,
    priceMonthly: "$9.99",
    priceYearly: "$4.17",
    priceFrequencyText: "/year",
    highlight: true,
    popular: true,
    actionText: "Start Free Trial",
    actionLink: "/checkout?plan=plus",
    badgeText: "Most Popular",
    trialText: "Free for the First 100 Users\n— only a few spots left!",
    audienceText: "Ideal for first-time investors serious about learning",
    bgColor: "bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20",
    textColor: "text-gray-900 dark:text-white",
    borderColor: "border-purple-200 dark:border-purple-800",
    features: [
      "All 10 basic lessons unlocked",
      "10 advanced courses by financial advisors",
      "Priority support (24hr response)",
      "Connect 1 brokerage account"
    ],
    featureItems: [
      { text: "All 10 basic lessons unlocked", icon: faBook },
      { text: "10 advanced courses by financial advisors", icon: faUserGraduate },
      { text: "Priority support (24hr response)", icon: faHeadset },
      { text: "Connect 1 brokerage account", icon: faChartLine }
    ],
    featureComparison: {
      basicLessons: { description: "Core financial education lessons", isIncluded: true, limit: "All 10", highlight: true },
      advancedCourses: { description: "Expert-generated advanced courses", isIncluded: true, limit: "10 Courses", highlight: true },
      aiPersonalizedLessons: { description: "AI-generated personalized lessons", isIncluded: false },
      portfolioTracking: { description: "Track your investments", isIncluded: true, limit: "1 Brokerage Account" },
      support: { description: "Get help when needed", isIncluded: true, limit: "Priority (24hr response)" },
      oneOnOneGuidance: { description: "Personal financial guidance", isIncluded: false },
      communityAccess: { description: "Join our financial community", isIncluded: true, limit: "Priority Access" }
    }
  },
  
  premium: {
    id: "premium",
    name: "Premium",
    title: "Wealth Builder",
    subtitle: "For Advanced Investors Building Wealth",
    description: "Unlimited AI-powered guidance and premium features",
    monthlyPrice: 19.99,
    yearlyPrice: 8.33,
    annualTotal: 100,
    priceMonthly: "$19.99",
    priceYearly: "$8.33",
    priceFrequencyText: "/year",
    highlight: false,
    actionText: "Join waitlist",
    actionLink: DISCORD_URL,
    badgeText: "Coming Soon",
    audienceText: "Designed for sophisticated investors and wealth builders",
    bgColor: "bg-white dark:bg-slate-800",
    textColor: "text-gray-900 dark:text-white",
    features: [
      "All 10 basic lessons unlocked",
      "Unlimited advanced courses by advisors",
      "Unlimited AI-personalized lessons",
      "Monthly 1-on-1 guidance sessions",
      "Unlimited brokerage connections"
    ],
    featureItems: [
      { text: "All 10 basic lessons unlocked", icon: faBook },
      { text: "Unlimited advanced courses by advisors", icon: faUserGraduate },
      { text: "Unlimited AI-personalized lessons", icon: faRobot },
      { text: "Monthly 1-on-1 guidance sessions", icon: faUserTie },
      { text: "Unlimited brokerage connections", icon: faChartLine }
    ],
    featureComparison: {
      basicLessons: { description: "Core financial education lessons", isIncluded: true, limit: "All 10" },
      advancedCourses: { description: "Expert-generated advanced courses", isIncluded: true, limit: "Unlimited Access", highlight: true },
      aiPersonalizedLessons: { description: "AI-generated personalized lessons", isIncluded: true, limit: "Unlimited", highlight: true },
      portfolioTracking: { description: "Track your investments", isIncluded: true, limit: "Unlimited Accounts", highlight: true },
      support: { description: "Get help when needed", isIncluded: true, limit: "1-on-1 Priority Channel" },
      oneOnOneGuidance: { description: "Personal financial guidance", isIncluded: true, limit: "Monthly Sessions", highlight: true },
      communityAccess: { description: "Join our financial community", isIncluded: true, limit: "VIP Access" }
    }
  },
};

// Helper function to get plans as an array for PlanSelector
export function getPlanOptions(): PlanOption[] {
  return Object.values(planData).map(plan => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    monthlyPrice: plan.monthlyPrice,
    yearlyPrice: plan.yearlyPrice,
    features: plan.features,
    popular: plan.popular || false,
  }));
}

// Helper function to get pricing tiers for PricingPage
export function getPricingTiers(isYearly: boolean = false): PricingTier[] {
  return Object.values(planData).map(plan => ({
    title: plan.title,
    subtitle: plan.subtitle,
    priceMonthly: plan.priceMonthly,
    priceYearly: plan.priceYearly,
    annualTotal: plan.annualTotal,
    priceFrequencyText: isYearly ? "/year" : plan.priceFrequencyText,
    description: plan.description,
    features: plan.featureItems,
    actionText: plan.actionText,
    actionLink: plan.actionLink,
    highlight: plan.highlight,
    trialText: plan.trialText,
    audienceText: plan.audienceText,
    badgeText: plan.badgeText,
    bgColor: plan.bgColor,
    textColor: plan.textColor,
    borderColor: plan.borderColor,
  }));
}

// Missing icon definitions - adding them here
import { 
  faBook, 
  faUsers, 
  faHeadset, 
  faChartLine, 
  faUserTie, 
  faTools,
  faGraduationCap,
  faUserGraduate,
  faRobot
} from "@fortawesome/free-solid-svg-icons";
