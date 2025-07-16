"use client";

import { useState, useMemo, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faCircleCheck,
  faCircleExclamation,
  faCircleQuestion,
  faHandshake,
  faCoins,
  faChartPie,
  faFileInvoiceDollar,
  faSnowflake,
  faFire,
  // Icons for FinancialHealthScorecardWidget are now imported within its definition
} from "@fortawesome/free-solid-svg-icons";
import {
  IFinancialHealthScorecardWidget,
  INextBestActionWidget,
  INextBestActionItem, // Added import for INextBestActionItem
  IDebtVisualizerWidget,
  IRetirementReadinessWidget,
  IEnhancedSavingsGoalsWidget,
  IInsuranceCoverageWidget,
} from "../types/dashboard-data.typings";
import { Widget } from "./Widget";

// Financial Health Scorecard Widget
import { motion, Variants } from "framer-motion";

import {
  faWallet,
  faPiggyBank,
  faCreditCard,
  faChartLine,
  faShieldAlt,
  faQuestionCircle,
  faUmbrellaBeach,
  faCalculator,
  faArrowTrendUp,
  faArrowTrendDown,
} from "@fortawesome/free-solid-svg-icons"; // Added more icons

// Helper to get styles based on financial status
interface StatusStyles {
  textColor: string;
  bgColor: string;
  borderColor: string;
  progressColor: string;
  iconColor?: string;
  ringColor?: string;
}

// Helper to get actual color values for SVG elements
function getStatusColorValue(status?: string): string {
  const s = status?.toLowerCase();
  switch (s) {
    case "excellent":
      return "#10b981"; // emerald-500
    case "good":
      return "#0ea5e9"; // sky-500
    case "fair":
      return "#f59e0b"; // amber-500
    case "needs attention":
    case "needs improvement":
      return "#f97316"; // orange-500
    case "poor":
      return "#ef4444"; // red-500
    default:
      return "#64748b"; // slate-500
  }
}

type FinancialStatus =
  | "Excellent"
  | "Good"
  | "Fair"
  | "Needs Attention"
  | string
  | undefined;

function getFinancialStatusStyles(status?: FinancialStatus): StatusStyles {
  const s = status?.toLowerCase();
  switch (s) {
    case "excellent":
      return {
        textColor: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-50 dark:bg-emerald-900/60",
        borderColor: "border-emerald-500/30 dark:border-emerald-700/50",
        progressColor: "text-emerald-500 dark:text-emerald-400",
        iconColor: "text-emerald-500 dark:text-emerald-400",
        ringColor: "ring-emerald-500",
      };
    case "good":
      return {
        textColor: "text-sky-600 dark:text-sky-400",
        bgColor: "bg-sky-50 dark:bg-sky-900/60",
        borderColor: "border-sky-500/30 dark:border-sky-700/50",
        progressColor: "text-sky-500 dark:text-sky-400",
        iconColor: "text-sky-500 dark:text-sky-400",
        ringColor: "ring-sky-500",
      };
    case "fair":
      return {
        textColor: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-900/60",
        borderColor: "border-amber-500/30 dark:border-amber-700/50",
        progressColor: "text-amber-500 dark:text-amber-400",
        iconColor: "text-amber-500 dark:text-amber-400",
        ringColor: "ring-amber-500",
      };
    case "needs attention": // Mapped from 'Needs Improvement'
    case "needs improvement":
    case "needs work":
      return {
        textColor: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-50 dark:bg-orange-900/60",
        borderColor: "border-orange-500/30 dark:border-orange-700/50",
        progressColor: "text-orange-500 dark:text-orange-400",
        iconColor: "text-orange-500 dark:text-orange-400",
        ringColor: "ring-orange-500",
      };
    case "poor":
    case "at risk":
      return {
        textColor: "text-red-600 dark:text-red-500",
        bgColor: "bg-red-50 dark:bg-red-900/60",
        borderColor: "border-red-500/30 dark:border-red-700/50",
        progressColor: "text-red-500 dark:text-red-400",
        iconColor: "text-red-500 dark:text-red-400",
        ringColor: "ring-red-500",
      };
    default:
      return {
        textColor: "text-slate-600 dark:text-slate-400",
        bgColor: "bg-slate-100 dark:bg-slate-800/60",
        borderColor: "border-slate-300/40 dark:border-slate-700/50",
        progressColor: "text-slate-500 dark:text-slate-400",
        iconColor: "text-slate-500 dark:text-slate-400",
        ringColor: "ring-slate-500",
      };
  }
}

// Helper function to get color class for status text display
function getStatusColorClass(status?: string): string {
  const s = status?.toLowerCase();
  switch (s) {
    case "excellent":
      return "text-emerald-600 dark:text-emerald-400";
    case "good":
      return "text-emerald-600 dark:text-emerald-400";
    case "fair":
      return "text-amber-600 dark:text-amber-400";
    case "needs attention":
    case "needs improvement":
    case "needs work":
      return "text-orange-600 dark:text-orange-400";
    case "poor":
    case "at risk":
      return "text-red-600 dark:text-red-500";
    default:
      return "text-slate-600 dark:text-slate-400";
  }
}

// Framer Motion Variants
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.07,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -15 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 100, damping: 12 },
  },
};

const scoreCircleVariants: Variants = {
  hidden: { strokeDashoffset: 283 }, // Assuming circumference of ~283 for a 45 radius circle (2 * PI * 45)
  visible: (custom: number) => ({
    strokeDashoffset: 283 * (1 - custom / 100),
    transition: { duration: 1.2, ease: [0.33, 1, 0.68, 1] },
  }),
};

// Helper to get category icon
function getCategoryIcon(category?: string) {
  switch (category?.toLowerCase()) {
    case "budgeting":
      return faWallet;
    case "savings":
      return faPiggyBank;
    case "debt":
      return faCreditCard;
    case "investment":
    case "investments":
      return faChartLine;
    case "insurance":
      return faShieldAlt;
    case "emergency fund":
      return faCoins;
    case "risk management":
      return faShieldAlt;
    default:
      return faQuestionCircle;
  }
}

// Define the types for the financial health calculation results
/**
 * Type definition for debt status
 */
export interface DebtStatus {
  debtFree: boolean;
  debtTypes: string[];
}

export interface IFinancialHealthCalculationResult {
  overallScore: number;
  status: "Excellent" | "Good" | "Fair" | "Needs Attention";
  items: Array<{
    id: string;
    category: string;
    score: number;
    status: string;
    explanation: string;
  }>;
  // Added fields for debt status and retirement projection information
  debtStatus?: DebtStatus;
  projectedRetirementFund?: number;
  monthlyRetirementIncome?: number;
  progressPercentage?: number;
}

export interface QuizAnswers {
  [key: string]: any;
}

/**
 * Calculates a financial health score and retirement projections based on quiz answers
 * This is an exported utility function that can be used by any component
 * @param quizAnswers - Object containing raw financial data like income, expenses, etc.
 * @returns Financial health calculation result with overall score, status, breakdown items, and retirement projections
 */
