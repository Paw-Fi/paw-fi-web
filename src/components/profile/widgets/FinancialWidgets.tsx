/* eslint-disable */
// @ts-nocheck
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
  faExclamationTriangle,
  faArrowUp,
  faArrowDown,
  faInfoCircle,
  faTasks,
  faExclamationCircle,
  faLightbulb,
} from "@fortawesome/free-solid-svg-icons";
import {
  IFinancialHealthScorecardWidget,
  INextBestActionWidget,
  INextBestActionItem,
  IDebtVisualizerWidget,
  IRetirementReadinessWidget,
  IEnhancedSavingsGoalsWidget,
  IInsuranceCoverageWidget,
} from "../types/dashboard-data.typings";
import { Widget } from "./Widget";
import { motion, Variants } from "framer-motion";
import { ComprehensiveFinancialProfile } from "@/types/financial-quiz-constants";
import { FinancialScoreBreakdown } from "@/components/financial-health/FinancialScoreBreakdown";
import { AdvancedAnalyticsPanel } from "@/components/financial-health/AdvancedAnalyticsPanel";
import { InvestmentEntryCTA } from "@/components/financial-health/InvestmentEntryCTA";
import { Button } from "@/components/ui/button";

// --- STYLING & HELPER FUNCTIONS ---

interface StatusStyles {
  textColor: string;
  bgColor: string;
  borderColor: string;
  progressColor: string;
  iconColor?: string;
  ringColor?: string;
}

function getStatusColorValue(status?: string): string {
  const s = status?.toLowerCase();
  switch (s) {
    case "excellent": return "#10b981";
    case "good": return "#0ea5e9";
    case "fair": return "#f59e0b";
    case "needs attention": return "#f97316";
    case "poor": return "#ef4444";
    default: return "#64748b";
  }
}

function getFinancialStatusStyles(status?: string): StatusStyles {
  const s = status?.toLowerCase();
  switch (s) {
    case "excellent": return { textColor: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-50 dark:bg-emerald-900/60", borderColor: "border-emerald-500/30 dark:border-emerald-700/50", progressColor: "text-emerald-500 dark:text-emerald-400", iconColor: "text-emerald-500 dark:text-emerald-400", ringColor: "ring-emerald-500" };
    case "good": return { textColor: "text-sky-600 dark:text-sky-400", bgColor: "bg-sky-50 dark:bg-sky-900/60", borderColor: "border-sky-500/30 dark:border-sky-700/50", progressColor: "text-sky-500 dark:text-sky-400", iconColor: "text-sky-500 dark:text-sky-400", ringColor: "ring-sky-500" };
    case "fair": return { textColor: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-900/60", borderColor: "border-amber-500/30 dark:border-amber-700/50", progressColor: "text-amber-500 dark:text-amber-400", iconColor: "text-amber-500 dark:text-amber-400", ringColor: "ring-amber-500" };
    case "needs attention": return { textColor: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-900/60", borderColor: "border-orange-500/30 dark:border-orange-700/50", progressColor: "text-orange-500 dark:text-orange-400", iconColor: "text-orange-500 dark:text-orange-400", ringColor: "ring-orange-500" };
    default: return { textColor: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-800/60", borderColor: "border-slate-300/40 dark:border-slate-700/50", progressColor: "text-slate-500 dark:text-slate-400", iconColor: "text-slate-500 dark:text-slate-400", ringColor: "ring-slate-500" };
  }
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.07 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -15 },
  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 100, damping: 12 } },
};

// --- UPGRADED FINANCIAL HEALTHSCORE CALCULATION & WIDGET ---

export interface QuizAnswers { [key: string]: any; }

export interface MetricStatus {
  value: number;
  status: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';
  description: string;
}

export interface BudgetAnalysis {
  needs: { amount: number; percentage: number };
  wants: { amount: number; percentage: number };
  savings: { amount: number; percentage: number };
  status: 'Balanced' | 'Needs Review';
  description: string;
}

export interface IFinancialHealthCalculationResult {
  overallScore: MetricStatus;
  budget: BudgetAnalysis;
  emergencyFund: MetricStatus;
  savingsRate: MetricStatus;
  debtToIncome: MetricStatus;
}

/**
 * Calculates an amortized monthly payment for an installment loan.
 * @param principal The total loan amount.
 * @param annualRate The annual interest rate (as a percentage, e.g., 5 for 5%).
 * @param termInMonths The loan term in months.
 * @returns The calculated monthly payment.
 */
function calculateAmortizedPayment(principal: number, annualRate: number, termInMonths: number): number {
    if (principal <= 0 || annualRate < 0 || termInMonths <= 0) return 0;
    if (annualRate === 0) return principal / termInMonths;

    const monthlyRate = annualRate / 12 / 100;
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termInMonths)) / (Math.pow(1 + monthlyRate, termInMonths) - 1);
    return payment;
}

