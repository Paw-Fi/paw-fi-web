// Request Validator - Input Validation and Sanitization
// Validates incoming requests and ensures data integrity

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface GoalGenerationRequest {
  userId?: string | null;
  goalType: string;
  questionnaireAnswers: Record<string, any>;
}

export class RequestValidator {
  
  private readonly validGoalTypes = [
    'retirement',
    'home_buying',
    'passive_income',
    'emergency_fund',
    'debt_payoff',
    'investment',
    'wealth',
    'custom'
  ];

  validateRequest(request: GoalGenerationRequest): ValidationResult {
    const errors: string[] = [];

    // Validate goal type
    if (!request.goalType) {
      errors.push("goalType is required");
    } else if (!this.validGoalTypes.includes(request.goalType)) {
      errors.push(`goalType must be one of: ${this.validGoalTypes.join(", ")}`);
    }

    // Validate questionnaire answers
    if (!request.questionnaireAnswers) {
      errors.push("questionnaireAnswers is required");
    } else if (typeof request.questionnaireAnswers !== 'object') {
      errors.push("questionnaireAnswers must be an object");
    } else if (Object.keys(request.questionnaireAnswers).length === 0) {
      errors.push("questionnaireAnswers cannot be empty");
    }

    // Validate userId format if provided
    if (request.userId !== null && request.userId !== undefined) {
      if (typeof request.userId !== 'string' || request.userId.length === 0) {
        errors.push("userId must be a non-empty string or null");
      }
    }

    // Validate questionnaire data contains essential fields
    if (request.questionnaireAnswers && typeof request.questionnaireAnswers === 'object') {
      const hasTargetAmount = this.hasValidTargetAmount(request.questionnaireAnswers);
      const hasIncomeData = this.hasValidIncomeData(request.questionnaireAnswers);

      if (!hasTargetAmount && !hasIncomeData) {
        errors.push("questionnaireAnswers must contain either target amount or income information");
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private hasValidTargetAmount(answers: Record<string, any>): boolean {
    const targetFields = [
      'target_amount',
      'goal_amount', 
      'target_home_price',
      'wealth_target',
      'investment_amount',
      'total_debt_amount',
      'savings_goal'
    ];

    return targetFields.some(field => {
      const value = answers[field];
      if (value == null) return false;
      
      const numValue = parseFloat(String(value).replace(/[$,]/g, ''));
      return !isNaN(numValue) && numValue > 0;
    });
  }

  private hasValidIncomeData(answers: Record<string, any>): boolean {
    const incomeFields = [
      'gross_monthly_income',
      'net_monthly_income', 
      'monthly_income',
      'current_income',
      'annual_income'
    ];

    return incomeFields.some(field => {
      const value = answers[field];
      if (value == null) return false;
      
      const numValue = parseFloat(String(value).replace(/[$,]/g, ''));
      return !isNaN(numValue) && numValue > 0;
    });
  }

  sanitizeRequest(request: GoalGenerationRequest): GoalGenerationRequest {
    return {
      userId: request.userId?.trim() || null,
      goalType: request.goalType?.trim().toLowerCase(),
      questionnaireAnswers: this.sanitizeAnswers(request.questionnaireAnswers)
    };
  }

  private sanitizeAnswers(answers: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(answers)) {
      // Skip null/undefined values
      if (value == null) continue;

      // Sanitize strings
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          sanitized[key] = trimmed;
        }
      }
      // Keep numbers and booleans as-is
      else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      }
      // Handle arrays
      else if (Array.isArray(value)) {
        const filtered = value.filter(item => item != null);
        if (filtered.length > 0) {
          sanitized[key] = filtered;
        }
      }
      // Handle nested objects (limited depth)
      else if (typeof value === 'object') {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}