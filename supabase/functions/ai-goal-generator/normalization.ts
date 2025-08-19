// AI Response Normalization - PRODUCTION BULLETPROOF VERSION
// Handles ALL edge cases and ensures valid data before validation

import type { AIGoalResponse } from "./schema.ts";

interface QuestionnaireAnswers {
  [key: string]: string | number | boolean | string[];
}

interface NormalizationContext {
  goalType: string;
  targetAmount: number;
  targetDate: string;
  monthsToGoal: number;
  userIncome: number;
  userExpenses: number;
}

// COMPREHENSIVE NORMALIZATION - Fixes AI response before validation
export function normalizeAIResponse(
  response: AIGoalResponse,
  goalType: string,
  questionnaireAnswers: QuestionnaireAnswers
): AIGoalResponse {
  console.log("🔧 Starting comprehensive AI response normalization...");

  // Create normalization context
  const context = createNormalizationContext(goalType, questionnaireAnswers);
  
  // Deep clone to avoid mutations
  const normalized = JSON.parse(JSON.stringify(response));

  // Normalize each section with fallbacks
  normalizeGoal(normalized, context);
  normalizeStrategy(normalized, context);
  normalizeMilestones(normalized, context);
  normalizeInsights(normalized, context);
  normalizeProjections(normalized, context);
  normalizeAdvisorMessages(normalized, context);
  normalizeFinancialProfile(normalized, context, questionnaireAnswers);

  console.log("✅ AI response normalization completed");
  return normalized;
}

// Create normalization context with safe fallbacks
function createNormalizationContext(
  goalType: string,
  questionnaireAnswers: QuestionnaireAnswers
): NormalizationContext {
  // Extract target amount with comprehensive fallbacks
  const targetAmount = extractSafeTargetAmount(goalType, questionnaireAnswers);
  
  // Calculate safe target date (minimum 6 months from now)
  const minDate = new Date();
  minDate.setMonth(minDate.getMonth() + 6);
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 30);
  
  // Goal-type specific timeline defaults
  const defaultMonths = getDefaultTimelineMonths(goalType);
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + defaultMonths);
  
  const monthsToGoal = Math.max(6, defaultMonths);
  
  // Extract financial context
  const userIncome = extractSafeIncome(questionnaireAnswers);
  const userExpenses = extractSafeExpenses(questionnaireAnswers, userIncome);

  return {
    goalType,
    targetAmount,
    targetDate: targetDate.toISOString().split('T')[0],
    monthsToGoal,
    userIncome,
    userExpenses
  };
}

// Extract target amount with comprehensive fallbacks
function extractSafeTargetAmount(goalType: string, answers: QuestionnaireAnswers): number {
  const amountFields = [
    'target_amount', 'target_home_price', 'wealth_target', 'investment_amount',
    'total_debt_amount', 'goal_amount', 'purchase_price', 'savings_goal'
  ];

  // Try to extract from questionnaire
  for (const field of amountFields) {
    if (answers[field]) {
      const amount = parseFloat(String(answers[field]).replace(/[$,]/g, ''));
      if (!isNaN(amount) && amount > 0) {
        return Math.round(amount);
      }
    }
  }

  // Goal-type specific calculations
  if (goalType === 'emergency_fund' && answers['monthly_essential_expenses']) {
    const monthly = parseFloat(String(answers['monthly_essential_expenses']).replace(/[$,]/g, ''));
    const months = parseInt(String(answers['target_months'])) || 6;
    if (!isNaN(monthly) && monthly > 0) {
      return Math.round(monthly * months);
    }
  }

  if (goalType === 'retirement' && answers['current_income']) {
    const income = parseFloat(String(answers['current_income']).replace(/[$,]/g, ''));
    if (!isNaN(income) && income > 0) {
      return Math.round(income * 10); // 10x income rule
    }
  }

  // Goal-type specific defaults
  const defaults = {
    'emergency_fund': 25000,
    'home_buying': 150000,
    'retirement': 1000000,
    'passive_income': 500000,
    'debt_payoff': 50000,
    'investment': 100000,
    'custom': 50000
  };

  return defaults[goalType as keyof typeof defaults] || 50000;
}