export function calculateFinancialHealthScore(quizAnswers: QuizAnswers): IFinancialHealthCalculationResult {
  const profile = quizAnswers as unknown as ComprehensiveFinancialProfile;

  const { net_monthly_income: income, gross_monthly_income: grossIncome } = profile;

  const needsExpenses = profile.housing_cost + profile.food_expenses + profile.transportation_expenses + profile.healthcare_expenses + profile.insurance_expenses;
  const wantsExpenses = profile.entertainment_expenses + profile.other_monthly_expenses;
  const totalExpenses = needsExpenses + wantsExpenses;
  const savingsAmount = income - totalExpenses;

  const needsPercentage = income > 0 ? (needsExpenses / income) * 100 : 0;
  const wantsPercentage = income > 0 ? (wantsExpenses / income) * 100 : 0;
  const savingsPercentage = income > 0 ? (savingsAmount / income) * 100 : 0;

  const budget: BudgetAnalysis = {
    needs: { amount: needsExpenses, percentage: needsPercentage },
    wants: { amount: wantsExpenses, percentage: wantsPercentage },
    savings: { amount: savingsAmount, percentage: savingsPercentage },
    status: savingsPercentage >= 20 && needsPercentage <= 50 ? 'Balanced' : 'Needs Review',
    description: `Your spending is split into ${needsPercentage.toFixed(0)}% needs, ${wantsPercentage.toFixed(0)}% wants, and ${savingsPercentage.toFixed(0)}% savings. The 50/30/20 rule is a common guideline.`,
  };

  // ACCURATE DEBT PAYMENT CALCULATION
  const creditCardPayment = profile.credit_card_debt > 0 ? (profile.credit_card_debt * (profile.credit_card_interest_rate / 12 / 100)) + (profile.credit_card_debt * 0.01) : 0; // Interest + 1% principal
  const mortgagePayment = calculateAmortizedPayment(profile.mortgage_balance, profile.mortgage_interest_rate, 360); // 30-year term
  const studentLoanPayment = calculateAmortizedPayment(profile.student_loan_debt, profile.student_loan_interest_rate, 120); // 10-year term
  const autoLoanPayment = calculateAmortizedPayment(profile.auto_loan_balance, profile.auto_loan_interest_rate, 60); // 5-year term
  const otherDebtPayment = calculateAmortizedPayment(profile.other_debt, profile.other_debt_interest_rate, 84); // 7-year term
  const totalMonthlyDebtPayments = creditCardPayment + mortgagePayment + studentLoanPayment + autoLoanPayment + otherDebtPayment;

  const dtiValue = grossIncome > 0 ? (totalMonthlyDebtPayments / grossIncome) : 0;
  const getDtiStatus = (val: number) => {
      if (val <= 0.20) return 'Excellent';
      if (val <= 0.36) return 'Good';
      if (val <= 0.43) return 'Fair';
      return 'Needs Attention';
  }
  const debtToIncome: MetricStatus = {
      value: dtiValue * 100,
      status: getDtiStatus(dtiValue),
      description: `Your DTI ratio is ${ (dtiValue * 100).toFixed(0)}%. Lenders prefer this to be below 36%.`
  };

  const emergencyFundCoverage = totalExpenses > 0 ? profile.emergency_fund / totalExpenses : 6;
  const getEmergencyStatus = (months: number) => {
      if (months >= 6) return 'Excellent';
      if (months >= 4) return 'Good';
      if (months >= 3) return 'Fair';
      return 'Needs Attention';
  }
  const emergencyFund: MetricStatus = {
      value: emergencyFundCoverage,
      status: getEmergencyStatus(emergencyFundCoverage),
      description: `You have ${emergencyFundCoverage.toFixed(1)} months of expenses saved. Aim for 3-6 months.`
  };

  const getSavingsStatus = (rate: number) => {
      if (rate >= 20) return 'Excellent';
      if (rate >= 15) return 'Good';
      if (rate >= 10) return 'Fair';
      return 'Needs Attention';
  }
  const savingsRate: MetricStatus = {
      value: profile.savings_rate || 0,
      status: getSavingsStatus(profile.savings_rate || 0),
      description: `You're saving ${profile.savings_rate || 0}% of your income. Aim for 15-20%.`
  };

  const scoreMap = { 'Excellent': 25, 'Good': 18, 'Fair': 10, 'Needs Attention': 5 };
  const overallScoreValue = scoreMap[emergencyFund.status] + scoreMap[debtToIncome.status] + scoreMap[savingsRate.status] + (budget.status === 'Balanced' ? 25 : 10);
  const getOverallStatus = (score: number) => {
      if (score >= 90) return 'Excellent';
      if (score >= 70) return 'Good';
      if (score >= 50) return 'Fair';
      return 'Needs Attention';
  }
  const overallScore: MetricStatus = {
      value: overallScoreValue,
      status: getOverallStatus(overallScoreValue),
      description: "This score reflects your financial habits in key areas like saving, spending, and debt."
  };

  return {
    overallScore,
    budget,
    emergencyFund,
    savingsRate,
    debtToIncome,
  };
}

