// Business Logic Validation - PRODUCTION BULLETPROOF VERSION
// Validates realistic financial scenarios and goal-type specific requirements

import type { AIGoalResponse } from "./schema.ts";

interface QuestionnaireAnswers {
  [key: string]: string | number | boolean | string[];
}

interface BusinessValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  adjustments: string[];
}

// COMPREHENSIVE BUSINESS LOGIC VALIDATION
export function validateBusinessLogic(
  response: AIGoalResponse,
  goalType: string,
  questionnaireAnswers: QuestionnaireAnswers
): BusinessValidationResult {
  console.log("🔍 Starting comprehensive business logic validation...");
  
  const errors: string[] = [];
  const warnings: string[] = [];
  const adjustments: string[] = [];

  // Extract user financial context
  const userContext = extractUserFinancialContext(questionnaireAnswers);
  
  // Goal-type specific validation
  validateGoalTypeSpecifics(response, goalType, userContext, errors, warnings);
  
  // Financial realism validation
  validateFinancialRealism(response, userContext, errors, warnings, adjustments);
  
  // Timeline validation
  validateTimeline(response, goalType, errors, warnings);
  
  // Milestone logic validation
  validateMilestoneLogic(response, errors, warnings);
  
  // Risk assessment validation
  validateRiskAssessment(response, userContext, goalType, warnings, adjustments);
  
  console.log(`✅ Business validation completed: ${errors.length} errors, ${warnings.length} warnings`);
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    adjustments
  };
}

// Extract comprehensive user financial context
function extractUserFinancialContext(answers: QuestionnaireAnswers) {
  const monthlyIncome = extractIncome(answers);
  const monthlyExpenses = extractExpenses(answers);
  const netWorth = calculateNetWorth(answers);
  const age = extractAge(answers);
  const dependents = extractDependents(answers);
  const riskTolerance = extractRiskTolerance(answers);
  
  const disposableIncome = monthlyIncome - monthlyExpenses;
  const savingsCapacity = Math.max(0, disposableIncome * 0.8); // Conservative estimate
  
  return {
    monthlyIncome,
    monthlyExpenses,
    disposableIncome,
    savingsCapacity,
    netWorth,
    age,
    dependents,
    riskTolerance,
    debtToIncomeRatio: calculateDebtToIncomeRatio(answers, monthlyIncome),
    emergencyFundMonths: calculateEmergencyFundCoverage(answers, monthlyExpenses)
  };
}

// Goal-type specific validation rules
function validateGoalTypeSpecifics(
  response: AIGoalResponse,
  goalType: string,
  userContext: any,
  errors: string[],
  warnings: string[]
): void {
  
  switch (goalType) {
    case 'emergency_fund':
      validateEmergencyFund(response, userContext, errors, warnings);
      break;
      
    case 'retirement':
      validateRetirement(response, userContext, errors, warnings);
      break;
      
    case 'home_buying':
      validateHomeBuying(response, userContext, errors, warnings);
      break;
      
    case 'passive_income':
      validatePassiveIncome(response, userContext, errors, warnings);
      break;
      
    case 'debt_payoff':
      validateDebtPayoff(response, userContext, errors, warnings);
      break;
      
    case 'investment':
      validateInvestment(response, userContext, errors, warnings);
      break;
      
    default:
      validateCustomGoal(response, userContext, errors, warnings);
  }
}

// Emergency fund specific validation
function validateEmergencyFund(response: AIGoalResponse, userContext: any, errors: string[], warnings: string[]): void {
  const targetAmount = response.goal.targetAmount;
  const monthlyExpenses = userContext.monthlyExpenses;
  
  // Target amount should be 3-12 months of expenses
  const monthsCovered = targetAmount / monthlyExpenses;
  
  if (monthsCovered < 3) {
    errors.push(`Emergency fund target of $${targetAmount.toLocaleString()} only covers ${monthsCovered.toFixed(1)} months of expenses. Minimum recommended is 3 months.`);
  } else if (monthsCovered > 12) {
    warnings.push(`Emergency fund target covers ${monthsCovered.toFixed(1)} months of expenses. Consider if this amount could be better invested elsewhere.`);
  }
  
  // Income replacement should be null
  if (response.projections.incomeReplacement !== null) {
    errors.push("Emergency fund goals should not have income replacement calculations");
  }
  
  // Timeline should be reasonable (6-24 months)
  const timeline = calculateMonthsToGoal(response.goal.targetDate);
  if (timeline > 36) {
    warnings.push("Emergency fund timeline is very long. Consider a more aggressive savings approach.");
  }
}

