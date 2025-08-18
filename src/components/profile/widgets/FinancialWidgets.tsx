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

  const calculatedData = useMemo(() => {
    if (data?.quizAnswers) {
      return calculateFinancialHealthScore(data.quizAnswers);
    }
    return null;
  }, [data]);

  if (!calculatedData) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="p-6 text-center">
          <FontAwesomeIcon icon={faCircleExclamation} className="mb-3 text-3xl text-slate-400 dark:text-slate-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No financial health data available.</p>
        </div>
      </Widget>
    );
  }

  const { overallScore, budget, emergencyFund, savingsRate, debtToIncome } = calculatedData;
  const overallStatusStyles = getFinancialStatusStyles(overallScore.status);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;

  return (
    <Widget widget={widget} controls={widget.controls}>
      <motion.div className="flex flex-col space-y-6" variants={cardVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants} className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:space-x-6">
          <div className="relative h-24 w-24 shrink-0">
            <svg className="h-full w-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="8" className="text-slate-200 dark:text-slate-700" stroke="currentColor" />
              <motion.circle
                cx="50" cy="50" r={radius} fill="none" strokeWidth="8" strokeLinecap="round"
                stroke={getStatusColorValue(overallScore.status)}
                strokeDasharray={circumference}
                custom={overallScore.value}
                variants={{ hidden: { strokeDashoffset: circumference }, visible: (custom) => ({ strokeDashoffset: circumference * (1 - custom / 100), transition: { duration: 1.2, ease: [0.33, 1, 0.68, 1] } }) }}
                style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${overallStatusStyles.textColor}`}>{Math.round(overallScore.value)}</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">/ 100</span>
            </div>
          </div>
          <div className="mt-4 sm:mt-0">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Your Financial Health is {overallScore.status}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{overallScore.description}</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-4">
          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Budget Breakdown (50/30/20 Rule)</h4>
            <div className={`p-4 rounded-xl border ${getFinancialStatusStyles(budget.status === 'Balanced' ? 'Excellent' : 'Fair').bgColor} ${getFinancialStatusStyles(budget.status === 'Balanced' ? 'Excellent' : 'Fair').borderColor}`}>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{budget.description}</p>
                <div className="w-full flex rounded-full h-3 bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div className="bg-sky-500" style={{ width: `${budget.needs.percentage}%` }} title={`Needs: ${budget.needs.percentage.toFixed(0)}%`}></div>
                    <div className="bg-amber-500" style={{ width: `${budget.wants.percentage}%` }} title={`Wants: ${budget.wants.percentage.toFixed(0)}%`}></div>
                    <div className="bg-emerald-500" style={{ width: `${budget.savings.percentage}%` }} title={`Savings: ${budget.savings.percentage.toFixed(0)}%`}></div>
                </div>
                <div className="flex justify-between text-xs mt-1.5 text-slate-500 dark:text-slate-400">
                    <span><span className="h-2 w-2 inline-block rounded-full bg-sky-500 mr-1.5"></span>Needs</span>
                    <span><span className="h-2 w-2 inline-block rounded-full bg-amber-500 mr-1.5"></span>Wants</span>
                    <span><span className="h-2 w-2 inline-block rounded-full bg-emerald-500 mr-1.5"></span>Savings</span>
                </div>
            </div>
          </div>
          <MetricDisplay icon={faPiggyBank} metric={savingsRate} title="Savings Rate" />
          <MetricDisplay icon={faShieldAlt} metric={emergencyFund} title="Emergency Fund" />
          <MetricDisplay icon={faCreditCard} metric={debtToIncome} title="Debt to Income" />
        </motion.div>
      </motion.div>
    </Widget>
  );
}


// --- OTHER WIDGETS (Restored and Unchanged) ---

export function NextBestActionWidget({ widget }: { widget: INextBestActionWidget; }) {
  const { data: actionsData, maxDisplayItems, filterByPriority } = widget;
  const actionsToDisplay = useMemo(() => {
    if (!actionsData || !Array.isArray(actionsData)) return [];
    let filteredActions = [...actionsData].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    if (filterByPriority) {
      filteredActions = filteredActions.filter(action => action.priority === filterByPriority);
    }
    if (maxDisplayItems && maxDisplayItems > 0) {
      return filteredActions.slice(0, maxDisplayItems);
    }
    return filteredActions;
  }, [actionsData, maxDisplayItems, filterByPriority]);

  if (!actionsToDisplay || actionsToDisplay.length === 0) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="flex h-full flex-col items-center justify-center p-6 text-center">
          <FontAwesomeIcon icon={faCircleCheck} className="mb-4 text-4xl text-emerald-500 dark:text-emerald-400" />
          <h4 className="mb-1 text-lg font-semibold text-slate-700 dark:text-slate-200">All Caught Up!</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">No pending actions for you.</p>
        </div>
      </Widget>
    );
  }
  // Helper function to get priority styling based on mockup design
  const getPriorityStyles = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return {
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-600 dark:text-red-400',
          labelBg: 'bg-red-100 dark:bg-red-900/40',
          labelText: 'text-red-700 dark:text-red-300'
        };
      case 'medium':
        return {
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          textColor: 'text-yellow-600 dark:text-yellow-400',
          labelBg: 'bg-yellow-100 dark:bg-yellow-900/40',
          labelText: 'text-yellow-700 dark:text-yellow-300'
        };
      case 'low':
        return {
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          textColor: 'text-green-600 dark:text-green-400',
          labelBg: 'bg-green-100 dark:bg-green-900/40',
          labelText: 'text-green-700 dark:text-green-300'
        };
      default:
        return {
          bgColor: 'bg-slate-50 dark:bg-slate-800/50',
          borderColor: 'border-slate-200 dark:border-slate-700',
          textColor: 'text-slate-600 dark:text-slate-400',
          labelBg: 'bg-slate-100 dark:bg-slate-800',
          labelText: 'text-slate-700 dark:text-slate-300'
        };
    }
  };

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700 h-full">
        <div className="space-y-3">
          {actionsToDisplay.map((action) => {
            const styles = getPriorityStyles(action.priority);
            return (
              <div 
                key={action.id} 
                className={`p-4 rounded-lg border ${styles.bgColor} ${styles.borderColor}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles.labelBg} ${styles.labelText}`}>
                    {action.priority ? `${action.priority.charAt(0).toUpperCase() + action.priority.slice(1)} Priority` : 'Priority'}
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                    {action.title}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {action.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Widget>
  );
}

export function DebtVisualizerWidget({ widget }: { widget: IDebtVisualizerWidget; }) {
  const { data, strategy, title } = widget;
  if (!data || data.length === 0) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="flex h-full min-h-[200px] flex-col items-center justify-center p-6 text-center">
          <FontAwesomeIcon icon={faCircleCheck} className="mb-4 text-4xl text-emerald-500 dark:text-emerald-400" />
          <h4 className="mb-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">Congratulations - You're Debt Free!</h4>
        </div>
      </Widget>
    );
  }
  const sortedDebts = [...data].sort((a, b) => strategy === "snowball" ? (a.currentBalance || 0) - (b.currentBalance || 0) : (b.interestRate || 0) - (a.interestRate || 0));
  const totalCurrentBalance = data.reduce((sum, debt) => sum + (debt.currentBalance || 0), 0);
  const totalOriginalBalance = data.reduce((sum, debt) => sum + (debt.originalBalance || 0), 0);
  const totalPaid = totalOriginalBalance - totalCurrentBalance;
  const overallProgressPercentage = totalOriginalBalance > 0 ? Math.max(0, Math.min(100, (totalPaid / totalOriginalBalance) * 100)) : 0;
  const strategyIcon = strategy === "snowball" ? faSnowflake : faFire;
  const strategyName = strategy === "snowball" ? "Snowball" : "Avalanche";

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="p-4">
        <h3 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">{title || 'Path to Debt Freedom'}</h3>
        <p className="text-slate-700 dark:text-slate-300">Total Debt: ${totalCurrentBalance.toLocaleString()}</p>
        <p className="text-slate-700 dark:text-slate-300">Progress: {overallProgressPercentage.toFixed(1)}%</p>
        <p className="text-slate-700 dark:text-slate-300">Strategy: {strategyName}</p>
        {/* Full implementation of the debt visualizer would go here */}
      </div>
    </Widget>
  );
}

export function RetirementReadinessWidget({ widget }: { widget: IRetirementReadinessWidget; }) {
    const { data: retirementData } = widget;
    const [selectedScenarioId, setSelectedScenarioId] = useState(retirementData.currentScenarioId);
    const currentScenario = useMemo(() => retirementData.scenarios.find(s => s.id === selectedScenarioId), [retirementData.scenarios, selectedScenarioId]);

    if (!currentScenario) {
        return (
            <Widget widget={widget} controls={widget.controls}>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700 h-full flex items-center justify-center">
                    <p className="text-slate-600 dark:text-slate-400">Scenario not found.</p>
                </div>
            </Widget>
        );
    }

    // Extract data from current scenario
    const projectedAmount = currentScenario.projectionAmount || 0;
    const targetAmount = currentScenario.targetAmount || projectedAmount * 2; // Fallback if no target
    const currentSavings = currentScenario.currentAmount || 0;
    const annualSavings = currentScenario.annualContribution || 3000; // Default from mockup
    const expectedReturn = currentScenario.expectedReturn || 6.5; // Default from mockup
    const targetAge = currentScenario.targetAge || 65;
    const currentAge = currentScenario.currentAge || 30;
    const yearsToRetirement = targetAge - currentAge;
    
    // Calculate progress percentage
    const progressPercentage = targetAmount > 0 ? Math.min((projectedAmount / targetAmount) * 100, 100) : 0;
    
    // Determine status based on progress
    const getRetirementStatus = (progress: number) => {
        if (progress >= 90) return { status: 'On Track', color: 'green', textClass: 'text-green-600 dark:text-green-400', bgClass: 'bg-green-50 dark:bg-green-900/20' };
        if (progress >= 70) return { status: 'Good Progress', color: 'blue', textClass: 'text-blue-600 dark:text-blue-400', bgClass: 'bg-blue-50 dark:bg-blue-900/20' };
        if (progress >= 40) return { status: 'Needs Attention', color: 'orange', textClass: 'text-orange-600 dark:text-orange-400', bgClass: 'bg-orange-50 dark:bg-orange-900/20' };
        return { status: 'At Risk', color: 'red', textClass: 'text-red-600 dark:text-red-400', bgClass: 'bg-red-50 dark:bg-red-900/20' };
    };

    const statusInfo = getRetirementStatus(progressPercentage);

    return (
        <Widget widget={widget} controls={widget.controls}>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
                {/* Status Badge */}
                <div className="mb-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.textClass} ${statusInfo.bgClass}`}>
                        <span>{statusInfo.status}</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="mb-2">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-2">
                            <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                    statusInfo.color === 'green' ? 'bg-green-500 dark:bg-green-400' :
                                    statusInfo.color === 'blue' ? 'bg-blue-500 dark:bg-blue-400' :
                                    statusInfo.color === 'orange' ? 'bg-orange-500 dark:bg-orange-400' :
                                    'bg-red-500 dark:bg-red-400'
                                }`}
                                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                            <span>{progressPercentage.toFixed(0)}%</span>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        You're on track to meet your retirement goal based on your current savings, timeline, and expected portfolio growth.
                    </p>
                </div>

                {/* Detailed Information Section */}
                <div className="mt-auto">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Will You Reach Your Goal?</h4>
                        
                        <div className="flex items-center gap-4 mb-4">
                            {/* Circular Progress Indicator */}
                            <div className="relative w-12 h-12 flex-shrink-0">
                                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                                    <circle
                                        cx="24"
                                        cy="24"
                                        r="20"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="none"
                                        className="text-slate-200 dark:text-slate-700"
                                    />
                                    <circle
                                        cx="24"
                                        cy="24"
                                        r="20"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="none"
                                        strokeDasharray={`${(progressPercentage / 100) * 125.6} 125.6`}
                                        className={
                                            statusInfo.color === 'green' ? 'text-green-500 dark:text-green-400' :
                                            statusInfo.color === 'blue' ? 'text-blue-500 dark:text-blue-400' :
                                            statusInfo.color === 'orange' ? 'text-orange-500 dark:text-orange-400' :
                                            'text-red-500 dark:text-red-400'
                                        }
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                        {Math.round(progressPercentage)}
                                    </span>
                                </div>
                            </div>
                            
                            <div>
                                <h5 className={`font-bold ${statusInfo.textClass}`}>{statusInfo.status}</h5>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Projected: ${projectedAmount.toLocaleString()} by Age {targetAge}
                                </p>
                            </div>
                        </div>
                        
                        <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                            <p>Assumes {expectedReturn}% return annually</p>
                            <p>Based on your current savings: ${annualSavings.toLocaleString()}/yr</p>
                            {yearsToRetirement > 0 && (
                                <p>{yearsToRetirement} years until retirement</p>
                            )}
                            {currentSavings > 0 && (
                                <p>Current balance: ${currentSavings.toLocaleString()}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Widget>
    );
}

export function EnhancedSavingsGoalsWidget({ widget }: { widget: IEnhancedSavingsGoalsWidget; }) {
    const { data } = widget;
    const { items } = data;
    return (
        <Widget widget={widget} controls={widget.controls}>
            <div className="p-4">
                <h3 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Savings Goals</h3>
                {items.map(item => (
                    <div key={item.id} className="mb-2">
                        <p className="text-slate-700 dark:text-slate-300">{item.name}: ${item.savedAmount.toLocaleString()} / ${item.targetAmount.toLocaleString()}</p>
                    </div>
                ))}
            </div>
        </Widget>
    );
}

export function InsuranceCoverageWidget({ widget }: { widget: IInsuranceCoverageWidget; }) {
    const { data } = widget;
    const { items } = data;
    return (
        <Widget widget={widget} controls={widget.controls}>
            <div className="p-4">
                <h3 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Insurance Coverage</h3>
                {items.map(item => (
                    <div key={item.id} className="mb-2">
                        <p className="text-slate-700 dark:text-slate-300">{item.policyName} ({item.type})</p>
                    </div>
                ))}
            </div>
        </Widget>
    );
}