import type { Question } from "@/types/learning.types";

// Define interface for AI responses
export interface AIResponse {
  content: string;
  isComplete: boolean;
  generatedLessons?: Lesson;
}

// Define interfaces for mock conversation
export interface Conversation {
  userInput: string;
  aiResponse: AIResponse;
}

// Define interface for a lesson
export interface Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon: string;
  questions: Question[];
}

// Mock conversations with different user inputs and AI responses
export const mockConversations: Record<string, Conversation[]> = {
  // Beginner investing flow
  "beginner-investing": [
    {
      userInput: "I'm new to investing and don't know where to start",
      aiResponse: {
        content: "I'd love to help you build a foundation. Could you tell me what your main financial goals are? For example, are you saving for retirement, a home, or just want to grow your wealth in general?",
        isComplete: false
      }
    },
    {
      userInput: "I mainly want to save for retirement and maybe buy a house in the future",
      aiResponse: {
        content: "Great goals! Retirement and home ownership are important milestones. When it comes to risk, how would you feel about temporary drops in your investment value if it meant potentially higher returns long-term? On a scale of 1-5, with 1 being very uncomfortable and 5 being completely comfortable with volatility.",
        isComplete: false
      }
    },
    {
      userInput: "Maybe a 3? I don't want to lose money but understand some risk is needed",
      aiResponse: {
        content: "That's a balanced approach! Based on our conversation, I think you'd benefit from learning about retirement accounts like 401(k)s and IRAs, index fund investing, and how to save for major purchases like a home. I've created some personalized lessons to help you get started on your investing journey.",
        isComplete: true,
        generatedLessons: {
          id: "beginner-retirement-planning",
          title: "Retirement & Long-term Planning",
          description: "Learn the fundamentals of retirement accounts and long-term investing strategies.",
          xp: 75,
          unlocked: true,
          icon: "🏦",
          questions: [
            {
              id: "retirement-accounts",
              type: "scq",
              question: "Which retirement account typically comes from an employer?",
              options: [
                { id: "opt-1", content: "401(k) Plan", isCorrect: true },
                { id: "opt-2", content: "Traditional IRA", isCorrect: false },
                { id: "opt-3", content: "Roth IRA", isCorrect: false },
                { id: "opt-4", content: "Health Savings Account (HSA)", isCorrect: false }
              ],
              explanation: "A 401(k) is an employer-sponsored retirement plan that allows you to contribute directly from your paycheck, often with employer matching."
            },
            {
              id: "index-funds",
              type: "mcq",
              question: "What are the benefits of index fund investing? (Select all that apply)",
              options: [
                { id: "opt-1", content: "Low fees compared to actively managed funds", isCorrect: true },
                { id: "opt-2", content: "Instant diversification across many companies", isCorrect: true },
                { id: "opt-3", content: "Guaranteed returns every year", isCorrect: false },
                { id: "opt-4", content: "Historically outperforms most active managers over long periods", isCorrect: true },
                { id: "opt-5", content: "Requires minimal time and research", isCorrect: true }
              ],
              explanation: "Index funds offer diversification, low costs, and simplicity - perfect for beginning investors with a medium risk tolerance."
            },
            {
              id: "emergency-fund",
              type: "scq",
              question: "How much should you have in an emergency fund before focusing heavily on investing?",
              options: [
                { id: "opt-1", content: "No emergency fund needed if you have investments", isCorrect: false },
                { id: "opt-2", content: "1 month of expenses", isCorrect: false },
                { id: "opt-3", content: "3-6 months of expenses", isCorrect: true },
                { id: "opt-4", content: "At least 1 year of expenses", isCorrect: false }
              ],
              explanation: "A 3-6 month emergency fund provides a solid financial foundation before investing more aggressively for long-term goals."
            },
            {
              id: "home-downpayment",
              type: "match",
              question: "Match the savings vehicle with its best use for home buying:",
              items: [
                { id: "item-1", content: "High-yield savings account" },
                { id: "item-2", content: "Stock market investments" },
                { id: "item-3", content: "I Bonds" },
                { id: "item-4", content: "401(k) loan" }
              ],
              options: [
                { id: "opt-1", content: "For a home purchase in 1-2 years" },
                { id: "opt-2", content: "For a home purchase in 7+ years" },
                { id: "opt-3", content: "For a home purchase in 3-5 years" },
                { id: "opt-4", content: "Last resort option, generally not recommended" }
              ],
              correctMatches: {
                "item-1": "opt-1",
                "item-2": "opt-2",
                "item-3": "opt-3",
                "item-4": "opt-4"
              },
              explanation: "Your timeline determines where to save for a home down payment. Shorter timelines need more conservative options."
            }
          ]
        }
      }
    }
  ],
  
  // Debt management flow
  "debt-management": [
    {
      userInput: "I have a lot of debt and need help figuring out how to pay it off",
      aiResponse: {
        content: "I understand dealing with debt can be stressful. I'm here to help you develop a plan. Could you share what types of debt you have? For example, credit cards, student loans, auto loans, or a mortgage?",
        isComplete: false
      }
    },
    {
      userInput: "I have credit card debt with high interest rates and some student loans",
      aiResponse: {
        content: "Thank you for sharing. High-interest credit card debt is typically the most important to tackle first. Do you know approximately what interest rates you're paying on your credit cards and student loans?",
        isComplete: false
      }
    },
    {
      userInput: "Credit cards are about 22% and student loans are around 5%",
      aiResponse: {
        content: "Those credit card rates are definitely high! Based on our conversation, I've created some lessons to help you manage your debt effectively, with a focus on tackling those high-interest credit cards first while maintaining your student loan payments.",
        isComplete: true,
        generatedLessons: {
          id: "debt-reduction-strategies",
          title: "Strategic Debt Reduction",
          description: "Learn proven methods to tackle high-interest debt and create a sustainable financial future.",
          xp: 60,
          unlocked: true,
          icon: "💸",
          questions: [
            {
              id: "debt-payoff-method",
              type: "scq",
              question: "Which debt payoff method would be most effective for someone with high-interest credit cards and lower-interest student loans?",
              options: [
                { id: "opt-1", content: "Debt snowball (paying smallest balances first)", isCorrect: false },
                { id: "opt-2", content: "Debt avalanche (paying highest interest rates first)", isCorrect: true },
                { id: "opt-3", content: "Debt consolidation loan", isCorrect: false },
                { id: "opt-4", content: "Pay all debts equally", isCorrect: false }
              ],
              explanation: "The debt avalanche method prioritizes debts with the highest interest rates first (like credit cards), which saves the most money in interest over time."
            },
            {
              id: "interest-savings",
              type: "text-input",
              question: "If you have $5,000 in credit card debt at 22% interest, approximately how much interest would you pay in one year if making minimum payments?",
              correctAnswers: ["$1,100", "1100", "1100 dollars", "$1100", "about 1100", "approximately $1100", "around $1100", "around 1100"],
              explanation: "$5,000 × 22% = $1,100 in annual interest. This shows why high-interest debt is so important to eliminate quickly!"
            },
            {
              id: "emergency-fund-debt",
              type: "scq",
              question: "While aggressively paying off high-interest debt, how much should you aim to have in an emergency fund?",
              options: [
                { id: "opt-1", content: "No emergency fund until all debt is paid", isCorrect: false },
                { id: "opt-2", content: "1 month of expenses", isCorrect: true },
                { id: "opt-3", content: "6 months of expenses", isCorrect: false },
                { id: "opt-4", content: "12 months of expenses", isCorrect: false }
              ],
              explanation: "A starter emergency fund of 1 month's expenses provides some security while you focus on eliminating high-interest debt. After the high-interest debt is gone, you can build this up to 3-6 months."
            },
            {
              id: "debt-consolidation",
              type: "sort-categories",
              question: "Sort these debt management options by whether they're generally good strategies for someone with high-interest credit card debt.",
              items: [
                { id: "item-1", content: "Balance transfer to a 0% APR credit card" },
                { id: "item-2", content: "Taking a cash advance from another credit card" },
                { id: "item-3", content: "Personal loan at 9% to pay off 22% credit cards" },
                { id: "item-4", content: "Using retirement savings to pay off debt" }
              ],
              categories: [
                { id: "recommended", name: "Generally Recommended" },
                { id: "not-recommended", name: "Generally Not Recommended" }
              ],
              correctAnswers: {
                "item-1": "recommended",
                "item-2": "not-recommended",
                "item-3": "recommended",
                "item-4": "not-recommended"
              },
              explanation: "Strategies that lower your interest rate without creating new financial problems are generally recommended."
            }
          ]
        }
      }
    }
  ],

  // Retirement planning flow
  "retirement-planning": [
    {
      userInput: "I want to make sure I'm on track for retirement",
      aiResponse: {
        content: "That's great that you're thinking about retirement planning! To give you the most relevant guidance, could you tell me roughly how old you are and when you hope to retire?",
        isComplete: false
      }
    },
    {
      userInput: "I'm 35 and would like to retire around 65",
      aiResponse: {
        content: "Thank you! And approximately how much are you currently contributing to retirement accounts each month or as a percentage of your income?",
        isComplete: false
      }
    },
    {
      userInput: "I put about 10% of my salary into my 401(k) with a 5% employer match",
      aiResponse: {
        content: "That's excellent! A 15% total contribution (your 10% plus the 5% match) is a strong savings rate. Based on your age and savings rate, I've created some personalized retirement planning lessons for you.",
        isComplete: true,
        generatedLessons: {
          id: "mid-career-retirement-planning",
          title: "Mid-Career Retirement Planning",
          description: "Optimize your retirement strategy and ensure you're on track for your goals.",
          xp: 80,
          unlocked: true,
          icon: "🏝️",
          questions: [
            {
              id: "retirement-contribution",
              type: "scq",
              question: "For someone currently saving 15% (including employer match) who wants to retire at 65, which statement is most accurate?",
              options: [
                { id: "opt-1", content: "They should immediately increase contributions to 25% to catch up", isCorrect: false },
                { id: "opt-2", content: "15% is a solid contribution rate that's likely to build adequate retirement savings", isCorrect: true },
                { id: "opt-3", content: "They can reduce contributions to 10% total and still be fine", isCorrect: false },
                { id: "opt-4", content: "They should focus on more aggressive investments instead of increasing contributions", isCorrect: false }
              ],
              explanation: "Financial experts typically recommend saving 15% of income (including any employer match) throughout your career for a comfortable retirement."
            },
            {
              id: "investment-allocation",
              type: "mcq",
              question: "For a 35-year-old with 30 years until retirement, which investments would typically be appropriate? (Select all that apply)",
              options: [
                { id: "opt-1", content: "Mostly stocks or stock funds (70-90%)", isCorrect: true },
                { id: "opt-2", content: "Mostly bonds (70-90%)", isCorrect: false },
                { id: "opt-3", content: "Target date fund for 2050-2055", isCorrect: true },
                { id: "opt-4", content: "Keeping most retirement savings in cash or CDs", isCorrect: false },
                { id: "opt-5", content: "A globally diversified portfolio", isCorrect: true }
              ],
              explanation: "With 30 years until retirement, you can take advantage of higher growth potential from stocks while having time to ride out market volatility."
            },
            {
              id: "roth-vs-traditional",
              type: "match",
              question: "Match each retirement account type with its key tax advantage:",
              items: [
                { id: "item-1", content: "Traditional 401(k)/IRA" },
                { id: "item-2", content: "Roth 401(k)/IRA" },
                { id: "item-3", content: "HSA (for retirement)" },
                { id: "item-4", content: "Taxable brokerage account" }
              ],
              options: [
                { id: "opt-1", content: "Tax deduction now, taxed in retirement" },
                { id: "opt-2", content: "Taxed now, tax-free in retirement" },
                { id: "opt-3", content: "Triple tax advantage: deduction now, tax-free growth and withdrawals" },
                { id: "opt-4", content: "No tax advantages, but no withdrawal restrictions" }
              ],
              correctMatches: {
                "item-1": "opt-1",
                "item-2": "opt-2",
                "item-3": "opt-3",
                "item-4": "opt-4"
              },
              explanation: "Understanding the tax treatment of different account types helps you build a more tax-efficient retirement strategy."
            },
            {
              id: "retirement-multiple",
              type: "text-input",
              question: "By age 35, financial experts suggest having approximately how many times your annual salary saved for retirement?",
              correctAnswers: ["2", "two", "2x", "two times", "about 2", "approximately 2", "around 2"],
              explanation: "A common guideline is to have 1x your salary by 30, 2x by 35, 3x by 40, and so on, reaching 10-12x by retirement age."
            }
          ]
        }
      }
    }
  ]
};

