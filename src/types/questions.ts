export type QuestionType = 'radio' | 'checkbox' | 'number' | 'sortable';

export interface Option {
  id: string;
  label: string;
  description?: string;
}

export interface Question {
  id: string;
  title: string;
  description: string;
  type: QuestionType;
  options?: Array<Option>;
  min?: number;
  max?: number;
  placeholder?: string;
}

export interface QuestionnaireState {
  currentStep: number;
  answers: Record<string, string | Array<string> | number>;
}

// Initial questions data
export const questions: Array<Question> = [
  {
    id: 'investingExperience',
    title: "What's your experience with investing?",
    description: "This helps me tailor content to your needs.",
    type: 'radio',
    options: [
      {
        id: 'beginner',
        label: 'Just Starting',
        description: "I'm new to investing and saving."
      },
      {
        id: 'intermediate',
        label: 'Some Experience',
        description: 'I know the basics but want to learn more.'
      },
      {
        id: 'advanced',
        label: 'Experienced',
        description: "I'm comfortable with investing concepts."
      }
    ]
  },
  {
    id: 'financialGoals',
    title: "What's your experience with investing?",
    description: "This helps me tailor content to your needs.",
    type: 'checkbox',
    options: [
      { id: 'emergencyFund', label: 'Emergency fund' },
      { id: 'retirement', label: 'Retirement' },
      { id: 'homePurchase', label: 'Home purchase' },
      { id: 'travel', label: 'Travel' },
      { id: 'education', label: 'Education' },
      { id: 'debtPayoff', label: 'Debt payoff' },
      { id: 'startingBusiness', label: 'Starting a business' },
      { id: 'familyPlanning', label: 'Family planning' },
      { id: 'majorPurchase', label: 'Major purchase' },
      { id: 'wealthBuilding', label: 'Wealth building' }
    ]
  },
  {
    id: 'monthlySavings',
    title: "How much can you save monthly?",
    description: "Even small amounts add up over time! This helps me suggest realistic goals.",
    type: 'number',
    placeholder: '$ 0',
    min: 0
  }
];