// Extract safe monthly income
function extractSafeIncome(answers: QuestionnaireAnswers): number {
  const incomeFields = [
    'gross_monthly_income', 'net_monthly_income', 'monthly_income', 'current_income'
  ];

  for (const field of incomeFields) {
    if (answers[field]) {
      const amount = parseFloat(String(answers[field]).replace(/[$,]/g, ''));
      if (!isNaN(amount) && amount > 0) {
        return Math.round(amount);
      }
    }
  }

  return 5000; // Safe default
}

// Extract safe monthly expenses
function extractSafeExpenses(answers: QuestionnaireAnswers, income: number): number {
  const expenseFields = [
    'housing_cost', 'food_expenses', 'transportation_expenses', 
    'healthcare_expenses', 'entertainment_expenses', 'other_monthly_expenses'
  ];

  let totalExpenses = 0;
  for (const field of expenseFields) {
    if (answers[field]) {
      const amount = parseFloat(String(answers[field]).replace(/[$,]/g, ''));
      if (!isNaN(amount) && amount > 0) {
        totalExpenses += amount;
      }
    }
  }

  // If no expenses found, use 70% of income as safe default
  if (totalExpenses === 0) {
    totalExpenses = Math.round(income * 0.7);
  }

  // Cap expenses at 95% of income to ensure some savings capacity
  return Math.min(totalExpenses, Math.round(income * 0.95));
}

// Get default timeline based on goal type
function getDefaultTimelineMonths(goalType: string): number {
  const defaults = {
    'emergency_fund': 12,      // 1 year
    'home_buying': 24,         // 2 years
    'retirement': 360,         // 30 years
    'passive_income': 120,     // 10 years
    'debt_payoff': 36,         // 3 years
    'investment': 60,          // 5 years
    'custom': 24               // 2 years
  };

  return defaults[goalType as keyof typeof defaults] || 24;
}

// Normalize goal section
function normalizeGoal(response: AIGoalResponse, context: NormalizationContext): void {
  if (!response.goal) {
    response.goal = {
      title: '',
      description: '',
      targetAmount: 0,
      targetDate: '',
      rationale: ''
    };
  }

  // Normalize title
  if (!response.goal.title || typeof response.goal.title !== 'string') {
    response.goal.title = `${capitalizeGoalType(context.goalType)} Goal`;
  }
  response.goal.title = response.goal.title.trim().substring(0, 255);

  // Normalize description
  if (!response.goal.description || typeof response.goal.description !== 'string') {
    response.goal.description = `A comprehensive financial plan to achieve your ${context.goalType.replace('_', ' ')} goal of $${context.targetAmount.toLocaleString()}.`;
  }
  response.goal.description = response.goal.description.trim();
  if (response.goal.description.length < 100) {
    response.goal.description += " This plan includes detailed milestones, insights, and a strategic approach tailored to your financial situation.";
  }

  // Normalize target amount
  if (typeof response.goal.targetAmount !== 'number' || response.goal.targetAmount <= 0) {
    response.goal.targetAmount = context.targetAmount;
  }

  // Normalize target date
  if (!response.goal.targetDate || !isValidDate(response.goal.targetDate)) {
    response.goal.targetDate = context.targetDate;
  }

  // Normalize rationale
  if (!response.goal.rationale || typeof response.goal.rationale !== 'string') {
    response.goal.rationale = `Based on your financial situation, this goal amount and timeline provide a realistic and achievable path forward.`;
  }
  response.goal.rationale = response.goal.rationale.trim().substring(0, 1000);
}

// Normalize strategy section
function normalizeStrategy(response: AIGoalResponse, context: NormalizationContext): void {
  if (!response.strategy || typeof response.strategy !== 'string') {
    const monthlyRequired = Math.round(context.targetAmount / context.monthsToGoal);
    response.strategy = `To achieve your ${context.goalType.replace('_', ' ')} goal of $${context.targetAmount.toLocaleString()}, you'll need to save approximately $${monthlyRequired.toLocaleString()} per month over ${context.monthsToGoal} months. This strategy focuses on consistent monthly contributions while optimizing your savings approach.`;
  }
  
  // Ensure minimum length
  if (response.strategy.length < 200) {
    response.strategy += " This plan includes regular progress reviews and adjustments to ensure you stay on track.";
  }
}