const MetricDisplay = ({ icon, metric, title }: { icon: any, metric: MetricStatus, title: string }) => {
  const styles = getFinancialStatusStyles(metric.status);
  return (
    <motion.div variants={itemVariants} className={`p-4 rounded-xl border ${styles.bgColor} ${styles.borderColor}`}>
      <div className="flex items-start space-x-4">
        <FontAwesomeIcon icon={icon} className={`mt-1 h-6 w-6 ${styles.iconColor}`} />
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">{title}</p>
          <p className={`text-lg font-bold ${styles.textColor}`}>{metric.status}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{metric.description}</p>
        </div>
      </div>
    </motion.div>
  );
};

export function FinancialHealthScorecardWidget({ widget }: { widget: IFinancialHealthScorecardWidget; }) {
  const { data } = widget;
  const [showAdvanced, setShowAdvanced] = useState(false);

  const calculatedData = useMemo(() => {
    if (data?.quizAnswers) {
      return calculateFinancialHealthScore(data.quizAnswers);
    }
    return null;
  }, [data]);

  if (!calculatedData || !data?.quizAnswers) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="p-6 text-center">
          <FontAwesomeIcon icon={faCircleExclamation} className="mb-3 text-3xl text-slate-400 dark:text-slate-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No financial health data available.</p>
        </div>
      </Widget>
    );
  }

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="space-y-6">
        {/* Financial Score Breakdown with real calculations */}
        <FinancialScoreBreakdown quizAnswers={data.quizAnswers} />

        {/* Investment Entry CTA */}
        <InvestmentEntryCTA />

        {/* Advanced Analytics Toggle */}
        <div className="flex justify-center">
          <Button
            onClick={() => setShowAdvanced(!showAdvanced)}
            variant="outline"
            className="rounded-full"
          >
            {showAdvanced ? 'Hide' : 'View'} Advanced Analytics
          </Button>
        </div>

        {/* Advanced Analytics Panel (collapsible) */}
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <AdvancedAnalyticsPanel
              quizAnswers={data.quizAnswers}
              calculationResult={calculatedData}
            />
          </motion.div>
        )}
      </div>
    </Widget>
  );
}


// --- OTHER WIDGETS (Restored and Unchanged) ---

