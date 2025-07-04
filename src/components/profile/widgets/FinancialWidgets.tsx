'use client';

import { useMemo, useState } from 'react'; // Added back useMemo as it's used by multiple widgets
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowRight, faCircleCheck, faCircleExclamation, 
  faCircleQuestion, faHandshake,
  faCoins, 
  faChartPie, 
  faFileInvoiceDollar, 
  faSnowflake, 
  faFire
  // Icons for FinancialHealthScorecardWidget are now imported within its definition
} from '@fortawesome/free-solid-svg-icons';
import { 
  IFinancialHealthScorecardWidget, 
  INextBestActionWidget,
  INextBestActionItem, // Added import for INextBestActionItem
  IDebtVisualizerWidget,
  IRetirementReadinessWidget,
  IEnhancedSavingsGoalsWidget,
  IInsuranceCoverageWidget
} from '../types/dashboard-data.typings';
import { Widget } from './Widget';

// Financial Health Scorecard Widget
import { motion, Variants } from 'framer-motion';



import {
  faWallet, 
  faPiggyBank, 
  faCreditCard, 
  faChartLine, 
  faShieldAlt, 
  faQuestionCircle 
} from '@fortawesome/free-solid-svg-icons'; // Added more icons

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
    case 'excellent':
      return '#10b981'; // emerald-500
    case 'good':
      return '#0ea5e9'; // sky-500
    case 'fair':
      return '#f59e0b'; // amber-500
    case 'needs attention':
    case 'needs improvement':
      return '#f97316'; // orange-500
    case 'poor':
      return '#ef4444'; // red-500
    default:
      return '#64748b'; // slate-500
  }
}

type FinancialStatus = 'Excellent' | 'Good' | 'Fair' | 'Needs Attention' | string | undefined;

