import type { Course, Lesson, Question } from "@/types/learning.types";
import mockLessons from "./mock1.json";
import sabinaLessons from "./sabina-mock.json"

// Individual lessons with multiple question types
export const lessons: Record<string, Lesson> = {
  "saving-vs-investing": {
    id: "saving-vs-investing",
    title: "Saving vs Investing",
    description:
      "Learn the difference between saving and investing, and when to use each strategy.",
    xp: 50,
    unlocked: true,
    icon: "💰",
    questions: [          
      {
        id: "sort-actions",
        type: "sort-categories",
        question: "Sort these actions into Investing or Saving.",
        items: [
          { id: "item-1", content: "Buying an index fund" },
          { id: "item-2", content: "Buying cryptocurrency" },
          { id: "item-3", content: "Putting money in a piggy bank" },
          { id: "item-4", content: "Setting aside emergency fund" },
        ],
        categories: [
          { id: "investing", name: "Investing" },
          { id: "saving", name: "Saving" },
        ],
        correctCategories: {
          "item-1": "investing",
          "item-2": "investing",
          "item-3": "saving",
          "item-4": "saving",
        },
        helpTips:
          "Saving refers to putting money into safe instruments where there is little or no risk of loss of capital and where returns are generally guaranteed, or close to it. Investing involves more risky instruments and no guarantee of returns, and usually no promise about the security of the invested principals, either.",
      },
      {
        id: "mcq-investing-purpose",
        type: "mcq",
        question:
          "Which of the following are primary purposes of investing? (Select all that apply)",
        options: [
          {
            id: "opt-1",
            content: "Wealth building over the long term",
            isCorrect: true,
          },
          {
            id: "opt-2",
            content: "Protection against inflation",
            isCorrect: true,
          },
          {
            id: "opt-3",
            content: "Immediate access to funds",
            isCorrect: false,
          },
          { id: "opt-4", content: "Guaranteed returns", isCorrect: false },
          {
            id: "opt-5",
            content: "Potential for higher returns",
            isCorrect: true,
          },
        ],
      },
      {
        id: "risk-assessment",
        type: "matrix-rating",
        question: "Tap to rate each one as Low, Medium, or High risk.",
        items: [
          { id: "item-1", content: "Government bond" },
          { id: "item-2", content: "Real estate" },
          { id: "item-3", content: "Single tech stock" },
          { id: "item-4", content: "Savings account" },
        ],
        ratingOptions: [
          { id: "low", content: "Low", color: "green" },
          { id: "medium", content: "Medium", color: "yellow" },
          { id: "high", content: "High", color: "red" },
        ],
        correctRatings: {
          "item-1": "low",
          "item-2": "medium",
          "item-3": "high",
          "item-4": "low",
        },
        helpTips: "Low Risk: Safer, more stable options — like savings accounts or government bonds. Returns are usually smaller but more predictable.\n\nMedium Risk: Balanced choices — like real estate or diversified funds. They can grow more, but prices may rise and fall along the way.\n\nHigh Risk: Big ups and downs — like single stocks or crypto. Potential for high rewards, but also higher chance of losing money.",
      },
      {
        id: "scq-savings-purpose",
        type: "scq",
        question: "Which is the MOST important purpose of a savings account?",
        options: [
          { id: "opt-1", content: "Growing wealth rapidly", isCorrect: false },
          {
            id: "opt-2",
            content:
              "Having funds available for emergencies and short-term goals",
            isCorrect: true,
          },
          {
            id: "opt-3",
            content: "Maximizing investment returns",
            isCorrect: false,
          },
          { id: "opt-4", content: "Tax advantages", isCorrect: false },
        ],
      },
      {
        id: 'portfolioPreference',
        type: 'image-choice',
        question: "Which portfolio is better diversified?",
        explanation: "Diversification helps reduce risk by spreading investments across different asset classes.",
        helpTips: "Diversification means not putting all your eggs in one basket. A diversified portfolio includes different types of assets — like tech, real estate, bonds, and savings — so that if one drops, others might stay steady or even rise. It helps reduce risk while giving your money more ways to grow!",
        itemsPerRow: 2,
        options: [
          {
            id: 'portfolio1',
            content: 'Portfolio 1',
            imagePrompt: "optional Mermaid diagram description if needed",
            caption: '100% Tech Stocks',
            isCorrect: false
          },
          {
            id: 'portfolio2',
            content: 'Portfolio 2',
            imagePrompt: "optional Mermaid diagram description if needed",
            caption: 'Tech (20%), Real Estate (25%), Bonds (25%), Savings (20%), Healthcare (10%)',
            isCorrect: true
          }
        ]
      },

      {
        id: 'brokerOrDealer',
        type: 'scq',
        question: "Is It a Broker or a Dealer?",
        explanation: "Understanding the difference between brokers and dealers is important for investors.",
        helpTips: "Broker = A matchmaker. Helps you buy or sell by finding someone on the other side of the trade. They don't own the stock — they just connect buyers and sellers.\n\nDealer = A seller or buyer. They trade from their own inventory, meaning they're the one actually selling to (or buying from) you.",
        contentBlocks: [
          {
            type: 'paragraph',
            content: "You're investing in stocks using a financial firm."
          },
          {
            type: 'bulletList',
            content: [
              "First, you buy 100 shares of Apple — the firm helps you find someone to buy from.",
              "Later, you buy 100 shares of Microsoft — this time, the firm sells you the shares from its own inventory."
            ]
          },
          {
            type: 'paragraph',
            content: "What best describes the firm's role in each case?"
          }
        ],
        itemsPerRow: 2,
        options: [
          {
            id: 'brokerBoth',
            content: 'Broker for both',
            isCorrect: false
          },
          {
            id: 'dealerBoth',
            content: 'Dealer for both',
            isCorrect: false
          },
          {
            id: 'brokerAppleDealerMicrosoft',
            content: 'Broker for Apple, Dealer for Microsoft',
            isCorrect: true
          },
          {
            id: 'dealerAppleBrokerMicrosoft',
            content: 'Dealer for Apple, Broker for Microsoft',
            isCorrect: false
          }
        ]
      },
      
      {
        id: 'primaryOrSecondaryMarket',
        type: 'scq',
        question: "Was it the Primary or Secondary Market?",
        explanation: "Understanding the difference between primary and secondary markets is essential for investors.",
        helpTips: "Primary Market = Buying from the company for the first time. When a company sells new shares to investors (like in an IPO), that's the primary market. Your money goes to the company.\n\nSecondary Market = Buying or selling from other investors. When you trade stocks with other people through the stock market (like NYSE or NASDAQ), that's the secondary market. The company isn't involved.",
        contentBlocks: [
          {
            type: 'paragraph',
            content: "You bought shares of a tech company during its IPO (the first time the stock was sold to the public). A few months later, you sold those shares to another investor through the stock market."
          },
          {
            type: 'paragraph',
            content: "Which market were you in for each trade?"
          }
        ],
        itemsPerRow: 1, // Display options one per row
        options: [
          {
            id: 'secondaryPrimary',
            content: 'Bought in the Secondary Market, sold in the Primary Market',
            isCorrect: false
          },
          {
            id: 'primarySecondary',
            content: 'Bought in the Primary Market, sold in the Secondary Market',
            isCorrect: true
          },
          {
            id: 'bothPrimary',
            content: 'Both trades were in the Primary Market',
            isCorrect: false
          },
          {
            id: 'bothSecondary',
            content: 'Both trades were in the Secondary Market',
            isCorrect: false
          }
        ]
      },      
     
    ],
  },
  "investment-types": {
    id: "investment-types",
    title: "Investment Types",
    description:
      "Explore different investment vehicles and their characteristics.",
    xp: 75,
    unlocked: false,
    icon: "📊",
  questions: [
      {
        id: "match-investments",
        type: "match",
        question: "Match each investment type with its description.",
        items: [
          { id: "item-1", content: "Stocks" },
          { id: "item-2", content: "Bonds" },
          { id: "item-3", content: "ETFs" },
          { id: "item-4", content: "Mutual Funds" },
        ],
        matchItems: [
          { id: "match-1", content: "Ownership shares in a company" },
          { id: "match-2", content: "Loans to a company or government" },
          { id: "match-3", content: "Basket of securities traded like stocks" },
          {
            id: "match-4",
            content: "Professionally managed pool of investments",
          },
        ],
        correctMatches: {
          "item-1": "match-1",
          "item-2": "match-2",
          "item-3": "match-3",
          "item-4": "match-4",
        },
        helpTips:
        "Different investment types have varying levels of risk, liquidity, and potential returns. Stocks offer ownership in a company, bonds are essentially loans to companies or governments, and funds are collections of investments managed together.",
      
      },
      {
        id: "risk-assessment",
        type: "matrix-rating",
        question: "Tap to rate each one as Low, Medium, or High risk.",
        items: [
          { id: "item-1", content: "Government bond" },
          { id: "item-2", content: "Real estate" },
          { id: "item-3", content: "Single tech stock" },
          { id: "item-4", content: "Savings account" },
        ],
        ratingOptions: [
          { id: "low", content: "Low", color: "green" },
          { id: "medium", content: "Medium", color: "yellow" },
          { id: "high", content: "High", color: "red" },
        ],
        correctRatings: {
          "item-1": "low",
          "item-2": "medium",
          "item-3": "high",
          "item-4": "low",
        },
        helpTips: "Low Risk: Safer, more stable options — like savings accounts or government bonds. Returns are usually smaller but more predictable.\n\nMedium Risk: Balanced choices — like real estate or diversified funds. They can grow more, but prices may rise and fall along the way.\n\nHigh Risk: Big ups and downs — like single stocks or crypto. Potential for high rewards, but also higher chance of losing money.",
      },
      // {
      //   id: "sort-risk-level",
      //   type: "sort",
      //   question: "Arrange these investment types from highest to lowest risk.",
      //   items: [
      //     { id: "item-1", content: "Government Treasury Bonds" },
      //     { id: "item-2", content: "Blue Chip Stocks" },
      //     { id: "item-3", content: "Penny Stocks" },
      //     { id: "item-4", content: "Cryptocurrency" },
      //     { id: "item-5", content: "Index Funds" },
      //   ],
      //   correctOrder: ["item-4", "item-3", "item-2", "item-5", "item-1"],
      // },
    ],
  },
  "compound-interest": {
    id: "compound-interest",
    title: "Compound Interest",
    description:
      "Understand how compound interest works and why it's so powerful for investors.",
    xp: 60,
    unlocked: false,
    icon: "📈",
    questions: [
      {
        id: "scq-compound",
        type: "scq",
        question: "What is compound interest?",
        options: [
          {
            id: "opt-1",
            content: "Interest calculated only on the initial principal",
            isCorrect: false,
          },
          {
            id: "opt-2",
            content:
              "Interest calculated on the initial principal and previously earned interest",
            isCorrect: true,
          },
          {
            id: "opt-3",
            content: "A fixed amount of interest paid annually",
            isCorrect: false,
          },
          {
            id: "opt-4",
            content: "Interest paid directly to your bank account",
            isCorrect: false,
          },
        ],
        
      },
    ],
  },
};

// Course data
export const courses: Record<string, Course> = {
  "intro-investing": {
    id: "intro-investing",
    title: "Introduction to Investing",
    description:
      "Understand how money grows—and how you can make it work for you.",
    lessons: Object.values(lessons),
  },
};

// Helper function to get lesson by ID
export function getLessonById(id: string): Lesson | undefined {
  return lessons[id] || sabinaLessons.find((lesson) => lesson.id === id)
}

export function getMockLessonById(id: string): Lesson | undefined {
  return mockLessons.find((lesson) => lesson.id === id) || sabinaLessons.find((lesson) => lesson.id === id)
}


// Helper function to get course by ID
export function getCourseById(id: string): Course | undefined {
  return courses[id];
}

// Helper function to get question by ID and lesson ID
export function getQuestionById(
  lessonId: string,
  questionId: string,
): Question | undefined {
  const lesson = lessons[lessonId];
  if (!lesson) return undefined;

  return lesson.questions.find((q) => q.id === questionId);
}

export function getAllLessons(): Lesson[] {
  return mockLessons
}

// Default export for the current active course
export default courses["intro-investing"];