export function NextBestActionWidget({ widget }: { widget: INextBestActionWidget }) {
  const { data: actionsData, maxDisplayItems, filterByPriority } = widget;
  const actionsToDisplay = useMemo(() => {
    if (!actionsData || !Array.isArray(actionsData)) return [];
    let filteredActions = [...actionsData].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    if (filterByPriority) {
      filteredActions = filteredActions.filter((action) => action.priority === filterByPriority);
    }
    if (maxDisplayItems && maxDisplayItems > 0) {
      return filteredActions.slice(0, maxDisplayItems);
    }
    return filteredActions;
  }, [actionsData, maxDisplayItems, filterByPriority]);

  if (!actionsToDisplay || actionsToDisplay.length === 0) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="flex h-full flex-col items-center justify-center text-center">
          <FontAwesomeIcon
            icon={faCircleCheck}
            className="mb-3 sm:mb-4 text-3xl sm:text-4xl text-emerald-500 dark:text-emerald-400"
          />
          <h4 className="mb-1 text-mobile-base sm:text-lg font-medium text-foreground">All Caught Up!</h4>
          <p className="text-mobile-sm sm:text-sm text-muted-foreground-color">No pending actions for you.</p>
        </div>
      </Widget>
    );
  }

  // Helper function using Moneko color system
  const getPriorityStyles = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return {
          bgColor: 'bg-orange-50/50 dark:bg-orange-950/30',
          textColor: 'text-orange-600 dark:text-orange-400',
          badgeBg: 'bg-orange-100 dark:bg-orange-900/40',
          badgeText: 'text-orange-700 dark:text-orange-300',
        };
      case 'medium':
        return {
          bgColor: 'bg-amber-50/50 dark:bg-amber-950/30',
          textColor: 'text-amber-600 dark:text-amber-400',
          badgeBg: 'bg-amber-100 dark:bg-amber-900/40',
          badgeText: 'text-amber-700 dark:text-amber-300',
        };
      case 'low':
        return {
          bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/30',
          textColor: 'text-emerald-600 dark:text-emerald-400',
          badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40',
          badgeText: 'text-emerald-700 dark:text-emerald-300',
        };
      default:
        return {
          bgColor: 'bg-subtle-background/50',
          textColor: 'text-muted-foreground-color',
          badgeBg: 'bg-subtle-background',
          badgeText: 'text-muted-foreground-color',
        };
    }
  };

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="h-full flex flex-col">
        <motion.div
          className="space-y-3 sm:space-y-4 flex-1"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.08,
                delayChildren: 0.1,
              },
            },
          }}
          initial="hidden"
          animate="visible"
        >
          {actionsToDisplay.map((action, index) => {
            const styles = getPriorityStyles(action.priority);
            return (
              <motion.div
                key={action.id}
                className={`${styles.bgColor} rounded-2xl p-4 sm:p-6 transition-all duration-200 hover:shadow-sm touch-manipulation`}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.4,
                      ease: [0.25, 0.46, 0.45, 0.94] as const,
                    },
                  },
                }}
                whileHover={{ x: 4 }}
              >
                <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-mobile-xs sm:text-xs font-medium ${styles.badgeBg} ${styles.badgeText}`}>
                    {action.priority
                      ? `${action.priority.charAt(0).toUpperCase() + action.priority.slice(1)} Priority`
                      : 'Priority'}
                  </div>
                </div>
                <div>
                  <p className="text-mobile-sm sm:text-sm font-medium text-foreground mb-2">{action.title}</p>
                  <p className="text-mobile-sm sm:text-sm text-muted-foreground-color leading-relaxed">
                    {action.message}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </Widget>
  );
}

export function DebtVisualizerWidget({ widget }: { widget: IDebtVisualizerWidget; }) {
  const { data, strategy, title } = widget;

  // No debt - celebration state
  if (!data || data.length === 0) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
          <div className="bg-emerald-50/50 dark:bg-emerald-950/30 rounded-full p-4 sm:p-6 mb-3 sm:mb-4">
            <FontAwesomeIcon icon={faCircleCheck} className="text-3xl sm:text-4xl text-emerald-500 dark:text-emerald-400" />
          </div>
          <h4 className="text-mobile-base sm:text-lg font-medium text-foreground mb-2">Congratulations - You're Debt Free!</h4>
          <p className="text-mobile-sm sm:text-sm text-muted-foreground-color">You have no outstanding debts.</p>
        </div>
      </Widget>
    );
  }

  // Calculate real debt metrics - NO MOCK DATA
  const sortedDebts = [...data].sort((a, b) =>
    strategy === "snowball"
      ? (a.currentBalance || 0) - (b.currentBalance || 0)
      : (b.interestRate || 0) - (a.interestRate || 0)
  );
  const totalCurrentBalance = data.reduce((sum, debt) => sum + (debt.currentBalance || 0), 0);
  const totalOriginalBalance = data.reduce((sum, debt) => sum + (debt.originalBalance || 0), 0);
  const totalPaid = totalOriginalBalance - totalCurrentBalance;
  const overallProgressPercentage = totalOriginalBalance > 0
    ? Math.max(0, Math.min(100, (totalPaid / totalOriginalBalance) * 100))
    : 0;
  const strategyIcon = strategy === "snowball" ? faSnowflake : faFire;
  const strategyName = strategy === "snowball" ? "Snowball" : "Avalanche";

  // Determine status based on progress
  const getDebtStatus = (progress: number) => {
    if (progress >= 75) return {
      status: 'Almost There!',
      bgClass: 'bg-emerald-50/50 dark:bg-emerald-950/30',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      progressClass: 'text-emerald-500 dark:text-emerald-400',
    };
    if (progress >= 50) return {
      status: 'Great Progress',
      bgClass: 'bg-sky-50/50 dark:bg-sky-950/30',
      textClass: 'text-sky-600 dark:text-sky-400',
      progressClass: 'text-sky-500 dark:text-sky-400',
    };
    if (progress >= 25) return {
      status: 'Making Progress',
      bgClass: 'bg-amber-50/50 dark:bg-amber-950/30',
      textClass: 'text-amber-600 dark:text-amber-400',
      progressClass: 'text-amber-500 dark:text-amber-400',
    };
    return {
      status: 'Getting Started',
      bgClass: 'bg-orange-50/50 dark:bg-orange-950/30',
      textClass: 'text-orange-600 dark:text-orange-400',
      progressClass: 'text-orange-500 dark:text-orange-400',
    };
  };

  const statusInfo = getDebtStatus(overallProgressPercentage);

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="h-full flex flex-col space-y-4 sm:space-y-6">
        {/* Strategy Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-subtle-background/50 rounded-full p-2 sm:p-3">
            <FontAwesomeIcon icon={strategyIcon} className="text-lg sm:text-xl text-primary" />
          </div>
          <div>
            <div className="text-mobile-xs sm:text-sm text-muted-foreground-color">Payoff Strategy</div>
            <div className="text-mobile-sm sm:text-base font-medium text-foreground">{strategyName}</div>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="bg-subtle-background/50 rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-mobile-sm sm:text-sm font-medium text-foreground">Overall Progress</div>
            <div className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-mobile-xs sm:text-xs font-medium ${statusInfo.bgClass} ${statusInfo.textClass}`}>
              {statusInfo.status}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-2 bg-subtle-background rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${statusInfo.progressClass}`}
                style={{ backgroundColor: 'currentColor' }}
                initial={{ width: 0 }}
                animate={{ width: `${overallProgressPercentage}%` }}
                transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] as const, delay: 0.2 }}
              />
            </div>
            <div className="flex justify-between text-mobile-xs sm:text-xs text-muted-foreground-color">
              <span>{overallProgressPercentage.toFixed(1)}% paid off</span>
              <span className="text-right">{totalPaid.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} of {totalOriginalBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}</span>
            </div>
          </div>

          {/* Total Debt Remaining */}
          <div className="pt-4 border-t border-subtle-background">
            <div className="text-sm text-muted-foreground-color mb-1">Remaining Balance</div>
            <div className="text-3xl font-light text-foreground">
              {totalCurrentBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* Debt List - Prioritized by Strategy */}
        <div className="space-y-3 flex-1">
          <div className="text-sm font-medium text-foreground mb-2">
            Payoff Priority ({strategy === "snowball" ? 'Smallest First' : 'Highest Interest First'})
          </div>
          <motion.div
            className="space-y-3"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.08,
                  delayChildren: 0.1,
                },
              },
            }}
            initial="hidden"
            animate="visible"
          >
            {sortedDebts.slice(0, 5).map((debt, index) => {
              const debtProgress = debt.originalBalance > 0
                ? ((debt.originalBalance - debt.currentBalance) / debt.originalBalance) * 100
                : 0;
              const isPriority = index === 0;

              return (
                <motion.div
                  key={debt.id}
                  className={`rounded-2xl p-4 transition-all duration-200 ${
                    isPriority
                      ? 'bg-primary/5 ring-1 ring-primary/20'
                      : 'bg-subtle-background/50'
                  }`}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: {
                        duration: 0.4,
                        ease: [0.25, 0.46, 0.45, 0.94] as const,
                      },
                    },
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-medium text-foreground truncate">
                          {debt.name}
                        </div>
                        {isPriority && (
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground shrink-0">
                            Focus
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground-color">
                        {debt.interestRate?.toFixed(2)}% APR
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-light text-foreground">
                        {debt.currentBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                      </div>
                      <div className="text-xs text-muted-foreground-color">
                        {debtProgress.toFixed(0)}% paid
                      </div>
                    </div>
                  </div>
                  <div className="h-1 bg-subtle-background rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${debtProgress}%` }}
                      transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] as const, delay: 0.3 + index * 0.1 }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
          {sortedDebts.length > 5 && (
            <div className="text-xs text-center text-muted-foreground-color pt-2">
              +{sortedDebts.length - 5} more {sortedDebts.length - 5 === 1 ? 'debt' : 'debts'}
            </div>
          )}
        </div>
      </div>
    </Widget>
  );
}