// Retirement specific validation
function validateRetirement(response: AIGoalResponse, userContext: any, errors: string[], warnings: string[]): void {
  const targetAmount = response.goal.targetAmount;
  const currentAge = userContext.age;
  const timeline = calculateMonthsToGoal(response.goal.targetDate);
  const retirementAge = currentAge + (timeline / 12);
  
  // Income replacement validation
  if (response.projections.incomeReplacement === null) {
    errors.push("Retirement goals must include income replacement percentage");
  } else {
    if (response.projections.incomeReplacement < 50) {
      warnings.push(`Income replacement of ${response.projections.incomeReplacement}% may be insufficient for comfortable retirement`);
    } else if (response.projections.incomeReplacement > 100) {
      warnings.push(`Income replacement of ${response.projections.incomeReplacement}% is very aggressive`);
    }
  }
  
  // Age-based validation
  if (retirementAge < 59.5) {
    warnings.push("Early retirement before 59.5 may incur penalties on retirement account withdrawals");
  } else if (retirementAge > 75) {
    warnings.push("Very late retirement age - consider if this timeline is realistic");
  }
  
  // Target amount reasonableness (10-25x current income)
  const incomeMultiplier = targetAmount / (userContext.monthlyIncome * 12);
  if (incomeMultiplier < 8) {
    warnings.push(`Retirement target is only ${incomeMultiplier.toFixed(1)}x annual income. Consider increasing target.`);
  } else if (incomeMultiplier > 30) {
    warnings.push(`Retirement target is ${incomeMultiplier.toFixed(1)}x annual income. Very ambitious target.`);
  }
}

// Home buying specific validation
function validateHomeBuying(response: AIGoalResponse, userContext: any, errors: string[], warnings: string[]): void {
  const targetAmount = response.goal.targetAmount;
  const monthlyIncome = userContext.monthlyIncome;
  
  // Income replacement should be null
  if (response.projections.incomeReplacement !== null) {
    errors.push("Home buying goals should not have income replacement calculations");
  }
  
  // Home price should be reasonable relative to income (3-5x annual income)
  const homePrice = estimateHomePriceFromTarget(targetAmount);
  const incomeMultiplier = homePrice / (monthlyIncome * 12);
  
  if (incomeMultiplier > 6) {
    warnings.push(`Estimated home price is ${incomeMultiplier.toFixed(1)}x annual income. This may be difficult to qualify for.`);
  } else if (incomeMultiplier < 2) {
    warnings.push(`Target amount seems low for home buying. Consider increasing target.`);
  }
  
  // Down payment percentage validation
  const estimatedDownPayment = targetAmount * 0.6; // Assuming 60% is down payment
  const downPaymentPercent = (estimatedDownPayment / homePrice) * 100;
  
  if (downPaymentPercent < 5) {
    warnings.push("Low down payment may require PMI and higher monthly payments");
  }
}

