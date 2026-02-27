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

// Feature comparison structure derived from main_shell.md
export interface FeatureComparison {
  fastCapture: FeatureDetail;
  pockets: FeatureDetail;
  whatsapp: FeatureDetail;
  scenarioPlanning: FeatureDetail;
  personalHousehold: FeatureDetail;
  recurring: FeatureDetail;
  multiCurrency: FeatureDetail;
  homeWidgets: FeatureDetail;
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
      "Fast capture with a review-first workflow",
      "Pockets & envelope budgeting",
      "Personal and Household modes",
      "Recurring bills and income tracking",
      "Multi-currency overview",
      "Home screen widgets + quick add"
    ],
    featureItems: [
      { text: "Fast capture with a review-first workflow", icon: faComments },
      { text: "Pockets & envelope budgeting", icon: faBullseye },
      { text: "Personal and Household modes", icon: faUsers },
      { text: "Recurring bills and income tracking", icon: faEdit },
      { text: "Multi-currency overview", icon: faChartLine },
      { text: "Home screen widgets + quick add", icon: faGift }
    ],
    featureComparison: {
      fastCapture: { description: "Fast capture workflow", isIncluded: true, limit: "Text capture + review" },
      pockets: { description: "Pockets & envelopes", isIncluded: true },
      whatsapp: { description: "WhatsApp assistant", isIncluded: false },
      scenarioPlanning: { description: "Scenario planning", isIncluded: true },
      personalHousehold: { description: "Personal vs Household mode", isIncluded: true },
      recurring: { description: "Recurring bills & income", isIncluded: true },
      multiCurrency: { description: "Multi-currency view", isIncluded: true, limit: "Switch currency" },
      homeWidgets: { description: "Home screen widgets", isIncluded: true }
    }
  },
  
  plus: {
    id: "plus",
    name: "Plus",
    title: "Plus",
    subtitle: "Full AI budgeting plan for faster capture + scenario planning",
    description: "Upgrade for WhatsApp expense tracking (where available), receipt/voice capture (where available), and scenario insights.",
    monthlyPrice: 2.99,
    yearlyPrice: 9.99,
    compareAtMonthlyPrice: 7.99,
    compareAtYearlyPrice: 59.99,
    annualTotal: 9.99,
    priceMonthly: "$2.99",
    priceYearly: "$9.99",
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
      "WhatsApp assistant for capture + summaries",
      "Receipt/photo/voice capture (where available)",
      "Scenario planning with saved insights",
      "Home screen widgets + quick add"
    ],
    featureItems: [
      { text: "Everything in Starter", icon: faGift },
      { text: "WhatsApp assistant for capture + summaries", icon: faRobot },
      { text: "Receipt/photo/voice capture (where available)", icon: faBook },
      { text: "Scenario planning with saved insights", icon: faChartLine },
      { text: "Home screen widgets + quick add", icon: faComments }
    ],
    featureComparison: {
      fastCapture: { description: "Fast capture workflow", isIncluded: true, limit: "Text, photo & voice", highlight: true },
      pockets: { description: "Pockets & envelopes", isIncluded: true, highlight: true },
      whatsapp: { description: "WhatsApp assistant", isIncluded: true, limit: "Chat capture + summaries", highlight: true },
      scenarioPlanning: { description: "Scenario planning", isIncluded: true, highlight: true },
      personalHousehold: { description: "Personal vs Household mode", isIncluded: true, highlight: true },
      recurring: { description: "Recurring bills & income", isIncluded: true, highlight: true },
      multiCurrency: { description: "Multi-currency view", isIncluded: true, limit: "Switch currency", highlight: true },
      homeWidgets: { description: "Home screen widgets", isIncluded: true, highlight: true }
    }
  },
  
  premium: {
    id: "lifetime",
    name: "Lifetime",
    title: "Lifetime",
    subtitle: "All features — one-time payment, lifetime access",
    description: "A limited-time one-time payment option for lifetime access.",
    monthlyPrice: 19.99,
    yearlyPrice: 19.99,
    annualTotal: 19.99,
    priceMonthly: "$19.99",
    priceYearly: "$19.99",
    priceFrequencyText: "",
    highlight: false,
    actionText: "Secure Lifetime Access",
    actionLink: "/checkout?plan=lifetime",
    audienceText: "Limited-time lifetime access offer (one-time).",
    bgColor: "bg-white dark:bg-slate-800",
    textColor: "text-gray-900 dark:text-white",
    features: [
      "All Plus features unlocked",
      "Fast capture + pockets workflows",
      "WhatsApp budgeting assistant",
      "Scenario planning & insights"
    ],
    featureItems: [
      { text: "All Plus features unlocked", icon: faGift },
      { text: "Fast capture + pockets workflows", icon: faBullseye },
      { text: "WhatsApp budgeting assistant", icon: faRobot },
      { text: "Scenario planning & insights", icon: faChartLine }
    ],
    featureComparison: {
      fastCapture: { description: "Fast capture workflow", isIncluded: true, limit: "Text, photo & voice", highlight: true },
      pockets: { description: "Pockets & envelopes", isIncluded: true, highlight: true },
      whatsapp: { description: "WhatsApp assistant", isIncluded: true, limit: "Chat capture + summaries", highlight: true },
      scenarioPlanning: { description: "Scenario planning", isIncluded: true, highlight: true },
      personalHousehold: { description: "Personal vs Household mode", isIncluded: true, highlight: true },
      recurring: { description: "Recurring bills & income", isIncluded: true, highlight: true },
      multiCurrency: { description: "Multi-currency view", isIncluded: true, limit: "Switch currency", highlight: true },
      homeWidgets: { description: "Home screen widgets", isIncluded: true, highlight: true }
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

// Helper function to get pricing tiers for PricingPage with 3 separate plans
export function getPricingTiers(): PricingTier[] {
  // Plus Monthly
  const plusMonthly: PricingTier = {
    title: planData.plus.title,
    subtitle: "Monthly subscription to Moneko Plus",
    priceMonthly: "$2.99",
    compareAtPriceMonthly: "$7.99",
    priceFrequencyText: "/month",
    description: planData.plus.description,
    features: planData.plus.featureItems,
    actionText: "Subscribe Monthly",
    actionLink: "/checkout?plan=plus&billing=monthly",
    highlight: false,
    trialText: planData.plus.trialText,
    audienceText: planData.plus.audienceText,
    badgeText: "Early Bird",
    bgColor: planData.plus.bgColor,
    textColor: planData.plus.textColor,
    borderColor: planData.plus.borderColor,
  };

  // Plus Yearly
  const plusYearly: PricingTier = {
    title: planData.plus.title + " Yearly",
    subtitle: "Best value — annual subscription to Moneko Plus",
    priceMonthly: "$9.99",
    compareAtPriceMonthly: "$59.99",
    priceFrequencyText: "/year",
    description: planData.plus.description,
    features: planData.plus.featureItems,
    actionText: "Subscribe Yearly",
    actionLink: "/checkout?plan=plus&billing=yearly",
    highlight: true,
    popular: true,
    trialText: planData.plus.trialText,
    audienceText: planData.plus.audienceText,
    badgeText: "Best Value",
    bgColor: planData.plus.bgColor,
    textColor: planData.plus.textColor,
    borderColor: planData.plus.borderColor,
  };

  // Lifetime
  const lifetime: PricingTier = {
    title: planData.premium.title,
    subtitle: planData.premium.subtitle,
    priceMonthly: "$19.99",
    priceFrequencyText: "",
    description: planData.premium.description,
    features: planData.premium.featureItems,
    actionText: "Get Lifetime Access",
    actionLink: "/checkout?plan=lifetime",
    highlight: false,
    trialText: planData.premium.trialText,
    audienceText: planData.premium.audienceText,
    badgeText: "Limited Time",
    bgColor: planData.premium.bgColor,
    textColor: planData.premium.textColor,
    borderColor: planData.premium.borderColor,
  };

  return [plusMonthly, plusYearly, lifetime];
}