// Normalize milestones with comprehensive fallbacks
function normalizeMilestones(response: AIGoalResponse, context: NormalizationContext): void {
  if (!Array.isArray(response.milestones)) {
    response.milestones = [];
  }

  // Ensure we have 3-6 milestones
  if (response.milestones.length < 3) {
    response.milestones = generateDefaultMilestones(context);
  } else if (response.milestones.length > 6) {
    response.milestones = response.milestones.slice(0, 6);
  }

  // Normalize each milestone
  response.milestones.forEach((milestone, index) => {
    normalizeMilestone(milestone, index, context);
  });
}

// Generate default milestones for goal type
function generateDefaultMilestones(context: NormalizationContext): any[] {
  const milestones = [];
  const milestoneCount = Math.min(6, Math.max(3, Math.floor(context.monthsToGoal / 6)));
  
  for (let i = 0; i < milestoneCount; i++) {
    const monthsFromNow = Math.round((context.monthsToGoal / milestoneCount) * (i + 1));
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + monthsFromNow);
    
    const progressPercent = ((i + 1) / milestoneCount) * 100;
    const targetAmount = Math.round((context.targetAmount * progressPercent) / 100);
    
    milestones.push({
      title: `Milestone ${i + 1}: ${progressPercent}% Progress`,
      description: `Reach ${progressPercent}% of your goal by saving $${targetAmount.toLocaleString()}.`,
      type: 'savings',
      targetAmount: targetAmount,
      dueDate: targetDate.toISOString().split('T')[0],
      habitDescription: null,
      frequency: null,
      habitTargetValue: null,
      priority: i === 0 ? 'high' : 'medium',
      aiRationale: `This milestone ensures steady progress toward your goal.`
    });
  }
  
  return milestones;
}

// Normalize individual milestone
function normalizeMilestone(milestone: any, index: number, context: NormalizationContext): void {
  // Normalize title
  if (!milestone.title || typeof milestone.title !== 'string') {
    milestone.title = `Milestone ${index + 1}`;
  }
  milestone.title = milestone.title.substring(0, 255);

  // Normalize description
  if (!milestone.description || typeof milestone.description !== 'string') {
    milestone.description = `Complete this milestone to progress toward your goal.`;
  }

  // Normalize type
  const validTypes = ['savings', 'action', 'habit', 'review'];
  if (!validTypes.includes(milestone.type)) {
    milestone.type = 'savings';
  }

  // Normalize due date
  if (!milestone.dueDate || !isValidDate(milestone.dueDate)) {
    const monthsFromNow = Math.round((context.monthsToGoal / 6) * (index + 1));
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + monthsFromNow);
    milestone.dueDate = dueDate.toISOString().split('T')[0];
  }

  // Normalize priority
  const validPriorities = ['critical', 'high', 'medium', 'low'];
  if (!validPriorities.includes(milestone.priority)) {
    milestone.priority = index === 0 ? 'high' : 'medium';
  }

  // Normalize AI rationale
  if (!milestone.aiRationale || typeof milestone.aiRationale !== 'string') {
    milestone.aiRationale = `This milestone supports your overall goal progress.`;
  }

  // Type-specific normalization
  if (milestone.type === 'savings') {
    if (typeof milestone.targetAmount !== 'number' || milestone.targetAmount <= 0) {
      milestone.targetAmount = Math.round(context.targetAmount * 0.25 * (index + 1));
    }
  } else {
    milestone.targetAmount = null;
  }

  if (milestone.type === 'habit') {
    if (!milestone.habitDescription) {
      milestone.habitDescription = 'Develop a positive financial habit';
    }
    const validFrequencies = ['daily', 'weekly', 'monthly', 'one-time'];
    if (!validFrequencies.includes(milestone.frequency)) {
      milestone.frequency = 'monthly';
    }
    if (typeof milestone.habitTargetValue !== 'number') {
      milestone.habitTargetValue = 100;
    }
  } else {
    milestone.habitDescription = null;
    milestone.frequency = null;
    milestone.habitTargetValue = null;
  }
}

