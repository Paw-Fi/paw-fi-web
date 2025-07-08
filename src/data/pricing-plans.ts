import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faCheck,
  faGift,
  faRocket,
  faMoneyBillWave,
  faChartPie,
  faUserGraduate,
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

// Pricing tier interface used in PricingPage
export interface PricingTier {
  title: string;
  subtitle: string;
  priceMonthly: string;
  priceYearly?: string;
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
}

// Shared plan data that can be transformed for different components
export const planData: Record<string, PlanData> = {
  free: {
    id: "free",
    name: "Free",
    title: "Free Plan",
    subtitle: "Starter Pack",
    description: "Perfect if you're just starting your financial journey.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    priceMonthly: "$0",
    priceYearly: "$0",
    priceFrequencyText: "forever",
    highlight: false,
    actionText: "Get Started",
    actionLink: "/signup",
    audienceText: "Perfect for beginners",
    bgColor: "bg-white dark:bg-slate-800",
    textColor: "text-gray-900 dark:text-white",
    features: [
      "Basic financial calculators",
      "Limited learning modules",
      "Community access",
    ],
    featureItems: [
      { text: "Basic financial calculators", icon: faCalculator },
      { text: "Limited learning modules", icon: faBook },
      { text: "Community access", icon: faUsers },
    ],
  },
  // plus: {
  //   id: "plus",
  //   name: "Plus",
  //   title: "Plus Plan",
  //   subtitle: "Money Mover",
  //   description: "Great if you want deeper tools and investing prep.",
  //   monthlyPrice: 9.99,
  //   yearlyPrice: 99.99,
  //   priceMonthly: "$9.99",
  //   priceYearly: "$99.99",
  //   priceFrequencyText: "/month",
  //   highlight: true,
  //   popular: true,
  //   actionText: "Start Free Trial",
  //   actionLink: "/checkout?plan=plus",
  //   badgeText: "Most Popular",
  //   trialText: "7-day free trial, cancel anytime",
  //   audienceText: "Great for active savers",
  //   bgColor: "bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20",
  //   textColor: "text-gray-900 dark:text-white",
  //   borderColor: "border-purple-200 dark:border-purple-800",
  //   features: [
  //     "All basic calculators",
  //     "10 premium learning modules",
  //     "Priority community support",
  //     "Basic portfolio tracking",
  //   ],
  //   featureItems: [
  //     { text: "All basic calculators", icon: faCalculator },
  //     { text: "10 premium learning modules", icon: faBook },
  //     { text: "Priority community support", icon: faHeadset },
  //     { text: "Basic portfolio tracking", icon: faChartLine },
  //   ],
  // },
  premium: {
    id: "premium",
    name: "Premium",
    title: "Premium Plan",
    subtitle: "Invest & Thrive",
    description: "For users serious about mastering money & building wealth.",
    monthlyPrice: 19.99,
    yearlyPrice: 199.99,
    priceMonthly: "$19.99",
    priceYearly: "$199.99",
    priceFrequencyText: "/month",
    highlight: true,
    actionText: "Get Premium",
    actionLink: "/checkout?plan=premium",
    trialText: "14-day free trial, cancel anytime",
    audienceText: "Ideal for investors",
    bgColor: "bg-white dark:bg-slate-800",
    textColor: "text-gray-900 dark:text-white",
    features: [
      "All financial calculators",
      "Unlimited learning modules",
      "1-on-1 expert consultation",
      "Advanced portfolio tracking",
      "Custom financial planning tools",
    ],
    featureItems: [
      { text: "All financial calculators", icon: faCalculator },
      { text: "Unlimited learning modules", icon: faBook },
      { text: "1-on-1 expert consultation", icon: faUserTie },
      { text: "Advanced portfolio tracking", icon: faChartLine },
      { text: "Custom financial planning tools", icon: faTools },
    ],
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
  faCalculator, 
  faBook, 
  faUsers, 
  faHeadset, 
  faChartLine, 
  faUserTie, 
  faTools 
} from "@fortawesome/free-solid-svg-icons";
