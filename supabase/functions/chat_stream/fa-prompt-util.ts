import {prompt} from "./fa-prompt.ts";

const GOAL_PAGE_PATH = '/dashboard/tracker/';

export function buildContextPrompt(
  message: string,
  goalContext: any,
  isGlobalMode: boolean  // Deprecated but kept for compatibility
) {
  let contextDescription = '';
  
  // Simple context building - AI gets all goals and decides
  if (goalContext?.goalsSummary && Array.isArray(goalContext.goalsSummary)) {
    try {
      const goalsList = goalContext.goalsSummary.map((goal: any, index: number) => 
        `${index + 1}. "${goal.title || 'Untitled Goal'}" (ID: ${goal.id || 'unknown'}) - $${goal.current_amount || 0}/$${goal.target_amount || 0} (${Math.round(goal.progress_percentage || 0)}%)`
      ).join('\n');
      
      contextDescription = `
🎯 ALL USER GOALS:
${goalsList}

CONVERSATION INTELLIGENCE: You have access to the complete conversation history and all user goals. Use this information to make intelligent decisions about which goal the user is referring to and what actions to take.
`;
    } catch (error) {
      console.error('Error building goals context:', error);
      contextDescription = '\n🎯 ERROR: Could not load goals context\n';
    }
  } else {
    contextDescription = '\n🎯 NO GOALS: User has no goals available\n';
  }
  
  return `
User message: "${message}"

${contextDescription}

🧠 AI DECISION FRAMEWORK:
- Use conversation history to understand context
- Reference goals by name, ID, or position as appropriate  
- Call functions with correct goalId when user requests changes
- Provide helpful responses based on complete context

GOAL FORMATTING: When mentioning goals, use markdown links: [Goal Name](${GOAL_PAGE_PATH}goal-id)

Full Goal Context: ${goalContext ? JSON.stringify(goalContext, null, 2) : 'No goal context available'}
`;
}

export function formatPromptWithContext(
  goalData: any,
  userId: string,
  isGlobalMode: boolean,  // Deprecated but kept for compatibility
  allGoalsContext?: any
): string {
  try {
    return prompt
      .replace("{{GOAL_DATA}}", goalData ? JSON.stringify(goalData, null, 2) : 'No goal data available')
      .replace("{{USER_ID}}", userId || 'unknown')
      .replace("{{IS_GLOBAL_MODE}}", 'false')  // Always false now - AI always gets all goals
      .replace("{{ALL_GOALS_CONTEXT}}", allGoalsContext ? JSON.stringify(allGoalsContext, null, 2) : 'No goals available');
  } catch (error) {
    console.error('Error formatting prompt with context:', error);
    return prompt
      .replace("{{GOAL_DATA}}", 'Error loading goal data')
      .replace("{{USER_ID}}", userId || 'unknown')
      .replace("{{IS_GLOBAL_MODE}}", 'false')
      .replace("{{ALL_GOALS_CONTEXT}}", 'Error loading goals context');
  }
}