// Passive income specific validation
function validatePassiveIncome(response: AIGoalResponse, userContext: any, errors: string[], warnings: string[]): void {
  // Income replacement should be null (different from retirement)
  if (response.projections.incomeReplacement !== null) {
    errors.push("Passive income goals should not have income replacement calculations");
  }
  
  // Validate yield assumptions
  const targetAmount = response.goal.targetAmount;
  const monthlyRequired = response.projections.monthlyRequired;
  const timeline = calculateMonthsToGoal(response.goal.targetDate);
  
  // Calculate implied yield
  const totalContributions = monthlyRequired * timeline;
  const impliedGrowth = targetAmount - totalContributions;
  const annualizedReturn = (Math.pow(targetAmount / totalContributions, 1 / (timeline / 12)) - 1) * 100;
  
  if (annualizedReturn > 15) {
    warnings.push(`Strategy assumes ${annualizedReturn.toFixed(1)}% annual return, which is very optimistic for passive income`);
  } else if (annualizedReturn < 3) {
    warnings.push(`Strategy assumes only ${annualizedReturn.toFixed(1)}% annual return, which may be too conservative`);
  }
}

// Debt payoff specific validation
function validateDebtPayoff(response: AIGoalResponse, userContext: any, errors: string[], warnings: string[]): void {
  // Income replacement should be null
  if (response.projections.incomeReplacement !== null) {
    errors.push("Debt payoff goals should not have income replacement calculations");
  }
  
  // Validate against debt-to-income ratio
  if (userContext.debtToIncomeRatio > 40) {
    warnings.push("High debt-to-income ratio detected. Consider debt consolidation or credit counseling.");
  }
  
  // Timeline validation for debt payoff
  const timeline = calculateMonthsToGoal(response.goal.targetDate);
  if (timeline > 120) { // 10 years
    warnings.push("Very long debt payoff timeline. Consider more aggressive payment strategy.");
  }
}

// Investment specific validation
function validateInvestment(response: AIGoalResponse, userContext: any, errors: string[], warnings: string[]): void {
  // Income replacement should be null
  if (response.projections.incomeReplacement !== null) {
    errors.push("Investment goals should not have income replacement calculations");
  }
  
  // Risk tolerance alignment
  const targetAmount = response.goal.targetAmount;
  const monthlyRequired = response.projections.monthlyRequired;
  const timeline = calculateMonthsToGoal(response.goal.targetDate);
  
  // Calculate required return
  const totalContributions = monthlyRequired * timeline;
  const requiredGrowth = targetAmount - totalContributions;
  const requiredReturn = (Math.pow(targetAmount / totalContributions, 1 / (timeline / 12)) - 1) * 100;
  
  // Risk tolerance validation
  if (userContext.riskTolerance === 'conservative' && requiredReturn > 8) {
    warnings.push(`Goal requires ${requiredReturn.toFixed(1)}% return but user has conservative risk tolerance`);
  } else if (userContext.riskTolerance === 'aggressive' && requiredReturn < 6) {
    warnings.push(`Conservative return expectations with aggressive risk tolerance - consider higher target`);
  }
}

// Custom goal validation
function validateCustomGoal(response: AIGoalResponse, userContext: any, errors: string[], warnings: string[]): void {
  // Income replacement should be null unless specifically retirement-related
  if (response.projections.incomeReplacement !== null) {
    const goalTitle = response.goal.title.toLowerCase();
    if (!goalTitle.includes('retirement') && !goalTitle.includes('pension')) {
      errors.push("Custom goals should not have income replacement unless retirement-related");
    }
  }
}

// Financial realism validation
function validateFinancialRealism(
  response: AIGoalResponse,
  userContext: any,
  errors: string[],
  warnings: string[],
  adjustments: string[]
): void {
  const monthlyRequired = response.projections.monthlyRequired;
  const savingsRate = (monthlyRequired / userContext.monthlyIncome) * 100;
  
  // Savings rate validation
  if (monthlyRequired > userContext.savingsCapacity) {
    errors.push(`Required savings of $${monthlyRequired.toLocaleString()}/month exceeds realistic capacity of $${userContext.savingsCapacity.toLocaleString()}/month`);
    adjustments.push(`Consider extending timeline or reducing target amount`);
  } else if (savingsRate > 50) {
    warnings.push(`Required savings rate of ${savingsRate.toFixed(1)}% is very aggressive`);
    adjustments.push(`Consider extending timeline for more manageable monthly payments`);
  } else if (savingsRate > 30) {
    warnings.push(`Savings rate of ${savingsRate.toFixed(1)}% is ambitious but achievable with discipline`);
  }
  
  // Emergency fund prerequisite
  if (userContext.emergencyFundMonths < 3 && response.goal.targetAmount > 50000) {
    warnings.push("Consider building emergency fund before pursuing large financial goals");
  }
  
  // High debt validation
  if (userContext.debtToIncomeRatio > 30 && savingsRate > 20) {
    warnings.push("High debt levels may make aggressive savings difficult. Consider debt reduction first.");
  }
}