function getFinancialStatusStyles(status?: FinancialStatus): StatusStyles {
  const s = status?.toLowerCase();
  switch (s) {
    case 'excellent':
      return {
        textColor: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/60',
        borderColor: 'border-emerald-500/30 dark:border-emerald-700/50',
        progressColor: 'text-emerald-500 dark:text-emerald-400',
        iconColor: 'text-emerald-500 dark:text-emerald-400',
        ringColor: 'ring-emerald-500',
      };
    case 'good':
      return {
        textColor: 'text-sky-600 dark:text-sky-400',
        bgColor: 'bg-sky-50 dark:bg-sky-900/60',
        borderColor: 'border-sky-500/30 dark:border-sky-700/50',
        progressColor: 'text-sky-500 dark:text-sky-400',
        iconColor: 'text-sky-500 dark:text-sky-400',
        ringColor: 'ring-sky-500',
      };
    case 'fair':
      return {
        textColor: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-900/60',
        borderColor: 'border-amber-500/30 dark:border-amber-700/50',
        progressColor: 'text-amber-500 dark:text-amber-400',
        iconColor: 'text-amber-500 dark:text-amber-400',
        ringColor: 'ring-amber-500',
      };
    case 'needs attention': // Mapped from 'Needs Improvement'
    case 'needs improvement':
      return {
        textColor: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-900/60',
        borderColor: 'border-orange-500/30 dark:border-orange-700/50',
        progressColor: 'text-orange-500 dark:text-orange-400',
        iconColor: 'text-orange-500 dark:text-orange-400',
        ringColor: 'ring-orange-500',
      };
    case 'poor':
      return {
        textColor: 'text-red-600 dark:text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-900/60',
        borderColor: 'border-red-500/30 dark:border-red-700/50',
        progressColor: 'text-red-500 dark:text-red-400',
        iconColor: 'text-red-500 dark:text-red-400',
        ringColor: 'ring-red-500',
      };
    default:
      return {
        textColor: 'text-slate-600 dark:text-slate-400',
        bgColor: 'bg-slate-100 dark:bg-slate-800/60',
        borderColor: 'border-slate-300/50 dark:border-slate-700/50',
        progressColor: 'text-slate-500 dark:text-slate-400',
        iconColor: 'text-slate-500 dark:text-slate-400',
        ringColor: 'ring-slate-500',
      };
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
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 100, damping: 12 } },
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
    case 'budgeting': return faWallet;
    case 'savings': return faPiggyBank;
    case 'debt': return faCreditCard;
    case 'investment': return faChartLine;
    case 'insurance': return faShieldAlt;
    default: return faQuestionCircle;
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
  status: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';
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
export function calculateFinancialHealthScore(quizAnswers: QuizAnswers): IFinancialHealthCalculationResult {
  console.log('Running calculateFinancialHealthScore with answers:', quizAnswers);

  // Extract and validate required granular data
  const monthlyIncome = typeof quizAnswers['monthly-income'] === 'number' ? quizAnswers['monthly-income'] : 0;
  const monthlyExpenses = typeof quizAnswers['monthly-expenses'] === 'number' ? quizAnswers['monthly-expenses'] : 0;
  const emergencyFundMonths = typeof quizAnswers['emergency-fund-months'] === 'number' ? quizAnswers['emergency-fund-months'] : 
                               (typeof quizAnswers['emergency-fund'] === 'number' && monthlyExpenses > 0 ? 
                                Math.floor(quizAnswers['emergency-fund'] / monthlyExpenses) : 0);
  
  // Extract insurance policies (handle both array and string formats)
  let insurancePolicies: string[] = [];
  if (Array.isArray(quizAnswers['insurance-policies'])) {
    insurancePolicies = quizAnswers['insurance-policies'];
  } else if (Array.isArray(quizAnswers['insurance-coverage'])) {
    insurancePolicies = quizAnswers['insurance-coverage'];
  }
  
  // Handle debt fields - recognize both amount fields and type arrays
  // Extract debt amounts
  let debtMortgage = typeof quizAnswers['debt-amount-mortgage'] === 'number' ? quizAnswers['debt-amount-mortgage'] : 0;
  let debtCredit = typeof quizAnswers['debt-amount-credit'] === 'number' ? quizAnswers['debt-amount-credit'] : 0;
  let debtStudent = typeof quizAnswers['debt-amount-student'] === 'number' ? quizAnswers['debt-amount-student'] : 0;
  let debtOther = typeof quizAnswers['debt-amount-other'] === 'number' ? quizAnswers['debt-amount-other'] : 0;
  
  // Parse debt types from quiz answers - handling both strings and arrays
  let debtTypes: string[] = [];
  const totalDebtAmount = typeof quizAnswers['debt-level'] === 'number' ? quizAnswers['debt-level'] : 0;
  
  // Handle debt-type array - always use this if available
  if (Array.isArray(quizAnswers['debt-type'])) {
    // Filter out 'none' if other debt types are present
    if (quizAnswers['debt-type'].length > 1) {
      debtTypes = quizAnswers['debt-type'].filter(type => type !== 'none');
    } else {
      debtTypes = [...quizAnswers['debt-type']];
    }
  }
  
  // Handle housing situation as a debt type
  if (quizAnswers['housing-situation'] === 'own-mortgage' && !debtTypes.includes('mortgage')) {
    debtTypes.push('mortgage');
  }
  
  console.log('Debt types detected from quiz answers:', debtTypes);
  
  // If we have debt types and a total debt amount, always distribute the debt
  // Do this regardless of whether specific amounts are set, as the debt-level is likely more accurate
  if (debtTypes.length > 0 && totalDebtAmount > 0 && debtTypes[0] !== 'none') {
    // Reset any existing debt amounts since we're redistributing based on debt-type
    debtMortgage = 0;
    debtCredit = 0; 
    debtStudent = 0;
    debtOther = 0;
    
    // Simple distribution - divide debt equally among types
    const perTypeAmount = totalDebtAmount / debtTypes.length;
    
    debtTypes.forEach(debtType => {
      if (debtType.includes('mortgage')) {
        debtMortgage += perTypeAmount;
      }
      else if (debtType.includes('credit')) {
        debtCredit += perTypeAmount;
      }
      else if (debtType.includes('student')) {
        debtStudent += perTypeAmount;
      }
      else {
        // personal-loan and any other type
        debtOther += perTypeAmount;
      }
    });
    
    console.log('Debt distribution after allocation:', {
      debtMortgage, debtCredit, debtStudent, debtOther, totalDebtAmount
    });
  }
  
  // Always create a derived debtTypes array based on the actual numeric debt amounts
  // This ensures consistency between debt types and amounts
  const calculatedDebtTypes: string[] = [];
  if (debtMortgage > 0) calculatedDebtTypes.push('mortgage');
  if (debtCredit > 0) calculatedDebtTypes.push('credit-card');
  if (debtStudent > 0) calculatedDebtTypes.push('student');
  if (debtOther > 0) calculatedDebtTypes.push('personal-loan');
  
  // If no debts have amounts but we have debt types from the quiz, use those
  if (calculatedDebtTypes.length === 0 && debtTypes.length > 0 && debtTypes[0] !== 'none') {
    debtTypes.forEach(type => {
      if (!calculatedDebtTypes.includes(type)) calculatedDebtTypes.push(type);
    });
  }
  
  console.log('Final calculated debt types:', calculatedDebtTypes);
  
  // Health checkup frequency
  const healthCheckupFrequency = quizAnswers['health-checkup-frequency'] || 
                                (quizAnswers['health-status'] === 'excellent' ? 'yearly' : 
                                 quizAnswers['health-status'] === 'good' ? 'yearly' : 'asneeded');
  
  // 1. Calculate Savings Score (40% of total)
  // Compute savings rate from income and expenses
  const savingsAmount = Math.max(0, monthlyIncome - monthlyExpenses);
  const savingsRate = monthlyIncome > 0 ? (savingsAmount / monthlyIncome) * 100 : 0;
  
  // Calculate income adequacy factor - higher income gives a slight boost to savings score
  // This assumes a median household income of around $5000/month
  const incomeAdequacyFactor = Math.min(1.25, Math.max(0.75, monthlyIncome / 5000));
  
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
  const creditCardDebtRatio = monthlyIncome > 0 ? debtCredit / monthlyIncome : 0;
  const hasHighRiskDebt = creditCardDebtRatio > 2;
  const hasModerateRiskDebt = creditCardDebtRatio > 1 && creditCardDebtRatio <= 2;
  
  // Calculate debt-to-income ratio (monthly)
  // Rough estimate of monthly debt payments (simplified)
  const monthlyDebtPayment = (debtCredit * 0.03) + // Approx 3% min payment on credit cards
                           (debtMortgage / 12 * 0.006) + // Approx mortgage payment
                           (debtStudent / 12 * 0.01) + // Approx student loan payment
                           (debtOther / 12 * 0.02); // Approx other debt payment
  
  // Calculate debt-to-income ratio and cap it at 100% for scoring purposes
  const debtToIncomeRatio = monthlyIncome > 0 ? Math.min(100, (monthlyDebtPayment / monthlyIncome) * 100) : 0;
  
  // Evaluate insurance coverage
  const hasAdequateInsurance = Array.isArray(insurancePolicies) && 
                             insurancePolicies.length >= 2 && 
                             (insurancePolicies.includes('health') || insurancePolicies.includes('medical'));
  
  // Regular health checkups are good risk management
  const hasRegularHealthCheckups = healthCheckupFrequency === 'yearly' || healthCheckupFrequency === 'biannual';
  
  // Income-based adjustment for insurance assessment
  // Higher income = higher expectation for insurance coverage
  const insuranceCoverageExpectation = monthlyIncome > 5000 ? 3 : 2; // Expected number of policies
  const hasOptimalInsurance = Array.isArray(insurancePolicies) && 
                             insurancePolicies.length >= insuranceCoverageExpectation &&
                             (insurancePolicies.includes('health') || insurancePolicies.includes('medical'));
  
  let riskManagementScore = 0;
  if (hasOptimalInsurance && !hasHighRiskDebt && !hasModerateRiskDebt && debtToIncomeRatio < 36 && hasRegularHealthCheckups) {
    riskManagementScore = 100;
  } else if (hasAdequateInsurance && !hasHighRiskDebt && debtToIncomeRatio < 43) {
    riskManagementScore = 75;
  } else if ((hasAdequateInsurance && hasModerateRiskDebt) || debtToIncomeRatio < 50) {
    riskManagementScore = 50;
  } else {
    riskManagementScore = 25;
  }

  // 4. Overall score and status
  // Calculate overall score with weights
  const overallScore = Math.round((savingsScore * 0.4) + (emergencyFundScore * 0.3) + (riskManagementScore * 0.3));
  
  // Determine status based on score
  let status: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';
  if (overallScore >= 90) {
    status = 'Excellent';
  } else if (overallScore >= 75) {
    status = 'Good';
  } else if (overallScore >= 60) {
    status = 'Fair';
  } else {
    status = 'Needs Attention';
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
      id: 'savings-rate',
      category: 'Savings',
      score: savingsScore,
      status: getScoreStatus(savingsScore),
      explanation: `You're saving ${savingsRate.toFixed(1)}% of your ${monthlyIncome >= 5000 ? 'above-average' : 'monthly'} income of $${monthlyIncome.toLocaleString()}. ${savingsRate >= 20 ? 
        'Great job! Maintaining a 20%+ savings rate puts you on track for financial independence.' : 
        (savingsRate >= 10 ? 
          'Good progress. Try to increase to 20% for optimal financial health.' : 
          `Consider ${monthlyExpenses > monthlyIncome * 0.9 ? 'reducing expenses' : 'increasing savings'} to save at least 10-20% of your income.`)
      }`
    },
    {
      id: 'emergency-fund',
      category: 'Emergency Fund',
      score: emergencyFundScore,
      status: getScoreStatus(emergencyFundScore),
      explanation: emergencyFundScore >= 75 
        ? `Your emergency fund covers ${emergencyFundMonths} months of expenses.` 
        : `Your emergency fund covers ${emergencyFundMonths} months. Work towards 3-6 months coverage.`
    },
    {
      id: 'risk-management',
      category: 'Risk Management',
      score: riskManagementScore,
      status: getScoreStatus(riskManagementScore),
      explanation: hasHighRiskDebt 
        ? `Your credit card debt is ${creditCardDebtRatio.toFixed(1)}x your monthly income. Focus on reducing this high-interest debt to improve financial security.` 
        : (hasModerateRiskDebt 
            ? `Your credit card debt is ${creditCardDebtRatio.toFixed(1)}x your monthly income. Consider paying this down more aggressively.`
            : (hasAdequateInsurance 
               ? `You have ${insurancePolicies?.length || 0} insurance policies, which provides adequate coverage for your income level.` 
               : `Consider expanding your insurance coverage to at least ${insuranceCoverageExpectation} policies to protect against risks.`)
          )
    }
  ];

  // Retirement Projections Calculation
  // Extract retirement-specific fields from quiz answers with robust fallbacks
  const retirementAge = typeof quizAnswers['retirement-age'] === 'number' ? quizAnswers['retirement-age'] : 65;
  const currentAge = typeof quizAnswers['current-age'] === 'number' ? quizAnswers['current-age'] : 35;
  
  // Calculate raw years until retirement (can be negative)
  const rawYearsUntilRetirement = retirementAge - currentAge;
  
  // Handle different possible fields for current investments
  const currentInvestments = 
    typeof quizAnswers['current-investments'] === 'number' ? quizAnswers['current-investments'] : 
    typeof quizAnswers['current-assets'] === 'number' ? quizAnswers['current-assets'] : 0;
  
  // Handle multiple possible contribution fields
  let annualContribution = typeof quizAnswers['annual-contribution'] === 'number' ? quizAnswers['annual-contribution'] : 0;
  
  // If we don't have annual contribution but have monthly savings and investment percentage
  if (annualContribution === 0 && savingsAmount > 0) {
    // Try to extract investment percentage from various fields
    const investmentPercentage = 
      typeof quizAnswers['investment-percentage'] === 'number' ? quizAnswers['investment-percentage'] : 
      typeof quizAnswers['investing-percentage'] === 'number' ? quizAnswers['investing-percentage'] : 20;
    
    // Calculate monthly contribution and convert to annual
    const monthlyContribution = savingsAmount * (investmentPercentage / 100);
    annualContribution = monthlyContribution * 12;
  }
  
  // Handle various forms of return rate
  let annualReturnRate = 0.07; // Default to 7%
  
  // Try to extract from expected-return field first (common in quiz)
  if (typeof quizAnswers['expected-return'] === 'number') {
    // Make sure the rate is reasonable (sometimes users enter very small numbers like 1.3%)
    // If less than 5, assume it's a percentage already (e.g., 1.3%)
    if (quizAnswers['expected-return'] < 5) {
      annualReturnRate = Math.max(0.01, quizAnswers['expected-return'] / 100); // Minimum 1%
    } else {
      // If greater than 5, assume it's in basis points (e.g., 500 = 5%)
      annualReturnRate = quizAnswers['expected-return'] / 10000;
    }
  }
  // Fall back to return-rate
  else if (typeof quizAnswers['return-rate'] === 'number') {
    annualReturnRate = quizAnswers['return-rate'] / 100; // Convert from percentage to decimal
  }
  // Fall back to risk tolerance
  else {
    const riskTolerance = 
      typeof quizAnswers['risk-tolerance'] === 'string' ? quizAnswers['risk-tolerance'].toLowerCase() : 
      typeof quizAnswers['risk-tolerance'] === 'number' ? 
        (quizAnswers['risk-tolerance'] <= 3 ? 'conservative' : 
         quizAnswers['risk-tolerance'] <= 7 ? 'moderate' : 'aggressive') : 'moderate';
    
    switch (riskTolerance) {
      case 'conservative': annualReturnRate = 0.05; break;
      case 'moderate': annualReturnRate = 0.07; break;
      case 'aggressive': annualReturnRate = 0.09; break;
      default: annualReturnRate = 0.07;
    }
  }
  
  console.log('Retirement calculation inputs:', { 
    currentAge, retirementAge, rawYearsUntilRetirement,
    currentInvestments, annualContribution, annualReturnRate 
  });
  
  // Handle calculation differently based on whether retirement age is in past or future
  let projectedRetirementFund = currentInvestments;
  let monthlyRetirementIncome = 0;
  let progressPercentage = 0;
  const targetRetirement = typeof quizAnswers['target-retirement'] === 'number' ? 
    quizAnswers['target-retirement'] : 1000000; // Default to $1M if not specified
  
  if (rawYearsUntilRetirement <= 0) {
    // Already at or past retirement age - use current assets with no growth
    projectedRetirementFund = currentInvestments;
    monthlyRetirementIncome = projectedRetirementFund * 0.0033; // 4% annual withdrawal rate
    progressPercentage = targetRetirement > 0 ? 
      Math.min(100, Math.round((projectedRetirementFund / targetRetirement) * 100)) : 0;
  } else {
    // Future retirement - calculate compound growth
    const yearsUntilRetirement = rawYearsUntilRetirement;
    
    // Compound interest formula: FV = PV(1+r)^t + PMT*((1+r)^t-1)/r
    const annualFactor = Math.pow(1 + annualReturnRate, yearsUntilRetirement);
    projectedRetirementFund = currentInvestments * annualFactor;
    
    // Add contributions only if we have contributions and rate > 0
    if (annualContribution > 0 && annualReturnRate > 0) {
      projectedRetirementFund += annualContribution * ((annualFactor - 1) / annualReturnRate);
    } else if (annualContribution > 0) {
      // If rate is 0 or negative, just add the contributions
      projectedRetirementFund += annualContribution * yearsUntilRetirement;
    }
    
    // Calculate monthly retirement income (4% safe withdrawal rate annually = 0.33% monthly)
    monthlyRetirementIncome = projectedRetirementFund * 0.0033;
    
    // Calculate progress percentage toward target
    progressPercentage = targetRetirement > 0 ? 
      Math.min(100, Math.round((projectedRetirementFund / targetRetirement) * 100)) : 0;
  }
  
  // Make sure we return non-zero values even in edge cases
  projectedRetirementFund = Math.max(0, Math.round(projectedRetirementFund));
  monthlyRetirementIncome = Math.max(0, Math.round(monthlyRetirementIncome));
  progressPercentage = Math.max(0, progressPercentage);

  // If no debt or only debtTypes array exists with 'none', mark as debt free
  const debtFree = (calculatedDebtTypes.length === 0 && debtTypes.length === 0) || 
                   (debtTypes.length === 1 && debtTypes[0] === 'none');
  
  console.log('Final calculation results:', {
    overallScore,
    status,
    debtStatus: { debtFree, debtTypes: calculatedDebtTypes },
    projectedRetirementFund: Math.round(projectedRetirementFund),
    monthlyRetirementIncome: Math.round(monthlyRetirementIncome),
    progressPercentage,
    rawYearsUntilRetirement
  });
  
  return {
    overallScore,
    status,
    items,
    // Add debtStatus object with debtFree flag and debtTypes array
    debtStatus: {
      debtFree,
      debtTypes: calculatedDebtTypes
    },
    // Add retirement-related fields
    projectedRetirementFund: Math.round(projectedRetirementFund),
    monthlyRetirementIncome: Math.round(monthlyRetirementIncome),
    progressPercentage
  };
}

