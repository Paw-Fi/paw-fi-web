// Goal Type Configurations
// This file contains the configuration for different goal types used in the goal creation flow

export interface GoalTypeConfig {
  id: GoalType;
  name: string;
  description: string;
  color: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  benefits: string[];
  isPopular?: boolean;
}

export const GOAL_TYPE_CONFIGS: Record<string, GoalTypeConfig> = {
  retirement: {
    id: 'retirement',
    name: 'Retirement Planning',
    description: 'Build a comprehensive retirement savings strategy with personalized milestones and investment recommendations.',
    color: 'bg-gradient-to-br from-blue-500 to-blue-600',
    difficulty: 'beginner',
    estimatedTime: '5-10 minutes',
    benefits: [
      'AI-calculated retirement target amount',
      'Personalized investment strategy based on risk tolerance',
      'Smart milestones with timeline optimization',
      'Employer 401k match maximization',
      'Inflation-adjusted projections'
    ],
    isPopular: true
  },
  home_buying: {
    id: 'home_buying',
    name: 'Home Buying',
    description: 'Create a strategic savings plan for your dream home with down payment, closing costs, and timeline optimization.',
    color: 'bg-gradient-to-br from-green-500 to-green-600',
    difficulty: 'beginner',
    estimatedTime: '5-8 minutes',
    benefits: [
      'Down payment and closing cost calculations',
      'Monthly savings target optimization',
      'Timeline-based milestone planning',
      'Additional cost planning (moving, repairs)',
      'Market timing considerations'
    ],
    isPopular: true
  },
  wealth: {
    id: 'wealth',
    name: 'Wealth Building',
    description: 'Develop a long-term wealth accumulation strategy with investment allocation and growth optimization.',
    color: 'bg-gradient-to-br from-purple-500 to-purple-600',
    difficulty: 'intermediate',
    estimatedTime: '8-12 minutes',
    benefits: [
      'Personalized investment portfolio allocation',
      'Risk-adjusted growth projections',
      'Tax-efficient wealth building strategies',
      'Diversification recommendations',
      'Long-term compound growth planning'
    ]
  },
  investment: {
    id: 'investment',
    name: 'Investment Portfolio',
    description: 'Build a targeted investment strategy for specific financial objectives with risk management.',
    color: 'bg-gradient-to-br from-orange-500 to-orange-600',
    difficulty: 'intermediate',
    estimatedTime: '6-10 minutes',
    benefits: [
      'Purpose-driven investment strategy',
      'Risk tolerance-based asset allocation',
      'Performance tracking milestones',
      'Regular contribution optimization',
      'Return expectation calibration'
    ]
  },
  debt_payoff: {
    id: 'debt_payoff',
    name: 'Debt Payoff',
    description: 'Create a strategic plan to eliminate debt efficiently with optimized payment strategies.',
    color: 'bg-gradient-to-br from-red-500 to-red-600',
    difficulty: 'beginner',
    estimatedTime: '5-8 minutes',
    benefits: [
      'Debt snowball vs avalanche comparison',
      'Optimized payment strategy',
      'Interest savings calculations',
      'Timeline optimization',
      'Credit score improvement tracking'
    ]
  },
  emergency_fund: {
    id: 'emergency_fund',
    name: 'Emergency Fund',
    description: 'Build a financial safety net with a strategic emergency fund savings plan.',
    color: 'bg-gradient-to-br from-teal-500 to-teal-600',
    difficulty: 'beginner',
    estimatedTime: '4-6 minutes',
    benefits: [
      'Personalized fund size calculation',
      'Monthly savings target optimization',
      'High-yield savings account guidance',
      'Automated savings strategies',
      'Financial security milestone tracking'
    ]
  },
  passive_income: {
    id: 'passive_income',
    name: 'Passive Income',
    description: 'Build sustainable income streams that generate money with minimal ongoing effort through strategic investments and assets.',
    color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    difficulty: 'intermediate',
    estimatedTime: '8-12 minutes',
    benefits: [
      'Dividend growth investing strategy',
      'REIT and rental property income planning',
      'High-yield investment recommendations',
      'Multiple income stream diversification',
      'Monthly passive income targets and milestones'
    ],
    isPopular: true
  },
  custom: {
    id: 'custom',
    name: 'Custom Goal',
    description: 'Create a personalized financial goal with custom parameters and AI-generated strategy.',
    color: 'bg-gradient-to-br from-gray-500 to-gray-600',
    difficulty: 'advanced',
    estimatedTime: '10-15 minutes',
    benefits: [
      'Fully customizable goal parameters',
      'AI-generated strategy based on your inputs',
      'Flexible milestone structure',
      'Personalized insights and recommendations',
      'Adaptable to unique financial situations'
    ]
  }
};

// Helper functions
export function getGoalTypeConfig(goalType: string): GoalTypeConfig | undefined {
  return GOAL_TYPE_CONFIGS[goalType];
}

export function getAllGoalTypes(): GoalTypeConfig[] {
  return Object.values(GOAL_TYPE_CONFIGS);
}

export function getPopularGoalTypes(): GoalTypeConfig[] {
  return Object.values(GOAL_TYPE_CONFIGS).filter(config => config.isPopular);
}

export function getGoalTypesByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): GoalTypeConfig[] {
  return Object.values(GOAL_TYPE_CONFIGS).filter(config => config.difficulty === difficulty);
}

// Export types
export type GoalType = keyof typeof GOAL_TYPE_CONFIGS;