// Timeline validation
function validateTimeline(response: AIGoalResponse, goalType: string, errors: string[], warnings: string[]): void {
  const timeline = calculateMonthsToGoal(response.goal.targetDate);
  
  // Goal-type specific timeline validation
  const timelineRules = {
    'emergency_fund': { min: 3, max: 24, optimal: 12 },
    'home_buying': { min: 6, max: 60, optimal: 24 },
    'retirement': { min: 12, max: 600, optimal: 240 }, // 1-50 years, optimal 20 years
    'passive_income': { min: 24, max: 240, optimal: 120 },
    'debt_payoff': { min: 6, max: 120, optimal: 36 },
    'investment': { min: 12, max: 240, optimal: 60 },
    'custom': { min: 3, max: 240, optimal: 24 }
  };
  
  const rules = timelineRules[goalType as keyof typeof timelineRules] || timelineRules.custom;
  
  if (timeline < rules.min) {
    errors.push(`Timeline of ${timeline} months is too short for ${goalType}. Minimum recommended: ${rules.min} months.`);
  } else if (timeline > rules.max) {
    warnings.push(`Timeline of ${timeline} months is very long for ${goalType}. Consider setting interim goals.`);
  }
  
  // Validate target date format
  const targetDate = new Date(response.goal.targetDate);
  const today = new Date();
  
  if (targetDate <= today) {
    errors.push("Target date must be in the future");
  }
}

// Milestone logic validation
function validateMilestoneLogic(response: AIGoalResponse, errors: string[], warnings: string[]): void {
  if (!response.milestones || response.milestones.length === 0) {
    errors.push("No milestones defined");
    return;
  }
  
  // Validate milestone progression
  const goalTargetAmount = response.goal.targetAmount;
  const goalTargetDate = new Date(response.goal.targetDate);
  
  let previousDate = new Date();
  let cumulativeAmount = 0;
  
  response.milestones.forEach((milestone, index) => {
    const milestoneDate = new Date(milestone.dueDate);
    
    // Only validate milestone is before goal target date
    if (milestoneDate > goalTargetDate) {
      errors.push(`Milestone ${index + 1} date is after goal target date`);
    }
    
    // Amount progression validation (keep as warnings, not errors)
    if (milestone.type === 'savings' && milestone.targetAmount) {
      if (milestone.targetAmount <= cumulativeAmount) {
        warnings.push(`Milestone ${index + 1} target amount is not progressive`);
      }
      
      if (milestone.targetAmount > goalTargetAmount) {
        warnings.push(`Milestone ${index + 1} target amount exceeds goal target`);
      }
      
      cumulativeAmount = milestone.targetAmount;
    }
  });
  
  // Final milestone should be close to goal amount
  const finalMilestone = response.milestones[response.milestones.length - 1];
  if (finalMilestone.type === 'savings' && finalMilestone.targetAmount) {
    const finalPercentage = (finalMilestone.targetAmount / goalTargetAmount) * 100;
    if (finalPercentage < 80) {
      warnings.push("Final milestone covers less than 80% of goal amount");
    }
  }
}

