import { Widget } from '../profile/types/dashboard-data.typings';
import { v4 as uuidv4 } from 'uuid';

// Define the calculations result interface
export interface CalculationResults {
  portfolioProjection: {
    futureValue: number;
    timePeriodsInYears: number;
    onTrack: boolean;
    progressPercentage: number;
    retirementAge: number;
  };
  financialHealthScore: {
    overallScore: number;
    savingsScore: number;
    emergencyFundScore: number;
    riskManagementScore: number;
    status: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention';
  };
  cashFlow: {
    monthlySavings: number;
    savingsRatePercent: number;
    income: number;
    expenses: number;
  };
  debtStatus: {
    debtFree: boolean;
    debtTypes: string[];
  };
  investingGuidance: string[];
  assetAllocation: {
    conservative: number;
    balanced: number;
    aggressive: number;
  };
  nextSteps: string[];
}

// Interface for quiz answers
export interface QuizAnswers {
  [key: string]: any;
}

/**
 * Calculate financial results based on quiz answers
 */
export function calculateResults(answers: QuizAnswers): CalculationResults {
  // Calculate portfolio projection
  const currentAge = answers['current-age'] || 30;
  const retirementAge = answers['retirement-age'] || 65;
  const annualContribution = answers['annual-contribution'] || 0;
  const currentAssets = answers['current-assets'] || 0;
  const targetRetirement = answers['target-retirement'] || 1000000;
  const returnRate = (answers['return-rate'] || 6) / 100; // Convert percentage to decimal

  const timePeriodsInYears = retirementAge - currentAge;

  // Calculate future value using formula: FV = PV × (1 + r)^N + PMT × [((1 + r)^N – 1) / r]
  const futureValue = currentAssets * Math.pow(1 + returnRate, timePeriodsInYears) +
                      annualContribution * ((Math.pow(1 + returnRate, timePeriodsInYears) - 1) / returnRate);

  // Calculate progress percentage
  const progressPercentage = Math.min(100, Math.round((futureValue / targetRetirement) * 100));
  const onTrack = futureValue >= targetRetirement;

  // Calculate financial health score
  // 1. Savings Score (40%)
  const savingsRate = answers['savings-rate'] || 0;
  let savingsScore = 0;
  if (savingsRate >= 20) {
    savingsScore = 100;
  } else if (savingsRate >= 10) {
    savingsScore = 70;
  } else {
    savingsScore = 50;
  }

  // 2. Emergency Fund Score (30%)
  const emergencyFund = answers['emergency-fund'] || 'none';
  let emergencyFundScore = 0;
  if (emergencyFund === 'more-than-6' || emergencyFund === '3-6') {
    emergencyFundScore = 100;
  } else {
    emergencyFundScore = 60;
  }

  // 3. Risk Management Score (30%)
  const insuranceCoverage = answers['insurance-coverage'] || [];
  const debtTypes = answers['debt-types'] || [];
  const hasHighRiskDebt = debtTypes.includes('credit-card') || debtTypes.includes('personal-loan');
  const hasAdequateInsurance =
    (Array.isArray(insuranceCoverage) && insuranceCoverage.length > 2) ||
    (typeof insuranceCoverage === 'string' && insuranceCoverage !== 'none');

  let riskManagementScore = 0;
  if (hasAdequateInsurance && !hasHighRiskDebt) {
    riskManagementScore = 100;
  } else {
    riskManagementScore = 50;
  }

  // Calculate overall score with weights
  const overallScore = Math.round((savingsScore * 0.4) + (emergencyFundScore * 0.3) + (riskManagementScore * 0.3));

  // Determine status based on overall score
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

  // Calculate cash flow
  const monthlyIncome = answers['monthly-income'] || 0;
  const monthlyExpenses = answers['monthly-expenses'] || 0;
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRatePercent = monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : 0;

  // Determine debt status
  const debtFree = debtTypes.length === 1 && debtTypes[0] === 'none';

  // Determine investing guidance based on risk profile and time horizon
  const riskProfile = answers['risk-profile'] || 'moderate';
  const timeHorizon = answers['time-horizon'] || 'medium';
  const investingGuidance: string[] = [];

  if (riskProfile === 'conservative' || timeHorizon === 'short') {
    investingGuidance.push('Diversification across asset classes');
    investingGuidance.push('Bond laddering for stable income');
    investingGuidance.push('Focus on capital preservation');
  } else if (riskProfile === 'aggressive' || timeHorizon === 'long') {
    investingGuidance.push('Dollar-cost averaging for long-term growth');
    investingGuidance.push('Regular portfolio rebalancing');
    investingGuidance.push('Strategic tax-loss harvesting');
  } else {
    investingGuidance.push('Balanced asset allocation');
    investingGuidance.push('Consistent contribution schedule');
    investingGuidance.push('Periodic portfolio review');
  }

  // Asset allocation recommendations
  let assetAllocation = {
    conservative: 0,
    balanced: 0,
    aggressive: 0
  };

  if (riskProfile === 'conservative') {
    assetAllocation = { conservative: 80, balanced: 50, aggressive: 20 };
  } else if (riskProfile === 'aggressive') {
    assetAllocation = { conservative: 20, balanced: 50, aggressive: 80 };
  } else {
    assetAllocation = { conservative: 40, balanced: 50, aggressive: 60 };
  }

  // Next steps recommendations
  const nextSteps = determineNextSteps(answers, {
    savingsScore,
    emergencyFundScore,
    riskManagementScore,
    debtFree,
    progressPercentage
  });

  return {
    portfolioProjection: {
      futureValue,
      timePeriodsInYears,
      onTrack,
      progressPercentage,
      retirementAge
    },
    financialHealthScore: {
      overallScore,
      savingsScore,
      emergencyFundScore,
      riskManagementScore,
      status
    },
    cashFlow: {
      monthlySavings,
      savingsRatePercent,
      income: monthlyIncome,
      expenses: monthlyExpenses
    },
    debtStatus: {
      debtFree,
      debtTypes: debtTypes === 'none' ? [] : (Array.isArray(debtTypes) ? debtTypes : [debtTypes])
    },
    investingGuidance,
    assetAllocation,
    nextSteps
  };
}

