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
  faEdit,
  faEnvelope,
  faCamera,
  faMicrophone,
  faWallet,
  faPiggyBank,
  faSync,
  faLightbulb,
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
  emailCapture: FeatureDetail;
  householdSharing: FeatureDetail;
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
  plus: {
    id: "plus",
    name: "Plus",
    title: "Plus",
    subtitle: "AI-powered budgeting with unlimited capture & smart automation",
    description:
      "Full-featured budgeting with AI expense capture via text, photo, voice, email, and WhatsApp. Includes envelope budgeting, scenario planning, and automatic receipt processing.",
    monthlyPrice: 4.99,
    yearlyPrice: 34.99,
    compareAtMonthlyPrice: 9.99,
    compareAtYearlyPrice: 119.88,
    annualTotal: 34.99,
    priceMonthly: "$4.99",
    priceYearly: "$34.99",
    compareAtPriceMonthly: "$9.99",
    compareAtPriceYearly: "$119.88",
    priceFrequencyText: "/month",
    highlight: true,
    popular: true,
    actionText: "Upgrade to Plus",
    actionLink: "/checkout?plan=plus",
    badgeText: "Early Bird",
    audienceText: "",
    bgColor:
      "bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20",
    textColor: "text-gray-900 dark:text-white",
    borderColor: "border-purple-200 dark:border-purple-800",
    features: [
      "Unlimited AI expense capture — text, photo, voice, email",
      "Smart email receipt capture — forward receipts to auto-log",
      "WhatsApp budgeting assistant — capture + summaries on chat",
      "Personal & Household modes — solo or shared finances",
      "One subscription shared across all household members",
      "Recurring bills & income tracking — never miss a payment",
      "Scenario planning — what-if insights with AI",
      "Multi-currency support — track spending globally",
      "Home screen widgets — quick add & budget glance",
      "Bank sync via Plaid — auto-import transactions (Coming Soon)",
    ],
    featureItems: [
      {
        text: "Unlimited AI expense capture — text, photo, voice, email",
        icon: faRobot,
      },
      {
        text: "Smart email receipt capture — forward receipts to auto-log",
        icon: faEnvelope,
      },
      {
        text: "WhatsApp budgeting assistant — capture + summaries on chat",
        icon: faComments,
      },
      {
        text: "Personal & Household modes — solo or shared finances",
        icon: faUsers,
      },
      {
        text: "One subscription shared across all household members",
        icon: faUsers,
      },
      {
        text: "Recurring bills & income tracking — never miss a payment",
        icon: faSync,
      },
      {
        text: "Scenario planning — what-if insights with AI",
        icon: faLightbulb,
      },
      {
        text: "Multi-currency support — track spending globally",
        icon: faChartLine,
      },
      {
        text: "Bank sync via Plaid — auto-import transactions (Coming Soon)",
        icon: faWallet,
      },
    ],
    featureComparison: {
      fastCapture: {
        description: "Fast capture workflow",
        isIncluded: true,
        limit: "Text, photo, voice & email",
        highlight: true,
      },
      pockets: {
        description: "Pockets & envelopes",
        isIncluded: true,
        highlight: true,
      },
      whatsapp: {
        description: "WhatsApp assistant",
        isIncluded: true,
        limit: "Chat capture + summaries",
        highlight: true,
      },
      scenarioPlanning: {
        description: "Scenario planning",
        isIncluded: true,
        highlight: true,
      },
      personalHousehold: {
        description: "Personal vs Household mode",
        isIncluded: true,
        highlight: true,
      },
      recurring: {
        description: "Recurring bills & income",
        isIncluded: true,
        highlight: true,
      },
      multiCurrency: {
        description: "Multi-currency view",
        isIncluded: true,
        limit: "Switch currency",
        highlight: true,
      },
      homeWidgets: {
        description: "Home screen widgets",
        isIncluded: true,
        highlight: true,
      },
      emailCapture: {
        description: "Email receipt capture",
        isIncluded: true,
        limit: "Unlimited forwarding",
        highlight: true,
      },
      householdSharing: {
        description: "Shared household subscription",
        isIncluded: true,
        limit: "All members",
        highlight: true,
      },
    },
  },

  premium: {
    id: "premium",
    name: "Premium",
    title: "Premium",
    subtitle: "Advanced money automation for connected finances",
    description:
      "Everything in Plus, with Premium-tier access for advanced currency controls, bank sync, custom dashboards, and priority support.",
    monthlyPrice: 7.99,
    yearlyPrice: 59.99,
    compareAtMonthlyPrice: 9.99,
    compareAtYearlyPrice: 95.88,
    annualTotal: 59.99,
    priceMonthly: "$7.99",
    priceYearly: "$59.99",
    compareAtPriceMonthly: "$9.99",
    compareAtPriceYearly: "$95.88",
    priceFrequencyText: "/month",
    highlight: true,
    popular: false,
    actionText: "Upgrade to Premium",
    actionLink: "/checkout?plan=premium",
    badgeText: "Advanced",
    audienceText: "",
    bgColor:
      "bg-gradient-to-br from-amber-50 to-violet-50 dark:from-amber-900/20 dark:to-violet-900/20",
    textColor: "text-gray-900 dark:text-white",
    borderColor: "border-amber-200 dark:border-amber-800",
    features: [
      "Everything in Plus",
      "Advanced multi-currency controls — premium conversion tools",
      "Bank sync via Plaid — auto-import transactions (Coming Soon)",
      "Custom dashboards — build focused money views",
      "Unlimited learning modules — guided money skills",
      "Priority support — faster help when you need it",
      "Premium-tier access for all household members",
    ],
    featureItems: [
      { text: "Everything in Plus", icon: faGift },
      {
        text: "Advanced multi-currency controls — premium conversion tools",
        icon: faChartLine,
      },
      {
        text: "Bank sync via Plaid — auto-import transactions (Coming Soon)",
        icon: faWallet,
      },
      {
        text: "Custom dashboards — build focused money views",
        icon: faBullseye,
      },
      {
        text: "Unlimited learning modules — guided money skills",
        icon: faGraduationCap,
      },
      {
        text: "Priority support — faster help when you need it",
        icon: faHeadset,
      },
      {
        text: "Premium-tier access for all household members",
        icon: faUsers,
      },
    ],
    featureComparison: {
      fastCapture: {
        description: "Fast capture workflow",
        isIncluded: true,
        limit: "Text, photo, voice & email",
        highlight: true,
      },
      pockets: {
        description: "Pockets & envelopes",
        isIncluded: true,
        highlight: true,
      },
      whatsapp: {
        description: "WhatsApp assistant",
        isIncluded: true,
        limit: "Chat capture + summaries",
        highlight: true,
      },
      scenarioPlanning: {
        description: "Scenario planning",
        isIncluded: true,
        highlight: true,
      },
      personalHousehold: {
        description: "Personal vs Household mode",
        isIncluded: true,
        highlight: true,
      },
      recurring: {
        description: "Recurring bills & income",
        isIncluded: true,
        highlight: true,
      },
      multiCurrency: {
        description: "Advanced multi-currency view",
        isIncluded: true,
        limit: "Premium controls",
        highlight: true,
      },
      homeWidgets: {
        description: "Home screen widgets",
        isIncluded: true,
        highlight: true,
      },
      emailCapture: {
        description: "Email receipt capture",
        isIncluded: true,
        limit: "Unlimited forwarding",
        highlight: true,
      },
      householdSharing: {
        description: "Shared household subscription",
        isIncluded: true,
        limit: "All members",
        highlight: true,
      },
    },
  },
};