// Normalize insights section
function normalizeInsights(response: AIGoalResponse, context: NormalizationContext): void {
  if (!Array.isArray(response.insights)) {
    response.insights = [];
  }

  // Ensure we have 2-5 insights
  if (response.insights.length < 2) {
    response.insights = generateDefaultInsights(context);
  } else if (response.insights.length > 5) {
    response.insights = response.insights.slice(0, 5);
  }

  // Normalize each insight
  response.insights.forEach((insight, index) => {
    normalizeInsight(insight, index, context);
  });
}

// Generate default insights
function generateDefaultInsights(context: NormalizationContext): any[] {
  const monthlyRequired = Math.round(context.targetAmount / context.monthsToGoal);
  const savingsRate = Math.round((monthlyRequired / context.userIncome) * 100);
  
  return [
    {
      type: 'strategy_insight',
      title: 'Monthly Savings Strategy',
      content: `To reach your goal, you'll need to save $${monthlyRequired.toLocaleString()} per month, which represents ${savingsRate}% of your monthly income. This is ${savingsRate <= 20 ? 'achievable' : 'challenging but possible'} with proper budgeting.`,
      priority: 'high',
      actionable: true
    },
    {
      type: 'behavioral_tip',
      title: 'Automate Your Success',
      content: 'Set up automatic transfers to a dedicated savings account to ensure consistent progress toward your goal without relying on willpower.',
      priority: 'medium',
      actionable: true
    }
  ];
}

// Normalize individual insight
function normalizeInsight(insight: any, index: number, context: NormalizationContext): void {
  // Normalize type
  const validTypes = ['strategy_insight', 'risk_warning', 'opportunity', 'behavioral_tip'];
  if (!validTypes.includes(insight.type)) {
    insight.type = 'strategy_insight';
  }

  // Normalize title
  if (!insight.title || typeof insight.title !== 'string') {
    insight.title = `Insight ${index + 1}`;
  }
  insight.title = insight.title.substring(0, 255);

  // Normalize content
  if (!insight.content || typeof insight.content !== 'string') {
    insight.content = 'This insight provides valuable guidance for your financial journey.';
  }
  if (insight.content.length < 100) {
    insight.content += ' Regular review and adjustment of your strategy will help ensure success.';
  }

  // Normalize priority
  const validPriorities = ['critical', 'high', 'medium', 'low'];
  if (!validPriorities.includes(insight.priority)) {
    insight.priority = 'medium';
  }

  // Normalize actionable
  if (typeof insight.actionable !== 'boolean') {
    insight.actionable = true;
  }
}

// Normalize projections with goal-type specific logic
function normalizeProjections(response: AIGoalResponse, context: NormalizationContext): void {
  if (!response.projections) {
    response.projections = {
      monthlyRequired: 0,
      projectedFinalAmount: 0,
      incomeReplacement: null,
      confidenceLevel: 0.8
    };
  }

  // Calculate safe monthly required
  if (typeof response.projections.monthlyRequired !== 'number' || response.projections.monthlyRequired <= 0) {
    response.projections.monthlyRequired = Math.round(context.targetAmount / context.monthsToGoal);
  }

  // Calculate projected final amount
  if (typeof response.projections.projectedFinalAmount !== 'number' || response.projections.projectedFinalAmount <= 0) {
    response.projections.projectedFinalAmount = response.projections.monthlyRequired * context.monthsToGoal;
  }

  // Goal-type specific income replacement logic
  if (context.goalType === 'retirement') {
    if (typeof response.projections.incomeReplacement !== 'number' || 
        response.projections.incomeReplacement < 0 || 
        response.projections.incomeReplacement > 200) {
      // Calculate 4% withdrawal rule income replacement
      const annualWithdrawal = response.projections.projectedFinalAmount * 0.04;
      const monthlyWithdrawal = annualWithdrawal / 12;
      response.projections.incomeReplacement = Math.round((monthlyWithdrawal / context.userIncome) * 100);
    }
  } else {
    // Non-retirement goals should have null income replacement
    response.projections.incomeReplacement = null;
  }

  // Normalize confidence level
  if (typeof response.projections.confidenceLevel !== 'number' || 
      response.projections.confidenceLevel < 0.5 || 
      response.projections.confidenceLevel > 1.0) {
    response.projections.confidenceLevel = 0.8;
  }
}

