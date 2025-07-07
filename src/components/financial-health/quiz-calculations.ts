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

/**
 * Calculate financial results based on quiz answers
 */
export function calculateResults(answers: QuizAnswers): CalculationResults {
  // Calculate portfolio projection
  const currentAge = answers['current-age'];
  const retirementAge = answers['retirement-age'];
  const annualContribution = answers['annual-contribution'];
  const currentAssets = answers['current-assets'];
  const targetRetirement = answers['target-retirement'];
  
  // Calculate portfolio allocation based on risk profile questions
  const portfolioAllocation = calculatePortfolioAllocation(answers);
  const returnRate = answers['return-rate'] / 100; // Convert percentage to decimal

  const timePeriodsInYears = retirementAge - currentAge;

  // Calculate future value using formula: FV = PV × (1 + r)^N + PMT × [((1 + r)^N – 1) / r]
  const futureValue = currentAssets * Math.pow(1 + returnRate, timePeriodsInYears) +
                      annualContribution * ((Math.pow(1 + returnRate, timePeriodsInYears) - 1) / returnRate);

  // Calculate progress percentage - ensure it doesn't result in NaN or Infinity
  let progressPercentage = 0;
  if (targetRetirement && targetRetirement > 0) {
    // Use current assets as the numerator for the progress bar
    // since we want to show current progress, not future projection
    progressPercentage = Math.min(100, Math.round((currentAssets / targetRetirement) * 100));
  }
  const onTrack = futureValue >= targetRetirement;

  // Financial health score calculation has been moved to the widget
  // This function now focuses on other calculations and preserves the raw quiz answers
  const debtTypes = answers['debt-types'] || [];

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

  // Next steps recommendations - passing just basic data since financialHealth score is calculated in widget
  const nextSteps = determineNextSteps(answers, {
    debtFree,
    progressPercentage
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
      income: monthlyIncome,
      expenses: monthlyExpenses
    },
    debtStatus: {
      debtFree,
      debtTypes
    },
    investingGuidance,
    assetAllocation,
    portfolioAllocation,
    nextSteps,
    quizAnswers: answers
  };
}

/**
 * Determine next action steps based on assessment results
 * @param answers - Raw quiz answers
 * @param params - Basic parameters for determining next steps
 */
function determineNextSteps(answers: QuizAnswers, params: { debtFree: boolean, progressPercentage: number }): string[] {
  const nextSteps: string[] = [];

  // Check emergency fund based directly on answers
  const emergencyFund = answers['emergency-fund'] || 'none';
  if (emergencyFund !== 'more-than-6' && emergencyFund !== '3-6') {
    nextSteps.push('Build an emergency fund covering 3-6 months of expenses');
  }
  
  // Check debt status
  if (!params.debtFree) {
    nextSteps.push('Create a debt repayment strategy focusing on high-interest debt first');
  }
  
  // Check savings rate directly from answers
  const savingsRate = answers['savings-rate'] || 0;
  if (savingsRate < 15) {
    nextSteps.push('Increase monthly savings rate to at least 15% of income');
  }
  
  // Check retirement progress
  if (params.progressPercentage < 70) {
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


  // 1. Progress Bar for Retirement Goal
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
      row_span: 4,
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
 * Calculate portfolio allocation based on risk profile questions
 * Formula:
 * 1. If yes count > no count, 60% Equity, 40% Bond
 * 2. If yes count < no count, 40% Equity, 60% Bond
 * 3. If yes count = no count, 50% Equity, 50% Bond
 */
function calculatePortfolioAllocation(answers: QuizAnswers) {
  // Questions to consider for risk profile
  const riskProfileQuestions = [
    'paid-all-debt',
    'expect-lump-sum',
    'long-term-goal',
    'predictable-income',
    'high-risk-preference',
    'risky-investments',
    'extreme-sports'
  ];
  
  // Count yes answers
  let yesCount = 0;
  let noCount = 0;
  
  for (const question of riskProfileQuestions) {
    if (answers[question] === 'yes') {
      yesCount++;
    } else if (answers[question] === 'no') {
      noCount++;
    }
  }
  
  let equityPercentage = 50; // Default balanced allocation
  let bondPercentage = 50;
  
  // Apply allocation formula
  if (yesCount > noCount) {
    equityPercentage = 60;
    bondPercentage = 40;
  } else if (yesCount < noCount) {
    equityPercentage = 40;
    bondPercentage = 60;
  }
  // else keep 50/50 split
  
  return {
    equityPercentage,
    bondPercentage,
    riskScore: yesCount, // Store the risk score (number of yes answers)
  };
}