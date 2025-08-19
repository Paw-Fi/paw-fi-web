// Advisor Message Transformer
// Converts advisor messages from database format (content) to frontend format (message)

export interface DatabaseAdvisorMessage {
  content: string;
  tone: string;
}

export interface FrontendAdvisorMessage {
  message: string;
  tone: string;
}

export interface DatabaseAdvisorMessages {
  planMessage: DatabaseAdvisorMessage;
  insightsMessage: DatabaseAdvisorMessage;
  nextStepsMessage: DatabaseAdvisorMessage;
}

export interface FrontendAdvisorMessages {
  planMessage: FrontendAdvisorMessage;
  insightsMessage: FrontendAdvisorMessage;
  nextStepsMessage: FrontendAdvisorMessage;
}

/**
 * Transform advisor messages from database format to frontend format
 * Database format uses 'content' field, frontend expects 'message' field
 */
export function transformAdvisorMessages(
  databaseMessages: DatabaseAdvisorMessages | null | undefined
): FrontendAdvisorMessages | null {
  if (!databaseMessages) {
    console.log('🔄 No advisor messages to transform');
    return null;
  }

  console.log('🔄 Transforming advisor messages from database to frontend format');
  
  const transformed: FrontendAdvisorMessages = {
    planMessage: {
      message: databaseMessages.planMessage?.content || '',
      tone: databaseMessages.planMessage?.tone || 'informative'
    },
    insightsMessage: {
      message: databaseMessages.insightsMessage?.content || '',
      tone: databaseMessages.insightsMessage?.tone || 'informative'
    },
    nextStepsMessage: {
      message: databaseMessages.nextStepsMessage?.content || '',
      tone: databaseMessages.nextStepsMessage?.tone || 'informative'
    }
  };

  console.log('✅ Transformed advisor messages:', {
    hasPlan: !!transformed.planMessage.message,
    hasInsights: !!transformed.insightsMessage.message,
    hasNextSteps: !!transformed.nextStepsMessage.message,
    planTone: transformed.planMessage.tone,
    insightsTone: transformed.insightsMessage.tone,
    nextStepsTone: transformed.nextStepsMessage.tone
  });

  return transformed;
}

/**
 * Helper function to check if advisor messages are valid
 */
export function validateAdvisorMessages(messages: any): boolean {
  if (!messages) return false;
  
  const hasValidPlan = messages.planMessage && messages.planMessage.content;
  const hasValidInsights = messages.insightsMessage && messages.insightsMessage.content;
  const hasValidNextSteps = messages.nextStepsMessage && messages.nextStepsMessage.content;
  
  return hasValidPlan && hasValidInsights && hasValidNextSteps;
}