import { DISCORD_URL } from "@/routes";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faGift,
  faBullseye,
  faBook, 
  faUsers, 
  faHeadset, 
  faChartLine, 
  faUserTie, 
  faGraduationCap,
  faUserGraduate,
  faRobot,
  faComments,
  faEdit
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
  aiConversations: FeatureDetail;
  goalCreation: FeatureDetail;
  goalModification: FeatureDetail;
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
    name: "Starter",
    title: "Starter",
    subtitle: "Free dashboard to start budgeting smarter with AI",
    description: "Start your financial journey with AI-powered budgeting tools",
    monthlyPrice: 0,
    yearlyPrice: 0,
    priceMonthly: "$0",
    priceYearly: "$0",
    priceFrequencyText: "/month",
    highlight: false,
    actionText: "Get Started Free",
    actionLink: "/signup",
    audienceText: "Best for trying Moneko before upgrading",
    bgColor: "bg-white dark:bg-slate-800",
    textColor: "text-gray-900 dark:text-white",
    features: [
      "Limited AI conversations with Moneko",
      "Basic budgeting & expense tracking",
      "Create and view savings goals",
      "Desktop access only",
      "Join our budgeting community",
      "Best for trying Moneko before upgrading"
    ],
    featureItems: [
      { text: "Limited AI conversations with Moneko", icon: faComments },
      { text: "Basic budgeting & expense tracking", icon: faChartLine },
      { text: "Create and view savings goals", icon: faBullseye },
      { text: "Desktop access only", icon: faUsers },
      { text: "Join our budgeting community", icon: faUsers },
      { text: "Best for trying Moneko before upgrading", icon: faGift }
    ],
    featureComparison: {
      basicLessons: { description: "Core financial education lessons", isIncluded: true, limit: "Limited Access" },
      advancedCourses: { description: "Expert-generated advanced courses", isIncluded: false },
      aiPersonalizedLessons: { description: "AI-generated personalized lessons", isIncluded: false },
      aiConversations: { description: "Chat with Moneko AI assistant", isIncluded: true, limit: "Limited conversations" },
      goalCreation: { description: "Create and track financial goals", isIncluded: true, limit: "Create only (view-only)" },
      goalModification: { description: "Modify and AI-refine your goals", isIncluded: false },
      portfolioTracking: { description: "Track your investments", isIncluded: false },
      support: { description: "Get help when needed", isIncluded: true, limit: "Standard Access" },
      oneOnOneGuidance: { description: "Personal financial guidance", isIncluded: false },
      communityAccess: { description: "Join our financial community", isIncluded: true, limit: "Standard Access" }
    }
  },
  
  plus: {
    id: "plus",
    name: "Plus",
    title: "Plus",
    subtitle: "Perfect for managing expenses, bills, and savings with AI support",
    description: "Full budgeting tools with AI-powered insights and mobile access",
    monthlyPrice: 7.99,
    yearlyPrice: 49,
    annualTotal: 49,
    priceMonthly: "$7.99",
    priceYearly: "$49",
    priceFrequencyText: "/month",
    highlight: true,
    popular: true,
    actionText: "Try Plus Free for 1 Month",
    actionLink: "/checkout?plan=plus",
    badgeText: "Most Popular",
    audienceText: "",
    bgColor: "bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20",
    textColor: "text-gray-900 dark:text-white",
    borderColor: "border-purple-200 dark:border-purple-800",
    features: [
      "Unlimited AI conversations with Moneko",
      "Full budgeting and expense categorization",
      "Advanced savings goal tracking with AI suggestions",
      "Smart reminders for paychecks & bills",
      "Desktop + Mobile App sync"
    ],
    featureItems: [
      { text: "Unlimited AI conversations with Moneko", icon: faRobot },
      { text: "Full budgeting and expense categorization", icon: faChartLine },
      { text: "Advanced savings goal tracking with AI suggestions", icon: faBullseye },
      { text: "Smart reminders for paychecks & bills", icon: faHeadset },
      { text: "Desktop + Mobile App sync", icon: faBook }
    ],
    featureComparison: {
      basicLessons: { description: "Core financial education lessons", isIncluded: true, limit: "All 10", highlight: true },
      advancedCourses: { description: "Expert-generated advanced courses", isIncluded: true, limit: "Unlimited Access", highlight: true },
      aiPersonalizedLessons: { description: "AI-generated personalized lessons", isIncluded: true },
      aiConversations: { description: "Chat with Moneko AI assistant", isIncluded: true, limit: "Unlimited", highlight: true },
      goalCreation: { description: "Create and track financial goals", isIncluded: true, limit: "Full access", highlight: true },
      goalModification: { description: "Modify and AI-refine your goals", isIncluded: true, limit: "With AI refinement", highlight: true },
      portfolioTracking: { description: "Track your investments", isIncluded: true, limit: "1 Brokerage Account" },
      support: { description: "Get help when needed", isIncluded: true, limit: "Priority (24hr response)" },
      oneOnOneGuidance: { description: "Personal financial guidance", isIncluded: false },
      communityAccess: { description: "Join our financial community", isIncluded: true, limit: "Priority Access" }
    }
  },
  
  premium: {
    id: "lifetime",
    name: "Lifetime",
    title: "Lifetime",
    subtitle: "All features, AI support & Founder benefits — forever",
    description: "One-time payment for lifetime access to all features",
    monthlyPrice: 149,
    yearlyPrice: 149,
    annualTotal: 149,
    priceMonthly: "$149",
    priceYearly: "$149",
    priceFrequencyText: "",
    highlight: false,
    actionText: "Secure Lifetime Access",
    actionLink: "/checkout?plan=lifetime",
    audienceText: "Early-bird price (One-time)\nOriginal $199",
    bgColor: "bg-white dark:bg-slate-800",
    textColor: "text-gray-900 dark:text-white",
    features: [
      "Unlimited AI insights & personalization",
      "All Plus features included",
      "Free future updates & features",
      "Founder Member Benefits",
      "Priority support (24hr response)"
    ],
    featureItems: [
      { text: "Unlimited AI insights & personalization", icon: faRobot },
      { text: "All Plus features included", icon: faGift },
      { text: "Free future updates & features", icon: faBook },
      { text: "Founder Member Benefits", icon: faUserTie },
      { text: "Priority support (24hr response)", icon: faHeadset }
    ],
    featureComparison: {
      basicLessons: { description: "Core financial education lessons", isIncluded: true, limit: "All 10" },
      advancedCourses: { description: "Expert-generated advanced courses", isIncluded: true, limit: "Unlimited Access", highlight: true },
      aiPersonalizedLessons: { description: "AI-generated personalized lessons", isIncluded: true, limit: "Unlimited", highlight: true },
      aiConversations: { description: "Chat with Moneko AI assistant", isIncluded: true, limit: "Unlimited", highlight: true },
      goalCreation: { description: "Create and track financial goals", isIncluded: true, limit: "Advanced management", highlight: true },
      goalModification: { description: "Modify and AI-refine your goals", isIncluded: true, limit: "AI optimization", highlight: true },
      portfolioTracking: { description: "Track your investments", isIncluded: true, limit: "Unlimited Accounts", highlight: true },
      support: { description: "Get help when needed", isIncluded: true, limit: "Priority (24hr response)" },
      oneOnOneGuidance: { description: "Personal financial guidance", isIncluded: true, limit: "Founder Benefits", highlight: true },
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