/**
 * Determine next action steps based on assessment results
 */
function determineNextSteps(answers: QuizAnswers, scores: any): string[] {
  const nextSteps: string[] = [];

  if (scores.emergencyFundScore < 100) {
    nextSteps.push('Build an emergency fund covering 3-6 months of expenses');
  }
  if (!scores.debtFree) {
    nextSteps.push('Create a debt repayment strategy focusing on high-interest debt first');
  }
  if (scores.savingsScore < 70) {
    nextSteps.push('Increase monthly savings rate to at least 15% of income');
  }
  if (scores.progressPercentage < 70) {
    nextSteps.push('Increase retirement contributions to stay on track with goals');
  }
  nextSteps.push('Review your asset allocation annually');
  nextSteps.push('Ensure adequate insurance coverage for your needs');

  return nextSteps.slice(0, 4);
}

/**
 * Generate dashboard widgets based on calculation results
 */
export function generateDashboardWidgets(results: CalculationResults): Widget[] {
  const widgets: Widget[] = [];

  // 1. Financial Health Scorecard Widget
  widgets.push({
    id: uuidv4(),
    type: 'financialHealthScorecard',
    title: 'Your Financial Health Score',
    icon: 'fas fa-heartbeat',
    column_span: 2,
    row_span: 2,
    data: {
      items: [
        { id: uuidv4(), category: 'Savings', score: results.financialHealthScore.savingsScore, status: getScoreStatus(results.financialHealthScore.savingsScore), explanation: 'Based on your monthly savings rate.', weight: 0.4, displayOrder: 1 },
        { id: uuidv4(), category: 'Emergency Fund', score: results.financialHealthScore.emergencyFundScore, status: getScoreStatus(results.financialHealthScore.emergencyFundScore), explanation: 'Based on months of expenses covered.', weight: 0.3, displayOrder: 2 },
        { id: uuidv4(), category: 'Risk Management', score: results.financialHealthScore.riskManagementScore, status: getScoreStatus(results.financialHealthScore.riskManagementScore), explanation: 'Based on insurance and debt.', weight: 0.3, displayOrder: 3 }
      ],
      overallScore: results.financialHealthScore.overallScore,
      overallStatus: results.financialHealthScore.status,
      showIndividualScores: true
    },
  });

  // 2. Retirement Readiness Widget
  widgets.push({
    id: uuidv4(),
    type: 'retirementReadiness',
    title: 'Retirement Outlook',
    icon: 'fas fa-umbrella-beach',
    column_span: 1,
    data: {
      scenarios: [
        {
          id: 'current-path',
          scenarioName: 'Current Path',
          score: results.portfolioProjection.onTrack ? 80 : 60,
          status: results.portfolioProjection.onTrack ? 'On Track' : 'Needs Adjustment',
          projectionAmount: Math.round(results.portfolioProjection.futureValue),
          projectionDate: `At Age ${results.portfolioProjection.retirementAge}`,
          explanation: `Based on your current strategy over ${results.portfolioProjection.timePeriodsInYears} years.`,
          assumptions: 'Based on your provided savings and expected returns.',
          displayOrder: 1
        }
      ],
      currentScenarioId: 'current-path'
    },
  });

  // 3. Progress Bar for Retirement Goal
  widgets.push({
    id: uuidv4(),
    type: 'progressBarList',
    title: 'Retirement Goal Progress',
    icon: 'fas fa-bullseye',
    column_span: 1,
    data: {
      items: [
        {
          id: uuidv4(),
          label: 'Retirement Goal',
          current: results.portfolioProjection.progressPercentage,
          max: 100,
          color: getProgressColor(results.portfolioProjection.progressPercentage),
          displayOrder: 1
        }
      ],
      showPercentages: true
    }
  });

  // 4. Cash Flow Summary Widget
  widgets.push({
    id: uuidv4(),
    type: 'quickCashFlowSummary',
    title: 'Monthly Cash Flow',
    icon: 'fas fa-exchange-alt',
    column_span: 2,
    data: {
      inflows: [{ id: uuidv4(), title: 'Total Income', value: results.cashFlow.income, category: 'Income', frequency: 'monthly', displayOrder: 1 }],
      outflows: [{ id: uuidv4(), title: 'Total Expenses', value: results.cashFlow.expenses, category: 'Expenses', frequency: 'monthly', displayOrder: 1 }],
      projectedPeriod: 'Monthly'
    }
  });

  // 5. Next Best Action Widget
  widgets.push({
    id: uuidv4(),
    type: 'nextBestAction',
    title: 'Recommended Actions',
    icon: 'fas fa-clipboard-check',
    column_span: 1,
    row_span: 2,
    data: results.nextSteps.map((step, index) => ({
      id: uuidv4(),
      title: `Priority ${index + 1}`,
      message: step,
      priority: index === 0 ? 'high' : (index === 1 ? 'medium' : 'low'),
      category: 'Financial Improvement',
      displayOrder: index + 1
    }))
  });

  // 6. Tips Card Widget
  widgets.push({
    id: uuidv4(),
    type: 'tipCard',
    title: 'Smart Investment Tips',
    icon: 'fas fa-lightbulb',
    column_span: 1,
    data: {
      tips: results.investingGuidance.map((tip, index) => ({
        id: uuidv4(),
        title: `Investment Strategy ${index + 1}`,
        content: tip,
        displayOrder: index + 1
      })),
      currentTipIndex: 0,
      autoRotate: true
    }
  });

  // 7. Metric Card for Savings Rate
  widgets.push({
    id: uuidv4(),
    type: 'metricCard',
    title: 'Key Financial Metrics',
    icon: 'fas fa-chart-pie',
    column_span: 1,
    data: {
      metrics: [
        {
          id: uuidv4(),
          value: `${results.cashFlow.savingsRatePercent}%`,
          currency: '',
          trend: results.cashFlow.savingsRatePercent >= 15 ? 'up' : (results.cashFlow.savingsRatePercent >= 10 ? 'neutral' : 'down'),
          description: 'Monthly Savings Rate',
          progress: results.cashFlow.savingsRatePercent / 20, // Assumes 20% is the goal
          goalLabel: '20% Target',
          displayOrder: 1
        },
        {
          id: uuidv4(),
          value: results.cashFlow.monthlySavings.toFixed(2),
          currency: '$',
          description: 'Monthly Savings Amount',
          displayOrder: 2
        }
      ]
    }
  });

  // 8. Debt Status Widget (if applicable)
  if (!results.debtStatus.debtFree) {
    widgets.push({
      id: uuidv4(),
      type: 'tipCard',
      title: 'Debt Management',
      icon: 'fas fa-credit-card',
      column_span: 2,
      data: {
        tips: [
          { id: uuidv4(), title: 'Debt Payoff Strategy', content: 'Consider using the Avalanche method (highest interest first) or Snowball method (smallest balances first).', displayOrder: 1 },
          { id: uuidv4(), title: 'Consolidation Opportunity', content: 'You may benefit from consolidating high-interest debt into a lower-interest option if available.', displayOrder: 2 }
        ],
        currentTipIndex: 0,
        autoRotate: true
      }
    });
  }

  return widgets;
}

/**
 * Helper function to get status based on score
 */
function getScoreStatus(score: number): 'Excellent' | 'Good' | 'Fair' | 'Needs Attention' {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Needs Attention';
}

/**
 * Helper function to get color based on progress percentage
 */
function getProgressColor(percentage: number): string {
  if (percentage >= 80) return '#4CAF50'; // Green
  if (percentage >= 50) return '#FFC107'; // Yellow
  return '#F44336'; // Red
}