'use client';

import { useState, useMemo } from 'react';
import { motion, Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faChevronUp,
  faCircleInfo,
  faPiggyBank,
  faCreditCard,
  faChartLine,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  calculateFinancialHealthScore,
  type QuizAnswers,
  type IFinancialHealthCalculationResult,
} from '@/components/profile/widgets/FinancialWidgets';

interface FinancialScoreBreakdownProps {
  quizAnswers: QuizAnswers;
  className?: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      staggerChildren: 0.08,
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
      ease: [0.25, 0.46, 0.45, 0.94], // Apple-like easing
    },
  },
};

function getStatusColorClasses(status: string): {
  text: string;
  bg: string;
  border: string;
  ring: string;
} {
  const statusLower = status.toLowerCase();

  if (statusLower === 'excellent') {
    return {
      text: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800',
      ring: 'ring-emerald-500',
    };
  }

  if (statusLower === 'good') {
    return {
      text: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50/50 dark:bg-sky-950/30',
      border: 'border-sky-200 dark:border-sky-800',
      ring: 'ring-sky-500',
    };
  }

  if (statusLower === 'fair') {
    return {
      text: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50/50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
      ring: 'ring-amber-500',
    };
  }

  // Needs Attention
  return {
    text: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50/50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-800',
    ring: 'ring-orange-500',
  };
}

function ScoreComponentCard({
  icon,
  title,
  score,
  maxScore,
  status,
  description,
  formula,
}: {
  icon: any;
  title: string;
  score: number;
  maxScore: number;
  status: string;
  description: string;
  formula: string;
}) {
  const colors = getStatusColorClasses(status);
  const scorePercent = (score / maxScore) * 100;

  return (
    <motion.div
      variants={itemVariants}
      className={`rounded-2xl border p-6 ${colors.bg} ${colors.border} transition-all duration-200`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-full p-2 ${colors.bg}`}>
            <FontAwesomeIcon icon={icon} className={`h-5 w-5 ${colors.text}`} />
          </div>
          <div>
            <h4 className="font-medium text-foreground">{title}</h4>
            <p className="text-sm text-muted-foreground-color">{status}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-light ${colors.text}`}>{score.toFixed(0)}</p>
          <p className="text-sm text-muted-foreground-color">/ {maxScore}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-2 rounded-full bg-subtle-background overflow-hidden">
        <motion.div
          className={`h-full ${colors.bg.replace('/50', '').replace('/30', '')} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${scorePercent}%` }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>

      <p className="text-sm text-muted-foreground-color mb-2">{description}</p>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="flex items-center gap-1 text-xs text-muted-foreground-color hover:text-foreground transition-colors">
              <FontAwesomeIcon icon={faCircleInfo} className="h-3 w-3" />
              <span>How is this calculated?</span>
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">{formula}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </motion.div>
  );
}

