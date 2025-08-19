// AI Goal Generator Validation - BULLETPROOF VERSION
// Strict validation that prevents ALL database failures

import type { AIGoalResponse } from "./schema.ts";

interface QuestionnaireAnswers {
  [key: string]: string | number | boolean | string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// FAIL-FAST VALIDATION - Must pass 100% before database operations
export function validateAIResponse(response: AIGoalResponse): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // GOAL VALIDATION
  if (!response.goal) {
    errors.push("Goal object is missing");
    return { isValid: false, errors, warnings };
  }

  // Title validation
  if (!response.goal.title || response.goal.title.trim().length === 0) {
    errors.push("Goal title is required");
  } else if (response.goal.title.length > 255) {
    errors.push("Goal title exceeds 255 characters");
  }

  // Description validation
  if (!response.goal.description || response.goal.description.trim().length === 0) {
    errors.push("Goal description is required");
  } else if (response.goal.description.length < 100) {
    errors.push("Goal description too short (minimum 100 characters)");
  } else if (response.goal.description.length > 2000) {
    errors.push("Goal description too long (maximum 2000 characters)");
  }

  // Target amount validation
  if (!response.goal.targetAmount || typeof response.goal.targetAmount !== 'number') {
    errors.push("Goal target amount must be a number");
  } else if (response.goal.targetAmount <= 0) {
    errors.push("Goal target amount must be positive");
  } else if (response.goal.targetAmount > 100000000) {
    errors.push("Goal target amount exceeds reasonable limit");
  }