export function calculateFinancialHealthScore(
  quizAnswers: QuizAnswers,
): IFinancialHealthCalculationResult {


  // Extract and validate required granular data
  const monthlyIncome =
    typeof quizAnswers["monthly-income"] === "number"
      ? quizAnswers["monthly-income"]
      : 0;
  const monthlyExpenses =
    typeof quizAnswers["monthly-expenses"] === "number"
      ? quizAnswers["monthly-expenses"]
      : 0;
  const emergencyFundMonths =
    typeof quizAnswers["emergency-fund-months"] === "number"
      ? quizAnswers["emergency-fund-months"]
      : typeof quizAnswers["emergency-fund"] === "number" && monthlyExpenses > 0
        ? Math.floor(quizAnswers["emergency-fund"] / monthlyExpenses)
        : 0;

  // Extract insurance policies (handle both array and string formats)
  let insurancePolicies: string[] = [];
  if (Array.isArray(quizAnswers["insurance-policies"])) {
    insurancePolicies = quizAnswers["insurance-policies"];
  } else if (Array.isArray(quizAnswers["insurance-coverage"])) {
    insurancePolicies = quizAnswers["insurance-coverage"];
  }

  // Handle debt fields - recognize both amount fields and type arrays
  // Extract debt amounts
  let debtMortgage =
    typeof quizAnswers["debt-amount-mortgage"] === "number"
      ? quizAnswers["debt-amount-mortgage"]
      : 0;
  let debtCredit =
    typeof quizAnswers["debt-amount-credit"] === "number"
      ? quizAnswers["debt-amount-credit"]
      : 0;
  let debtStudent =
    typeof quizAnswers["debt-amount-student"] === "number"
      ? quizAnswers["debt-amount-student"]
      : 0;
  let debtOther =
    typeof quizAnswers["debt-amount-other"] === "number"
      ? quizAnswers["debt-amount-other"]
      : 0;

  // Parse debt types from quiz answers - handling both strings and arrays
  let debtTypes: string[] = [];
  const totalDebtAmount =
    typeof quizAnswers["debt-level"] === "number"
      ? quizAnswers["debt-level"]
      : 0;

  // Handle debt-type array - always use this if available
  if (Array.isArray(quizAnswers["debt-type"])) {
    // Filter out 'none' if other debt types are present
    if (quizAnswers["debt-type"].length > 1) {
      debtTypes = quizAnswers["debt-type"].filter((type) => type !== "none");
    } else {
      debtTypes = [...quizAnswers["debt-type"]];
    }
  }

  // Handle housing situation as a debt type
  if (
    quizAnswers["housing-situation"] === "own-mortgage" &&
    !debtTypes.includes("mortgage")
  ) {
    debtTypes.push("mortgage");
  }


  // If we have debt types and a total debt amount, always distribute the debt
  // Do this regardless of whether specific amounts are set, as the debt-level is likely more accurate
  if (debtTypes.length > 0 && totalDebtAmount > 0 && debtTypes[0] !== "none") {
    // Reset any existing debt amounts since we're redistributing based on debt-type
    debtMortgage = 0;
    debtCredit = 0;
    debtStudent = 0;
    debtOther = 0;

    // Simple distribution - divide debt equally among types
    const perTypeAmount = totalDebtAmount / debtTypes.length;

    debtTypes.forEach((debtType) => {
      if (debtType.includes("mortgage")) {
        debtMortgage += perTypeAmount;
      } else if (debtType.includes("credit")) {
        debtCredit += perTypeAmount;
      } else if (debtType.includes("student")) {
        debtStudent += perTypeAmount;
      } else {
        // personal-loan and any other type
        debtOther += perTypeAmount;
      }
    });
  }

  // Always create a derived debtTypes array based on the actual numeric debt amounts
  // This ensures consistency between debt types and amounts
  const calculatedDebtTypes: string[] = [];
  if (debtMortgage > 0) calculatedDebtTypes.push("mortgage");
  if (debtCredit > 0) calculatedDebtTypes.push("credit-card");
  if (debtStudent > 0) calculatedDebtTypes.push("student");
  if (debtOther > 0) calculatedDebtTypes.push("personal-loan");

  // If no debts have amounts but we have debt types from the quiz, use those
  if (
    calculatedDebtTypes.length === 0 &&
    debtTypes.length > 0 &&
    debtTypes[0] !== "none"
  ) {
    debtTypes.forEach((type) => {
      if (!calculatedDebtTypes.includes(type)) calculatedDebtTypes.push(type);
    });
  }


  // Health checkup frequency
  const healthCheckupFrequency =
    quizAnswers["health-checkup-frequency"] ||
    (quizAnswers["health-status"] === "excellent"
      ? "yearly"
      : quizAnswers["health-status"] === "good"
        ? "yearly"
        : "asneeded");

  // 1. Calculate Savings Score (40% of total)
  // Compute savings rate from income and expenses
  const savingsAmount = Math.max(0, monthlyIncome - monthlyExpenses);
  const savingsRate =
    monthlyIncome > 0 ? (savingsAmount / monthlyIncome) * 100 : 0;

  // Calculate income adequacy factor - higher income gives a slight boost to savings score
  // This assumes a median household income of around $5000/month
  const incomeAdequacyFactor = Math.min(
    1.25,
    Math.max(0.75, monthlyIncome / 5000),
  );

  let savingsScore = 0;
  if (savingsRate >= 20) {
    savingsScore = 100 * incomeAdequacyFactor;
  } else if (savingsRate >= 10) {
    savingsScore = 75 * incomeAdequacyFactor;
  } else if (savingsRate >= 5) {
    savingsScore = 50 * incomeAdequacyFactor;
  } else {
    savingsScore = 25 * incomeAdequacyFactor;
  }

  // Cap the score at 100
  savingsScore = Math.min(100, savingsScore);

  // 2. Calculate Emergency Fund Score (30% of total)
  let emergencyFundScore = 0;
  if (emergencyFundMonths >= 6) {
    emergencyFundScore = 100;
  } else if (emergencyFundMonths >= 3) {
    emergencyFundScore = 75;
  } else if (emergencyFundMonths >= 1) {
    emergencyFundScore = 50;
  } else {
    emergencyFundScore = 25;
  }

  // 3. Risk Management Score (30% of total)
  // Evaluate debt composition
  const totalDebt = debtMortgage + debtCredit + debtStudent + debtOther;

  // Assess credit card debt relative to income
  // If credit card debt > 2x monthly income, it's high risk
  // If credit card debt < monthly income, it's moderate risk
  // This provides a more nuanced assessment based on income
  const creditCardDebtRatio =
    monthlyIncome > 0 ? debtCredit / monthlyIncome : 0;
  const hasHighRiskDebt = creditCardDebtRatio > 2;
  const hasModerateRiskDebt =
    creditCardDebtRatio > 1 && creditCardDebtRatio <= 2;

  // Calculate debt-to-income ratio (monthly)
  // Rough estimate of monthly debt payments (simplified)
  const monthlyDebtPayment =
    debtCredit * 0.03 + // Approx 3% min payment on credit cards
    (debtMortgage / 12) * 0.006 + // Approx mortgage payment
    (debtStudent / 12) * 0.01 + // Approx student loan payment
    (debtOther / 12) * 0.02; // Approx other debt payment

  // Calculate debt-to-income ratio and cap it at 100% for scoring purposes
  const debtToIncomeRatio =
    monthlyIncome > 0
      ? Math.min(100, (monthlyDebtPayment / monthlyIncome) * 100)
      : 0;

  // Evaluate insurance coverage
  const hasAdequateInsurance =
    Array.isArray(insurancePolicies) &&
    insurancePolicies.length >= 2 &&
    (insurancePolicies.includes("health") ||
      insurancePolicies.includes("medical"));

  // Regular health checkups are good risk management
  const hasRegularHealthCheckups =
    healthCheckupFrequency === "yearly" ||
    healthCheckupFrequency === "biannual";

  // Income-based adjustment for insurance assessment
  // Higher income = higher expectation for insurance coverage
  const insuranceCoverageExpectation = monthlyIncome > 5000 ? 3 : 2; // Expected number of policies
  const hasOptimalInsurance =
    Array.isArray(insurancePolicies) &&
    insurancePolicies.length >= insuranceCoverageExpectation &&
    (insurancePolicies.includes("health") ||
      insurancePolicies.includes("medical"));

  let riskManagementScore = 0;
  if (
    hasOptimalInsurance &&
    !hasHighRiskDebt &&
    !hasModerateRiskDebt &&
    debtToIncomeRatio < 36 &&
    hasRegularHealthCheckups
  ) {
    riskManagementScore = 100;
  } else if (
    hasAdequateInsurance &&
    !hasHighRiskDebt &&
    debtToIncomeRatio < 43
  ) {
    riskManagementScore = 75;
  } else if (
    (hasAdequateInsurance && hasModerateRiskDebt) ||
    debtToIncomeRatio < 50
  ) {
    riskManagementScore = 50;
  } else {
    riskManagementScore = 25;
  }

  // 4. Overall score and status
  // Calculate overall score with weights
  const overallScore = Math.round(
    savingsScore * 0.4 + emergencyFundScore * 0.3 + riskManagementScore * 0.3,
  );

  // Determine status based on score
  let status: "Excellent" | "Good" | "Fair" | "Needs Attention";
  if (overallScore >= 90) {
    status = "Excellent";
  } else if (overallScore >= 75) {
    status = "Good";
  } else if (overallScore >= 60) {
    status = "Fair";
  } else {
    status = "Needs Attention";
  }

  // Generate breakdown items
  const items: Array<{
    id: string;
    category: string;
    score: number;
    status: string;
    explanation: string;
  }> = [
    {
      id: "savings-rate",
      category: "Savings",
      score: savingsScore,
      status: getScoreStatus(savingsScore),
      explanation: `You're saving ${savingsRate.toFixed(1)}% of your ${monthlyIncome >= 5000 ? "above-average" : "monthly"} income of $${monthlyIncome.toLocaleString()}. ${
        savingsRate >= 20
          ? "Great job! Maintaining a 20%+ savings rate puts you on track for financial independence."
          : savingsRate >= 10
            ? "Good progress. Try to increase to 20% for optimal financial health."
            : `Consider ${monthlyExpenses > monthlyIncome * 0.9 ? "reducing expenses" : "increasing savings"} to save at least 10-20% of your income.`
      }`,
    },
    {
      id: "emergency-fund",
      category: "Emergency Fund",
      score: emergencyFundScore,
      status: getScoreStatus(emergencyFundScore),
      explanation:
        emergencyFundScore >= 75
          ? `Your emergency fund covers ${emergencyFundMonths} months of expenses.`
          : `Your emergency fund covers ${emergencyFundMonths} months. Work towards 3-6 months coverage.`,
    },
    {
      id: "risk-management",
      category: "Risk Management",
      score: riskManagementScore,
      status: getScoreStatus(riskManagementScore),
      explanation: hasHighRiskDebt
        ? `Your credit card debt is ${creditCardDebtRatio.toFixed(1)}x your monthly income. Focus on reducing this high-interest debt to improve financial security.`
        : hasModerateRiskDebt
          ? `Your credit card debt is ${creditCardDebtRatio.toFixed(1)}x your monthly income. Consider paying this down more aggressively.`
          : hasAdequateInsurance
            ? `You have ${insurancePolicies?.length || 0} insurance policies, which provides adequate coverage for your income level.`
            : `Consider expanding your insurance coverage to at least ${insuranceCoverageExpectation} policies to protect against risks.`,
    },
  ];

  // Retirement Projections Calculation
  // Extract retirement-specific fields from quiz answers with robust fallbacks
  const retirementAge =
    typeof quizAnswers["retirement-age"] === "number"
      ? quizAnswers["retirement-age"]
      : 65;
  const currentAge =
    typeof quizAnswers["current-age"] === "number"
      ? quizAnswers["current-age"]
      : 35;

  // Calculate raw years until retirement (can be negative)
  const rawYearsUntilRetirement = retirementAge - currentAge;

  // Handle different possible fields for current investments
  const currentInvestments =
    typeof quizAnswers["current-investments"] === "number"
      ? quizAnswers["current-investments"]
      : typeof quizAnswers["current-assets"] === "number"
        ? quizAnswers["current-assets"]
        : 0;

  // Handle multiple possible contribution fields
  let annualContribution =
    typeof quizAnswers["annual-contribution"] === "number"
      ? quizAnswers["annual-contribution"]
      : 0;

  // If we don't have annual contribution but have monthly savings and investment percentage
  if (annualContribution === 0 && savingsAmount > 0) {
    // Try to extract investment percentage from various fields
    const investmentPercentage =
      typeof quizAnswers["investment-percentage"] === "number"
        ? quizAnswers["investment-percentage"]
        : typeof quizAnswers["investing-percentage"] === "number"
          ? quizAnswers["investing-percentage"]
          : 20;

    // Calculate monthly contribution and convert to annual
    const monthlyContribution = savingsAmount * (investmentPercentage / 100);
    annualContribution = monthlyContribution * 12;
  }

  // Handle various forms of return rate
  let annualReturnRate = 0.07; // Default to 7%

  // Try to extract from expected-return field first (common in quiz)
  if (typeof quizAnswers["expected-return"] === "number") {
    // Make sure the rate is reasonable (sometimes users enter very small numbers like 1.3%)
    // If less than 5, assume it's a percentage already (e.g., 1.3%)
    if (quizAnswers["expected-return"] < 5) {
      annualReturnRate = Math.max(0.01, quizAnswers["expected-return"] / 100); // Minimum 1%
    } else {
      // If greater than 5, assume it's in basis points (e.g., 500 = 5%)
      annualReturnRate = quizAnswers["expected-return"] / 10000;
    }
  }
  // Fall back to return-rate
  else if (typeof quizAnswers["return-rate"] === "number") {
    annualReturnRate = quizAnswers["return-rate"] / 100; // Convert from percentage to decimal
  }
  // Fall back to risk tolerance
  else {
    const riskTolerance =
      typeof quizAnswers["risk-tolerance"] === "string"
        ? quizAnswers["risk-tolerance"].toLowerCase()
        : typeof quizAnswers["risk-tolerance"] === "number"
          ? quizAnswers["risk-tolerance"] <= 3
            ? "conservative"
            : quizAnswers["risk-tolerance"] <= 7
              ? "moderate"
              : "aggressive"
          : "moderate";

    switch (riskTolerance) {
      case "conservative":
        annualReturnRate = 0.05;
        break;
      case "moderate":
        annualReturnRate = 0.07;
        break;
      case "aggressive":
        annualReturnRate = 0.09;
        break;
      default:
        annualReturnRate = 0.07;
    }
  }

  // Handle calculation differently based on whether retirement age is in past or future
  let projectedRetirementFund = currentInvestments;
  let monthlyRetirementIncome = 0;
  let progressPercentage = 0;
  const targetRetirement =
    typeof quizAnswers["target-retirement"] === "number"
      ? quizAnswers["target-retirement"]
      : 1000000; // Default to $1M if not specified

  if (rawYearsUntilRetirement <= 0) {
    // Already at or past retirement age - use current assets with no growth
    projectedRetirementFund = currentInvestments;
    monthlyRetirementIncome = projectedRetirementFund * 0.0033; // 4% annual withdrawal rate
    progressPercentage =
      targetRetirement > 0
        ? Math.min(
            100,
            Math.round((projectedRetirementFund / targetRetirement) * 100),
          )
        : 0;
  } else {
    // Future retirement - calculate compound growth
    const yearsUntilRetirement = rawYearsUntilRetirement;

    // Compound interest formula: FV = PV(1+r)^t + PMT*((1+r)^t-1)/r
    const annualFactor = Math.pow(1 + annualReturnRate, yearsUntilRetirement);
    projectedRetirementFund = currentInvestments * annualFactor;

    // Add contributions only if we have contributions and rate > 0
    if (annualContribution > 0 && annualReturnRate > 0) {
      projectedRetirementFund +=
        annualContribution * ((annualFactor - 1) / annualReturnRate);
    } else if (annualContribution > 0) {
      // If rate is 0 or negative, just add the contributions
      projectedRetirementFund += annualContribution * yearsUntilRetirement;
    }

    // Calculate monthly retirement income (4% safe withdrawal rate annually = 0.33% monthly)
    monthlyRetirementIncome = projectedRetirementFund * 0.0033;

    // Calculate progress percentage toward target
    progressPercentage =
      targetRetirement > 0
        ? Math.min(
            100,
            Math.round((projectedRetirementFund / targetRetirement) * 100),
          )
        : 0;
  }

  // Make sure we return non-zero values even in edge cases
  projectedRetirementFund = Math.max(0, Math.round(projectedRetirementFund));
  monthlyRetirementIncome = Math.max(0, Math.round(monthlyRetirementIncome));
  progressPercentage = Math.max(0, progressPercentage);

  // If no debt or only debtTypes array exists with 'none', mark as debt free
  const debtFree =
    (calculatedDebtTypes.length === 0 && debtTypes.length === 0) ||
    (debtTypes.length === 1 && debtTypes[0] === "none");

  return {
    overallScore,
    status,
    items,
    // Add debtStatus object with debtFree flag and debtTypes array
    debtStatus: {
      debtFree,
      debtTypes: calculatedDebtTypes,
    },
    // Add retirement-related fields
    projectedRetirementFund: Math.round(projectedRetirementFund),
    monthlyRetirementIncome: Math.round(monthlyRetirementIncome),
    progressPercentage,
  };
}

