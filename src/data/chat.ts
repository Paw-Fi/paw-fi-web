import type { LearningQuizQuestion } from "@/types/learning.types";

// Define all Chat questions
export const questions: LearningQuizQuestion[] = [
    {
      id: 'investingExperience',
      question_id: 'investingExperience',
      type: 'scq',
      question: "What's your experience with investing?",
      explanation: "This helps me tailor content to your needs.",
      options: [
        {
          id: 'beginner',
          content: "Just Starting",
          description: "I'm new to investing and saving.",
          isCorrect: false
        },
        {
          id: 'intermediate',
          content: "Some Experience",
          description: "I know the basics but want to learn more.",
          isCorrect: false
        },
        {
          id: 'advanced',
          content: "Experienced",
          description: "I'm comfortable with investing concepts.",
          isCorrect: false
        }
      ]
    },
    {
      id: 'financialGoals',
      question_id: 'financialGoals',
      type: 'mcq',
      question: "What are your financial goals?",
      explanation: "Select all that apply to your situation.",
      itemsPerRow: 2, // Display options in a 2-column grid
      options: [
        { id: 'emergencyFund', content: 'Emergency fund', isCorrect: false },
        { id: 'retirement', content: 'Retirement', isCorrect: false },
        { id: 'homePurchase', content: 'Home purchase', isCorrect: false },
        { id: 'travel', content: 'Travel', isCorrect: false },
        { id: 'education', content: 'Education', isCorrect: false },
        { id: 'debtPayoff', content: 'Debt payoff', isCorrect: false },
        { id: 'startingBusiness', content: 'Starting a business', isCorrect: false },
        { id: 'familyPlanning', content: 'Family planning', isCorrect: false },
        { id: 'majorPurchase', content: 'Major purchase', isCorrect: false },
        { id: 'wealthBuilding', content: 'Wealth building', isCorrect: false }
      ]
    },
    {
      id: 'monthlySavings',
      question_id: 'monthlySavings',
      type: 'text-input',
      question: "How much can you save monthly?",
      explanation: "Even small amounts add up over time! This helps me suggest realistic goals.",
      prefix: "$",
      placeholder: "0",
      validation: {
        pattern: "^\\d+(\\.\\d{1,2})?$",  // Dollars with optional cents
        min: 0,
        required: true,
        errorMessage: "Please enter a valid dollar amount"
      }
    }
  ];