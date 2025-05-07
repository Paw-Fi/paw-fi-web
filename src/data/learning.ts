import type { Course, Lesson, Question } from '@/types/learning';

// Individual lessons with multiple question types
export const lessons: Record<string, Lesson> = {
  'saving-vs-investing': {
    id: 'saving-vs-investing',
    title: 'Saving vs Investing',
    description: 'Learn the difference between saving and investing, and when to use each strategy.',
    xp: 50,
    unlocked: true,
    icon: '💰',
    helpTips: 'Saving refers to putting money into safe instruments where there is little or no risk of loss of capital and where returns are generally guaranteed, or close to it. Investing involves more risky instruments and no guarantee of returns, and usually no promise about the security of the invested principals, either.',
    questions: [
      {
        id: 'sort-actions',
        type: 'sort-categories',
        question: 'Sort these actions into Investing or Saving.',
        items: [
          { id: 'item-1', content: 'Buying an index fund' },
          { id: 'item-2', content: 'Buying cryptocurrency' },
          { id: 'item-3', content: 'Putting money in a piggy bank' },
          { id: 'item-4', content: 'Setting aside emergency fund' },
        ],
        categories: [
          { id: 'investing', name: 'Investing' },
          { id: 'saving', name: 'Saving' },
        ],
        correctCategories: {
          'item-1': 'investing',
          'item-2': 'investing',
          'item-3': 'saving',
          'item-4': 'saving',
        }
      },
      {
        id: 'mcq-investing-purpose',
        type: 'mcq',
        question: 'Which of the following are primary purposes of investing? (Select all that apply)',
        options: [
          { id: 'opt-1', content: 'Wealth building over the long term', isCorrect: true },
          { id: 'opt-2', content: 'Protection against inflation', isCorrect: true },
          { id: 'opt-3', content: 'Immediate access to funds', isCorrect: false },
          { id: 'opt-4', content: 'Guaranteed returns', isCorrect: false },
          { id: 'opt-5', content: 'Potential for higher returns', isCorrect: true },
        ]
      },
      {
        id: 'scq-savings-purpose',
        type: 'scq',
        question: 'Which is the MOST important purpose of a savings account?',
        options: [
          { id: 'opt-1', content: 'Growing wealth rapidly', isCorrect: false },
          { id: 'opt-2', content: 'Having funds available for emergencies and short-term goals', isCorrect: true },
          { id: 'opt-3', content: 'Maximizing investment returns', isCorrect: false },
          { id: 'opt-4', content: 'Tax advantages', isCorrect: false },
        ]
      },
      {
        id: 'sort-risk-returns',
        type: 'sort',
        question: 'Arrange these investment options from highest to lowest potential returns.',
        items: [
          { id: 'item-1', content: 'High-growth stock investments' },
          { id: 'item-2', content: 'Index funds' },
          { id: 'item-3', content: 'Corporate bonds' },
          { id: 'item-4', content: 'Savings account' },
          { id: 'item-5', content: 'Certificate of deposit' },
        ],
        correctOrder: ['item-1', 'item-2', 'item-3', 'item-5', 'item-4']
      }
    ]
  },
  'investment-types': {
    id: 'investment-types',
    title: 'Investment Types',
    description: 'Explore different investment vehicles and their characteristics.',
    xp: 75,
    unlocked: false, 
    icon: '📊',
    helpTips: 'Different investment types have varying levels of risk, liquidity, and potential returns. Stocks offer ownership in a company, bonds are essentially loans to companies or governments, and funds are collections of investments managed together.',
    questions: [
      {
        id: 'match-investments',
        type: 'match',
        question: 'Match each investment type with its description.',
        items: [
          { id: 'item-1', content: 'Stocks' },
          { id: 'item-2', content: 'Bonds' },
          { id: 'item-3', content: 'ETFs' },
          { id: 'item-4', content: 'Mutual Funds' },
        ],
        matchItems: [
          { id: 'match-1', content: 'Ownership shares in a company' },
          { id: 'match-2', content: 'Loans to a company or government' },
          { id: 'match-3', content: 'Basket of securities traded like stocks' },
          { id: 'match-4', content: 'Professionally managed pool of investments' },
        ],
        correctMatches: {
          'item-1': 'match-1',
          'item-2': 'match-2',
          'item-3': 'match-3',
          'item-4': 'match-4',
        }
      },
      {
        id: 'sort-risk-level',
        type: 'sort',
        question: 'Arrange these investment types from highest to lowest risk.',
        items: [
          { id: 'item-1', content: 'Government Treasury Bonds' },
          { id: 'item-2', content: 'Blue Chip Stocks' },
          { id: 'item-3', content: 'Penny Stocks' },
          { id: 'item-4', content: 'Cryptocurrency' },
          { id: 'item-5', content: 'Index Funds' },
        ],
        correctOrder: ['item-4', 'item-3', 'item-2', 'item-5', 'item-1']
      }
    ]
  },
  'compound-interest': {
    id: 'compound-interest',
    title: 'Compound Interest',
    description: 'Understand how compound interest works and why it\'s so powerful for investors.',
    xp: 60,
    unlocked: false,
    icon: '📈',
    helpTips: 'Compound interest is the interest earned on both the initial principal and the accumulated interest from previous periods. The more frequently interest is compounded, the more you earn over time. This is why starting to invest early is so important.',
    questions: [
      {
        id: 'scq-compound',
        type: 'scq',
        question: 'What is compound interest?',
        options: [
          { id: 'opt-1', content: 'Interest calculated only on the initial principal', isCorrect: false },
          { id: 'opt-2', content: 'Interest calculated on the initial principal and previously earned interest', isCorrect: true },
          { id: 'opt-3', content: 'A fixed amount of interest paid annually', isCorrect: false },
          { id: 'opt-4', content: 'Interest paid directly to your bank account', isCorrect: false },
        ]
      },
      {
        id: 'sort-compound-frequency',
        type: 'sort',
        question: 'Arrange these compound interest frequencies from highest total return to lowest (assuming same interest rate and time period).',
        items: [
          { id: 'item-1', content: 'Annually' },
          { id: 'item-2', content: 'Quarterly' },
          { id: 'item-3', content: 'Monthly' },
          { id: 'item-4', content: 'Daily' },
          { id: 'item-5', content: 'Continuously' },
        ],
        correctOrder: ['item-5', 'item-4', 'item-3', 'item-2', 'item-1']
      }
    ]
  }
};

// Course data
export const courses: Record<string, Course> = {
  'intro-investing': {
    id: 'intro-investing',
    title: 'Introduction to Investing',
    description: 'Understand how money grows—and how you can make it work for you.',
    lessons: Object.values(lessons)
  }
};

// Helper function to get lesson by ID
export function getLessonById(id: string): Lesson | undefined {
  return lessons[id];
}

// Helper function to get course by ID
export function getCourseById(id: string): Course | undefined {
  return courses[id];
}

// Helper function to get question by ID and lesson ID
export function getQuestionById(lessonId: string, questionId: string): Question | undefined {
  const lesson = lessons[lessonId];
  if (!lesson) return undefined;
  
  return lesson.questions.find(q => q.id === questionId);
}

// Default export for the current active course
export default courses['intro-investing'];
