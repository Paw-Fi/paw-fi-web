import { Widget } from '../profile/types/dashboard-data.typings';
import { v4 as uuidv4 } from 'uuid';
import BasicLesson from "@data/basic-lessons.json"

// Lesson data interface for tip card links
export interface LessonLink {
  lessonId: string;
  title: string;
  description: string;
}

// Available lessons for linking in tip cards
export const availableLessons: LessonLink[] = [
  {
    lessonId: "invest-L1",
    title: "Investing Fundamentals",
    description: "Learn the fundamental differences between saving and investing, understand risk, and discover how financial markets work."
  },
  {
    lessonId: "behavfin-L2",
    title: "Behavioral Finance",
    description: "Explore common psychological biases like loss aversion, confirmation bias, and overconfidence, and learn how they can impact investment decisions."
  },
  {
    lessonId: "moneymarket-L3",
    title: "Money Markets",
    description: "Understand key short-term debt instruments like Treasury Bills, Repurchase Agreements, Commercial Paper, and Negotiable CDs, and their role in finance."
  },
  {
    lessonId: "bondmarket-L4",
    title: "Bond Markets",
    description: "Learn about bonds, how credit ratings work, the difference between various bond types, and key market pricing concepts."
  },
  {
    lessonId: "equitymarket-L5",
    title: "Equity Markets",
    description: "Learn about common and preferred equity (stocks), dividends, how companies go public (IPOs), order types, and stock market indexes."
  },
  {
    lessonId: "derivatives-L6",
    title: "Derivatives",
    description: "Explore financial derivatives like futures, forwards, options, and swaps, and understand how their value is derived from underlying assets."
  },
  {
    lessonId: "tvm-L7",
    title: "Time Value of Money",
    description: "Understand the core concepts of the time value of money, including interest rates, simple vs. compound interest, present and future value, annuities, and APR vs. EAR."
  },
  {
    lessonId: "stats-L8",
    title: "Statistics for Investing",
    description: "Grasp essential statistical concepts for investing, including mean, variance, correlation, normal distribution, and common data interpretation biases."
  },
  {
    lessonId: "econbasics-L9",
    title: "Economic Fundamentals",
    description: "Learn fundamental economic concepts like scarcity, opportunity cost, supply & demand, GDP, economic indicators, and inflation, and their relevance to investing."
  },
  {
    lessonId: "finstatements-L10",
    title: "Financial Statements",
    description: "Learn about the double-entry accounting system, the main financial statements (Income Statement, Balance Sheet, Cash Flow), the accounting equation, EPS, inventory, and operating cash flow."
  }
];