// Helper function to get plans as an array for PlanSelector
export function getPlanOptions(): PlanOption[] {
  return Object.values(planData).map((plan) => ({
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
export function getPricingTiers(): PricingTier[] {
  // Plus Monthly
  const plusMonthly: PricingTier = {
    title: planData.plus.title,
    subtitle: "Monthly subscription to Moneko Plus",
    priceMonthly: "$4.99",
    compareAtPriceMonthly: "$9.99",
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
    priceMonthly: "$34.99",
    compareAtPriceMonthly: "$119.88",
    priceFrequencyText: "/year",
    description: planData.plus.description,
    features: planData.plus.featureItems,
    actionText: "Subscribe Yearly",
    actionLink: "/checkout?plan=plus&billing=yearly",
    highlight: true,
    trialText: planData.plus.trialText,
    audienceText: planData.plus.audienceText,
    badgeText: "Best Value",
    bgColor: planData.plus.bgColor,
    textColor: planData.plus.textColor,
    borderColor: planData.plus.borderColor,
  };

  // Premium Monthly
  const premiumMonthly: PricingTier = {
    title: planData.premium.title,
    subtitle: "Monthly subscription to Moneko Premium",
    priceMonthly: planData.premium.priceMonthly,
    compareAtPriceMonthly: planData.premium.compareAtPriceMonthly,
    priceFrequencyText: "/month",
    description: planData.premium.description,
    features: planData.premium.featureItems,
    actionText: "Subscribe Monthly",
    actionLink: "/checkout?plan=premium&billing=monthly",
    highlight: false,
    trialText: planData.premium.trialText,
    audienceText: planData.premium.audienceText,
    badgeText: "Advanced",
    bgColor: planData.premium.bgColor,
    textColor: planData.premium.textColor,
    borderColor: planData.premium.borderColor,
  };

  // Premium Yearly
  const premiumYearly: PricingTier = {
    title: planData.premium.title + " Yearly",
    subtitle: "Best value — annual subscription to Moneko Premium",
    priceMonthly: planData.premium.priceYearly,
    compareAtPriceMonthly: planData.premium.compareAtPriceYearly,
    priceFrequencyText: "/year",
    description: planData.premium.description,
    features: planData.premium.featureItems,
    actionText: "Subscribe Yearly",
    actionLink: "/checkout?plan=premium&billing=yearly",
    highlight: false,
    trialText: planData.premium.trialText,
    audienceText: planData.premium.audienceText,
    badgeText: "Premium",
    bgColor: planData.premium.bgColor,
    textColor: planData.premium.textColor,
    borderColor: planData.premium.borderColor,
  };

  return [plusMonthly, plusYearly, premiumMonthly, premiumYearly];
}