  // Target date validation
  if (!response.goal.targetDate) {
    errors.push("Goal target date is required");
  } else {
    const targetDate = new Date(response.goal.targetDate);
    if (isNaN(targetDate.getTime())) {
      errors.push("Goal target date is invalid");
    } else if (targetDate <= today) {
      errors.push("Goal target date must be in the future");
    } else {
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 50);
      if (targetDate > maxDate) {
        errors.push("Goal target date is too far in the future");
      }
    }
  }

  // Rationale validation
  if (!response.goal.rationale || response.goal.rationale.trim().length === 0) {
    errors.push("Goal rationale is required");
  } else if (response.goal.rationale.length > 1000) {
    errors.push("Goal rationale too long (maximum 1000 characters)");
  }

  // STRATEGY VALIDATION
  if (!response.strategy || response.strategy.trim().length === 0) {
    errors.push("Strategy is required");
  } else if (response.strategy.length < 200) {
    errors.push("Strategy too short (minimum 200 characters)");
  } else if (response.strategy.length > 3000) {
    errors.push("Strategy too long (maximum 3000 characters)");
  }

  // MILESTONES VALIDATION
  if (!response.milestones || !Array.isArray(response.milestones)) {
    errors.push("Milestones must be an array");
  } else {
    if (response.milestones.length < 3) {
      errors.push("Must have at least 3 milestones");
    } else if (response.milestones.length > 6) {
      errors.push("Cannot have more than 6 milestones");
    }

    response.milestones.forEach((milestone, index) => {
      const prefix = `Milestone ${index + 1}:`;
      
      if (!milestone.title || milestone.title.trim().length === 0) {
        errors.push(`${prefix} title is required`);
      } else if (milestone.title.length > 255) {
        errors.push(`${prefix} title too long`);
      }

      if (!milestone.description || milestone.description.trim().length === 0) {
        errors.push(`${prefix} description is required`);
      } else if (milestone.description.length > 1000) {
        errors.push(`${prefix} description too long`);
      }

      const validTypes = ['savings', 'action', 'habit', 'review'];
      if (!validTypes.includes(milestone.type)) {
        errors.push(`${prefix} type must be one of: ${validTypes.join(', ')}`);
      }

      if (!milestone.dueDate) {
        errors.push(`${prefix} due date is required`);
      } else {
        const dueDate = new Date(milestone.dueDate);
        if (isNaN(dueDate.getTime())) {
          errors.push(`${prefix} due date is invalid`);
        } else if (dueDate <= today) {
          errors.push(`${prefix} due date must be in the future`);
        }
      }

      const validPriorities = ['critical', 'high', 'medium', 'low'];
      if (!validPriorities.includes(milestone.priority)) {
        errors.push(`${prefix} priority must be one of: ${validPriorities.join(', ')}`);
      }

      if (!milestone.aiRationale || milestone.aiRationale.trim().length === 0) {
        errors.push(`${prefix} AI rationale is required`);
      }

      // Type-specific validation
      if (milestone.type === 'habit') {
        if (!milestone.habitDescription) {
          errors.push(`${prefix} habit description required for habit type`);
        }
        const validFrequencies = ['daily', 'weekly', 'monthly', 'one-time'];
        if (!milestone.frequency || !validFrequencies.includes(milestone.frequency)) {
          errors.push(`${prefix} valid frequency required for habit type`);
        }
      }

      if (milestone.type === 'savings' && milestone.targetAmount !== null) {
        if (typeof milestone.targetAmount !== 'number' || milestone.targetAmount <= 0) {
          errors.push(`${prefix} valid target amount required for savings type`);
        }
      }
    });
  }

  // INSIGHTS VALIDATION
  if (!response.insights || !Array.isArray(response.insights)) {
    errors.push("Insights must be an array");
  } else {
    if (response.insights.length < 2) {
      errors.push("Must have at least 2 insights");
    } else if (response.insights.length > 5) {
      errors.push("Cannot have more than 5 insights");
    }

    response.insights.forEach((insight, index) => {
      const prefix = `Insight ${index + 1}:`;
      
      const validTypes = ['strategy_insight', 'risk_warning', 'opportunity', 'behavioral_tip'];
      if (!validTypes.includes(insight.type)) {
        errors.push(`${prefix} type must be one of: ${validTypes.join(', ')}`);
      }

      if (!insight.title || insight.title.trim().length === 0) {
        errors.push(`${prefix} title is required`);
      } else if (insight.title.length > 255) {
        errors.push(`${prefix} title too long`);
      }

      if (!insight.content || insight.content.trim().length === 0) {
        errors.push(`${prefix} content is required`);
      } else if (insight.content.length < 100) {
        errors.push(`${prefix} content too short (minimum 100 characters)`);
      } else if (insight.content.length > 1000) {
        errors.push(`${prefix} content too long (maximum 1000 characters)`);
      }

      const validPriorities = ['critical', 'high', 'medium', 'low'];
      if (!validPriorities.includes(insight.priority)) {
        errors.push(`${prefix} priority must be one of: ${validPriorities.join(', ')}`);
      }

      if (typeof insight.actionable !== 'boolean') {
        errors.push(`${prefix} actionable must be boolean`);
      }
    });
  }

  // PROJECTIONS VALIDATION
  if (!response.projections) {
    errors.push("Projections object is missing");
  } else {
    if (typeof response.projections.monthlyRequired !== 'number' || response.projections.monthlyRequired <= 0) {
      errors.push("Monthly required amount must be positive number");
    }

    if (typeof response.projections.projectedFinalAmount !== 'number' || response.projections.projectedFinalAmount <= 0) {
      errors.push("Projected final amount must be positive number");
    }

    if (typeof response.projections.confidenceLevel !== 'number' || 
        response.projections.confidenceLevel < 0.5 || 
        response.projections.confidenceLevel > 1.0) {
      errors.push("Confidence level must be between 0.5 and 1.0");
    }

    if (response.projections.incomeReplacement !== null) {
      if (typeof response.projections.incomeReplacement !== 'number' || 
          response.projections.incomeReplacement < 0 || 
          response.projections.incomeReplacement > 200) {
        errors.push("Income replacement must be between 0 and 200");
      }
    }
  }

  // ADVISOR MESSAGES VALIDATION
  if (!response.advisorMessages) {
    errors.push("Advisor messages object is missing");
  } else {
    const validTones = ['congratulatory', 'encouraging', 'motivational', 'reassuring', 'informative'];
    
    ['planMessage', 'insightsMessage', 'nextStepsMessage'].forEach(messageType => {
      const message = response.advisorMessages[messageType as keyof typeof response.advisorMessages];
      if (!message) {
        errors.push(`${messageType} is missing`);
      } else {
        if (!message.content || message.content.trim().length === 0) {
          errors.push(`${messageType} content is required`);
        } else if (message.content.length < 200) {
          errors.push(`${messageType} content too short (minimum 200 characters)`);
        } else if (message.content.length > 800) {
          errors.push(`${messageType} content too long (maximum 800 characters)`);
        }

        if (!validTones.includes(message.tone)) {
          errors.push(`${messageType} tone must be one of: ${validTones.join(', ')}`);
        }

        // Check required format
        if (!message.content.includes('I suggest you to')) {
          errors.push(`${messageType} must follow required format: 'I suggest you to [action], because [reason], so that [outcome].'`);
        }
      }
    });
  }

  // FINANCIAL PROFILE VALIDATION
  if (!response.financialProfile) {
    errors.push("Financial profile object is missing");
  } else {
    if (!response.financialProfile.profileDescription || response.financialProfile.profileDescription.trim().length === 0) {
      errors.push("Financial profile description is required");
    } else if (response.financialProfile.profileDescription.length < 300) {
      errors.push("Financial profile description too short (minimum 300 characters)");
    } else if (response.financialProfile.profileDescription.length > 2000) {
      errors.push("Financial profile description too long (maximum 2000 characters)");
    }

    if (!response.financialProfile.profileData) {
      errors.push("Financial profile data is missing");
    } else {
      const data = response.financialProfile.profileData;

      if (typeof data.netWorth !== 'number') {
        errors.push("Net worth must be a number");
      }

      if (typeof data.monthlyIncome !== 'number' || data.monthlyIncome <= 0) {
        errors.push("Monthly income must be positive number");
      }

      if (typeof data.monthlyExpenses !== 'number' || data.monthlyExpenses < 0) {
        errors.push("Monthly expenses must be non-negative number");
      }

      if (typeof data.savingsRate !== 'number' || data.savingsRate < 0 || data.savingsRate > 100) {
        errors.push("Savings rate must be between 0 and 100");
      }

      const validRisk = ['conservative', 'moderate', 'aggressive'];
      if (!validRisk.includes(data.riskTolerance)) {
        errors.push(`Risk tolerance must be one of: ${validRisk.join(', ')}`);
      }

      if (!Array.isArray(data.financialGoals) || data.financialGoals.length < 2) {
        errors.push("Must have at least 2 financial goals");
      }

      if (!Array.isArray(data.strengths) || data.strengths.length < 2) {
        errors.push("Must have at least 2 financial strengths");
      }

      if (!Array.isArray(data.recommendations) || data.recommendations.length < 3) {
        errors.push("Must have at least 3 recommendations");
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Database compatibility validation
export function validateDatabaseCompatibility(response: AIGoalResponse): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check all string fields for dangerous characters
  const dangerousChars = /[<>\"']/g;
  
  if (dangerousChars.test(response.goal.title)) {
    errors.push("Goal title contains dangerous characters");
  }

  if (dangerousChars.test(response.goal.description)) {
    errors.push("Goal description contains dangerous characters");
  }

  // Validate all dates are properly formatted
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(response.goal.targetDate)) {
    errors.push("Goal target date not in YYYY-MM-DD format");
  }

  response.milestones.forEach((milestone, index) => {
    if (!dateRegex.test(milestone.dueDate)) {
      errors.push(`Milestone ${index + 1} due date not in YYYY-MM-DD format`);
    }
  });

  // Validate JSONB compatibility
  try {
    JSON.stringify(response.advisorMessages);
  } catch (e) {
    errors.push("Advisor messages not JSON serializable");
  }

  try {
    JSON.stringify(response.financialProfile);
  } catch (e) {
    errors.push("Financial profile not JSON serializable");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Complete validation pipeline
export function validateComplete(response: AIGoalResponse): ValidationResult {
  const structuralValidation = validateAIResponse(response);
  if (!structuralValidation.isValid) {
    return structuralValidation;
  }

  const dbValidation = validateDatabaseCompatibility(response);
  return {
    isValid: dbValidation.isValid,
    errors: [...structuralValidation.errors, ...dbValidation.errors],
    warnings: [...structuralValidation.warnings, ...dbValidation.warnings]
  };
}