// Define the calculations result interface
export interface CalculationResults {
  portfolioProjection: {
    futureValue: number;
    timePeriodsInYears: number;
    onTrack: boolean;
    progressPercentage: number;
    retirementAge: number;
    targetAmount: number;
    currentSavings: number;
  };
  // Raw quiz answers are now passed directly to widgets for score calculation
  // financialHealthScore field removed as it's now calculated by the widget
  cashFlow: {
    monthlySavings: number;
    savingsRatePercent: number;
    income: number;
    expenses: number;
    emergencyFundMonths: number;
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
  // Portfolio allocation based on risk profile questions
  portfolioAllocation: {
    equityPercentage: number;
    bondPercentage: number;
    riskScore: number;
  };
  nextSteps: string[];
  // Store the original quiz answers for widget calculations
  quizAnswers: QuizAnswers;
}

// Interface for quiz answers
export interface QuizAnswers {
  [key: string]: any;
}

// Interface for debt detail
export interface DebtDetail {
  id: string;
  type: string;
  amount: number;
  interestRate: number;
}

// Risk profile with numerical scoring
export interface RiskProfile {
  score: number; // 0-100
  label: string;
  description: string;
  assetAllocation: {
    equityPercentage: number;
    bondPercentage: number;
  };
  expectedReturn: number; // Annual expected return percentage
}

// Risk profiles mapping
export const RISK_PROFILES: Record<string, RiskProfile> = {
  'conservative': {
    score: 20,
    label: 'Conservative',
    description: 'Focus: Capital Preservation',
    assetAllocation: { equityPercentage: 20, bondPercentage: 80 },
    expectedReturn: 3.5
  },
  'cautious': {
    score: 40,
    label: 'Cautious',
    description: 'Focus: Income & some growth',
    assetAllocation: { equityPercentage: 40, bondPercentage: 60 },
    expectedReturn: 4.5
  },
  'balanced': {
    score: 60,
    label: 'Balanced',
    description: 'Focus: A mix of growth and income',
    assetAllocation: { equityPercentage: 60, bondPercentage: 40 },
    expectedReturn: 5.5
  },
  'growth': {
    score: 80,
    label: 'Growth',
    description: 'Focus: Long-term growth',
    assetAllocation: { equityPercentage: 80, bondPercentage: 20 },
    expectedReturn: 6.5
  },
  'aggressive': {
    score: 100,
    label: 'Aggressive',
    description: 'Focus: Maximising long-term growth',
    assetAllocation: { equityPercentage: 90, bondPercentage: 10 },
    expectedReturn: 7.5
  }
};

/**
 * Map Quick Look answers to detailed quiz format for calculations
 */
export function mapQuickLookAnswers(answers: QuizAnswers): QuizAnswers {
  const mappedAnswers: QuizAnswers = { ...answers };
  
  // Map Quick Look fields to detailed quiz fields
  if (answers['estimated-monthly-income']) {
    mappedAnswers['net-monthly-income'] = answers['estimated-monthly-income'];
    mappedAnswers['gross-monthly-income'] = Number(answers['estimated-monthly-income']) * 1.25; // Estimate gross as 25% higher
  }
  
  if (answers['estimated-monthly-expenses']) {
    mappedAnswers['fixed-monthly-expenses'] = Number(answers['estimated-monthly-expenses']) * 0.6; // Estimate 60% fixed
    mappedAnswers['variable-monthly-expenses'] = Number(answers['estimated-monthly-expenses']) * 0.4; // Estimate 40% variable
  }
  
  if (answers['retirement-savings']) {
    mappedAnswers['pension-value'] = answers['retirement-savings'];
    mappedAnswers['cash-savings'] = Number(answers['retirement-savings']) * 0.2; // Estimate some cash savings
  }
  
  // Map debt situation to debt details
  if (answers['debt-situation']) {
    const debtSituation = answers['debt-situation'];
    if (debtSituation === 'debt-free') {
      mappedAnswers['debt-details'] = [];
    } else if (debtSituation === 'manageable') {
      mappedAnswers['debt-details'] = [{
        id: 'estimated-1',
        type: 'credit-card',
        amount: 5000,
        interestRate: 18
      }];
    } else if (debtSituation === 'high-debt') {
      mappedAnswers['debt-details'] = [{
        id: 'estimated-1',
        type: 'credit-card',
        amount: 15000,
        interestRate: 22
      }];
    } else if (debtSituation === 'overwhelming') {
      mappedAnswers['debt-details'] = [{
        id: 'estimated-1',
        type: 'credit-card',
        amount: 30000,
        interestRate: 25
      }];
    }
  }
  
  // Map risk comfort to detailed risk questions
  if (answers['risk-comfort']) {
    const riskComfort = answers['risk-comfort'];
    if (riskComfort === 'very-conservative') {
      mappedAnswers['market-downturn'] = 'sell';
      mappedAnswers['high-risk-preference'] = 'no';
      mappedAnswers['risky-investments'] = 'no';
      mappedAnswers['investment-knowledge'] = 'beginner';
    } else if (riskComfort === 'conservative') {
      mappedAnswers['market-downturn'] = 'worried';
      mappedAnswers['high-risk-preference'] = 'no';
      mappedAnswers['risky-investments'] = 'no';
      mappedAnswers['investment-knowledge'] = 'beginner';
    } else if (riskComfort === 'moderate') {
      mappedAnswers['market-downturn'] = 'wait';
      mappedAnswers['high-risk-preference'] = 'no';
      mappedAnswers['risky-investments'] = 'no';
      mappedAnswers['investment-knowledge'] = 'intermediate';
    } else if (riskComfort === 'aggressive') {
      mappedAnswers['market-downturn'] = 'buy-more';
      mappedAnswers['high-risk-preference'] = 'yes';
      mappedAnswers['risky-investments'] = 'yes';
      mappedAnswers['investment-knowledge'] = 'advanced';
    }
  }
  
  // Map investment timeline to time horizon
  if (answers['investment-timeline']) {
    const timeline = answers['investment-timeline'];
    if (timeline === 'soon') {
      mappedAnswers['time-horizon'] = 'short';
    } else if (timeline === 'medium') {
      mappedAnswers['time-horizon'] = 'medium';
    } else if (timeline === 'long') {
      mappedAnswers['time-horizon'] = 'long';
    }
  }
  
  // Set default values for missing fields
  mappedAnswers['predictable-income'] = 'yes'; // Default assumption
  mappedAnswers['liquidity-importance'] = 'somewhat-important'; // Default assumption
  mappedAnswers['number-of-dependents'] = 0; // Default assumption
  mappedAnswers['target-retirement'] = 1000000; // Default $1M target
  mappedAnswers['monthly-pension-contribution'] = Math.max(0, (Number(answers['estimated-monthly-income']) || 0) - (Number(answers['estimated-monthly-expenses']) || 0)) * 0.5; // Estimate half of savings goes to retirement
  mappedAnswers['other-investments'] = 0; // Default assumption
  
  return mappedAnswers;
}

/**
 * Calculate numerical risk score based on quiz answers (0-100)
 */
export function calculateRiskScore(answers: QuizAnswers): number {
  let score = 0;
  
  // Market downturn reaction (high impact on risk tolerance)
  if (answers['market-downturn'] === 'buy-more') score += 20;
  else if (answers['market-downturn'] === 'wait') score += 10;
  else if (answers['market-downturn'] === 'worried') score += 5;
  else if (answers['market-downturn'] === 'sell') score -= 10;
  
  // Investment knowledge (affects risk capacity)
  if (answers['investment-knowledge'] === 'expert') score += 15;
  else if (answers['investment-knowledge'] === 'advanced') score += 10;
  else if (answers['investment-knowledge'] === 'intermediate') score += 5;
  else if (answers['investment-knowledge'] === 'beginner') score += 0;
  
  // Time horizon (longer = more risk capacity)
  if (answers['time-horizon'] === 'long') score += 15;
  else if (answers['time-horizon'] === 'medium') score += 10;
  else if (answers['time-horizon'] === 'short') score += 0;
  
  // High risk preference (direct risk tolerance indicator)
  if (answers['high-risk-preference'] === 'yes') score += 15;
  else if (answers['high-risk-preference'] === 'no') score -= 5;
  
  // Risky investment experience (past behavior indicator)
  if (answers['risky-investments'] === 'yes') score += 10;
  else if (answers['risky-investments'] === 'no') score -= 5;
  
  // Predictable income (affects risk capacity)
  if (answers['predictable-income'] === 'yes') score += 10;
  else if (answers['predictable-income'] === 'no') score -= 5;
  
  // Liquidity importance (affects suitable investments)
  if (answers['liquidity-importance'] === 'not-important') score += 10;
  else if (answers['liquidity-importance'] === 'somewhat-important') score += 5;
  else if (answers['liquidity-importance'] === 'important') score += 0;
  else if (answers['liquidity-importance'] === 'very-important') score -= 5;
  
  // Age factor (younger = more risk capacity)
  const age = Number(answers['current-age']) || 30;
  if (age < 30) score += 10;
  else if (age < 40) score += 5;
  else if (age < 50) score += 0;
  else if (age < 60) score -= 5;
  else score -= 10;
  
  // Dependents (more dependents = less risk capacity)
  const dependents = Number(answers['number-of-dependents']) || 0;
  if (dependents === 0) score += 5;
  else if (dependents >= 3) score -= 10;
  else score -= 5;
  
  // Ensure score is within 0-100 range
  return Math.max(0, Math.min(100, score + 50)); // +50 to center around 50
}

/**
 * Get risk profile based on numerical score
 */
export function getRiskProfile(score: number): RiskProfile {
  if (score <= 20) return RISK_PROFILES['conservative'];
  if (score <= 40) return RISK_PROFILES['cautious'];
  if (score <= 60) return RISK_PROFILES['balanced'];
  if (score <= 80) return RISK_PROFILES['growth'];
  return RISK_PROFILES['aggressive'];
}

/**
 * Calculate financial results based on quiz answers
 */
export function calculateResults(answers: QuizAnswers): CalculationResults {
  // Calculate risk score and profile
  const riskScore = calculateRiskScore(answers);
  const riskProfile = getRiskProfile(riskScore);
  
  // Get financial data from new question structure (convert empty strings to 0)
  const currentAge = Number(answers['current-age']) || 30;
  const retirementAge = Number(answers['retirement-age']) || 65;
  const grossMonthlyIncome = Number(answers['gross-monthly-income']) || 0;
  const netMonthlyIncome = Number(answers['net-monthly-income']) || 0;
  const totalMonthlyExpenses = Number(answers['total-monthly-expenses']) || 0;
  const cashSavings = Number(answers['cash-savings']) || 0;
  const pensionValue = Number(answers['pension-value']) || 0;
  const otherInvestments = Number(answers['other-investments']) || 0;
  const monthlyPensionContribution = Number(answers['monthly-pension-contribution']) || 0;
  const targetRetirement = Number(answers['target-retirement']) || 1000000;
  const emergencyFund = Number(answers['emergency-fund']) || 0;
  const totalDebtAmount = Number(answers['total-debt-amount']) || 0;
  const averageDebtInterest = answers['average-debt-interest'] || 'none';
  
  // Convert average debt interest to numerical rate
  const getDebtInterestRate = (category: string): number => {
    switch (category) {
      case 'none': return 0;
      case 'low': return 5; // 5% average for low interest
      case 'medium': return 12; // 12% average for medium interest  
      case 'high': return 20; // 20% average for high interest
      default: return 0;
    }
  };
  
  const debtInterestRate = getDebtInterestRate(averageDebtInterest);
  
  // Create simplified debt details for compatibility
  const debtDetails: DebtDetail[] = totalDebtAmount > 0 ? [{
    id: 'simplified-debt',
    type: 'mixed',
    amount: totalDebtAmount,
    interestRate: debtInterestRate
  }] : [];
  
  // Calculate total current assets (investable assets)
  const currentAssets = cashSavings + pensionValue + otherInvestments;
  
  // Calculate cash flow
  const monthlySavings = netMonthlyIncome - totalMonthlyExpenses;
  const savingsRatePercent = netMonthlyIncome > 0 ? Math.round((monthlySavings / netMonthlyIncome) * 100) : 0;
  
  // Calculate annual contribution (from monthly savings + pension contributions)
  // Only count positive monthly savings towards retirement contributions
  const positiveMonthlyContribution = Math.max(0, monthlySavings) + monthlyPensionContribution;
  const annualContribution = positiveMonthlyContribution * 12;
  
  // Use system-assigned expected return based on risk profile
  const returnRate = riskProfile.expectedReturn / 100;
  
  const timePeriodsInYears = retirementAge - currentAge;
  
  // Calculate future value using formula: FV = PV × (1 + r)^N + PMT × [((1 + r)^N – 1) / r]
  let futureValue = 0;
  
  // Present value component (existing savings growth)
  const presentValueGrowth = currentAssets * Math.pow(1 + returnRate, timePeriodsInYears);
  
  // Annuity component (future value of annual contributions)
  let annuityValue = 0;
  if (returnRate > 0 && annualContribution > 0) {
    // Standard formula for future value of annuity
    annuityValue = annualContribution * ((Math.pow(1 + returnRate, timePeriodsInYears) - 1) / returnRate);
  } else if (returnRate === 0 && annualContribution > 0) {
    // If no return, just multiply contributions by years
    annuityValue = annualContribution * timePeriodsInYears;
  }
  
  futureValue = presentValueGrowth + annuityValue;
  
  
  // Ensure we don't have NaN or negative values
  if (isNaN(futureValue) || futureValue < 0) {
    futureValue = 0;
  }

  // Calculate progress percentage
  let progressPercentage = 0;
  if (targetRetirement && targetRetirement > 0) {
    progressPercentage = Math.min(100, Math.round((currentAssets / targetRetirement) * 100));
  }
  const onTrack = futureValue >= targetRetirement;

  // Process debt details
  const debtFree = debtDetails.length === 0;
  const debtTypes = debtDetails.map(debt => debt.type);

  // Determine investing guidance based on risk profile and time horizon
  const timeHorizon = answers['time-horizon'] || 'medium';
  const investingGuidance: string[] = [];

  if (riskProfile.label === 'Conservative' || timeHorizon === 'short') {
    investingGuidance.push('Diversification across asset classes');
    investingGuidance.push('Bond laddering for stable income');
    investingGuidance.push('Focus on capital preservation');
  } else if (riskProfile.label === 'Aggressive' || timeHorizon === 'long') {
    investingGuidance.push('Dollar-cost averaging for long-term growth');
    investingGuidance.push('Regular portfolio rebalancing');
    investingGuidance.push('Strategic tax-loss harvesting');
  } else {
    investingGuidance.push('Balanced asset allocation');
    investingGuidance.push('Consistent contribution schedule');
    investingGuidance.push('Periodic portfolio review');
  }

  // Asset allocation recommendations (legacy format for backwards compatibility)
  let assetAllocation = {
    conservative: 0,
    balanced: 0,
    aggressive: 0
  };

  if (riskProfile.label === 'Conservative') {
    assetAllocation = { conservative: 80, balanced: 50, aggressive: 20 };
  } else if (riskProfile.label === 'Aggressive') {
    assetAllocation = { conservative: 20, balanced: 50, aggressive: 80 };
  } else {
    assetAllocation = { conservative: 40, balanced: 50, aggressive: 60 };
  }

  // Next steps recommendations with improved logic
  const nextSteps = determineNextSteps(answers, {
    debtFree,
    progressPercentage,
    debtDetails,
    savingsRatePercent,
    emergencyFund: answers['emergency-fund'] || 0
  });

  return {
    portfolioProjection: {
      futureValue,
      timePeriodsInYears,
      onTrack,
      progressPercentage,
      retirementAge,
      targetAmount: targetRetirement || 0,
      currentSavings: currentAssets || 0
    },
    cashFlow: {
      monthlySavings,
      savingsRatePercent,
      income: netMonthlyIncome,
      expenses: totalMonthlyExpenses,
      emergencyFundMonths: totalMonthlyExpenses > 0 ? emergencyFund / totalMonthlyExpenses : 0,
    },
    debtStatus: {
      debtFree,
      debtTypes
    },
    investingGuidance,
    assetAllocation,
    portfolioAllocation: {
      equityPercentage: riskProfile.assetAllocation.equityPercentage,
      bondPercentage: riskProfile.assetAllocation.bondPercentage,
      riskScore: riskScore
    },
    nextSteps,
    quizAnswers: answers
  };
}

/**
 * Determine next action steps based on assessment results with hierarchical priority system
 * @param answers - Raw quiz answers
 * @param params - Parameters for determining next steps
 */
function determineNextSteps(answers: QuizAnswers, params: { 
  debtFree: boolean, 
  progressPercentage: number,
  debtDetails: DebtDetail[],
  savingsRatePercent: number,
  emergencyFund: number
}): string[] {
  const nextSteps: string[] = [];

  // PRIORITY 1: Emergency Fund (below 3 months)
  if (params.emergencyFund < 3) {
    nextSteps.push('Build an emergency fund covering 3 months of essential expenses');
  }

  // PRIORITY 2: High-Interest Debt (APR > 8%)
  const highInterestDebt = params.debtDetails.filter(debt => debt.interestRate > 8);
  if (highInterestDebt.length > 0) {
    const highestRate = Math.max(...highInterestDebt.map(debt => debt.interestRate));
    nextSteps.push(`Aggressively pay down your high-interest debt, starting with the ${highestRate.toFixed(1)}% APR debt`);
  }

  // PRIORITY 3: Pension/Employer Match (if applicable)
  const monthlyPensionContrib = Number(answers['monthly-pension-contribution']) || 0;
  const grossMonthlyIncome = Number(answers['gross-monthly-income']) || 0;
  const pensionRatePercent = grossMonthlyIncome > 0 ? (monthlyPensionContrib / grossMonthlyIncome) * 100 : 0;
  
  if (pensionRatePercent < 5) { // Assuming 5% is a reasonable minimum for employer match
    nextSteps.push('Ensure you are contributing enough to your pension to get the full employer match');
  }

  // PRIORITY 4: Savings Rate (if priorities 1-3 are met)
  if (params.emergencyFund >= 3 && highInterestDebt.length === 0) {
    if (params.savingsRatePercent < 15) {
      nextSteps.push('Increase monthly savings rate to at least 15% of income');
    }
  }

  // PRIORITY 5: Retirement Progress (if other priorities are met)
  if (params.progressPercentage < 70 && params.emergencyFund >= 3 && highInterestDebt.length === 0) {
    nextSteps.push('Increase retirement contributions to stay on track with goals');
  }

  // PRIORITY 6: General recommendations (always include some)
  if (nextSteps.length < 3) {
    nextSteps.push('Review your asset allocation annually');
  }
  if (nextSteps.length < 4) {
    nextSteps.push('Ensure adequate insurance coverage for your needs');
  }

  return nextSteps.slice(0, 4);
}

/**
 * Generate dashboard widgets based on calculation results
 */
export function generateDashboardWidgets(results: CalculationResults): Widget[] {
  const widgets: Widget[] = [];

  // 4. Progress Bar for Retirement Goal
  widgets.push({
    id: uuidv4(),
    type: 'progressBarList',
    title: 'Your Retirement Goal',
    icon: 'fas fa-bullseye',
    column_span: 2,
    row_span: 1,
    data: {
      items: [
        {
          id: uuidv4(),
          label: 'Retirement Goal',
          current: results.portfolioProjection.progressPercentage,
          max: 100,
          color: getProgressColor(results.portfolioProjection.progressPercentage),
          displayOrder: 1,
          explanationText: `You're ${results.portfolioProjection.onTrack ? 'on track' : 'working'} to meet your retirement goal based on your current savings, timeline, and expected portfolio growth.`
        }
      ],
      showPercentages: true
    }
  });
 

    // 2. Financial Health Scorecard Widget
    widgets.push({
      id: uuidv4(),
      type: 'financialHealthScorecard',
      title: 'Your Financial Health',
      icon: 'fas fa-heartbeat',
      column_span: 2,
      row_span: 4,
      data: {
        // We no longer pass precomputed scores - the widget will calculate them from quizAnswers
        quizAnswers: results.quizAnswers,
        showIndividualScores: true
      },
    });

 // 3. Retirement Readiness Widget
 widgets.push({
  id: uuidv4(),
  type: 'retirementReadiness',
  title: 'Will you reach your goal?',
  icon: 'fas fa-umbrella-beach',
  column_span: 2,
  row_span: 3,
  data: {
    // Pass the raw quiz answers for dynamic calculation in the widget
    quizAnswers: results.quizAnswers,
    scenarios: [
      {
        id: 'current-path',
        scenarioName: 'Current Path',
        score: results.portfolioProjection.onTrack ? 80 : 60,
        // Add the required progressPercentage field
        progressPercentage: results.portfolioProjection.progressPercentage,
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


  // 4. Cash Flow Summary Widget
  widgets.push({
    id: uuidv4(),
    type: 'quickCashFlowSummary',
    title: 'Monthly Cash Flow',
    icon: 'fas fa-exchange-alt',
    column_span: 2,
    row_span:2,
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
    column_span: 2,
    row_span: 4,
    data: results.nextSteps.map((step, index) => ({
      id: uuidv4(),
      title: index===0?'High Priority':index===1?'Medium Priority':'Low Priority',
      message: step,
      priority: index === 0 ? 'high' : (index === 1 ? 'medium' : 'low'),
      category: 'Financial Improvement',
      displayOrder: index + 1
    }))
  });

    // 6. Metric Card for Savings Rate
    widgets.push({
      id: uuidv4(),
      type: 'metricCard',
      title: 'Monthly Savings Rate',
      icon: 'fas fa-chart-pie',
      column_span: 2,
      row_span: 2,
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

    // 7. Portfolio Allocation Pie Chart
    widgets.push({
      id: uuidv4(),
      type: 'pieChart',
      title: 'Suggested Allocation',
      icon: 'fas fa-chart-pie',
      column_span: 2,
      row_span: 2,
      data: {
        dataPoints: [
          {
            id: uuidv4(),
            label: 'Stocks',
            value: results.portfolioAllocation.equityPercentage,
            color: 'rgba(161, 136, 255, 0.8)', // Purple color for stocks
            displayOrder: 1
          },
          {
            id: uuidv4(),
            label: 'Bonds',
            value: results.portfolioAllocation.bondPercentage,
            color: 'rgba(49, 203, 158, 0.8)', // Green color for bonds
            displayOrder: 2
          }
        ],
        title: 'Asset Allocation',
        showLegend: true
      }
    });

  // 8. Tips Card Widget with lesson links
  const investmentTips = [
    {
      title: "Diversify Your Portfolio",
      content: "Diversification across asset classes helps reduce risk and improve long-term returns. Consider adding different investment types to your portfolio.",
      lessonId: "invest-L1", // Investing fundamentals lesson
    },
    {
      title: "Understand Market Psychology",
      content: "Being aware of psychological biases can improve your investment decisions. Learn to recognize and overcome emotional reactions to market movements.",
      lessonId: "behavfin-L2", // Behavioral finance lesson
    },
    {
      title: "Consider Fixed Income",
      content: "Bonds can provide stable income and reduce portfolio volatility. Explore different bond types and their role in your investment strategy.",
      lessonId: "bondmarket-L4", // Bond market lesson
    }
  ];

  // Generate more personalized tips based on risk profile
  if (results.quizAnswers['risk-profile'] === 'conservative') {
    investmentTips.push({
      title: "Safety in Money Markets",
      content: "Money market instruments offer liquidity and security for conservative investors. Consider Treasury bills and CDs for your short-term investment needs.",
      lessonId: "moneymarket-L3", // Money market lesson
    });
  } else if (results.quizAnswers['risk-profile'] === 'aggressive') {
    investmentTips.push({
      title: "Growth Through Equities",
      content: "Stock investments offer high growth potential for long-term investors. Learn how to evaluate companies and understand different equity types.",
      lessonId: "equitymarket-L5", // Equity market lesson
    });
  }

  // Add financial statement tips if income is above threshold
  const monthlyIncome = results.quizAnswers['monthly-income'] || 0;
  if (monthlyIncome > 5000) {
    investmentTips.push({
      title: "Analyze Financial Statements",
      content: "Understanding how to read financial statements can help you make better investment decisions. Learn to evaluate company performance using key metrics.",
      lessonId: "finstatements-L10", // Financial statements lesson
    });
  }

  // Add time value of money tip if saving for long-term goals
  if (results.quizAnswers['long-term-goal'] === 'yes') {
    investmentTips.push({
      title: "Understand Compounding Returns",
      content: "The power of compound interest can significantly boost your long-term savings. Learn how time value of money concepts affect your financial decisions.",
      lessonId: "tvm-L7", // Time value of money lesson
    });
  }

  // Add derivatives tip for more sophisticated investors
  if (results.quizAnswers['invest-experience'] === 'experienced' || results.quizAnswers['risk-profile'] === 'aggressive') {
    investmentTips.push({
      title: "Consider Advanced Instruments",
      content: "Derivatives can be used for hedging risk or enhancing returns in your portfolio. Learn about options, futures, and other sophisticated financial instruments.",
      lessonId: "derivatives-L6", // Derivatives lesson
    });
  }

  // Add statistical analysis tip for data-driven investors
  if (results.quizAnswers['analytical-approach'] === 'yes') {
    investmentTips.push({
      title: "Apply Statistical Analysis",
      content: "Understanding statistics can help you evaluate investment performance and risk. Learn how to use quantitative measures to make more informed decisions.",
      lessonId: "stats-L8", // Statistics lesson
    });
  }

  // Add economic fundamentals tip for macroeconomic awareness
  investmentTips.push({
    title: "Monitor Economic Indicators",
    content: "Economic factors like inflation, interest rates, and GDP growth affect market performance. Learn how to interpret economic data and its impact on your investments.",
    lessonId: "econbasics-L9", // Economic fundamentals lesson
  });

  // widgets.push({
  //   id: uuidv4(),
  //   type: 'tipCard',
  //   title: 'Investment Advice for You',
  //   icon: 'fas fa-lightbulb',
  //   column_span: 1,
  //   data: {
  //     tips: investmentTips.map((tip, index) => {
  //       // Find the lesson details
  //       const lessonDetails = availableLessons.find(lesson => lesson.lessonId === tip.lessonId);
  //       return {
  //         id: uuidv4(),
  //         title: tip.title,
  //         content: tip.content,
  //         link: `/dashboard/essentials/${BasicLesson.course_id}/lesson/${tip.lessonId}`,
  //         displayOrder: index + 1,
  //         lessonDetails: lessonDetails || null
  //       };
  //     }),
  //     currentTipIndex: 0,
  //     autoRotate: true
  //   }
  // });


  
  // Add Portfolio Allocation Pie Chart


  // 8. Debt Status Widget (if applicable) with lesson links
  if (!results.debtStatus.debtFree) {
    widgets.push({
      id: uuidv4(),
      type: 'tipCard',
      title: 'Investment Advice for You',
      icon: 'fas fa-credit-card',
      column_span: 2,
      row_span: 2,
      data: {
        tips: [
          { 
            id: uuidv4(), 
            title: 'Debt Payoff Strategy', 
            content: 'Consider using the Avalanche method (highest interest first) or Snowball method (smallest balances first) to eliminate debt efficiently.',
            link: `/dashboard/essentials/${BasicLesson.course_id}/lesson/tvm-L7`,
            displayOrder: 1,
            lessonDetails: availableLessons.find(lesson => lesson.lessonId === 'tvm-L7') || null
          },
          { 
            id: uuidv4(), 
            title: 'Economic Impacts of Debt', 
            content: 'Understanding how debt affects your overall financial health can help you make better decisions about borrowing and repayment.',
            link: `/dashboard/essentials/${BasicLesson.course_id}/lesson/econbasics-L9`,
            displayOrder: 2,
            lessonDetails: availableLessons.find(lesson => lesson.lessonId === 'econbasics-L9') || null
          },
          { 
            id: uuidv4(), 
            title: 'Investment Fundamentals', 
            content: 'Learning the basics of investing can help you grow your wealth and reduce the impact of debt on your financial future.',
            link: `/dashboard/essentials/${BasicLesson.course_id}/lesson/invest-L1`,
            displayOrder: 3,
            lessonDetails: availableLessons.find(lesson => lesson.lessonId === 'invest-L1') || null
          },
          { 
            id: uuidv4(), 
            title: 'Behavioral Finance Awareness', 
            content: 'Understanding psychological biases can help you make more rational decisions about spending and debt management.',
            link: `/dashboard/essentials/${BasicLesson.course_id}/lesson/behavfin-L2`,
            displayOrder: 4,
            lessonDetails: availableLessons.find(lesson => lesson.lessonId === 'behavfin-L2') || null
          },
          { 
            id: uuidv4(), 
            title: 'Financial Statement Analysis', 
            content: 'Creating a personal income statement and balance sheet can help you track your progress in reducing debt and building assets.',
            link: `/dashboard/essentials/${BasicLesson.course_id}/lesson/finstatements-L10`,
            displayOrder: 5,
            lessonDetails: availableLessons.find(lesson => lesson.lessonId === 'finstatements-L10') || null
          },
        ],
        currentTipIndex: 0,
        autoRotate: true
      }
    });
  }

    // 1. Daily Habit Future Value Calculator
    widgets.push({
      id: uuidv4(),
      type: 'dailyHabitCalculator',
      title: 'Daily Habit Future Value Calculator',
      icon: 'fas fa-coffee',
      column_span: 2,
      row_span: 4,
      data:{}
    });
  
    // // 2. 401(k) Head Start Visualizer
    // widgets.push({
    //   id: uuidv4(),
    //   type: 'pensionHeadStart',
    //   title: '401(k) Head Start Visualizer',
    //   icon: 'fas fa-graduation-cap',
    //   column_span: 2,
    //   row_span: 4,
    //   data:{}
    // });
  
    // // 3. Down Payment Timeline
    // widgets.push({
    //   id: uuidv4(),
    //   type: 'mortgageDepositTimeline',
    //   title: 'Down Payment Timeline',
    //   icon: 'fas fa-home',
    //   column_span: 2,
    //   row_span: 2,
    //   data:{}
    // });

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

/**
 * Calculate weighted financial health score (0-100)
 * This provides a comprehensive assessment of financial wellness
 */
export function calculateFinancialHealthScore(answers: QuizAnswers): number {
  let score = 0;
  
  // Emergency Fund (30 points max)
  const emergencyFund = Number(answers['emergency-fund']) || 0;
  const emergencyScore = Math.min(30, (emergencyFund / 6) * 30);
  score += emergencyScore;
  
  // Savings Rate (30 points max)
  const netIncome = Number(answers['net-monthly-income']) || 0;
  const fixedExpenses = Number(answers['fixed-monthly-expenses']) || 0;
  const variableExpenses = Number(answers['variable-monthly-expenses']) || 0;
  const monthlySavings = netIncome - fixedExpenses - variableExpenses;
  const savingsRate = netIncome > 0 ? (monthlySavings / netIncome) * 100 : 0;
  const savingsScore = Math.min(30, (savingsRate / 20) * 30);
  score += savingsScore;
  
  // Debt Health (20 points max)
  const debtDetails = answers['debt-details'] as DebtDetail[] || [];
  const grossIncome = Number(answers['gross-monthly-income']) || 0;
  let debtScore = 20;
  
  if (debtDetails.length > 0) {
    const totalDebt = debtDetails.reduce((sum, debt) => sum + debt.amount, 0);
    const monthlyDebtPayments = debtDetails.reduce((sum, debt) => {
      // Estimate monthly payment as 2% of total debt amount
      return sum + (debt.amount * 0.02);
    }, 0);
    
    const debtToIncomeRatio = grossIncome > 0 ? (monthlyDebtPayments / grossIncome) : 0;
    const goodDebt = debtDetails.filter(debt => debt.interestRate <= 8);
    const badDebt = debtDetails.filter(debt => debt.interestRate > 8);
    
    // Penalize high debt-to-income ratio
    if (debtToIncomeRatio > 0.45) debtScore -= 15;
    else if (debtToIncomeRatio > 0.30) debtScore -= 10;
    else if (debtToIncomeRatio > 0.15) debtScore -= 5;
    
    // Penalize bad debt more heavily
    if (badDebt.length > 0) {
      const badDebtTotal = badDebt.reduce((sum, debt) => sum + debt.amount, 0);
      const badDebtRatio = totalDebt > 0 ? badDebtTotal / totalDebt : 0;
      debtScore -= Math.min(10, badDebtRatio * 20);
    }
  }
  
  score += Math.max(0, debtScore);
  
  // Retirement Progress (20 points max)
  const currentAge = Number(answers['current-age']) || 30;
  const retirementAge = Number(answers['retirement-age']) || 65;
  const totalAssets = (Number(answers['cash-savings']) || 0) + (Number(answers['pension-value']) || 0) + (Number(answers['other-investments']) || 0);
  const targetRetirement = Number(answers['target-retirement']) || 1000000;
  
  const yearsToRetirement = retirementAge - currentAge;
  const expectedProgress = yearsToRetirement > 0 ? (1 - (yearsToRetirement / 35)) : 1; // Assuming 35-year career
  const actualProgress = targetRetirement > 0 ? totalAssets / targetRetirement : 0;
  const progressRatio = expectedProgress > 0 ? actualProgress / expectedProgress : 0;
  
  const retirementScore = Math.min(20, progressRatio * 20);
  score += retirementScore;
  
  return Math.max(0, Math.min(100, score));
}