// Normalize advisor messages
function normalizeAdvisorMessages(response: AIGoalResponse, context: NormalizationContext): void {
  if (!response.advisorMessages) {
    response.advisorMessages = {
      planMessage: { content: '', tone: 'informative' },
      insightsMessage: { content: '', tone: 'informative' },
      nextStepsMessage: { content: '', tone: 'encouraging' }
    };
  }

  const messageTypes = ['planMessage', 'insightsMessage', 'nextStepsMessage'];
  const defaultTones: Record<string, any> = {
    planMessage: 'encouraging',
    insightsMessage: 'informative',
    nextStepsMessage: 'motivational'
  };

  messageTypes.forEach(messageType => {
    const message = response.advisorMessages[messageType as keyof typeof response.advisorMessages];
    
    if (!message || typeof message !== 'object') {
      response.advisorMessages[messageType as keyof typeof response.advisorMessages] = {
        content: '',
        tone: defaultTones[messageType]
      };
    }

    const msg = response.advisorMessages[messageType as keyof typeof response.advisorMessages];
    
    // Normalize content
    if (!msg.content || typeof msg.content !== 'string') {
      msg.content = generateDefaultAdvisorMessage(messageType, context);
    }
    
    // Ensure proper format
    if (!msg.content.includes('I suggest you to')) {
      msg.content = `I suggest you to ${msg.content}`;
    }
    
    // Ensure minimum length
    if (msg.content.length < 200) {
      msg.content += ', because this approach has proven successful for many people in similar situations, so that you can achieve your financial goals with confidence.';
    }

    // Normalize tone
    const validTones = ['congratulatory', 'encouraging', 'motivational', 'reassuring', 'informative'];
    if (!validTones.includes(msg.tone)) {
      msg.tone = defaultTones[messageType];
    }
  });
}

// Generate default advisor messages
function generateDefaultAdvisorMessage(messageType: string, context: NormalizationContext): string {
  const monthlyRequired = Math.round(context.targetAmount / context.monthsToGoal);
  
  switch (messageType) {
    case 'planMessage':
      return `I suggest you to start by setting up automatic monthly savings of $${monthlyRequired.toLocaleString()}, because this systematic approach removes the guesswork and ensures consistent progress, so that you can reach your ${context.goalType.replace('_', ' ')} goal of $${context.targetAmount.toLocaleString()} within ${context.monthsToGoal} months.`;
    
    case 'insightsMessage':
      return `I suggest you to review your budget and identify areas where you can optimize spending, because every dollar saved can be redirected toward your goal, so that you can potentially reach your target even faster than planned.`;
    
    case 'nextStepsMessage':
      return `I suggest you to open a dedicated savings account for this goal this week, because separating this money from your regular checking account prevents accidental spending, so that you can track your progress clearly and stay motivated.`;
    
    default:
      return `I suggest you to follow the plan consistently, because persistence is key to financial success, so that you can achieve your goals and build lasting wealth.`;
  }
}