export function FinancialScoreBreakdown({
  quizAnswers,
  className = '',
}: FinancialScoreBreakdownProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const calculationResult = useMemo<IFinancialHealthCalculationResult>(() => {
    return calculateFinancialHealthScore(quizAnswers);
  }, [quizAnswers]);

  const { overallScore, emergencyFund, savingsRate, debtToIncome, budget } = calculationResult;

  // Calculate individual component scores using the same logic as the widget
  const scoreMap = { 'Excellent': 25, 'Good': 18, 'Fair': 10, 'Needs Attention': 5 };
  const emergencyScore = scoreMap[emergencyFund.status];
  const debtScore = scoreMap[debtToIncome.status];
  const savingsScore = scoreMap[savingsRate.status];
  const budgetScore = budget.status === 'Balanced' ? 25 : 10;

  const overallStatusColors = getStatusColorClasses(overallScore.status);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - overallScore.value / 100);

  return (
    <motion.div
      className={`bg-moneko-background rounded-3xl p-8 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Overall Score Display */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-6 mb-8">
        {/* Circular Progress */}
        <div className="relative h-32 w-32 shrink-0">
          <svg className="h-full w-full transform -rotate-90" viewBox="0 0 140 140">
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              strokeWidth="10"
              className="text-subtle-background"
              stroke="currentColor"
            />
            <motion.circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              className={overallStatusColors.text}
              stroke="currentColor"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: [0.33, 1, 0.68, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-light ${overallStatusColors.text}`}>
              {Math.round(overallScore.value)}
            </span>
            <span className="text-sm font-medium text-muted-foreground-color">/ 100</span>
          </div>
        </div>

        {/* Score Description */}
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-2xl font-medium text-foreground mb-2">
            Financial Health Score
          </h2>
          <p className={`text-lg font-medium ${overallStatusColors.text} mb-2`}>
            {overallScore.status}
          </p>
          <p className="text-sm text-muted-foreground-color">
            {overallScore.description}
          </p>
        </div>
      </motion.div>

      {/* Simplified Formula */}
      <motion.div
        variants={itemVariants}
        className="bg-subtle-background/50 rounded-2xl p-6 mb-6"
      >
        <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
          <FontAwesomeIcon icon={faChartLine} className="h-4 w-4 text-primary" />
          How Your Score is Calculated
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-foreground">Your Score =</span>
          <Badge variant="outline" className="font-mono">Emergency Fund ({emergencyScore})</Badge>
          <span className="text-muted-foreground-color">+</span>
          <Badge variant="outline" className="font-mono">Debt Management ({debtScore})</Badge>
          <span className="text-muted-foreground-color">+</span>
          <Badge variant="outline" className="font-mono">Savings ({savingsScore})</Badge>
          <span className="text-muted-foreground-color">+</span>
          <Badge variant="outline" className="font-mono">Budget ({budgetScore})</Badge>
          <span className="text-muted-foreground-color">=</span>
          <Badge variant="outline" className={`font-mono ${overallStatusColors.text}`}>
            {Math.round(overallScore.value)}
          </Badge>
        </div>
      </motion.div>

      {/* Score Components Breakdown */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <ScoreComponentCard
          icon={faPiggyBank}
          title="Emergency Fund"
          score={emergencyScore}
          maxScore={25}
          status={emergencyFund.status}
          description={emergencyFund.description}
          formula={`Excellent (25pts): ≥6 months expenses | Good (18pts): 4-6 months | Fair (10pts): 3-4 months | Needs Attention (5pts): <3 months. You have ${emergencyFund.value.toFixed(1)} months of coverage.`}
        />
        <ScoreComponentCard
          icon={faCreditCard}
          title="Debt-to-Income Ratio"
          score={debtScore}
          maxScore={25}
          status={debtToIncome.status}
          description={debtToIncome.description}
          formula={`Excellent (25pts): ≤20% | Good (18pts): 21-36% | Fair (10pts): 37-43% | Needs Attention (5pts): >43%. Your DTI is ${debtToIncome.value.toFixed(1)}%.`}
        />
        <ScoreComponentCard
          icon={faChartLine}
          title="Savings Rate"
          score={savingsScore}
          maxScore={25}
          status={savingsRate.status}
          description={savingsRate.description}
          formula={`Excellent (25pts): ≥20% | Good (18pts): 15-19% | Fair (10pts): 10-14% | Needs Attention (5pts): <10%. You're saving ${savingsRate.value}% of your income.`}
        />
        <ScoreComponentCard
          icon={faWallet}
          title="Budget Balance"
          score={budgetScore}
          maxScore={25}
          status={budget.status === 'Balanced' ? 'Excellent' : 'Fair'}
          description={budget.description}
          formula={`Balanced (25pts): Savings ≥20% AND Needs ≤50% | Needs Review (10pts): Otherwise. Your split is ${budget.needs.percentage.toFixed(0)}% needs, ${budget.wants.percentage.toFixed(0)}% wants, ${budget.savings.percentage.toFixed(0)}% savings.`}
        />
      </motion.div>

      {/* Advanced Formula View */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="advanced" className="border-0">
          <AccordionTrigger className="hover:no-underline py-4 px-6 rounded-2xl bg-subtle-background/30 hover:bg-subtle-background/50 transition-all duration-200">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FontAwesomeIcon icon={faCircleInfo} className="h-4 w-4 text-primary" />
              <span>View Advanced Calculation Details</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 px-6">
            <div className="space-y-4 text-sm">
              <div className="bg-subtle-background/50 rounded-xl p-4">
                <h4 className="font-medium text-foreground mb-2">Detailed Calculation Steps</h4>
                <div className="space-y-2 font-mono text-xs text-muted-foreground-color">
                  <p><span className="text-foreground">Step 1:</span> Emergency Fund Coverage = {emergencyFund.value.toFixed(2)} months → Status: {emergencyFund.status} → Score: {emergencyScore} pts</p>
                  <p><span className="text-foreground">Step 2:</span> Debt-to-Income Ratio = {debtToIncome.value.toFixed(2)}% → Status: {debtToIncome.status} → Score: {debtScore} pts</p>
                  <p><span className="text-foreground">Step 3:</span> Savings Rate = {savingsRate.value}% → Status: {savingsRate.status} → Score: {savingsScore} pts</p>
                  <p><span className="text-foreground">Step 4:</span> Budget Balance = {budget.status} (Needs: {budget.needs.percentage.toFixed(1)}%, Wants: {budget.wants.percentage.toFixed(1)}%, Savings: {budget.savings.percentage.toFixed(1)}%) → Score: {budgetScore} pts</p>
                  <p className="pt-2 border-t border-subtle-border mt-2"><span className="text-foreground font-bold">Final Score:</span> {emergencyScore} + {debtScore} + {savingsScore} + {budgetScore} = {Math.round(overallScore.value)} / 100</p>
                </div>
              </div>

              <div className="bg-subtle-background/50 rounded-xl p-4">
                <h4 className="font-medium text-foreground mb-2">Scoring Thresholds</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-medium text-foreground mb-1">Overall Score:</p>
                    <ul className="space-y-1 text-muted-foreground-color">
                      <li>• Excellent: 90-100</li>
                      <li>• Good: 70-89</li>
                      <li>• Fair: 50-69</li>
                      <li>• Needs Attention: 0-49</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">Each Component:</p>
                    <ul className="space-y-1 text-muted-foreground-color">
                      <li>• Excellent: 25 points</li>
                      <li>• Good: 18 points</li>
                      <li>• Fair: 10 points</li>
                      <li>• Needs Attention: 5 points</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground-color italic">
                All calculations are performed in real-time using your financial data. The score updates automatically when you update your information.
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </motion.div>
  );
}
