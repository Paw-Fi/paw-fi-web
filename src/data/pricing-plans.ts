import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBook,
  faCamera,
  faChartLine,
  faComments,
  faEdit,
  faEnvelope,
  faGraduationCap,
  faHeadset,
  faUsers,
  faWallet,
  faRobot,
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
  priceMonthly: string;
  priceYearly: string;
  compareAtPriceMonthly?: string;
  compareAtPriceYearly?: string;
  features: string[];
  popular?: boolean;
}

export interface PlanComparisonValue {
  included: boolean | null;
  label?: string;
}

export interface PlanComparisonFeature {
  category: string;
  description: string;
  values: Record<string, PlanComparisonValue>;
}

export const plusChecklistFeatures = [
  "AI expense capture",
  "Telegram and WhatsApp capture",
  "Email receipt import",
  "Shared budgets",
  "Bank sync for supported US and Canadian banks, secured by Plaid",
  "Multiple currencies",
  "Currency converter",
  "Live exchange rates",
  "Priority support",
];

export const planComparisonFeatures: PlanComparisonFeature[] = [
  {
    category: "AI Expense Capture",
    description: "Log expenses with AI-assisted capture workflows",
    values: {
      plus: { included: true },
    },
  },
  {
    category: "Messaging App Capture",
    description: "Capture spending from Telegram and WhatsApp workflows",
    values: {
      plus: { included: true },
    },
  },
  {
    category: "Email Receipt Import",
    description: "Forward receipts and import expenses automatically",
    values: {
      plus: { included: true },
    },
  },
  {
    category: "Shared Budgets",
    description: "Plan budgets across personal and shared finances",
    values: {
      plus: { included: true },
    },
  },
  {
    category: "Bank Sync",
    description:
      "Connect supported US and Canadian bank accounts securely through Plaid",
    values: {
      plus: { included: true },
    },
  },
  {
    category: "Multiple Currencies",
    description: "Track and analyze finances across currencies",
    values: {
      plus: { included: true },
    },
  },
  {
    category: "Currency Converter",
    description: "Convert between supported currencies inside Moneko",
    values: {
      plus: { included: true },
    },
  },
  {
    category: "Live Exchange Rates",
    description: "Use up-to-date rates for currency-aware insights",
    values: {
      plus: { included: true },
    },
  },
  {
    category: "Customer Support",
    description: "Get help when you need support",
    values: {
      plus: { included: null, label: "Priority" },
    },
  },
];

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
      "Full-featured budgeting with AI expense capture, household sharing, advanced currency controls, optional bank sync, custom dashboards, learning modules, and priority support.",
    monthlyPrice: 10.99,
    yearlyPrice: 79.99,
    compareAtYearlyPrice: 131.88,
    annualTotal: 79.99,
    priceMonthly: "$10.99",
    priceYearly: "$79.99",
    compareAtPriceYearly: "$131.88",
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
      "Bank sync via Plaid — auto-import transactions from supported US and Canadian banks",
      "Custom dashboards — build focused money views",
      "Unlimited learning modules — guided money skills",
      "Priority support — faster help when you need it",
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
        text: "Currency converter and live exchange rates",
        icon: faChartLine,
      },
      {
        text: "Bank sync via Plaid — auto-import transactions from supported US and Canadian banks",
        icon: faWallet,
      },
      {
        text: "Custom dashboards — build focused money views",
        icon: faChartLine,
      },
      {
        text: "Unlimited learning modules — guided money skills",
        icon: faGraduationCap,
      },
      {
        text: "Priority support — faster help when you need it",
        icon: faHeadset,
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
        limit: "Conversion tools",
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
    priceMonthly: plan.priceMonthly,
    priceYearly: plan.priceYearly,
    compareAtPriceMonthly: plan.compareAtPriceMonthly,
    compareAtPriceYearly: plan.compareAtPriceYearly,
    features: plan.id === "plus" ? plusChecklistFeatures : plan.features,
    popular: plan.popular || false,
  }));
}

// Helper function to get pricing tiers for PricingPage
export function getPricingTiers(): PricingTier[] {
  // Plus Monthly
  const plusMonthly: PricingTier = {
    title: planData.plus.title,
    subtitle: "Monthly subscription to Moneko Plus",
    priceMonthly: "$10.99",
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
    priceMonthly: "$79.99",
    compareAtPriceMonthly: "$131.88",
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

  return [plusMonthly, plusYearly];
}