// Helper function to get AI response based on user input pattern matching
export function getMockAIResponse(userInput: string, conversationStep: number): AIResponse {
  // Lowercase user input for easier matching
  const input = userInput.toLowerCase();
  
  // Determine which conversation flow to use based on keywords in the first user message
  if (conversationStep === 0) {
    if (input.includes("new") || input.includes("beginner") || input.includes("start")) {
      return mockConversations["beginner-investing"][0].aiResponse;
    } else if (input.includes("debt") || input.includes("credit card") || input.includes("loan")) {
      return mockConversations["debt-management"][0].aiResponse;
    } else if (input.includes("retire") || input.includes("retirement") || input.includes("future")) {
      return mockConversations["retirement-planning"][0].aiResponse;
    }
    // Default to beginner investing if no match
    return mockConversations["beginner-investing"][0].aiResponse;
  }
  
  // For subsequent steps, continue the conversation flow that was started
  // This is a simplified approach - in a real implementation, you would use the 
  // conversation history and AI to determine the most appropriate response
  
  // Determine which flow we're in based on the previous responses
  let currentFlow = "beginner-investing"; // Default
  
  if (input.includes("debt") || input.includes("credit card") || input.includes("interest")) {
    currentFlow = "debt-management";
  } else if (input.includes("retire") || input.includes("age") || input.includes("401k") || input.includes("401(k)")) {
    currentFlow = "retirement-planning";
  }
  
  // Get the response for the current step in the flow
  const flowConversation = mockConversations[currentFlow];
  
  // Check if we have a response for this step
  if (conversationStep < flowConversation.length) {
    return flowConversation[conversationStep].aiResponse;
  }
  
  // If we don't have a predefined response for this step, return a generic response
  return {
    content: "I don't have a specific response for this step, but I'm listening and learning about your financial situation.",
    isComplete: false
  };
}