// Helper function to get status based on score
function getScoreStatus(score: number): 'Excellent' | 'Good' | 'Fair' | 'Needs Attention' {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Needs Attention';
}

export function FinancialHealthScorecardWidget({ widget }: { widget: IFinancialHealthScorecardWidget }) {
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
        items: result.items
      };
    }
    return {
      ...data,
      overallScore: 0,
      overallStatus: 'Not Evaluated',
      items: []
    };
  }, [data]);
  
  const showIndividualScores = calculatedData.showIndividualScores !== false;
  const overallStatusStyles = useMemo(() => getFinancialStatusStyles(calculatedData?.overallStatus), [calculatedData?.overallStatus]);

  if (!calculatedData || !calculatedData.quizAnswers) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div className="p-6 text-center">
          <FontAwesomeIcon icon={faCircleExclamation} className="text-3xl text-slate-400 dark:text-slate-500 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No financial health data available.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Please check back later or try updating your information.</p>
        </div>
      </Widget>
    );
  }

  const overallScoreNormalized = Math.max(0, Math.min(100, calculatedData.overallScore || 0));
  const radius = 45;
  const circumference = 2 * Math.PI * radius; // Approx 282.74

  return (
    <Widget widget={widget} controls={widget.controls}>
      <motion.div 
        className="p-4 md:p-6 flex flex-col space-y-6" 
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Overall Score Section */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center sm:justify-start text-center sm:text-left space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="relative w-32 h-32 md:w-36 md:h-36 shrink-0">
            <svg className="w-full h-full" viewBox="0 0 100 100"> {/* Adjusted viewBox for easier calculations */}
              {/* Background Circle */}
              <circle
                cx="50" cy="50" r={radius}
                fill="none"
                strokeWidth="8"
                stroke="rgba(200, 200, 200, 0.5)" 
              />
              {/* Foreground Progress Circle */}
              <circle
                cx="50" cy="50" r={radius}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                stroke={getStatusColorValue(calculatedData.overallStatus)}
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (overallScoreNormalized / 100) * circumference}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl md:text-4xl font-bold ${overallStatusStyles.textColor}`}>{Math.round(overallScoreNormalized)}</span>
              <span className={`text-xs font-medium ${overallStatusStyles.textColor} opacity-80`}>/ 100</span>
            </div>
          </div>
          <div className="flex-grow">
            <motion.h3 variants={itemVariants} className={`text-2xl md:text-3xl font-semibold ${overallStatusStyles.textColor}`}>
              {calculatedData.overallStatus || 'Not Evaluated'}
            </motion.h3>
            <motion.p variants={itemVariants} className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Your overall financial health score is {Math.round(overallScoreNormalized)} out of 100.
            </motion.p>
          </div>
        </motion.div>

        {/* Score Breakdown Section */}
        {showIndividualScores && calculatedData.items && calculatedData.items.length > 0 && (
          <motion.div variants={itemVariants} className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Score Breakdown</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {calculatedData.items.map((item) => {
                const itemStatusStyles = getFinancialStatusStyles(item.status);
                const itemScoreNormalized = Math.max(0, Math.min(100, item.score));
                return (
                  <motion.div 
                    key={item.id} 
                    variants={itemVariants}
                    className={`p-4 rounded-xl border ${itemStatusStyles.borderColor} ${itemStatusStyles.bgColor} shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col group`}
                  >
                    <div className="flex items-start mb-2">
                      <FontAwesomeIcon icon={getCategoryIcon(item.category)} className={`w-5 h-5 mr-3 mt-0.5 shrink-0 ${itemStatusStyles.iconColor}`} />
                      <div className="flex-grow">
                        <h4 className={`text-md font-semibold ${itemStatusStyles.textColor.split(' ')[0]} dark:${itemStatusStyles.textColor.split(' ')[1]} group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors`}>
                          {item.category}
                        </h4>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${itemStatusStyles.textColor} ${itemStatusStyles.bgColor}`}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <p className={`text-sm ${itemStatusStyles.textColor} mb-3 grow leading-relaxed pl-8`}>
                      {item.explanation}
                    </p>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 my-2">
                      <motion.div 
                        className={`h-2 rounded-full ${itemStatusStyles.progressColor.replace('text-', 'bg-')}`} 
                        initial={{ width: 0 }} 
                        animate={{ width: `${itemScoreNormalized}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    <span className={`text-sm font-bold ${itemStatusStyles.textColor}`}>{itemScoreNormalized}/100</span>
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
  faTasks
} from '@fortawesome/free-solid-svg-icons';

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

function getPriorityStyles(priority: 'low' | 'medium' | 'high' | 'urgent' | string | undefined): PriorityStyle {
  switch (priority?.toLowerCase()) {
    case 'urgent':
      return {
        icon: faExclamationTriangle,
        iconColor: 'text-red-500 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/40 backdrop-blur-md',
        textColor: 'text-red-700 dark:text-red-200',
        borderColor: 'border-red-500/50 dark:border-red-600/70',
        buttonBgColor: 'bg-red-600 dark:bg-red-700',
        buttonHoverBgColor: 'hover:bg-red-700 dark:hover:bg-red-800',
        badgeTextColor: 'text-red-700 dark:text-red-100',
        badgeBgColor: 'bg-red-100 dark:bg-red-500/60',
      };
    case 'high':
      return {
        icon: faArrowUp,
        iconColor: 'text-orange-500 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-900/40 backdrop-blur-md',
        textColor: 'text-orange-700 dark:text-orange-200',
        borderColor: 'border-orange-500/50 dark:border-orange-600/70',
        buttonBgColor: 'bg-orange-500 dark:bg-orange-600',
        buttonHoverBgColor: 'hover:bg-orange-600 dark:hover:bg-orange-700',
        badgeTextColor: 'text-orange-700 dark:text-orange-100',
        badgeBgColor: 'bg-orange-100 dark:bg-orange-500/60',
      };
    case 'medium':
      return {
        icon: faTasks,
        iconColor: 'text-sky-500 dark:text-sky-400',
        bgColor: 'bg-sky-50 dark:bg-sky-900/40 backdrop-blur-md',
        textColor: 'text-sky-700 dark:text-sky-200',
        borderColor: 'border-sky-500/50 dark:border-sky-600/70',
        buttonBgColor: 'bg-sky-500 dark:bg-sky-600',
        buttonHoverBgColor: 'hover:bg-sky-600 dark:hover:bg-sky-700',
        badgeTextColor: 'text-sky-700 dark:text-sky-100',
        badgeBgColor: 'bg-sky-100 dark:bg-sky-500/60',
      };
    case 'low':
      return {
        icon: faArrowDown,
        iconColor: 'text-emerald-500 dark:text-emerald-400',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/40 backdrop-blur-md',
        textColor: 'text-emerald-700 dark:text-emerald-200',
        borderColor: 'border-emerald-500/50 dark:border-emerald-600/70',
        buttonBgColor: 'bg-emerald-500 dark:bg-emerald-600',
        buttonHoverBgColor: 'hover:bg-emerald-600 dark:hover:bg-emerald-700',
        badgeTextColor: 'text-emerald-700 dark:text-emerald-100',
        badgeBgColor: 'bg-emerald-100 dark:bg-emerald-500/60',
      };
    default:
      return {
        icon: faInfoCircle,
        iconColor: 'text-slate-500 dark:text-slate-400',
        bgColor: 'bg-slate-100 dark:bg-slate-800/50 backdrop-blur-md',
        textColor: 'text-slate-700 dark:text-slate-300',
        borderColor: 'border-slate-300/60 dark:border-slate-700/60',
        buttonBgColor: 'bg-primary-600 dark:bg-primary-500',
        buttonHoverBgColor: 'hover:bg-primary-700 dark:hover:bg-primary-600',
        badgeTextColor: 'text-slate-700 dark:text-slate-200',
        badgeBgColor: 'bg-slate-200 dark:bg-slate-700/70',
      };
  }
}

export function NextBestActionWidget({ widget }: { widget: INextBestActionWidget }) {
  const { data: actionsData, maxDisplayItems, filterByPriority } = widget;

  const actionsToDisplay = useMemo(() => {
    if (!actionsData || !Array.isArray(actionsData)) return [];

    let filteredActions = [...actionsData];

    if (filterByPriority && ['low', 'medium', 'high', 'urgent'].includes(filterByPriority as string)) {
      filteredActions = filteredActions.filter((action: INextBestActionItem) => action.priority === filterByPriority);
    }
    
    filteredActions.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    if (maxDisplayItems && maxDisplayItems > 0) {
      return filteredActions.slice(0, maxDisplayItems);
    }
    return filteredActions;
  }, [actionsData, maxDisplayItems, filterByPriority]);

  if (!actionsToDisplay || actionsToDisplay.length === 0) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <motion.div 
          className="p-6 text-center flex flex-col items-center justify-center h-full"
          variants={cardVariants} initial="hidden" animate="visible"
        >
          <FontAwesomeIcon icon={faCircleCheck} className="text-4xl text-emerald-500 dark:text-emerald-400 mb-4" />
          <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">All Caught Up!</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">There are no pending actions for you at the moment.</p>
        </motion.div>
      </Widget>
    );
  }

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div 
        className="p-4 md:p-2 flex flex-col space-y-4"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        {actionsToDisplay.map((action) => {
          const priorityStyles = getPriorityStyles(action.priority);
          return (
            <div 
              key={action.id} 
              variants={itemVariants}
              className={`p-4 rounded-xl border ${priorityStyles.borderColor} ${priorityStyles.bgColor} shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col group`}
            >
              <div className="flex items-start mb-2">
                <FontAwesomeIcon icon={priorityStyles.icon} className={`w-5 h-5 mr-3 mt-0.5 shrink-0 ${priorityStyles.iconColor}`} />
                <div className="flex-grow">
                  <h4 className={`text-md font-semibold ${priorityStyles.textColor.split(' ')[0]} dark:${priorityStyles.textColor.split(' ')[1]} group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors`}>
                    {action.title}
                  </h4>
               {action.priority&&   <span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${priorityStyles.badgeTextColor} ${priorityStyles.badgeBgColor}`}>
                    {action.priority.charAt(0).toUpperCase() + action.priority.slice(1)} Priority
                  </span>}
                </div>
              </div>
              <p className={`text-sm ${priorityStyles.textColor} mb-3 grow leading-relaxed pl-8`}>
                {action.message}
              </p>
              {action.callToAction && (
                <div className="mt-auto self-start pl-8 w-full sm:w-auto">
                  <a 
                    href={action.actionLink || '#'}
                    target={action.actionLink && action.actionLink.startsWith('http') ? '_blank' : '_self'}
                    rel={action.actionLink && action.actionLink.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-center text-white rounded-lg transition-colors duration-150 w-full sm:w-auto focus:ring-4 focus:outline-none ${priorityStyles.buttonBgColor} ${priorityStyles.buttonHoverBgColor} focus:ring-primary-300 dark:focus:ring-primary-800`}
                  >
                    {action.callToAction}
                    <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Widget>
  );
}

// Debt Visualizer Widget
export function DebtVisualizerWidget({ widget }: { widget: IDebtVisualizerWidget }) {
  const { data, strategy, title } = widget; // Added title from widget props

  if (!data || data.length === 0) {
    return (
      <Widget widget={widget} controls={widget.controls}>
        <div 
          className="p-6 text-center flex flex-col items-center justify-center h-full min-h-[200px]" // Added min-h for better empty state visibility
          variants={cardVariants} initial="hidden" animate="visible"
        >
          <FontAwesomeIcon icon={faCircleCheck} className="text-4xl text-emerald-500 dark:text-emerald-400 mb-4" />
          <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">No Debts to Display!</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">Looks like you're debt-free or haven't added any debts yet.</p>
        </div>
      </Widget>
    );
  }
  
  // Ensure data is an array before sorting and reducing
  const validData = Array.isArray(data) ? data : [];

  const sortedDebts = [...validData].sort((a, b) => {
    if (strategy === 'snowball') {
      return (a.currentBalance || 0) - (b.currentBalance || 0); // Smallest balance first, handle undefined
    }
    // Default to avalanche (highest interest rate first)
    return (b.interestRate || 0) - (a.interestRate || 0); // Handle undefined
  });
  
  const totalOriginalBalance = validData.reduce((sum, debt) => sum + (debt.originalBalance || 0), 0);
  const totalCurrentBalance = validData.reduce((sum, debt) => sum + (debt.currentBalance || 0), 0);
  const totalPaid = totalOriginalBalance - totalCurrentBalance;
  const overallProgressPercentage = totalOriginalBalance > 0 ? Math.max(0, Math.min(100, (totalPaid / totalOriginalBalance) * 100)) : 0;

  const strategyIcon = strategy === 'snowball' ? faSnowflake : faFire;
  const strategyName = strategy === 'snowball' ? 'Snowball' : 'Avalanche';
  const strategyColor = strategy === 'snowball' ? 'text-sky-500 dark:text-sky-400' : 'text-orange-500 dark:text-orange-400';
  const strategyBg = strategy === 'snowball' ? 'bg-sky-100 dark:bg-sky-900/50' : 'bg-orange-100 dark:bg-orange-900/50';

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
        className="p-4 md:p-5 flex flex-col space-y-5"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Overall Summary Card */}
        <div 
          variants={itemVariants}
          className="p-5 rounded-xl bg-slate-100/80 dark:bg-slate-800/70 backdrop-blur-lg shadow-xl border border-slate-200 dark:border-slate-700/80" // Enhanced glassmorphism
        >
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title || 'Debt Overview'}</h3>
            <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${strategyBg} ${strategyColor}`}>
              <FontAwesomeIcon icon={strategyIcon} className={`mr-1.5 w-3 h-3 ${strategyColor}`} />
              {strategyName} Strategy
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mb-4 items-end"> {/* Adjusted gap */}
            <div className="flex items-center space-x-3">
              <FontAwesomeIcon icon={faCoins} className="w-7 h-7 text-primary dark:text-primary-400" /> {/* Adjusted color */}
              <div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Total Current Debt</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  ${totalCurrentBalance.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3 sm:justify-end">
              <FontAwesomeIcon icon={faChartPie} className="w-7 h-7 text-emerald-500 dark:text-emerald-400" />
              <div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Overall Progress</div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {overallProgressPercentage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3.5">
            <div 
              className="bg-gradient-to-r from-emerald-400 to-green-500 dark:from-emerald-500 dark:to-green-600 h-3.5 rounded-full" // Removed transition-all, Framer handles it
              initial={{ width: '0%' }}
              animate={{ width: `${overallProgressPercentage}%` }}
              transition={{ duration: 1, ease: "circOut" }}
            ></div>
          </div>
        </div>

        {/* Individual Debt Cards */}
        <div className="space-y-3.5">
          {sortedDebts.map((debt: IDebtItem, index: number) => { // Added types for debt and index
            const individualProgress = debt.originalBalance > 0 ? Math.max(0, Math.min(100, ((debt.originalBalance - debt.currentBalance) / debt.originalBalance) * 100)) : 0;
            const isFocusDebt = index === 0;

            return (
              <div 
                key={debt.id || `debt-${index}`} // Ensure unique key
                variants={itemVariants}
                className={`p-4 rounded-xl border shadow-md hover:shadow-lg transition-shadow duration-300 ${isFocusDebt ? 'border-primary-500/70 dark:border-primary-400/80 bg-primary-50/60 dark:bg-primary-900/40 backdrop-blur-md' : 'bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border-slate-200 dark:border-slate-700/60'}`} // Enhanced glassmorphism
              >
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faFileInvoiceDollar} className={`w-5 h-5 mr-2.5 ${isFocusDebt ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className={`text-md font-semibold ${isFocusDebt ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-200'}`}>
                      {debt.name}
                    </span>
                  </div>
                  {isFocusDebt && (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${strategyBg} ${strategyColor}`}>
                      <FontAwesomeIcon icon={strategyIcon} className={`mr-1 w-2.5 h-2.5 ${strategyColor}`} />
                      Focus Target
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-400 mb-2.5 pl-7"> {/* pl-7 to align with icon */}
                  <div>Current: <span className="font-semibold text-slate-700 dark:text-slate-200">${debt.currentBalance.toLocaleString()}</span></div>
                  <div>APR: <span className="font-semibold text-slate-700 dark:text-slate-200">{debt.interestRate}%</span></div>
                  <div className="md:text-right">Payoff: <span className="font-semibold text-slate-700 dark:text-slate-200">{debt.payoffDate || 'N/A'}</span></div>
                </div>
                
                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2.5 relative"> {/* Added relative and pl-7 for alignment */}
                  <div className="absolute left-0 top-0 bottom-0 flex items-center"> {/* This div is for potential icon if needed next to bar */}
                    {/* Icon could go here if desired */}
                  </div>
                  <div 
                    className={`h-full rounded-full ${isFocusDebt ? 'bg-gradient-to-r from-primary-400 to-primary-600' : 'bg-gradient-to-r from-slate-400 to-slate-600'}`} // Gradient progress bar
                    initial={{ width: '0%' }}
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
export function RetirementReadinessWidget({ widget }: { widget: IRetirementReadinessWidget }) {
  const { data: retirementData, title } = widget;
  const [selectedScenarioId, setSelectedScenarioId] = useState(retirementData.currentScenarioId);

  // Calculate retirement projections from raw quiz answers if available
  const calculatedProjections = useMemo(() => {
    if (retirementData.quizAnswers) {
      const result = calculateFinancialHealthScore(retirementData.quizAnswers);
      return {
        projectedRetirementFund: result.projectedRetirementFund,
        monthlyRetirementIncome: result.monthlyRetirementIncome,
        // Calculate retirement progress percentage (against typical retirement goal of $1.5M)
        progressPercentage: Math.min(100, Math.round((result.projectedRetirementFund || 0) / 1500000 * 100))
      };
    }
    return null;
  }, [retirementData.quizAnswers]);

  const currentScenario = useMemo(() => {
    const scenario = retirementData.scenarios.find(s => s.id === selectedScenarioId);
    
    // If we have calculated projections, use those values instead of hardcoded ones
    if (calculatedProjections && scenario) {
      return {
        ...scenario,
        projectedRetirementFund: calculatedProjections.projectedRetirementFund || scenario.projectedRetirementFund,
        monthlyRetirementIncome: calculatedProjections.monthlyRetirementIncome || scenario.monthlyRetirementIncome,
        progressPercentage: calculatedProjections.progressPercentage || scenario.progressPercentage
      };
    }
    
    return scenario;
  }, [retirementData.scenarios, selectedScenarioId, calculatedProjections]);

  const getStatusColor = (status?: string) => {
    if (!status) return 'text-gray-500';
    switch (status) {
      case 'Ahead': return 'text-green-500 dark:text-green-400';
      case 'On Track': return 'text-blue-500 dark:text-blue-400';
      case 'Behind': return 'text-yellow-500 dark:text-yellow-400';
      case 'Needs Significant Work': return 'text-red-500 dark:text-red-400';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  if (!retirementData || !retirementData.scenarios || retirementData.scenarios.length === 0) {
    return <Widget widget={widget} controls={widget.controls}><div className="p-4 text-sm text-slate-500 dark:text-slate-400">No retirement scenarios available.</div></Widget>;
  }

  if (!currentScenario) {
    return <Widget widget={widget} controls={widget.controls}><div className="p-4 text-sm text-red-500 dark:text-red-400">Selected retirement scenario not found.</div></Widget>;
  }

  return (
    <Widget widget={widget} controls={widget.controls}>
      <div className="flex flex-col p-1">
        {retirementData.scenarios.length > 1 && (
          <div className="mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
            <label htmlFor={`${widget.id}-scenario-select`} className="sr-only">Select Scenario</label>
            <select 
              id={`${widget.id}-scenario-select`}
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              className="w-full p-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:text-slate-200"
            >
              {retirementData.scenarios.map(scenario => (
                <option key={scenario.id} value={scenario.id}>{scenario.scenarioName}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center mb-3">
          <div className="relative w-16 h-16 mr-4 shrink-0">
            <svg className="w-full h-full" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${currentScenario.score}, 100`}
                className={`transform -rotate-90 origin-center transition-all duration-1000 ease-out ${getStatusColor(currentScenario.status)}`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{currentScenario.score}</div>
            </div>
          </div>
          
          <div className="flex-grow">
            <div className={`text-base font-semibold ${getStatusColor(currentScenario.status)}`}>
              {currentScenario.status}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Projected: <strong>${currentScenario.projectionAmount?.toLocaleString()}</strong> by {currentScenario.projectionDate}
            </div>
          </div>
        </div>
        
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-1">
          <p>{currentScenario.explanation}</p>
          {currentScenario.assumptions && <p><em>Assumptions: {currentScenario.assumptions}</em></p>}
        </div>
      </div>
    </Widget>
  );
}

// Enhanced Savings Goals Widget
export function EnhancedSavingsGoalsWidget({ widget }: { widget: IEnhancedSavingsGoalsWidget }) {
  const { data } = widget;
  const { items, groupByCategory, showProgress } = data;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ahead': return 'text-green-500';
      case 'On Track': return 'text-blue-500';
      default: return 'text-yellow-500';
    }
  };
  
  // Group goals by category if groupByCategory is true
  const goalsByCategory = useMemo(() => {
    if (!groupByCategory) return null;
    
    const grouped: Record<string, typeof items> = {};
    items.forEach(goal => {
      const category = goal.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(goal);
    });
    return grouped;
  }, [items, groupByCategory]);
  
  const renderGoal = (goal: typeof items[0], index: number) => {
    const progress = (goal.savedAmount / goal.targetAmount) * 100;
    
    return (
      <div key={goal.id || index} className="border-b border-gray-100 dark:border-gray-700/30 pb-3 last:border-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {goal.name}
          </span>
          <span className={`text-xs font-medium ${getStatusColor(goal.status)}`}>
            {goal.status}
          </span>
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>${goal.savedAmount?.toLocaleString()} of ${goal?.targetAmount?.toLocaleString()}</span>
          <span>Est. completion: {goal.estimatedCompletionDate}</span>
        </div>
        
        {(showProgress !== false) && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                goal.status === 'Behind' ? 'bg-yellow-500' : 'bg-primary'
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
        {goalsByCategory ? (
          // Render grouped by category
          Object.entries(goalsByCategory).map(([category, goals]) => (
            <div key={category} className="mb-4">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{category}</h4>
              <div className="space-y-3">
                {goals.map((goal, index) => renderGoal(goal, index))}
              </div>
            </div>
          ))
        ) : (
          // Render flat list
          items.map((goal, index) => renderGoal(goal, index))
        )}
        
        {(!items || items.length === 0) && (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/5 dark:bg-slate-800/20">
            <FontAwesomeIcon icon={faPiggyBank} className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3" />
            <p className="font-medium text-slate-600 dark:text-slate-300">No savings goals found.</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Add your savings goals to see them here.</p>
          </div>
        )}
      </div>
    </Widget>
  );
}

// Insurance Coverage Widget
export function InsuranceCoverageWidget({ widget }: { widget: IInsuranceCoverageWidget }) {
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
              className="p-4 rounded-xl border border-white/20 dark:border-slate-700/50 bg-white/20 dark:bg-slate-800/40 shadow-lg backdrop-blur-md hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-grow">
                  <div className="flex justify-between items-center">
                    <h5 className="font-semibold text-slate-800 dark:text-slate-100 truncate" title={item.type || item.policyName}>{item.type || item.policyName}</h5>
                    <span 
                      className={`text-xs px-2.5 py-1 rounded-full capitalize font-medium 
                        ${(item.status?.toLowerCase() === 'active' || !item.status) ? 'bg-green-100 text-green-800 dark:bg-green-700/30 dark:text-green-300' : 
                         (item.status?.toLowerCase() === 'pending') ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700/30 dark:text-yellow-300' : 
                         'bg-slate-100 text-slate-800 dark:bg-slate-700/30 dark:text-slate-300'}`}
                    >
                      {item.status || item.policyType || 'Active'}
                    </span>
                  </div>
                  {item.provider && <p className="text-sm text-slate-500 dark:text-slate-400">{item.provider}</p>}
                </div>
              </div>
              
              <div className="mt-3">
                {/* Coverage information */}
                <div className="text-right">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Coverage</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {item.coverage ? item.coverage : 
                     (typeof item.coverageAmount === 'number' ? `$${item.coverageAmount.toLocaleString()}` : '$0')}
                  </p>
                </div>
                
                {/* Premium information - conditionally shown */}
                {showPremiums && item.premium && (
                  <div className="text-right mt-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Premium</p>
                    <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                      ${item.premium.toLocaleString()}/mo
                    </p>
                  </div>
                )}
                
                {/* Renewal date - conditionally shown */}
                {showRenewalDates && item.renewalDate && (
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex justify-end items-center">
                    <span className="mr-1">Renewal:</span>
                    <span className="font-medium">
                      {new Date(item.renewalDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div 
            variants={itemVariants} 
            className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/5 dark:bg-slate-800/20"
          >
            <FontAwesomeIcon icon={faShieldAlt} className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3" />
            <p className="font-medium text-slate-600 dark:text-slate-300">No insurance policies found.</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Add your policies to see them here.</p>
          </div>
        )}
      </div>
    </Widget>
  );
}