// Risk assessment validation
function validateRiskAssessment(
  response: AIGoalResponse,
  userContext: any,
  goalType: string,
  warnings: string[],
  adjustments: string[]
): void {
  // Age-based risk assessment
  if (userContext.age > 55 && goalType === 'investment') {
    warnings.push("Consider more conservative investment approach given age");
    adjustments.push("Adjust risk tolerance and return expectations for age-appropriate strategy");
  }
  
  // Dependents-based assessment
  if (userContext.dependents > 0 && userContext.emergencyFundMonths < 6) {
    warnings.push("Consider larger emergency fund due to dependents");
  }
  
  // Net worth relative to goals
  if (response.goal.targetAmount > userContext.netWorth * 5) {
    warnings.push("Goal amount is very large relative to current net worth");
    adjustments.push("Consider breaking into smaller, intermediate goals");
  }
}

// Helper functions
function calculateMonthsToGoal(targetDate: string): number {
  const target = new Date(targetDate);
  const now = new Date();
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}

function extractIncome(answers: QuestionnaireAnswers): number {
  const fields = ['gross_monthly_income', 'net_monthly_income', 'monthly_income'];
  for (const field of fields) {
    if (answers[field]) {
      const amount = parseFloat(String(answers[field]).replace(/[$,]/g, ''));
      if (!isNaN(amount) && amount > 0) return amount;
    }
  }
  return 5000; // Default
}

function extractExpenses(answers: QuestionnaireAnswers): number {
  const expenseFields = [
    'housing_cost', 'food_expenses', 'transportation_expenses',
    'healthcare_expenses', 'entertainment_expenses', 'other_monthly_expenses'
  ];
  
  let total = 0;
  for (const field of expenseFields) {
    if (answers[field]) {
      const amount = parseFloat(String(answers[field]).replace(/[$,]/g, ''));
      if (!isNaN(amount) && amount > 0) total += amount;
    }
  }
  
  return total || 3500; // Default
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
  
  let assets = 0, debts = 0;
  
  assetFields.forEach(field => {
    if (answers[field]) {
      const amount = parseFloat(String(answers[field]).replace(/[$,]/g, ''));
      if (!isNaN(amount) && amount > 0) assets += amount;
    }
  });
  
  debtFields.forEach(field => {
    if (answers[field]) {
      const amount = parseFloat(String(answers[field]).replace(/[$,]/g, ''));
      if (!isNaN(amount) && amount > 0) debts += amount;
    }
  });
  
  return assets - debts;
}

function extractAge(answers: QuestionnaireAnswers): number {
  if (answers['current_age']) {
    const age = parseInt(String(answers['current_age']));
    if (!isNaN(age) && age >= 18 && age <= 100) return age;
  }
  return 35; // Default
}

function extractDependents(answers: QuestionnaireAnswers): number {
  if (answers['dependents']) {
    const deps = parseInt(String(answers['dependents']));
    if (!isNaN(deps) && deps >= 0) return deps;
  }
  return 0; // Default
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

function calculateDebtToIncomeRatio(answers: QuestionnaireAnswers, monthlyIncome: number): number {
  const debtFields = [
    'credit_card_debt', 'student_loan_debt', 'auto_loan_balance', 'other_debt'
  ];
  
  let totalDebt = 0;
  debtFields.forEach(field => {
    if (answers[field]) {
      const amount = parseFloat(String(answers[field]).replace(/[$,]/g, ''));
      if (!isNaN(amount) && amount > 0) totalDebt += amount;
    }
  });
  
  // Estimate monthly debt payments (assuming 5% of total debt per month)
  const monthlyDebtPayments = totalDebt * 0.05;
  return (monthlyDebtPayments / monthlyIncome) * 100;
}

function calculateEmergencyFundCoverage(answers: QuestionnaireAnswers, monthlyExpenses: number): number {
  if (answers['emergency_fund']) {
    const amount = parseFloat(String(answers['emergency_fund']).replace(/[$,]/g, ''));
    if (!isNaN(amount) && amount > 0) {
      return amount / monthlyExpenses;
    }
  }
  return 0;
}

function estimateHomePriceFromTarget(targetAmount: number): number {
  // Assume target includes down payment (20%) + closing costs (3%) + moving expenses (2%)
  // So target = 25% of home price
  return targetAmount / 0.25;
}