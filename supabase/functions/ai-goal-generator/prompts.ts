// AI Goal Generator Prompts - BULLETPROOF VERSION
// Ultra-precise prompts that guarantee consistent structure

interface QuestionnaireAnswers {
  [key: string]: string | number | boolean | string[];
}

// Main prompt generator - NO RETRY LOGIC, MUST WORK FIRST TIME
export function generatePrecisePrompt(
  goalType: string,
  questionnaireAnswers: QuestionnaireAnswers
): string {
  const today = new Date().toISOString().split('T')[0];
  
  return `You are a financial planning AI that MUST respond using the generate_complete_financial_plan function.

CRITICAL REQUIREMENTS:
- TODAY'S DATE: ${today}
- GOAL TYPE: ${goalType}
- ALL dates must be future dates in YYYY-MM-DD format
- ALL amounts must be positive integers
- RESPONSE FORMAT: Call generate_complete_financial_plan function ONLY

USER DATA:
${JSON.stringify(questionnaireAnswers, null, 2)}

CALCULATION REQUIREMENTS:
1. Extract target amount from questionnaire data
2. Calculate realistic monthly requirement: target_amount / months_to_goal (must be positive, e.g. $15000 target / 12 months = $1250/month)
3. Set target date minimum 6 months from today
4. Create 3-6 progressive milestones
5. Generate 2-5 actionable insights
6. Calculate financial profile metrics from questionnaire data
7. Set incomeReplacement to null for non-retirement goals
8. Calculate projectedFinalAmount = monthlyRequired * months_to_goal

ADVISOR MESSAGE FORMAT (REQUIRED):
Each message MUST follow: "I suggest you to [specific action], because [reason from user data], so that [clear outcome]."

FINANCIAL PROFILE REQUIREMENTS:
- Calculate net worth = (assets - debts) from questionnaire
- Extract monthly income and expenses from questionnaire
- Calculate savings rate = ((income - expenses) / income) * 100
- Extract risk tolerance from questionnaire answers
- Generate profile description summarizing user's financial situation

CALL THE FUNCTION NOW with complete data.`;
}

// Goal-specific context (minimal, focused)
export function getGoalContext(goalType: string): string {
  const contexts = {
    'retirement': 'Focus on long-term wealth accumulation, compound growth, and tax-advantaged accounts. Include income replacement percentage in projections.',
    'home_buying': 'Focus on down payment savings, credit score, and homebuying readiness. Set incomeReplacement to null.',
    'passive_income': 'Focus on dividend investing, REITs, and income-producing assets only. Set incomeReplacement to null.',
    'emergency_fund': 'Focus on liquid savings accounts and 3-6 months expense coverage. Set incomeReplacement to null.',
    'debt_payoff': 'Focus on debt reduction strategies and payment prioritization. Set incomeReplacement to null.',
    'investment': 'Focus on portfolio diversification and risk-appropriate asset allocation. Set incomeReplacement to null.',
    'custom': 'Focus on the specific goal described in questionnaire data. Set incomeReplacement to null unless it is a retirement goal.'
  };

  return contexts[goalType as keyof typeof contexts] || contexts['custom'];
}

// Financial calculation helpers
export function extractTargetAmount(answers: QuestionnaireAnswers): number {
  // Primary target amount fields
  const amountFields = [
    'target_amount', 'target_home_price', 'wealth_target', 'investment_amount',
    'total_debt_amount', 'goal_amount', 'purchase_price', 'savings_goal'
  ];

  for (const field of amountFields) {
    if (answers[field]) {
      const amount = parseFloat(String(answers[field]).replace(/[$,]/g, ''));
      if (!isNaN(amount) && amount > 0) {
        return Math.round(amount);
      }
    }
  }

  // Special calculations
  if (answers['monthly_essential_expenses'] && answers['target_months']) {
    const monthly = parseFloat(String(answers['monthly_essential_expenses']).replace(/[$,]/g, ''));
    const months = parseInt(String(answers['target_months'])) || 6;
    if (!isNaN(monthly) && monthly > 0) {
      return Math.round(monthly * months);
    }
  }

  if (answers['current_income']) {
    const income = parseFloat(String(answers['current_income']).replace(/[$,]/g, ''));
    if (!isNaN(income) && income > 0) {
      return Math.round(income * 10); // 10x income for retirement
    }
  }

  return 50000; // Default fallback
}

export function extractMonthlyIncome(answers: QuestionnaireAnswers): number {
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

  return 5000; // Default fallback
}

export function calculateMonthlyExpenses(answers: QuestionnaireAnswers): number {
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

  return totalExpenses > 0 ? Math.round(totalExpenses) : Math.round(extractMonthlyIncome(answers) * 0.7);
}

export function extractRiskTolerance(answers: QuestionnaireAnswers): 'conservative' | 'moderate' | 'aggressive' {
  const riskField = answers['risk_tolerance'] || answers['investment_risk_tolerance'];
  
  if (typeof riskField === 'string') {
    const risk = riskField.toLowerCase();
    if (risk.includes('conserv')) return 'conservative';
    if (risk.includes('aggr') || risk.includes('growth')) return 'aggressive';
  }
  
  return 'moderate'; // Default
}

// Validation helper
export function validatePromptInputs(goalType: string, answers: QuestionnaireAnswers): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!goalType || goalType.trim() === '') {
    errors.push('Goal type is required');
  }

  if (!answers || Object.keys(answers).length === 0) {
    errors.push('Questionnaire answers are required');
  }

  const targetAmount = extractTargetAmount(answers);
  if (targetAmount <= 0) {
    errors.push('Cannot determine valid target amount from questionnaire');
  }

  const monthlyIncome = extractMonthlyIncome(answers);
  if (monthlyIncome <= 0) {
    errors.push('Cannot determine valid monthly income from questionnaire');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}