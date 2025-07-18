import { DISCORD_URL } from "@/routes";
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
    subtitle: "Explore the basics",
    description: "Explore the basics for free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    priceMonthly: "$0",
    priceYearly: "$0",
    priceFrequencyText: "/year",
    highlight: false,
    actionText: "Get Started",
    actionLink: "/signup",
    audienceText: "Best for Beginners, No Credit Card Needed",
    bgColor: "bg-white dark:bg-slate-800",
    textColor: "text-gray-900 dark:text-white",
    features: [
      "3 Basic financial calculators",
      "Essential investing lessons",
      "Join our community and share progress"
    ],
    featureItems: [
      { text: "3 Basic financial calculators", icon: faCalculator },
      { text: "Essential investing lessons", icon: faBook },
      { text: "Join our community and share progress", icon: faUsers }
    ],
  },
  
  plus: {
    id: "plus",
    name: "Plus",
    title: "Plus Plan",
    subtitle: "Smart tools for first-time investors",
    description: "Smart tools for first-time investors",
    monthlyPrice: 9.99,
    yearlyPrice: 4.17,
    priceMonthly: "$9.99",
    priceYearly: "$4.17",
    priceFrequencyText: "/year",
    highlight: true,
    popular: true,
    actionText: "Start Free Trial",
    actionLink: "/checkout?plan=plus",
    badgeText: "Most Popular",
    trialText: "Free for the First 100 Users\n— only a few spots left!",
    audienceText: "30-day free trial, cancel anytime, no credit card needed",
    bgColor: "bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20",
    textColor: "text-gray-900 dark:text-white",
    borderColor: "border-purple-200 dark:border-purple-800",
    features: [
      "All calculators",
      "10 Premium learning modules",
      "Priority community support",
      "Basic portfolio tracking"
    ],
    featureItems: [
      { text: "All calculators", icon: faCalculator },
      { text: "10 Premium learning modules", icon: faBook },
      { text: "Priority community support", icon: faHeadset },
      { text: "Basic portfolio tracking", icon: faChartLine }
    ],
  },
  
  premium: {
    id: "premium",
    name: "Premium",
    title: "Premium Plan",
    subtitle: "Expert help + full customization",
    description: "Expert help + full customization",
    monthlyPrice: 19.99,
    yearlyPrice: 8.33,
    priceMonthly: "$19.99",
    priceYearly: "$8.33",
    priceFrequencyText: "/year",
    highlight: false,
    actionText: "Join waitlist",
    actionLink: DISCORD_URL,
    badgeText: "Coming Soon",
    audienceText: "Level up your money game and build real wealth",
    bgColor: "bg-white dark:bg-slate-800",
    textColor: "text-gray-900 dark:text-white",
    features: [
      "All calculators",
      "Unlimited Premium learning",
      "1-on-1 Investment Guidance",
      "Advanced portfolio tracking",
      "Custom financial planning features"
    ],
    featureItems: [
      { text: "All calculators", icon: faCalculator },
      { text: "Unlimited Premium learning", icon: faBook },
      { text: "1-on-1 Investment Guidance", icon: faUserTie },
      { text: "Advanced portfolio tracking", icon: faChartLine },
      { text: "Custom financial planning features", icon: faTools }
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