export function RetirementReadinessWidget({ widget }: { widget: IRetirementReadinessWidget }) {
  const { data: retirementData } = widget;
  const [selectedScenarioId, setSelectedScenarioId] = useState(retirementData.currentScenarioId);
  const currentScenario = useMemo(
    () => retirementData.scenarios.find((s) => s.id === selectedScenarioId),
    [retirementData.scenarios, selectedScenarioId]
  );

  if (!currentScenario) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground-color">Scenario not found.</p>
        </div>
      </Widget>
    );
  }

  // Extract REAL data from current scenario - NO MOCK VALUES
  const projectedAmount = currentScenario.projectionAmount || 0;
  const targetAmount = currentScenario.targetAmount || projectedAmount * 2;
  const currentSavings = currentScenario.currentAmount || 0;
  const annualSavings = currentScenario.annualContribution || 0;
  const expectedReturn = currentScenario.expectedReturn || 0;
  const targetAge = currentScenario.targetAge || 65;
  const currentAge = currentScenario.currentAge || 30;
  const yearsToRetirement = targetAge - currentAge;

  // Calculate progress percentage
  const progressPercentage =
    targetAmount > 0 ? Math.min((projectedAmount / targetAmount) * 100, 100) : 0;

  // Determine status based on progress - using Moneko color system
  const getRetirementStatus = (progress: number) => {
    if (progress >= 90)
      return {
        status: 'On Track',
        bgClass: 'bg-emerald-50/50 dark:bg-emerald-950/30',
        textClass: 'text-emerald-600 dark:text-emerald-400',
        ringClass: 'text-emerald-500 dark:text-emerald-400',
      };
    if (progress >= 70)
      return {
        status: 'Good Progress',
        bgClass: 'bg-sky-50/50 dark:bg-sky-950/30',
        textClass: 'text-sky-600 dark:text-sky-400',
        ringClass: 'text-sky-500 dark:text-sky-400',
      };
    if (progress >= 40)
      return {
        status: 'Needs Attention',
        bgClass: 'bg-amber-50/50 dark:bg-amber-950/30',
        textClass: 'text-amber-600 dark:text-amber-400',
        ringClass: 'text-amber-500 dark:text-amber-400',
      };
    return {
      status: 'At Risk',
      bgClass: 'bg-orange-50/50 dark:bg-orange-950/30',
      textClass: 'text-orange-600 dark:text-orange-400',
      ringClass: 'text-orange-500 dark:text-orange-400',
    };
  };

  const statusInfo = getRetirementStatus(progressPercentage);

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="h-full flex flex-col space-y-4 sm:space-y-6">
        {/* Status Badge with modern styling */}
        <div className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-mobile-sm sm:text-sm font-medium ${statusInfo.textClass} ${statusInfo.bgClass} self-start`}>
          <span>{statusInfo.status}</span>
        </div>

        {/* Circular Progress with large number */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0">
            <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                strokeWidth="8"
                className="text-subtle-background"
                stroke="currentColor"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                className={statusInfo.ringClass}
                stroke="currentColor"
                strokeDasharray={`${(progressPercentage / 100) * 282.7} 282.7`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl sm:text-2xl font-light text-foreground">
                {Math.round(progressPercentage)}
              </span>
              <span className="text-mobile-xs sm:text-xs font-medium text-muted-foreground-color">%</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className={`text-mobile-base sm:text-lg font-medium ${statusInfo.textClass} mb-1`}>
              {statusInfo.status}
            </h4>
            <p className="text-mobile-sm sm:text-sm text-muted-foreground-color">
              Projected: {projectedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} by age {targetAge}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-mobile-sm sm:text-sm">
            <span className="text-muted-foreground-color">Retirement readiness</span>
            <span className="text-foreground font-medium">{progressPercentage.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-subtle-background rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${statusInfo.ringClass}`}
              style={{ width: `${Math.min(progressPercentage, 100)}%`, backgroundColor: 'currentColor' }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
              transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </div>
        </div>

        {/* Details card with modern styling */}
        <div className="mt-auto bg-subtle-background/50 rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4">
          <h4 className="text-mobile-sm sm:text-base font-medium text-foreground">Projection Details</h4>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <div className="text-mobile-xs sm:text-sm text-muted-foreground-color mb-1">Current Balance</div>
              <div className="text-mobile-base sm:text-lg font-light text-foreground">
                {currentSavings.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground-color mb-1">Target Amount</div>
              <div className="text-lg font-light text-foreground">
                {targetAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground-color mb-1">Annual Savings</div>
              <div className="text-lg font-light text-foreground">
                {annualSavings.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground-color mb-1">Expected Return</div>
              <div className="text-lg font-light text-foreground">{expectedReturn.toFixed(1)}%</div>
            </div>
          </div>

          {yearsToRetirement > 0 && (
            <div className="pt-4 border-t border-subtle-background">
              <p className="text-sm text-muted-foreground-color">
                {yearsToRetirement} years until retirement at age {targetAge}
              </p>
            </div>
          )}
        </div>
      </div>
    </Widget>
  );
}

export function EnhancedSavingsGoalsWidget({ widget }: { widget: IEnhancedSavingsGoalsWidget; }) {
  const { data } = widget;
  const { items } = data;

  // Empty state - NO MOCK DATA
  if (!items || items.length === 0) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
          <div className="bg-sky-50/50 dark:bg-sky-950/30 rounded-full p-4 sm:p-6 mb-3 sm:mb-4">
            <FontAwesomeIcon icon={faPiggyBank} className="text-3xl sm:text-4xl text-sky-500 dark:text-sky-400" />
          </div>
          <h4 className="text-mobile-base sm:text-lg font-medium text-foreground mb-2">No Savings Goals Yet</h4>
          <p className="text-mobile-sm sm:text-sm text-muted-foreground-color mb-4">Start setting goals to track your savings progress.</p>
        </div>
      </Widget>
    );
  }

  // Calculate overall progress - NO MOCK DATA
  const totalSaved = items.reduce((sum, item) => sum + (item.savedAmount || 0), 0);
  const totalTarget = items.reduce((sum, item) => sum + (item.targetAmount || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="h-full flex flex-col space-y-4 sm:space-y-6">
        {/* Overall Summary */}
        <div className="bg-subtle-background/50 rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-mobile-xs sm:text-sm text-muted-foreground-color mb-1">Total Saved</div>
              <div className="text-2xl sm:text-3xl font-light text-foreground">
                {totalSaved.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
              </div>
            </div>
            <div className="text-right min-w-0">
              <div className="text-mobile-xs sm:text-sm text-muted-foreground-color mb-1">Target</div>
              <div className="text-mobile-base sm:text-lg font-light text-foreground">
                {totalTarget.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-2 bg-subtle-background rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(overallProgress, 100)}%` }}
                transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] as const, delay: 0.2 }}
              />
            </div>
            <div className="flex justify-between text-mobile-xs sm:text-xs text-muted-foreground-color">
              <span>{overallProgress.toFixed(1)}% of goals achieved</span>
              <span>{items.length} {items.length === 1 ? 'goal' : 'goals'}</span>
            </div>
          </div>
        </div>

        {/* Individual Goals List */}
        <div className="space-y-2 sm:space-y-3 flex-1">
          <div className="text-mobile-sm sm:text-sm font-medium text-foreground mb-2">Your Savings Goals</div>
          <motion.div
            className="space-y-3"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.08,
                  delayChildren: 0.1,
                },
              },
            }}
            initial="hidden"
            animate="visible"
          >
            {items.map((item, index) => {
              const progress = item.targetAmount > 0
                ? (item.savedAmount / item.targetAmount) * 100
                : 0;
              const isComplete = progress >= 100;
              const remaining = item.targetAmount - item.savedAmount;

              // Status coloring
              const getGoalStatus = (prog: number) => {
                if (prog >= 100) return {
                  bgClass: 'bg-emerald-50/50 dark:bg-emerald-950/30',
                  progressClass: 'bg-emerald-500 dark:bg-emerald-400',
                };
                if (prog >= 75) return {
                  bgClass: 'bg-sky-50/50 dark:bg-sky-950/30',
                  progressClass: 'bg-sky-500 dark:bg-sky-400',
                };
                if (prog >= 50) return {
                  bgClass: 'bg-amber-50/50 dark:bg-amber-950/30',
                  progressClass: 'bg-amber-500 dark:bg-amber-400',
                };
                return {
                  bgClass: 'bg-subtle-background/50',
                  progressClass: 'bg-primary',
                };
              };

              const statusInfo = getGoalStatus(progress);

              return (
                <motion.div
                  key={item.id}
                  className={`rounded-2xl p-4 transition-all duration-200 ${statusInfo.bgClass}`}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: {
                        duration: 0.4,
                        ease: [0.25, 0.46, 0.45, 0.94] as const,
                      },
                    },
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-medium text-foreground truncate">
                          {item.name}
                        </div>
                        {isComplete && (
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500 dark:bg-emerald-400 text-white shrink-0">
                            <FontAwesomeIcon icon={faCircleCheck} className="mr-1" />
                            Complete
                          </div>
                        )}
                      </div>
                      {item.targetDate && (
                        <div className="text-xs text-muted-foreground-color">
                          Target: {new Date(item.targetDate).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-light text-foreground">
                        {item.savedAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                      </div>
                      <div className="text-xs text-muted-foreground-color">
                        of {item.targetAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-1.5 bg-subtle-background rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${statusInfo.progressClass}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progress, 100)}%` }}
                        transition={{
                          duration: 1,
                          ease: [0.25, 0.46, 0.45, 0.94] as const,
                          delay: 0.3 + index * 0.1
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground-color">
                      <span>{progress.toFixed(0)}%</span>
                      {!isComplete && remaining > 0 && (
                        <span>
                          {remaining.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} to go
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </Widget>
  );
}

export function InsuranceCoverageWidget({ widget }: { widget: IInsuranceCoverageWidget; }) {
  const { data } = widget;
  const { items } = data;

  // Empty state - NO MOCK DATA
  if (!items || items.length === 0) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
          <div className="bg-amber-50/50 dark:bg-amber-950/30 rounded-full p-4 sm:p-6 mb-3 sm:mb-4">
            <FontAwesomeIcon icon={faShieldAlt} className="text-3xl sm:text-4xl text-amber-500 dark:text-amber-400" />
          </div>
          <h4 className="text-mobile-base sm:text-lg font-medium text-foreground mb-2">No Insurance Coverage Tracked</h4>
          <p className="text-mobile-sm sm:text-sm text-muted-foreground-color mb-4">Add your insurance policies to track your coverage.</p>
        </div>
      </Widget>
    );
  }

  // Group by insurance type and calculate coverage - NO MOCK DATA
  const groupedByType = items.reduce((acc, item) => {
    const type = item.type || 'Other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  const totalCoverage = items.reduce((sum, item) => sum + (item.coverageAmount || 0), 0);
  const totalPremium = items.reduce((sum, item) => sum + (item.monthlyPremium || 0), 0);

  // Icon mapping for insurance types
  const getInsuranceIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('health')) return faShieldAlt;
    if (lowerType.includes('life')) return faHandshake;
    if (lowerType.includes('auto') || lowerType.includes('car')) return faCreditCard;
    if (lowerType.includes('home') || lowerType.includes('property')) return faWallet;
    return faShieldAlt;
  };

  // Color mapping for insurance types
  const getInsuranceColors = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('health')) return {
      bgClass: 'bg-emerald-50/50 dark:bg-emerald-950/30',
      iconClass: 'text-emerald-500 dark:text-emerald-400',
    };
    if (lowerType.includes('life')) return {
      bgClass: 'bg-sky-50/50 dark:bg-sky-950/30',
      iconClass: 'text-sky-500 dark:text-sky-400',
    };
    if (lowerType.includes('auto') || lowerType.includes('car')) return {
      bgClass: 'bg-purple-50/50 dark:bg-purple-950/30',
      iconClass: 'text-purple-500 dark:text-purple-400',
    };
    if (lowerType.includes('home') || lowerType.includes('property')) return {
      bgClass: 'bg-amber-50/50 dark:bg-amber-950/30',
      iconClass: 'text-amber-500 dark:text-amber-400',
    };
    return {
      bgClass: 'bg-subtle-background/50',
      iconClass: 'text-muted-foreground-color',
    };
  };

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="h-full flex flex-col space-y-4 sm:space-y-6">
        {/* Overall Summary */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-subtle-background/50 rounded-2xl p-3 sm:p-4">
            <div className="text-mobile-xs sm:text-sm text-muted-foreground-color mb-1">Total Coverage</div>
            <div className="text-lg sm:text-2xl font-light text-foreground">
              {totalCoverage.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
            </div>
          </div>
          <div className="bg-subtle-background/50 rounded-2xl p-3 sm:p-4">
            <div className="text-mobile-xs sm:text-sm text-muted-foreground-color mb-1">Monthly Premium</div>
            <div className="text-lg sm:text-2xl font-light text-foreground">
              {totalPremium.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* Insurance Policies by Type */}
        <div className="space-y-2 sm:space-y-3 flex-1">
          <div className="text-mobile-sm sm:text-sm font-medium text-foreground mb-2">
            {items.length} {items.length === 1 ? 'Policy' : 'Policies'}
          </div>
          <motion.div
            className="space-y-3"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.08,
                  delayChildren: 0.1,
                },
              },
            }}
            initial="hidden"
            animate="visible"
          >
            {Object.entries(groupedByType).map(([type, policies], typeIndex) => {
              const typeColors = getInsuranceColors(type);
              const typeIcon = getInsuranceIcon(type);
              const typeCoverage = policies.reduce((sum, p) => sum + (p.coverageAmount || 0), 0);
              const typePremium = policies.reduce((sum, p) => sum + (p.monthlyPremium || 0), 0);

              return (
                <motion.div
                  key={type}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: {
                        duration: 0.4,
                        ease: [0.25, 0.46, 0.45, 0.94] as const,
                      },
                    },
                  }}
                >
                  <div className={`rounded-2xl p-4 transition-all duration-200 ${typeColors.bgClass}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="bg-white/60 dark:bg-black/20 rounded-full p-2.5 shrink-0">
                        <FontAwesomeIcon icon={typeIcon} className={`text-lg ${typeColors.iconClass}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground mb-1">
                          {type} Insurance
                        </div>
                        <div className="text-xs text-muted-foreground-color">
                          {policies.length} {policies.length === 1 ? 'policy' : 'policies'}
                        </div>
                      </div>
                    </div>

                    {/* Type Summary */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <div className="text-xs text-muted-foreground-color mb-0.5">Coverage</div>
                        <div className="text-sm font-light text-foreground">
                          {typeCoverage.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground-color mb-0.5">Premium</div>
                        <div className="text-sm font-light text-foreground">
                          {typePremium.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}/mo
                        </div>
                      </div>
                    </div>

                    {/* Individual Policies */}
                    {policies.length > 1 && (
                      <div className="space-y-2 pt-3 border-t border-white/20 dark:border-black/10">
                        {policies.map((policy) => (
                          <div key={policy.id} className="flex items-center justify-between text-xs">
                            <span className="text-foreground truncate flex-1 min-w-0 mr-2">
                              {policy.policyName}
                            </span>
                            <span className="text-muted-foreground-color shrink-0">
                              {policy.coverageAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </Widget>
  );
}