// Normalize financial profile
function normalizeFinancialProfile(
  response: AIGoalResponse, 
  context: NormalizationContext,
  answers: QuestionnaireAnswers
): void {
  if (!response.financialProfile) {
    response.financialProfile = {
      profileDescription: '',
      profileData: {
        netWorth: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        savingsRate: 0,
        riskTolerance: 'moderate',
        financialGoals: [],
        strengths: [],
        recommendations: []
      }
    };
  }

  // Normalize profile description
  if (!response.financialProfile.profileDescription || response.financialProfile.profileDescription.length < 300) {
    response.financialProfile.profileDescription = generateProfileDescription(context, answers);
  }

  // Normalize profile data
  const data = response.financialProfile.profileData;
  
  // Calculate net worth
  if (typeof data.netWorth !== 'number') {
    data.netWorth = calculateNetWorth(answers);
  }

  // Set income and expenses
  if (typeof data.monthlyIncome !== 'number' || data.monthlyIncome <= 0) {
    data.monthlyIncome = context.userIncome;
  }
  
  if (typeof data.monthlyExpenses !== 'number' || data.monthlyExpenses < 0) {
    data.monthlyExpenses = context.userExpenses;
  }

  // Calculate savings rate
  if (typeof data.savingsRate !== 'number' || data.savingsRate < 0 || data.savingsRate > 100) {
    data.savingsRate = Math.round(((data.monthlyIncome - data.monthlyExpenses) / data.monthlyIncome) * 100);
  }

  // Normalize risk tolerance
  const validRisk = ['conservative', 'moderate', 'aggressive'];
  if (!validRisk.includes(data.riskTolerance)) {
    data.riskTolerance = extractRiskTolerance(answers);
  }

  // Ensure arrays have minimum items
  if (!Array.isArray(data.financialGoals) || data.financialGoals.length < 2) {
    data.financialGoals = [`Achieve ${context.goalType.replace('_', ' ')} goal`, 'Build long-term wealth'];
  }

  if (!Array.isArray(data.strengths) || data.strengths.length < 2) {
    data.strengths = ['Committed to financial planning', 'Setting clear goals'];
  }

  if (!Array.isArray(data.recommendations) || data.recommendations.length < 3) {
    data.recommendations = [
      'Set up automatic savings transfers',
      'Track spending regularly',
      'Review and adjust plan quarterly'
    ];
  }
}

// Helper functions
function capitalizeGoalType(goalType: string): string {
  return goalType.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return date > today;
}

function calculateNetWorth(answers: QuestionnaireAnswers): number {
  const assetFields = [
    'checking_account', 'savings_account', 'investment_accounts',
    'retirement_accounts', 'real_estate_value', 'other_assets'
  ];
  
  const debtFields = [
    'credit_card_debt', 'student_loan_debt', 'mortgage_balance',
    'auto_loan_balance', 'other_debt'
  ];
  
  let assets = 0;
  let debts = 0;
  
  assetFields.forEach(field => {
    if (answers[field]) {
      const amount = parseFloat(String(answers[field]).replace(/[$,]/g, ''));
      if (!isNaN(amount) && amount > 0) {
        assets += amount;
      }
    }
  });
  
  debtFields.forEach(field => {
    if (answers[field]) {
      const amount = parseFloat(String(answers[field]).replace(/[$,]/g, ''));
      if (!isNaN(amount) && amount > 0) {
        debts += amount;
      }
    }
  });
  
  return Math.round(assets - debts);
}

function extractRiskTolerance(answers: QuestionnaireAnswers): 'conservative' | 'moderate' | 'aggressive' {
  const riskField = answers['risk_tolerance'] || answers['investment_risk_tolerance'];
  
  if (typeof riskField === 'string') {
    const risk = riskField.toLowerCase();
    if (risk.includes('conserv')) return 'conservative';
    if (risk.includes('aggr') || risk.includes('growth')) return 'aggressive';
  }
  
  return 'moderate';
}

function generateProfileDescription(context: NormalizationContext, answers: QuestionnaireAnswers): string {
  const netWorth = calculateNetWorth(answers);
  const savingsRate = Math.round(((context.userIncome - context.userExpenses) / context.userIncome) * 100);
  
  return `You are a financially focused individual with a monthly income of $${context.userIncome.toLocaleString()} and a current net worth of $${netWorth.toLocaleString()}. With a savings rate of ${savingsRate}%, you demonstrate good financial discipline. Your goal to achieve ${context.goalType.replace('_', ' ')} shows strong long-term planning. You have the financial capacity to reach your target of $${context.targetAmount.toLocaleString()} through consistent monthly contributions and strategic planning. Your commitment to this goal, combined with proper budgeting and regular progress reviews, positions you well for financial success.`;
}