// Helper function to get status based on score
function getScoreStatus(
  score: number,
): "Excellent" | "Good" | "Fair" | "Needs Attention" {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  return "Needs Attention";
}

export function FinancialHealthScorecardWidget({
  widget,
}: {
  widget: IFinancialHealthScorecardWidget;
}) {
  // Always calculate scores from raw quiz answers
  const { data } = widget;

  // Calculate scores directly from quiz answers
  const calculatedData = useMemo(() => {
    if (data?.quizAnswers) {
      const result = calculateFinancialHealthScore(data.quizAnswers);
      return {
        ...data,
        overallScore: result.overallScore,
        overallStatus: result.status,
        items: result.items,
      };
    }
    return {
      ...data,
      overallScore: 0,
      overallStatus: "Not Evaluated",
      items: [],
    };
  }, [data]);

  const showIndividualScores = calculatedData.showIndividualScores !== false;
  const overallStatusStyles = useMemo(
    () => getFinancialStatusStyles(calculatedData?.overallStatus),
    [calculatedData?.overallStatus],
  );

  if (!calculatedData || !calculatedData.quizAnswers) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="p-6 text-center">
          <FontAwesomeIcon
            icon={faCircleExclamation}
            className="mb-3 text-3xl text-slate-400 dark:text-slate-500"
          />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No financial health data available.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Please check back later or try updating your information.
          </p>
        </div>
      </Widget>
    );
  }

  const overallScoreNormalized = Math.max(
    0,
    Math.min(100, calculatedData.overallScore || 0),
  );
  const radius = 45;
  const circumference = 2 * Math.PI * radius; // Approx 282.74

  return (
    <Widget widget={widget} controls={widget.controls}>
      <motion.div
        className="flex flex-col space-y-6"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Overall Score Section */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center justify-center space-y-4 text-center sm:flex-row sm:justify-start sm:space-x-6 sm:space-y-0 sm:text-left"
        >
          <div className="relative h-20 w-20 shrink-0 md:h-20 md:w-20">
            <svg className="h-full w-full" viewBox="0 0 100 100">
              {/* Adjusted viewBox for easier calculations */}
              {/* Background Circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                strokeWidth="8"
                stroke="rgba(200, 200, 200, 0.5)"
              />
              {/* Foreground Progress Circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                stroke={getStatusColorValue(calculatedData.overallStatus)}
                strokeDasharray={circumference}
                strokeDashoffset={
                  circumference - (overallScoreNormalized / 100) * circumference
                }
                style={{
                  transform: "rotate(-90deg)",
                  transformOrigin: "50% 50%",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-xl font-bold md:text-2xl ${overallStatusStyles.textColor}`}
              >
                {Math.round(overallScoreNormalized)}
              </span>
             
            </div>
          </div>
          <div className="flex-grow">
            <motion.h3
              variants={itemVariants}
              className={`text-xl font-semibold md:text-2xl ${overallStatusStyles.textColor}`}
            >
              {calculatedData.overallStatus || "Not Evaluated"}
            </motion.h3>
            <motion.p
              variants={itemVariants}
              className="mt-1 text-sm text-slate-600 dark:text-slate-400"
            >
              Your overall financial health score is{" "}
              {Math.round(overallScoreNormalized)} out of 100.
            </motion.p>
          </div>
        </motion.div>

        {/* Score Breakdown Section */}
        {showIndividualScores &&
          calculatedData.items &&
          calculatedData.items.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="space-y-4"
            >
            
              <div className="flex flex-col space-y-4">
                {calculatedData.items.map((item) => {
                  const itemStatusStyles = getFinancialStatusStyles(
                    item.status,
                  );
                  
                  // Extract savings percentage from explanation if available
                  const savingsMatch = item.explanation?.match(/saving (\d+\.?\d*)%/);
                  const savingsPercentage = savingsMatch ? savingsMatch[1] : "100.0";
                  
                  // Simplified explanation for display
                  const simplifiedExplanation = `You're saving ${savingsPercentage}%`;
                  
                  return (
                    <motion.div
                      key={item.id}
                      variants={itemVariants}
                      className="bg-gray-50 dark:bg-slate-800/40 rounded-xl p-4"
                    >
                      <div className="flex items-center">
                        <div className="mr-3">
                          <FontAwesomeIcon
                            icon={getCategoryIcon(item.category)}
                            className={`size-5 text-slate-600 dark:text-slate-300`}
                          />
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              {item.category}
                            </h4>
                          </div>
                          <div className="flex items-center">
                            <span
                              className={`font-medium text-xs ${getStatusColorClass(item.status)}`}
                            >
                              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span>
                            <span className="mx-2 text-slate-400 text-xs">-</span>
                            <span className="text-slate-600 dark:text-slate-300 text-xs">
                              {simplifiedExplanation}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
      </motion.div>
    </Widget>
  );
}

// Next Best Action Widget
import {
  faExclamationTriangle,
  faArrowUp,
  faArrowDown,
  faInfoCircle,
  faTasks,
  faExclamationCircle,
  faLightbulb,
} from "@fortawesome/free-solid-svg-icons";

interface PriorityStyle {
  icon: any; // FontAwesomeIconDefinition
  iconColor: string;
  bgColor: string; // Card background
  textColor: string; // Main text color on card
  borderColor: string;
  buttonBgColor: string;
  buttonHoverBgColor: string;
  badgeTextColor: string;
  badgeBgColor: string;
}

function getPriorityStyles(
  priority: "low" | "medium" | "high" | "urgent" | string | undefined,
): PriorityStyle {
  switch (priority?.toLowerCase()) {
    case "urgent":
      return {
        icon: faExclamationTriangle,
        iconColor: "text-red-500 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-900/40 backdrop-blur-md",
        textColor: "text-red-700 dark:text-red-200",
        borderColor: "border-red-500/50 dark:border-red-600/70",
        buttonBgColor: "bg-red-600 dark:bg-red-700",
        buttonHoverBgColor: "hover:bg-red-700 dark:hover:bg-red-800",
        badgeTextColor: "text-red-700 dark:text-red-100",
        badgeBgColor: "bg-red-100 dark:bg-red-500/60",
      };
    case "high":
      return {
        icon: faArrowUp,
        iconColor: "text-red-500 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-900/40 backdrop-blur-md",
        textColor: "text-red-700 dark:text-red-200",
        borderColor: "border-red-500/50 dark:border-red-600/70",
        buttonBgColor: "bg-red-600 dark:bg-red-700",
        buttonHoverBgColor: "hover:bg-red-700 dark:hover:bg-red-800",
        badgeTextColor: "text-red-700 dark:text-red-100",
        badgeBgColor: "bg-red-100 dark:bg-red-500/60",
      };
    case "medium":
      return {
        icon: faTasks,
        iconColor: "text-sky-500 dark:text-sky-400",
        bgColor: "bg-sky-50 dark:bg-sky-900/40 backdrop-blur-md",
        textColor: "text-sky-700 dark:text-sky-200",
        borderColor: "border-sky-500/50 dark:border-sky-600/70",
        buttonBgColor: "bg-sky-500 dark:bg-sky-600",
        buttonHoverBgColor: "hover:bg-sky-600 dark:hover:bg-sky-700",
        badgeTextColor: "text-sky-700 dark:text-sky-100",
        badgeBgColor: "bg-sky-100 dark:bg-sky-500/60",
      };
    case "low":
      return {
        icon: faArrowDown,
        iconColor: "text-emerald-500 dark:text-emerald-400",
        bgColor: "bg-emerald-50 dark:bg-emerald-900/40 backdrop-blur-md",
        textColor: "text-emerald-700 dark:text-emerald-200",
        borderColor: "border-emerald-500/50 dark:border-emerald-600/70",
        buttonBgColor: "bg-emerald-500 dark:bg-emerald-600",
        buttonHoverBgColor: "hover:bg-emerald-600 dark:hover:bg-emerald-700",
        badgeTextColor: "text-emerald-700 dark:text-emerald-100",
        badgeBgColor: "bg-emerald-100 dark:bg-emerald-500/60",
      };
    default:
      return {
        icon: faInfoCircle,
        iconColor: "text-slate-500 dark:text-slate-400",
        bgColor: "bg-slate-100 dark:bg-slate-800/50 backdrop-blur-md",
        textColor: "text-slate-700 dark:text-slate-300",
        borderColor: "border-slate-300/60 dark:border-slate-700/60",
        buttonBgColor: "bg-primary-600 dark:bg-primary-500",
        buttonHoverBgColor: "hover:bg-primary-700 dark:hover:bg-primary-600",
        badgeTextColor: "text-slate-700 dark:text-slate-200",
        badgeBgColor: "bg-slate-200 dark:bg-slate-700/70",
      };
  }
}

export function NextBestActionWidget({
  widget,
}: {
  widget: INextBestActionWidget;
}) {
  const { data: actionsData, maxDisplayItems, filterByPriority } = widget;

  const calculatePriorityLevel = (action: INextBestActionItem) => {
   return action.priority;
  }

  const actionsToDisplay = useMemo(() => {
    if (!actionsData || !Array.isArray(actionsData)) return [];

    let filteredActions = [...actionsData];

    // Sort by objective factors, not by pre-assigned priority
    filteredActions.sort((a, b) => {
      // Sort by displayOrder first if available
      if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
        return a.displayOrder - b.displayOrder;
      }

      // Next by due date if available
      const aDate = a.dueDate ? new Date(a.dueDate) : null;
      const bDate = b.dueDate ? new Date(b.dueDate) : null;

      if (aDate && bDate) return aDate.getTime() - bDate.getTime();
      if (aDate) return -1; // a has date, b doesn't - a comes first
      if (bDate) return 1; // b has date, a doesn't - b comes first

      // Default to existing order
      return 0;
    });

    // Apply filtering if needed, using calculated priority
    if (
      filterByPriority &&
      ["low", "medium", "high"].includes(filterByPriority as string)
    ) {
      filteredActions = filteredActions.filter(
        (action) => calculatePriorityLevel(action) === filterByPriority,
      );
    }

    // Limit display items if needed
    if (maxDisplayItems && maxDisplayItems > 0) {
      return filteredActions.slice(0, maxDisplayItems);
    }

    return filteredActions;
  }, [actionsData, maxDisplayItems, filterByPriority, calculatePriorityLevel]);

  // Helper function to get priority icon
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100">
            <FontAwesomeIcon
              icon={faLightbulb}
              className="text-sm text-red-500"
            />
          </div>
        );
      case "medium":
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100">
            <FontAwesomeIcon
              icon={faLightbulb}
              className="text-sm text-amber-500"
            />
          </div>
        );
      case "low":
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
            <FontAwesomeIcon
              icon={faLightbulb}
              className="text-sm text-emerald-500"
            />
          </div>
        );
      default:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100">
            <FontAwesomeIcon
              icon={faInfoCircle}
              className="text-sm text-slate-500"
            />
          </div>
        );
    }
  };

  // Empty state
  if (!actionsToDisplay || actionsToDisplay.length === 0) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="flex h-full flex-col items-center justify-center p-6 text-center">
          <FontAwesomeIcon
            icon={faCircleCheck}
            className="mb-4 text-4xl text-emerald-500 dark:text-emerald-400"
          />
          <h4 className="mb-1 text-lg font-semibold text-slate-700 dark:text-slate-200">
            All Caught Up!
          </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            There are no pending actions for you at the moment.
          </p>
        </div>
      </Widget>
    );
  }

  // Get background color based on priority
  const getPriorityBgColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-50 dark:bg-red-900/10";
      case "medium":
        return "bg-amber-50 dark:bg-amber-900/10";
      case "low":
        return "bg-emerald-50 dark:bg-emerald-900/10";
      default:
        return "bg-slate-50 dark:bg-slate-800/10";
    }
  };

  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-500 dark:text-red-400";
      case "medium":
        return "text-amber-500 dark:text-amber-400";
      case "low":
        return "text-emerald-500 dark:text-emerald-400";
      default:
        return "text-slate-500 dark:text-slate-400";
    }
  };

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="flex flex-col space-y-4 p-4">
        {actionsToDisplay.map((action) => {
          // Calculate priority level at runtime
          const priorityLevel = calculatePriorityLevel(action);
          const bgColor = getPriorityBgColor(priorityLevel);

          return (
            <div
              key={action.id}
              className={`${bgColor} rounded-lg p-5 shadow-sm`}
            >
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  {getPriorityIcon(priorityLevel)}
                  <p className={`${getPriorityTextColor(priorityLevel)} text-md font-bold`}>
                    {action.title}
                  </p>
             

                </div>
                  <p className="text-md leading-relaxed text-slate-600 dark:text-slate-300">
                    {action.message}
                  </p>
              </div>
            </div>
          );
        })}
      </div>
    </Widget>
  );
}

