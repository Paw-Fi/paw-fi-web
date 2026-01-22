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
  compareAtPriceMonthly?: string;
  compareAtPriceYearly?: string;
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
  compareAtMonthlyPrice?: number;
  compareAtYearlyPrice?: number;
  annualTotal?: number;
  priceMonthly: string;
  priceYearly: string;
  compareAtPriceMonthly?: string;
  compareAtPriceYearly?: string;
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
    subtitle: "Free AI budgeting dashboard for simple monthly money tracking",
    description: "A free budgeting plan to track spending, set up pockets (digital envelopes), and manage recurring bills.",
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
      "Core web budgeting dashboard",
      "Fast capture (text + review)",
      "Pockets (envelopes) for monthly budgeting",
      "Personal and Household modes",
      "Recurring items (bills + income)",
      "Community access"
    ],
    featureItems: [
      { text: "Core web budgeting dashboard", icon: faChartLine },
      { text: "Fast capture (text + review)", icon: faComments },
      { text: "Pockets (envelopes) for monthly budgeting", icon: faBullseye },
      { text: "Personal and Household modes", icon: faUsers },
      { text: "Recurring items (bills + income)", icon: faEdit },
      { text: "Community access", icon: faGift }
    ],
    featureComparison: {
      basicLessons: { description: "Fast capture", isIncluded: true, limit: "Text capture" },
      advancedCourses: { description: "Pockets (envelopes)", isIncluded: true },
      aiPersonalizedLessons: { description: "Scenario planning", isIncluded: true },
      aiConversations: { description: "WhatsApp assistant", isIncluded: false },
      goalCreation: { description: "Personal vs Household mode", isIncluded: true },
      goalModification: { description: "Recurring items", isIncluded: true },
      portfolioTracking: { description: "Multi-currency view", isIncluded: true },
      support: { description: "Support", isIncluded: true, limit: "Standard" },
      oneOnOneGuidance: { description: "1:1 guidance", isIncluded: false },
      communityAccess: { description: "Community access", isIncluded: true, limit: "Standard" }
    }
  },
  
  plus: {
    id: "plus",
    name: "Plus",
    title: "Plus",
    subtitle: "Full AI budgeting plan for faster capture + scenario planning",
    description: "Upgrade for WhatsApp expense tracking (where available), receipt/voice capture (where available), and scenario insights.",
    monthlyPrice: 5.99,
    yearlyPrice: 29.99,
    compareAtMonthlyPrice: 7.99,
    compareAtYearlyPrice: 59.99,
    annualTotal: 29.99,
    priceMonthly: "$5.99",
    priceYearly: "$29.99",
    compareAtPriceMonthly: "$7.99",
    compareAtPriceYearly: "$59.99",
    priceFrequencyText: "/month",
    highlight: true,
    popular: true,
    actionText: "Upgrade to Plus",
    actionLink: "/checkout?plan=plus",
    badgeText: "Early Bird",
    audienceText: "",
    bgColor: "bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20",
    textColor: "text-gray-900 dark:text-white",
    borderColor: "border-purple-200 dark:border-purple-800",
    features: [
      "Everything in Starter",
      "WhatsApp assistant access (where available)",
      "Receipt photo capture (where available)",
      "Voice note capture (where available)",
      "Scenario planning and saved insights"
    ],
    featureItems: [
      { text: "Everything in Starter", icon: faGift },
      { text: "WhatsApp assistant access (where available)", icon: faRobot },
      { text: "Receipt photo capture (where available)", icon: faBook },
      { text: "Voice note capture (where available)", icon: faComments },
      { text: "Scenario planning and saved insights", icon: faChartLine }
    ],
    featureComparison: {
      basicLessons: { description: "Fast capture", isIncluded: true, limit: "Text + review", highlight: true },
      advancedCourses: { description: "Pockets (envelopes)", isIncluded: true, highlight: true },
      aiPersonalizedLessons: { description: "Scenario planning", isIncluded: true, highlight: true },
      aiConversations: { description: "WhatsApp assistant", isIncluded: true, limit: "Where available", highlight: true },
      goalCreation: { description: "Personal vs Household mode", isIncluded: true, highlight: true },
      goalModification: { description: "Recurring items", isIncluded: true, highlight: true },
      portfolioTracking: { description: "Multi-currency view", isIncluded: true },
      support: { description: "Support", isIncluded: true, limit: "Standard" },
      oneOnOneGuidance: { description: "1:1 guidance", isIncluded: false },
      communityAccess: { description: "Community access", isIncluded: true, limit: "Standard" }
    }
  },
  
  premium: {
    id: "lifetime",
    name: "Lifetime",
    title: "Lifetime",
    subtitle: "All features — one-time payment, lifetime access",
    description: "A limited-time one-time payment option for lifetime access.",
    monthlyPrice: 39.99,
    yearlyPrice: 39.99,
    annualTotal: 39.99,
    priceMonthly: "$39.99",
    priceYearly: "$39.99",
    priceFrequencyText: "",
    highlight: false,
    actionText: "Secure Lifetime Access",
    actionLink: "/checkout?plan=lifetime",
    audienceText: "Limited-time lifetime access offer (one-time).",
    bgColor: "bg-white dark:bg-slate-800",
    textColor: "text-gray-900 dark:text-white",
    features: [
      "All Plus features included",
      "Lifetime access for the account",
      "Discord community perks (when offered)",
      "Support"
    ],
    featureItems: [
      { text: "All Plus features included", icon: faGift },
      { text: "Lifetime access for the account", icon: faUserTie },
      { text: "Discord community perks (when offered)", icon: faUsers },
      { text: "Support", icon: faHeadset }
    ],
    featureComparison: {
      basicLessons: { description: "Fast capture", isIncluded: true, limit: "Text + review" },
      advancedCourses: { description: "Pockets (envelopes)", isIncluded: true, highlight: true },
      aiPersonalizedLessons: { description: "Scenario planning", isIncluded: true, highlight: true },
      aiConversations: { description: "WhatsApp assistant", isIncluded: true, limit: "Where available", highlight: true },
      goalCreation: { description: "Personal vs Household mode", isIncluded: true, highlight: true },
      goalModification: { description: "Recurring items", isIncluded: true, highlight: true },
      portfolioTracking: { description: "Multi-currency view", isIncluded: true, highlight: true },
      support: { description: "Support", isIncluded: true, limit: "Standard" },
      oneOnOneGuidance: { description: "1:1 guidance", isIncluded: false },
      communityAccess: { description: "Community access", isIncluded: true, limit: "Standard" }
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
    compareAtPriceMonthly: plan.compareAtPriceMonthly,
    compareAtPriceYearly: plan.compareAtPriceYearly,
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
