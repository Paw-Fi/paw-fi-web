'use client';

import { useMemo } from 'react';
import { motion, Variants } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartPie,
  faShieldAlt,
  faPercentage,
  faScaleBalanced,
  faLightbulb,
} from '@fortawesome/free-solid-svg-icons';
import { QuizAnswers } from './quiz-calculations';
import { IFinancialHealthCalculationResult } from '@/components/profile/widgets/FinancialWidgets';

export interface AdvancedAnalyticsPanelProps {
  quizAnswers: QuizAnswers;
  calculationResult: IFinancialHealthCalculationResult;
  className?: string;
}

interface BudgetBreakdown {
  needs: { amount: number; percentage: number };
  wants: { amount: number; percentage: number };
  savings: { amount: number; percentage: number };
  total: number;
}

interface DebtBreakdown {
  creditCard: { balance: number; payment: number; rate: number };
  mortgage: { balance: number; payment: number; rate: number };
  studentLoan: { balance: number; payment: number; rate: number };
  autoLoan: { balance: number; payment: number; rate: number };
  otherDebt: { balance: number; payment: number; rate: number };
  totalDebt: number;
  totalPayment: number;
  dtiRatio: number;
}

export function AdvancedAnalyticsPanel({
  quizAnswers,
  calculationResult,
  className = '',
}: AdvancedAnalyticsPanelProps) {
  const budgetBreakdown = useMemo<BudgetBreakdown>(() => {
    const income = Number(quizAnswers['net_monthly_income']) || 0;
    const needsExpenses =
      (Number(quizAnswers['housing_cost']) || 0) +
      (Number(quizAnswers['food_expenses']) || 0) +
      (Number(quizAnswers['transportation_expenses']) || 0) +
      (Number(quizAnswers['healthcare_expenses']) || 0) +
      (Number(quizAnswers['insurance_expenses']) || 0);
    const wantsExpenses =
      (Number(quizAnswers['entertainment_expenses']) || 0) +
      (Number(quizAnswers['other_monthly_expenses']) || 0);
    const total = needsExpenses + wantsExpenses;
    const savingsAmount = income - total;

    return {
      needs: {
        amount: needsExpenses,
        percentage: income > 0 ? (needsExpenses / income) * 100 : 0,
      },
      wants: {
        amount: wantsExpenses,
        percentage: income > 0 ? (wantsExpenses / income) * 100 : 0,
      },
      savings: {
        amount: savingsAmount,
        percentage: income > 0 ? (savingsAmount / income) * 100 : 0,
      },
      total,
    };
  }, [quizAnswers]);

  const debtBreakdown = useMemo<DebtBreakdown>(() => {
    const grossIncome = Number(quizAnswers['gross_monthly_income']) || 0;

    const creditCardBalance = Number(quizAnswers['credit_card_debt']) || 0;
    const creditCardRate = Number(quizAnswers['credit_card_interest_rate']) || 0;
    const creditCardPayment =
      creditCardBalance > 0
        ? creditCardBalance * (creditCardRate / 12 / 100) + creditCardBalance * 0.01
        : 0;

    const mortgageBalance = Number(quizAnswers['mortgage_balance']) || 0;
    const mortgageRate = Number(quizAnswers['mortgage_interest_rate']) || 0;
    const mortgagePayment =
      mortgageBalance > 0 && mortgageRate > 0
        ? mortgageBalance *
          ((mortgageRate / 12 / 100) * Math.pow(1 + mortgageRate / 12 / 100, 360)) /
          (Math.pow(1 + mortgageRate / 12 / 100, 360) - 1)
        : 0;

    const studentLoanBalance = Number(quizAnswers['student_loan_balance']) || 0;
    const studentLoanRate = Number(quizAnswers['student_loan_interest_rate']) || 0;
    const studentLoanPayment =
      studentLoanBalance > 0 && studentLoanRate > 0
        ? studentLoanBalance *
          ((studentLoanRate / 12 / 100) * Math.pow(1 + studentLoanRate / 12 / 100, 120)) /
          (Math.pow(1 + studentLoanRate / 12 / 100, 120) - 1)
        : 0;

    const autoLoanBalance = Number(quizAnswers['auto_loan_balance']) || 0;
    const autoLoanRate = Number(quizAnswers['auto_loan_interest_rate']) || 0;
    const autoLoanPayment =
      autoLoanBalance > 0 && autoLoanRate > 0
        ? autoLoanBalance *
          ((autoLoanRate / 12 / 100) * Math.pow(1 + autoLoanRate / 12 / 100, 60)) /
          (Math.pow(1 + autoLoanRate / 12 / 100, 60) - 1)
        : 0;

    const otherDebtBalance = Number(quizAnswers['other_debt']) || 0;
    const otherDebtPayment = otherDebtBalance * 0.02;

    const totalDebt =
      creditCardBalance +
      mortgageBalance +
      studentLoanBalance +
      autoLoanBalance +
      otherDebtBalance;
    const totalPayment =
      creditCardPayment +
      mortgagePayment +
      studentLoanPayment +
      autoLoanPayment +
      otherDebtPayment;
    const dtiRatio = grossIncome > 0 ? (totalPayment / grossIncome) * 100 : 0;

    return {
      creditCard: { balance: creditCardBalance, payment: creditCardPayment, rate: creditCardRate },
      mortgage: { balance: mortgageBalance, payment: mortgagePayment, rate: mortgageRate },
      studentLoan: {
        balance: studentLoanBalance,
        payment: studentLoanPayment,
        rate: studentLoanRate,
      },
      autoLoan: { balance: autoLoanBalance, payment: autoLoanPayment, rate: autoLoanRate },
      otherDebt: { balance: otherDebtBalance, payment: otherDebtPayment, rate: 0 },
      totalDebt,
      totalPayment,
      dtiRatio,
    };
  }, [quizAnswers]);

  const emergencyDetails = useMemo(() => {
    const emergencyFund = Number(quizAnswers['emergency_fund']) || 0;
    const totalExpenses = budgetBreakdown.total;
    const monthsCoverage = totalExpenses > 0 ? emergencyFund / totalExpenses : 0;
    const targetMonths = 6;
    const targetAmount = totalExpenses * targetMonths;
    const gap = Math.max(0, targetAmount - emergencyFund);

    return {
      current: emergencyFund,
      monthsCoverage,
      target: targetAmount,
      gap,
      percentToTarget: targetAmount > 0 ? (emergencyFund / targetAmount) * 100 : 0,
    };
  }, [quizAnswers, budgetBreakdown.total]);

  const savingsDetails = useMemo(() => {
    const income = Number(quizAnswers['net_monthly_income']) || 0;
    const savingsAmount = budgetBreakdown.savings.amount;
    const savingsRate = budgetBreakdown.savings.percentage;
    const targetRate = 20; // 20% is recommended
    const gap = income > 0 ? (targetRate / 100) * income - savingsAmount : 0;

    return {
      currentRate: savingsRate,
      currentAmount: savingsAmount,
      targetRate,
      gap: Math.max(0, gap),
      percentToTarget: targetRate > 0 ? (savingsRate / targetRate) * 100 : 0,
    };
  }, [quizAnswers, budgetBreakdown]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Excellent':
        return 'bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400';
      case 'Good':
        return 'bg-sky-50/50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400';
      case 'Fair':
        return 'bg-amber-50/50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400';
      case 'Needs Attention':
        return 'bg-orange-50/50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400';
      default:
        return 'bg-subtle-background/50 text-muted-foreground-color';
    }
  };

  const recommendations = useMemo(() => {
    const recs: string[] = [];

    if (emergencyDetails.monthsCoverage < 6) {
      recs.push(
        `Build your emergency fund to ${emergencyDetails.target.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
        })} (6 months of expenses). You need ${emergencyDetails.gap.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
        })} more.`
      );
    }

    if (debtBreakdown.dtiRatio > 36) {
      recs.push(
        `Your debt-to-income ratio is ${debtBreakdown.dtiRatio.toFixed(
          1
        )}%. Aim to reduce it below 36% by paying down high-interest debt first.`
      );
    }

    if (savingsDetails.currentRate < 20) {
      recs.push(
        `Increase your savings rate to at least 20% of income. You need to save ${savingsDetails.gap.toLocaleString(
          'en-US',
          { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }
        )} more per month.`
      );
    }

    if (budgetBreakdown.needs.percentage > 50) {
      recs.push(
        `Your needs spending is ${budgetBreakdown.needs.percentage.toFixed(
          1
        )}% of income. Try to reduce fixed expenses below 50% to improve financial flexibility.`
      );
    }

    if (recs.length === 0) {
      recs.push(
        'Great job! Your financial metrics are strong. Continue maintaining your current habits.'
      );
    }

    return recs;
  }, [emergencyDetails, debtBreakdown, savingsDetails, budgetBreakdown]);

  return (
    <motion.div
      className={`bg-subtle-background/50 rounded-2xl p-6 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <FontAwesomeIcon icon={faChartPie} className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-foreground">Advanced Analytics</h3>
          <p className="text-sm text-muted-foreground-color">
            Detailed breakdown of your financial metrics
          </p>
        </div>
      </div>

      <Accordion type="single" collapsible className="space-y-4">
        <motion.div variants={itemVariants}>
          <AccordionItem
            value="budget"
            className="bg-moneko-background rounded-2xl border-0 overflow-hidden"
          >
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-subtle-background/50 transition-all duration-200">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faChartPie} className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">Budget Breakdown</span>
                <Badge className={getStatusColor(calculationResult.budget.status)}>
                  {calculationResult.budget.status}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="p-4 bg-emerald-50/30 dark:bg-emerald-950/20 border-0">
                    <div className="text-sm text-muted-foreground-color mb-1">Needs</div>
                    <div className="text-2xl font-light text-foreground">
                      {budgetBreakdown.needs.percentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground-color">
                      {budgetBreakdown.needs.amount.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                      })}
                      /mo
                    </div>
                  </Card>
                  <Card className="p-4 bg-sky-50/30 dark:bg-sky-950/20 border-0">
                    <div className="text-sm text-muted-foreground-color mb-1">Wants</div>
                    <div className="text-2xl font-light text-foreground">
                      {budgetBreakdown.wants.percentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground-color">
                      {budgetBreakdown.wants.amount.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                      })}
                      /mo
                    </div>
                  </Card>
                  <Card className="p-4 bg-purple-50/30 dark:bg-purple-950/20 border-0">
                    <div className="text-sm text-muted-foreground-color mb-1">Savings</div>
                    <div className="text-2xl font-light text-foreground">
                      {budgetBreakdown.savings.percentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground-color">
                      {budgetBreakdown.savings.amount.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                      })}
                      /mo
                    </div>
                  </Card>
                </div>
                <div className="text-sm text-muted-foreground-color">
                  <p className="mb-2">
                    <strong>Ideal ratio:</strong> 50% needs, 30% wants, 20% savings
                  </p>
                  <p>{calculationResult.budget.description}</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </motion.div>

        <motion.div variants={itemVariants}>
          <AccordionItem
            value="emergency"
            className="bg-moneko-background rounded-2xl border-0 overflow-hidden"
          >
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-subtle-background/50 transition-all duration-200">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faShieldAlt} className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">Emergency Fund Analysis</span>
                <Badge className={getStatusColor(calculationResult.emergencyFund.status)}>
                  {calculationResult.emergencyFund.status}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground-color mb-1">Current Fund</div>
                    <div className="text-2xl font-light text-foreground">
                      {emergencyDetails.current.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground-color">
                      {emergencyDetails.monthsCoverage.toFixed(1)} months coverage
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground-color mb-1">
                      Target (6 months)
                    </div>
                    <div className="text-2xl font-light text-foreground">
                      {emergencyDetails.target.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground-color">
                      Gap:{' '}
                      {emergencyDetails.gap.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                      })}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground-color">Progress to target</span>
                    <span className="text-foreground font-medium">
                      {emergencyDetails.percentToTarget.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-subtle-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, emergencyDetails.percentToTarget)}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground-color">
                  <p>{calculationResult.emergencyFund.description}</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </motion.div>

        {debtBreakdown.totalDebt > 0 && (
          <motion.div variants={itemVariants}>
            <AccordionItem
              value="debt"
              className="bg-moneko-background rounded-2xl border-0 overflow-hidden"
            >
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-subtle-background/50 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faScaleBalanced} className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">Debt Breakdown</span>
                  <Badge className={getStatusColor(calculationResult.debtToIncome.status)}>
                    {calculationResult.debtToIncome.status}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground-color mb-1">Total Debt</div>
                      <div className="text-2xl font-light text-foreground">
                        {debtBreakdown.totalDebt.toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 0,
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground-color mb-1">
                        Monthly Payments
                      </div>
                      <div className="text-2xl font-light text-foreground">
                        {debtBreakdown.totalPayment.toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 0,
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground-color">
                        DTI: {debtBreakdown.dtiRatio.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {debtBreakdown.creditCard.balance > 0 && (
                      <div className="flex justify-between items-center p-3 bg-subtle-background/50 rounded-xl">
                        <div>
                          <div className="text-sm font-medium text-foreground">Credit Cards</div>
                          <div className="text-xs text-muted-foreground-color">
                            {debtBreakdown.creditCard.rate.toFixed(1)}% APR
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-foreground">
                            {debtBreakdown.creditCard.balance.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 0,
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground-color">
                            {debtBreakdown.creditCard.payment.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 0,
                            })}
                            /mo
                          </div>
                        </div>
                      </div>
                    )}
                    {debtBreakdown.mortgage.balance > 0 && (
                      <div className="flex justify-between items-center p-3 bg-subtle-background/50 rounded-xl">
                        <div>
                          <div className="text-sm font-medium text-foreground">Mortgage</div>
                          <div className="text-xs text-muted-foreground-color">
                            {debtBreakdown.mortgage.rate.toFixed(2)}% APR
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-foreground">
                            {debtBreakdown.mortgage.balance.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 0,
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground-color">
                            {debtBreakdown.mortgage.payment.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 0,
                            })}
                            /mo
                          </div>
                        </div>
                      </div>
                    )}
                    {debtBreakdown.studentLoan.balance > 0 && (
                      <div className="flex justify-between items-center p-3 bg-subtle-background/50 rounded-xl">
                        <div>
                          <div className="text-sm font-medium text-foreground">Student Loans</div>
                          <div className="text-xs text-muted-foreground-color">
                            {debtBreakdown.studentLoan.rate.toFixed(2)}% APR
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-foreground">
                            {debtBreakdown.studentLoan.balance.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 0,
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground-color">
                            {debtBreakdown.studentLoan.payment.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 0,
                            })}
                            /mo
                          </div>
                        </div>
                      </div>
                    )}
                    {debtBreakdown.autoLoan.balance > 0 && (
                      <div className="flex justify-between items-center p-3 bg-subtle-background/50 rounded-xl">
                        <div>
                          <div className="text-sm font-medium text-foreground">Auto Loan</div>
                          <div className="text-xs text-muted-foreground-color">
                            {debtBreakdown.autoLoan.rate.toFixed(2)}% APR
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-foreground">
                            {debtBreakdown.autoLoan.balance.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 0,
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground-color">
                            {debtBreakdown.autoLoan.payment.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 0,
                            })}
                            /mo
                          </div>
                        </div>
                      </div>
                    )}
                    {debtBreakdown.otherDebt.balance > 0 && (
                      <div className="flex justify-between items-center p-3 bg-subtle-background/50 rounded-xl">
                        <div>
                          <div className="text-sm font-medium text-foreground">Other Debt</div>
                          <div className="text-xs text-muted-foreground-color">Various</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-foreground">
                            {debtBreakdown.otherDebt.balance.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 0,
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground-color">
                            {debtBreakdown.otherDebt.payment.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 0,
                            })}
                            /mo
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground-color">
                    <p>{calculationResult.debtToIncome.description}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </motion.div>
        )}

        <motion.div variants={itemVariants}>
          <AccordionItem
            value="savings"
            className="bg-moneko-background rounded-2xl border-0 overflow-hidden"
          >
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-subtle-background/50 transition-all duration-200">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faPercentage} className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">Savings Rate Analysis</span>
                <Badge className={getStatusColor(calculationResult.savingsRate.status)}>
                  {calculationResult.savingsRate.status}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground-color mb-1">
                      Current Savings Rate
                    </div>
                    <div className="text-2xl font-light text-foreground">
                      {savingsDetails.currentRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground-color">
                      {savingsDetails.currentAmount.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                      })}
                      /mo
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground-color mb-1">Target Rate</div>
                    <div className="text-2xl font-light text-foreground">
                      {savingsDetails.targetRate}%
                    </div>
                    <div className="text-xs text-muted-foreground-color">
                      Gap:{' '}
                      {savingsDetails.gap.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                      })}
                      /mo
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground-color">Progress to target</span>
                    <span className="text-foreground font-medium">
                      {savingsDetails.percentToTarget.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-subtle-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, savingsDetails.percentToTarget)}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground-color">
                  <p>{calculationResult.savingsRate.description}</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </motion.div>

        <motion.div variants={itemVariants}>
          <AccordionItem
            value="recommendations"
            className="bg-moneko-background rounded-2xl border-0 overflow-hidden"
          >
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-subtle-background/50 transition-all duration-200">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faLightbulb} className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">Personalized Recommendations</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-3">
                {recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex gap-3 p-4 bg-subtle-background/50 rounded-xl"
                  >
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {index + 1}
                    </div>
                    <p className="text-sm text-foreground flex-1">{rec}</p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </motion.div>
      </Accordion>
    </motion.div>
  );
}
