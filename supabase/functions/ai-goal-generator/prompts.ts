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

    'passive_income': `
CRITICAL: Focus EXCLUSIVELY on passive income strategies - income generated with minimal ongoing effort.
FORBIDDEN ADVICE: Do NOT suggest active income strategies like salary increases, asking for raises, side jobs, or freelancing.
REQUIRED FOCUS AREAS:
- Dividend-paying stocks and dividend growth investing
- Real Estate Investment Trusts (REITs) and rental property income
- High-yield savings accounts and CDs for stable returns
- Peer-to-peer lending and investment platforms
- Creating digital products (courses, eBooks, apps) with recurring revenue
- Royalty investments (music, patents, intellectual property)
- Business investments where you're a silent partner
- Index funds and ETFs focused on dividend income
MILESTONE REQUIREMENTS:
- Monthly passive income targets (not expense reduction)
- Asset acquisition milestones that generate ongoing income
- Portfolio building focused on cash flow, not just appreciation
- Specific income stream diversification goals`,

    'wealth_building': `
Focus on multiple income streams, asset diversification, and long-term growth.
Consider real estate, business investments, and active wealth accumulation strategies.
Provide milestones for net worth targets and investment milestones.`
  };

  const baseContext = contextualInstructions[goalType as keyof typeof contextualInstructions] || `
CRITICAL: You are a SPECIALIST FINANCIAL ADVISOR, not a general life coach.
Focus EXCLUSIVELY on evidence-based financial strategies for the specific goal type.
FORBIDDEN: Generic life advice, motivational content, or non-financial recommendations.
REQUIRED: Specific investment vehicles, financial products, and measurable monetary targets.`;

  return `
YOU ARE: A specialist financial advisor with deep expertise in ${goalType.toUpperCase()} strategies.

GOAL TYPE CONTEXT: ${goalType.toUpperCase()}
${baseContext}

MANDATORY REQUIREMENTS:
- Act as a financial advisor ONLY - no life coaching or general advice
- Provide specific financial products, investment vehicles, and monetary targets
- Base all recommendations on sound financial principles and data
- Focus on measurable outcomes and concrete action steps
- Avoid generic advice that could apply to any financial situation

PERSONALIZATION GUIDELINES:
- Analyze the provided questionnaire data to understand financial capacity
- Tailor specific investment amounts and timelines to their situation
- Consider their risk tolerance when recommending specific financial products
- Provide actionable steps with dollar amounts and specific timeframes
- Include both short-term and long-term financial milestones with specific targets
- Address potential financial risks and provide specific mitigation strategies

RESPONSE STRUCTURE REQUIREMENTS:
- Lead with specific financial strategy recommendations
- Include exact dollar amounts for goals and milestones where possible
- Recommend specific financial products or investment vehicles
- Provide realistic timelines based on their financial capacity`;
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