// Debt Visualizer Widget
export function DebtVisualizerWidget({
  widget,
}: {
  widget: IDebtVisualizerWidget;
}) {
  const { data, strategy, title } = widget; // Added title from widget props

  if (!data || data.length === 0) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div
          className="flex h-full min-h-[200px] flex-col items-center justify-center p-6 text-center" // Added min-h for better empty state visibility
        >
          <FontAwesomeIcon
            icon={faCircleCheck}
            className="mb-4 text-4xl text-emerald-500 dark:text-emerald-400"
          />
          <h4 className="mb-1 text-lg font-semibold text-slate-700 dark:text-slate-200">
            No Debts to Display!
          </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Looks like you're debt-free or haven't added any debts yet.
          </p>
        </div>
      </Widget>
    );
  }

  // Ensure data is an array before sorting and reducing
  const validData = Array.isArray(data) ? data : [];

  const sortedDebts = [...validData].sort((a, b) => {
    if (strategy === "snowball") {
      return (a.currentBalance || 0) - (b.currentBalance || 0); // Smallest balance first, handle undefined
    }
    // Default to avalanche (highest interest rate first)
    return (b.interestRate || 0) - (a.interestRate || 0); // Handle undefined
  });

  const totalOriginalBalance = validData.reduce(
    (sum, debt) => sum + (debt.originalBalance || 0),
    0,
  );
  const totalCurrentBalance = validData.reduce(
    (sum, debt) => sum + (debt.currentBalance || 0),
    0,
  );
  const totalPaid = totalOriginalBalance - totalCurrentBalance;
  const overallProgressPercentage =
    totalOriginalBalance > 0
      ? Math.max(0, Math.min(100, (totalPaid / totalOriginalBalance) * 100))
      : 0;

  const strategyIcon = strategy === "snowball" ? faSnowflake : faFire;
  const strategyName = strategy === "snowball" ? "Snowball" : "Avalanche";
  const strategyColor =
    strategy === "snowball"
      ? "text-sky-500 dark:text-sky-400"
      : "text-orange-500 dark:text-orange-400";
  const strategyBg =
    strategy === "snowball"
      ? "bg-sky-100 dark:bg-sky-900/50"
      : "bg-orange-100 dark:bg-orange-900/50";

  // Type assertion for debt items in map, assuming IDebtItem or similar from your types
  interface IDebtItem {
    id?: string; // Assuming id might be optional or part of a base type
    name: string;
    currentBalance: number;
    originalBalance: number;
    interestRate: number;
    payoffDate?: string; // Assuming payoffDate might be optional
  }

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div
        className="flex flex-col space-y-5 p-4 md:p-5"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Overall Summary Card */}
        <div
          className="rounded-xl border border-slate-200 bg-slate-100/80 p-5 shadow-xl backdrop-blur-lg dark:border-slate-700/80 dark:bg-slate-800/70" // Enhanced glassmorphism
        >
          <div className="mb-3 flex items-start justify-between">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {title || "Debt Overview"}
            </h3>
            <div
              className={`flex items-center rounded-full px-3 py-1 text-xs font-medium ${strategyBg} ${strategyColor}`}
            >
              <FontAwesomeIcon
                icon={strategyIcon}
                className={`mr-1.5 h-3 w-3 ${strategyColor}`}
              />
              {strategyName} Strategy
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 items-end gap-x-4 gap-y-3 sm:grid-cols-2">
            {" "}
            {/* Adjusted gap */}
            <div className="flex items-center space-x-3">
              <FontAwesomeIcon
                icon={faCoins}
                className="dark:text-primary-400 h-7 w-7 text-primary"
              />{" "}
              {/* Adjusted color */}
              <div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Total Current Debt
                </div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  ${totalCurrentBalance.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3 sm:justify-end">
              <FontAwesomeIcon
                icon={faChartPie}
                className="h-7 w-7 text-emerald-500 dark:text-emerald-400"
              />
              <div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Overall Progress
                </div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {overallProgressPercentage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          <div className="h-3.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-3.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 dark:from-emerald-500 dark:to-green-600" // Removed transition-all, Framer handles it
              initial={{ width: "0%" }}
              animate={{ width: `${overallProgressPercentage}%` }}
              transition={{ duration: 1, ease: "circOut" }}
            ></div>
          </div>
        </div>

        {/* Individual Debt Cards */}
        <div className="space-y-3.5">
          {sortedDebts.map((debt: IDebtItem, index: number) => {
            // Added types for debt and index
            const individualProgress =
              debt.originalBalance > 0
                ? Math.max(
                    0,
                    Math.min(
                      100,
                      ((debt.originalBalance - debt.currentBalance) /
                        debt.originalBalance) *
                        100,
                    ),
                  )
                : 0;
            const isFocusDebt = index === 0;

            return (
              <div
                key={debt.id || `debt-${index}`} // Ensure unique key
                variants={itemVariants}
                className={`rounded-xl border p-4 shadow-md transition-shadow duration-300 hover:shadow-lg ${isFocusDebt ? "border-primary-500/70 dark:border-primary-400/80 bg-primary-50/60 dark:bg-primary-900/40 backdrop-blur-md" : "border-slate-200 bg-white/70 backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-800/60"}`} // Enhanced glassmorphism
              >
                <div className="mb-1.5 flex items-start justify-between">
                  <div className="flex items-center">
                    <FontAwesomeIcon
                      icon={faFileInvoiceDollar}
                      className={`mr-2.5 h-5 w-5 ${isFocusDebt ? "text-primary-600 dark:text-primary-400" : "text-slate-500 dark:text-slate-400"}`}
                    />
                    <span
                      className={`text-md font-semibold ${isFocusDebt ? "text-primary-700 dark:text-primary-300" : "text-slate-700 dark:text-slate-200"}`}
                    >
                      {debt.name}
                    </span>
                  </div>
                  {isFocusDebt && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${strategyBg} ${strategyColor}`}
                    >
                      <FontAwesomeIcon
                        icon={strategyIcon}
                        className={`mr-1 h-2.5 w-2.5 ${strategyColor}`}
                      />
                      Focus Target
                    </span>
                  )}
                </div>

                <div className="mb-2.5 grid grid-cols-2 gap-x-4 gap-y-2 pl-7 text-xs text-slate-600 md:grid-cols-3 dark:text-slate-400">
                  {" "}
                  {/* pl-7 to align with icon */}
                  <div>
                    Current:{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      ${debt.currentBalance.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    APR:{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {debt.interestRate}%
                    </span>
                  </div>
                  <div className="md:text-right">
                    Payoff:{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {debt.payoffDate || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="relative h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-600">
                  {" "}
                  {/* Added relative and pl-7 for alignment */}
                  <div className="absolute bottom-0 left-0 top-0 flex items-center">
                    {" "}
                    {/* This div is for potential icon if needed next to bar */}
                    {/* Icon could go here if desired */}
                  </div>
                  <div
                    className={`h-full rounded-full ${isFocusDebt ? "from-primary-400 to-primary-600 bg-gradient-to-r" : "bg-gradient-to-r from-slate-400 to-slate-600"}`} // Gradient progress bar
                    initial={{ width: "0%" }}
                    animate={{ width: `${individualProgress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Widget>
  );
}

// ... (other imports remain the same)

// Retirement Readiness Widget
export function RetirementReadinessWidget({
  widget,
}: {
  widget: IRetirementReadinessWidget;
}) {
  const { data: retirementData } = widget;
  const [selectedScenarioId, setSelectedScenarioId] = useState(
    retirementData.currentScenarioId,
  );

  // Calculate retirement projections from raw quiz answers if available
  const calculatedProjections = useMemo(() => {
    if (retirementData.quizAnswers) {
      const result = calculateFinancialHealthScore(retirementData.quizAnswers);
      return {
        projectedRetirementFund: result.projectedRetirementFund,
        monthlyRetirementIncome: result.monthlyRetirementIncome,
        // Calculate retirement progress percentage (against typical retirement goal of $1.5M)
        progressPercentage: Math.min(
          100,
          Math.round(((result.projectedRetirementFund || 0) / 1500000) * 100),
        ),
      };
    }
    return null;
  }, [retirementData.quizAnswers]);

  // Get raw data from current scenario
  const currentScenario = useMemo(() => {
    const scenario = retirementData.scenarios.find(
      (s) => s.id === selectedScenarioId,
    );

    // If we have calculated projections, use those values instead of hardcoded ones
    if (calculatedProjections && scenario) {
      return {
        ...scenario,
        projectedRetirementFund:
          calculatedProjections.projectedRetirementFund ||
          scenario.projectedRetirementFund,
        monthlyRetirementIncome:
          calculatedProjections.monthlyRetirementIncome ||
          scenario.monthlyRetirementIncome,
        progressPercentage:
          calculatedProjections.progressPercentage ||
          scenario.progressPercentage,
      };
    }

    return scenario;
  }, [retirementData.scenarios, selectedScenarioId, calculatedProjections]);

  // Get dynamic styles based on retirement status
  const getRetirementStatusStyles = useMemo(() => {
    if (!currentScenario)
      return {
        text: "Not Available",
        textColor: "text-gray-600 dark:text-gray-400",
        bgColor: "bg-gray-50 dark:bg-gray-800",
        borderColor: "border-gray-200 dark:border-gray-700",
        progressColor: "#6b7280",
        iconColor: "text-gray-500 dark:text-gray-400",
        icon: faInfoCircle,
        trend: null,
      };

    const percentage = currentScenario.progressPercentage || 0;

    if (percentage >= 90)
      return {
        text: "Excellent",
        textColor: "text-green-700 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-900/20",
        borderColor: "border-green-200 dark:border-green-800",
        progressColor: "#10b981",
        iconColor: "text-green-600 dark:text-green-400",
        icon: faArrowTrendUp,
        trend: "exceeding",
      };
    if (percentage >= 75)
      return {
        text: "On Track",
        textColor: "text-blue-700 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
        borderColor: "border-blue-200 dark:border-blue-800",
        progressColor: "#3b82f6",
        iconColor: "text-blue-600 dark:text-blue-400",
        icon: faArrowTrendUp,
        trend: "meeting",
      };
    if (percentage >= 50)
      return {
        text: "Behind",
        textColor: "text-yellow-700 dark:text-yellow-400",
        bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
        borderColor: "border-yellow-200 dark:border-yellow-800",
        progressColor: "#f59e0b",
        iconColor: "text-yellow-600 dark:text-yellow-400",
        icon: faCalculator,
        trend: "adjusting",
      };
    return {
      text: "At Risk",
      textColor: "text-red-700 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-900/20",
      borderColor: "border-red-200 dark:border-red-800",
      progressColor: "#ef4444",
      iconColor: "text-red-600 dark:text-red-400",
      icon: faArrowTrendDown,
      trend: "urgent",
    };
  }, [currentScenario]);

  if (
    !retirementData ||
    !retirementData.scenarios ||
    retirementData.scenarios.length === 0
  ) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
          No retirement scenarios available.
        </div>
      </Widget>
    );
  }

  if (!currentScenario) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="p-4 text-sm text-red-500 dark:text-red-400">
          Selected retirement scenario not found.
        </div>
      </Widget>
    );
  }

  // Calculate financial figures
  const projectionAmount = currentScenario.projectionAmount || 
    (calculatedProjections?.projectedRetirementFund || 0);
  const targetAmount = retirementData.quizAnswers?.["target-retirement"] || 1500000;
  const gap = targetAmount - projectionAmount;
  const retirementAge = retirementData.quizAnswers?.['retirement-age'] || 65;
  const currentAge = retirementData.quizAnswers?.['current-age'] || 30;
  const yearsToRetirement = retirementAge - currentAge;
  const currentSavingsPerYear = retirementData.quizAnswers?.["annual-contribution"] || 3000;
  const returnRate = retirementData.quizAnswers?.["return-rate"] || 6.8;

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="p-5 space-y-5">
        {/* Scenario Selector */}
        {retirementData.scenarios.length > 1 && (
          <div className="border-b border-slate-200 pb-4 dark:border-slate-700">
            <label htmlFor={`${widget.id}-scenario-select`} className="sr-only">
              Select Scenario
            </label>
            <select
              id={`${widget.id}-scenario-select`}
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm font-medium shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              {retirementData.scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.scenarioName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Header */}
        <div className={`rounded-lg border p-4 ${getRetirementStatusStyles.bgColor} ${getRetirementStatusStyles.borderColor}`}>
          <div className="flex items-center gap-3">
            <FontAwesomeIcon 
              icon={getRetirementStatusStyles.icon} 
              className={`text-xl ${getRetirementStatusStyles.iconColor}`} 
            />
            <div>
              <h3 className={`text-lg font-semibold ${getRetirementStatusStyles.textColor}`}>
                {getRetirementStatusStyles.text}
              </h3>
              <p className={`text-sm ${getRetirementStatusStyles.textColor}`}>
                {getRetirementStatusStyles.trend === "exceeding" && "You're exceeding your retirement goals"}
                {getRetirementStatusStyles.trend === "meeting" && "You're on track to meet your retirement goals"}
                {getRetirementStatusStyles.trend === "adjusting" && "Some adjustments may help reach your goals"}
                {getRetirementStatusStyles.trend === "urgent" && "Consider increasing your retirement contributions"}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Visualization */}
        <div className="flex items-center gap-6">
          {/* Progress Circle */}
          <div className="relative flex-shrink-0">
            <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                strokeWidth="12"
                className="text-slate-200 dark:text-slate-700"
                stroke="currentColor"
              />
              {/* Progress circle */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                strokeWidth="12"
                stroke={getRetirementStatusStyles.progressColor}
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - (currentScenario.progressPercentage || 0) / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${getRetirementStatusStyles.textColor}`}>
                {currentScenario.progressPercentage || 0}%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                of goal
              </span>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="flex-1 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Your Goal</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                ${targetAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Projected</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                ${projectionAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                {gap > 0 ? "Gap" : "Surplus"}
              </span>
              <span className={`font-semibold ${gap > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {gap > 0 ? '-' : '+'}${Math.abs(gap).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Gap Analysis */}
        {gap > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FontAwesomeIcon icon={faCalculator} className="text-slate-500" />
              Close the Gap
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600 dark:text-slate-400">Extra needed per month:</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  ${Math.round(gap / (yearsToRetirement * 12)).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-slate-600 dark:text-slate-400">Years to retirement:</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {yearsToRetirement} years
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Assumptions */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
            <FontAwesomeIcon icon={faInfoCircle} className="text-slate-500" />
            Assumptions
          </h4>
          <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <p>• Annual return: {returnRate}%</p>
            <p>• Current annual savings: ${currentSavingsPerYear.toLocaleString()}</p>
            <p>• Retirement age: {retirementAge}</p>
          </div>
        </div>
      </div>
    </Widget>
  );
}

// Enhanced Savings Goals Widget
export function EnhancedSavingsGoalsWidget({
  widget,
}: {
  widget: IEnhancedSavingsGoalsWidget;
}) {
  const { data } = widget;
  const { items, groupByCategory, showProgress } = data;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ahead":
        return "text-green-500";
      case "On Track":
        return "text-blue-500";
      default:
        return "text-yellow-500";
    }
  };

  // Group goals by category if groupByCategory is true
  const goalsByCategory = useMemo(() => {
    if (!groupByCategory) return null;

    const grouped: Record<string, typeof items> = {};
    items.forEach((goal) => {
      const category = goal.category || "Uncategorized";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(goal);
    });
    return grouped;
  }, [items, groupByCategory]);

  const renderGoal = (goal: (typeof items)[0], index: number) => {
    const progress = (goal.savedAmount / goal.targetAmount) * 100;

    return (
      <div
        key={goal.id || index}
        className="border-b border-gray-100 pb-3 last:border-0 dark:border-gray-700/30"
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {goal.name}
          </span>
          <span
            className={`text-xs font-medium ${getStatusColor(goal.status)}`}
          >
            {goal.status}
          </span>
        </div>

        <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            ${goal.savedAmount?.toLocaleString()} of $
            {goal?.targetAmount?.toLocaleString()}
          </span>
          <span>Est. completion: {goal.estimatedCompletionDate}</span>
        </div>

        {showProgress !== false && (
          <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                goal.status === "Behind" ? "bg-yellow-500" : "bg-primary"
              }`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="space-y-4">
        {goalsByCategory
          ? // Render grouped by category
            Object.entries(goalsByCategory).map(([category, goals]) => (
              <div key={category} className="mb-4">
                <h4 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {category}
                </h4>
                <div className="space-y-3">
                  {goals.map((goal, index) => renderGoal(goal, index))}
                </div>
              </div>
            ))
          : // Render flat list
            items.map((goal, index) => renderGoal(goal, index))}

        {(!items || items.length === 0) && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/5 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-800/20">
            <FontAwesomeIcon
              icon={faPiggyBank}
              className="mb-3 h-10 w-10 text-slate-400 dark:text-slate-500"
            />
            <p className="font-medium text-slate-600 dark:text-slate-300">
              No savings goals found.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Add your savings goals to see them here.
            </p>
          </div>
        )}
      </div>
    </Widget>
  );
}

// Insurance Coverage Widget
export function InsuranceCoverageWidget({
  widget,
}: {
  widget: IInsuranceCoverageWidget;
}) {
  const { data } = widget;
  const { items, showPremiums, showRenewalDates } = data;

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="space-y-4 p-1">
        {Array.isArray(items) && items.length > 0 ? (
          items.map((item, index) => (
            <div
              key={item.id || index}
              variants={itemVariants}
              className="rounded-xl border border-white/20 bg-white/20 p-4 shadow-lg backdrop-blur-md transition-shadow duration-300 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-800/40"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-grow">
                  <div className="flex items-center justify-between">
                    <h5
                      className="truncate font-semibold text-slate-800 dark:text-slate-100"
                      title={item.type || item.policyName}
                    >
                      {item.type || item.policyName}
                    </h5>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                        item.status?.toLowerCase() === "active" || !item.status
                          ? "bg-green-100 text-green-800 dark:bg-green-700/30 dark:text-green-300"
                          : item.status?.toLowerCase() === "pending"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-700/30 dark:text-yellow-300"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-700/30 dark:text-slate-300"
                      }`}
                    >
                      {item.status || item.policyType || "Active"}
                    </span>
                  </div>
                  {item.provider && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {item.provider}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3">
                {/* Coverage information */}
                <div className="text-right">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Coverage
                  </p>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {item.coverage
                      ? item.coverage
                      : typeof item.coverageAmount === "number"
                        ? `$${item.coverageAmount.toLocaleString()}`
                        : "$0"}
                  </p>
                </div>

                {/* Premium information - conditionally shown */}
                {showPremiums && item.premium && (
                  <div className="mt-2 text-right">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Premium
                    </p>
                    <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                      ${item.premium.toLocaleString()}/mo
                    </p>
                  </div>
                )}

                {/* Renewal date - conditionally shown */}
                {showRenewalDates && item.renewalDate && (
                  <div className="mt-2 flex items-center justify-end text-xs text-slate-500 dark:text-slate-400">
                    <span className="mr-1">Renewal:</span>
                    <span className="font-medium">
                      {new Date(item.renewalDate).toLocaleDateString(
                        undefined,
                        { year: "numeric", month: "short", day: "numeric" },
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div
            variants={itemVariants}
            className="rounded-xl border border-dashed border-slate-300 bg-white/5 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-800/20"
          >
            <FontAwesomeIcon
              icon={faShieldAlt}
              className="mb-3 h-10 w-10 text-slate-400 dark:text-slate-500"
            />
            <p className="font-medium text-slate-600 dark:text-slate-300">
              No insurance policies found.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Add your policies to see them here.
            </p>
          </div>
        )}
      </div>
    </Widget>
  );
}
