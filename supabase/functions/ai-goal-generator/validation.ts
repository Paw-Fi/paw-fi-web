// AI Goal Generator Validation Utilities
// Handles validation and normalization of AI responses and questionnaire data

import type { AIGoalResponse } from "./schema.ts";

// Types for better type safety
interface QuestionnaireAnswers {
  [key: string]: string | number | boolean;
}

// Helper function to extract target amount from questionnaire answers
export function extractTargetAmountFromAnswers(answers: QuestionnaireAnswers): number {
  // Actual field names from questionnaire templates
  const targetAmountFields = [
    // Direct target amounts
    'target_amount',           // custom template
    'target_home_price',       // home_buying template
    'wealth_target',           // wealth template
    'investment_amount',       // investment template
    'total_debt_amount',       // debt_payoff template
    'target_monthly_income',   // passive_income template (needs yield calculation)
    
    // Calculated target amounts
    'monthly_essential_expenses', // emergency_fund (needs multiplication)
    
    // Income-based targets (retirement)
    'current_income',          // retirement template (used for calculation)
    
    // Generic fallbacks
    'goal_amount',
    'purchase_price',
    'savings_goal',
    'desired_amount'
  ];
  
  // Look for direct target amount fields first
  for (const field of targetAmountFields) {
    if (answers[field]) {
      const amount = parseFloat(String(answers[field]).replace(/[$,]/g, ''));
      if (!isNaN(amount) && amount > 0) {
        // Special case for emergency fund - multiply by target months
        if (field === 'monthly_essential_expenses' && answers['target_months']) {
          const months = parseInt(answers['target_months']) || 6;
          const targetAmount = amount * months;
          console.log(`Calculated emergency fund target: ${amount} * ${months} months = ${targetAmount}`);
          return targetAmount;
        }
        
        // Special case for retirement - use conservative calculation
        if (field === 'current_income') {
          // Use 10x annual income as a conservative retirement target
          const retirementTarget = amount * 10;
          console.log(`Calculated retirement target: ${amount} * 10 = ${retirementTarget}`);
          return retirementTarget;
        }

        // Special case for passive income - calculate required capital based on yield
        if (field === 'target_monthly_income') {
          // Get risk tolerance to determine realistic yield assumptions
          const riskTolerance = answers['risk_tolerance'] || 'moderate';
          let averageYield = 0.06; // Default 6% yield
          
          // Adjust yield based on risk tolerance
          switch (riskTolerance) {
            case 'conservative':
              averageYield = 0.04; // 4% yield for conservative approach
              break;
            case 'moderate':
              averageYield = 0.06; // 6% yield for moderate approach
              break;
            case 'growth_focused':
              averageYield = 0.08; // 8% yield for growth-focused approach
              break;
          }
          
          // Calculate required capital: Monthly income * 12 / average yield
          const annualPassiveIncome = amount * 12;
          const requiredCapital = annualPassiveIncome / averageYield;
          console.log(`Calculated passive income capital target: $${amount}/month * 12 / ${(averageYield * 100)}% = $${requiredCapital}`);
          return Math.round(requiredCapital);
        }
        
        console.log(`Found target amount in field ${field}: ${amount}`);
        return amount;
      }
    }
  }
  
  // If no direct target amount found, look for any large numeric field
  for (const [key, value] of Object.entries(answers)) {
    if (typeof value === 'string' || typeof value === 'number') {
      const amount = parseFloat(String(value).replace(/[$,]/g, ''));
      if (!isNaN(amount) && amount > 1000) { // Assume goals are at least $1000
        console.log(`Using ${key} as fallback target amount: ${amount}`);
        return amount;
      }
    }
  }
  
  // Last resort: return a reasonable default
  console.warn('No valid target amount found in questionnaire answers, using default $10,000');
  return 10000; // Default $10,000 goal
}

// Validation function for structured AI response
export async function validateAndNormalizeResponse(
  structuredData: AIGoalResponse, 
  questionnaireAnswers: QuestionnaireAnswers
): Promise<AIGoalResponse> {
  const today = new Date();
  const minTargetDate = new Date();
  minTargetDate.setDate(minTargetDate.getDate() + 30); // At least 30 days from now

  // Validate and fix target amount
  if (!structuredData.goal.targetAmount || structuredData.goal.targetAmount <= 0) {
    console.warn("Invalid target amount in AI response, extracting from questionnaire...");
    structuredData.goal.targetAmount = extractTargetAmountFromAnswers(questionnaireAnswers);
  }

  // Validate and fix target date
  const targetDate = new Date(structuredData.goal.targetDate);
  if (isNaN(targetDate.getTime()) || targetDate <= minTargetDate) {
    console.warn("Invalid target date in AI response, auto-correcting...");
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    structuredData.goal.targetDate = oneYearFromNow.toISOString().split('T')[0];
  }

  // Validate and fix milestone dates
  if (structuredData.milestones) {
    structuredData.milestones.forEach((milestone, index) => {
      const milestoneDate = new Date(milestone.dueDate);
      if (isNaN(milestoneDate.getTime()) || milestoneDate <= today) {
        console.warn(`Invalid milestone date for milestone ${index}, auto-correcting...`);
        const milestoneTargetDate = new Date();
        milestoneTargetDate.setMonth(milestoneTargetDate.getMonth() + (index + 1) * 3); // 3 months apart
        milestone.dueDate = milestoneTargetDate.toISOString().split('T')[0];
      }
    });
  }

  // Ensure required arrays exist
  structuredData.milestones = structuredData.milestones || [];
  structuredData.insights = structuredData.insights || [];

  return structuredData;
}

// Final validation before database insertion
export function validateFinalResponse(aiResponse: AIGoalResponse): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate target amount
  if (aiResponse.goal.targetAmount <= 0) {
    errors.push(`Invalid target amount: ${aiResponse.goal.targetAmount}`);
  }

  // Validate target date is in the future
  const targetDate = new Date(aiResponse.goal.targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of today for comparison
  
  if (targetDate <= today) {
    errors.push(`Invalid target date - must be in the future: ${aiResponse.goal.targetDate}`);
  }

  // Validate required fields
  if (!aiResponse.goal.title || aiResponse.goal.title.trim() === '') {
    errors.push('Goal title is required');
  }

  if (!aiResponse.goal.description || aiResponse.goal.description.trim() === '') {
    errors.push('Goal description is required');
  }

  if (!aiResponse.strategy || aiResponse.strategy.trim() === '') {
    errors.push('Goal strategy is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}