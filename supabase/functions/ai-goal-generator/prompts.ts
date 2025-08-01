// AI Goal Generator Prompt Utilities
// Handles prompt preparation and enhancement for AI goal generation

// Enhance AI prompt with structured output instructions and validation context
export function enhancePromptForStructuredOutput(basePrompt: string, questionnaireAnswers: any): string {
  let enhancedPrompt = basePrompt;

  // Replace questionnaire data placeholder
  enhancedPrompt = enhancedPrompt.replace(
    "{{QUESTIONNAIRE_DATA}}", 
    JSON.stringify(questionnaireAnswers, null, 2)
  );

  // Ensure the prompt emphasizes structured function calling
  if (!enhancedPrompt.toLowerCase().includes('function')) {
    enhancedPrompt += "\n\nIMPORTANT: You must use the generate_financial_goal function to structure your response. Do not provide free-form text or JSON - use the function calling interface.";
  }

  // Add current date context and validation instructions
  const today = new Date().toISOString().split('T')[0];
  enhancedPrompt += `

CRITICAL REQUIREMENTS:
- Today's date is ${today}
- The goal's targetDate MUST be a future date (at least 30 days from today)
- All milestone dueDates must be in the future and properly sequenced
- Target amounts must be positive numbers
- Use the generate_financial_goal function to structure your response
- Provide realistic, actionable milestones with clear timelines
- Include diverse insight types: strategy insights, risk warnings, opportunities, and behavioral tips`;

  return enhancedPrompt;
}

// Add retry-specific instructions to the prompt
export function addRetryInstructions(prompt: string, attemptNumber: number): string {
  const retryInstructions = {
    1: "\n\nPlease ensure you call the generate_financial_goal function with all required parameters properly structured.",
    2: "\n\nIMPORTANT: You must use the generate_financial_goal function to structure your response. Do not provide free-form text."
  };

  return prompt + (retryInstructions[attemptNumber as keyof typeof retryInstructions] || "");
}

// Generate context-aware prompt based on goal type
export function generateContextPrompt(goalType: string, questionnaireAnswers: any): string {
  const contextualInstructions = {
    'retirement': `
Focus on long-term wealth building strategies, compound interest, and retirement account optimization.
Consider tax-advantaged accounts, employer matching, and age-appropriate risk levels.
Provide milestones for contribution increases and portfolio rebalancing.`,

    'home_buying': `
Focus on down payment strategies, credit score improvement, and pre-approval preparation.
Consider closing costs, emergency funds, and ongoing homeownership expenses.
Provide milestones for savings targets and homebuying process steps.`,

    'emergency_fund': `
Focus on liquidity, accessibility, and gradual building strategies.
Consider 3-6 months of expenses and high-yield savings options.
Provide milestones for monthly savings targets and fund growth.`,

    'debt_payoff': `
Focus on debt avalanche/snowball strategies and interest minimization.
Consider debt consolidation options and payment acceleration.
Provide milestones for individual debt payments and overall progress.`,

    'investment': `
Focus on diversification, risk management, and growth strategies.
Consider time horizon, risk tolerance, and investment vehicle selection.
Provide milestones for portfolio building and performance monitoring.`,

    'wealth_building': `
Focus on multiple income streams, asset diversification, and long-term growth.
Consider real estate, business investments, and passive income strategies.
Provide milestones for net worth targets and investment milestones.`
  };

  const baseContext = contextualInstructions[goalType as keyof typeof contextualInstructions] || `
Focus on practical, achievable financial strategies appropriate for the goal type.
Consider the user's financial situation and provide realistic timelines.
Provide milestones that build toward the ultimate goal systematically.`;

  return `
GOAL TYPE CONTEXT: ${goalType.toUpperCase()}
${baseContext}

PERSONALIZATION GUIDELINES:
- Analyze the provided questionnaire data carefully
- Tailor advice to the user's specific financial situation
- Consider their risk tolerance, timeline, and preferences
- Provide actionable, specific guidance rather than generic advice
- Include both short-term and long-term milestones
- Address potential challenges and provide solutions`;
}

// Validate and clean prompt before sending to AI
export function validateAndCleanPrompt(prompt: string): { isValid: boolean; cleanedPrompt: string; issues: string[] } {
  const issues: string[] = [];
  let cleanedPrompt = prompt;

  // Check for required elements
  if (!prompt.includes('generate_financial_goal')) {
    issues.push('Missing function calling instruction');
  }

  if (!prompt.includes('{{QUESTIONNAIRE_DATA}}') && !prompt.includes('{')) {
    issues.push('Missing questionnaire data or placeholder');
  }

  // Clean up common formatting issues
  cleanedPrompt = cleanedPrompt
    .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
    .replace(/\s{2,}/g, ' ')    // Remove excessive spaces
    .trim();

  // Ensure minimum length
  if (cleanedPrompt.length < 100) {
    issues.push('Prompt is too short to be effective');
  }

  return {
    isValid: issues.length === 0,
    cleanedPrompt,
    issues
  };
}