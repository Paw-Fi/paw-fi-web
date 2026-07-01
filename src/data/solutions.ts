import individualBudgetingIntro from "../../Documentation/solutions/Budgeting for Individuals/0.0 Budgeting for Individuals.md?raw";
import couplesBudgetingIntro from "../../Documentation/solutions/Budgeting for Couples/0.0 intro_ Budgeting for Couples.md?raw";
import buildingEmergencyFundIndividuals from "../../Documentation/solutions/Budgeting for Individuals/Building an Emergency Fund_ A Step-by-Step Guide for 2026.md?raw";
import financialGoalsIndividuals from "../../Documentation/solutions/Budgeting for Individuals/Financial Goals for Individuals_ A Step-by-Step Guide (2026).md?raw";
import monthlyBudgetIndividuals from "../../Documentation/solutions/Budgeting for Individuals/How to Create a Monthly Budget_ A Step-by-Step Guide for 2026.md?raw";
import startBudgetingIndividuals from "../../Documentation/solutions/Budgeting for Individuals/How to Start Budgeting_ A Beginner's Guide That Actually Works (2026).md?raw";
import stopOverspendingIndividuals from "../../Documentation/solutions/Budgeting for Individuals/How to Stop Overspending_ Build Better Spending Habits That Last.md?raw";
import trackExpensesIndividuals from "../../Documentation/solutions/Budgeting for Individuals/How to Track Expenses_ Know Where Your Money Goes.md?raw";
import budgetRuleIndividuals from "../../Documentation/solutions/Budgeting for Individuals/The 50_30_20 Budget Rule_ How It Works and Whether It's Right for You.md?raw";
import zeroBasedIndividuals from "../../Documentation/solutions/Budgeting for Individuals/Zero-Based Budgeting_ A Step-by-Step Guide for 2026.md?raw";
import budgetingAfterBaby from "../../Documentation/solutions/Budgeting for Couples/Budgeting After Having a Baby_ A Step-by-Step Guide for New Parents.md?raw";
import buildingEmergencyFundCouples from "../../Documentation/solutions/Budgeting for Couples/Building an Emergency Fund_ A Step-by-Step Guide for 2026.md?raw";
import financialGoalsCouples from "../../Documentation/solutions/Budgeting for Couples/Financial Goals for Couples_ How to Build a Future You Both Want.md?raw";
import householdExpenses from "../../Documentation/solutions/Budgeting for Couples/Household Expenses_ A Complete Guide to Budgeting Your Monthly Bills.md?raw";
import splitBillsFairly from "../../Documentation/solutions/Budgeting for Couples/How to Split Bills Fairly_ A Practical Guide for Couples, Roommates, and Friends (2026).md?raw";
import jointVsSeparateAccounts from "../../Documentation/solutions/Budgeting for Couples/Joint vs Separate Bank Accounts_ Which Option Is Right for Your Relationship.md?raw";
import movingInTogether from "../../Documentation/solutions/Budgeting for Couples/Moving in Together_ Your Guide to Managing Money as a Couple.md?raw";
import savingChildrenEducation from "../../Documentation/solutions/Budgeting for Couples/Saving for Your Children's Education_ A Step-by-Step Guide.md?raw";
import sharedCreditCards from "../../Documentation/solutions/Budgeting for Couples/Shared Credit Cards_ Should Couples Share a Credit Card.md?raw";
import weddingBudgetGuide from "../../Documentation/solutions/Budgeting for Couples/Wedding Budget Guide_ How to Plan Your Wedding Without Financial Stress (2026).md?raw";

export interface SolutionFaqItem {
  question: string;
  answer: string;
}

export interface SolutionCategory {
  slug: string;
  title: string;
  description: string;
  hero: string;
  sourceMarkdown: string;
  featuredGuideSlugs: string[];
  features: string[];
  faqs: SolutionFaqItem[];
}

export interface SolutionGuide {
  categorySlug: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  keywords: string[];
}

export const solutionCategories: SolutionCategory[] = [
  {
    slug: "budgeting-for-individuals",
    title: "Budgeting for Individuals",
    description:
      "Learn how to build a budget, track expenses, cut overspending, and reach personal financial goals with confidence.",
    hero: "Learn how to create a budget, track your expenses, reduce overspending, and reach your financial goals with practical guides built for everyday money management.",
    sourceMarkdown: individualBudgetingIntro,
    featuredGuideSlugs: [
      "how-to-start-budgeting",
      "financial-goals-for-individuals",
      "the-50-30-20-budget-rule",
      "zero-based-budgeting",
      "how-to-track-expenses",
      "how-to-stop-overspending",
      "building-an-emergency-fund",
      "how-to-create-a-monthly-budget",
    ],
    features: [
      "Personal Budget Space",
      "AI Expense Tracking",
      "Receipt Scanner",
      "Voice Expense Logging",
      "Budget Pockets",
      "Monthly Insights",
    ],
    faqs: [
      {
        question: "How do I start budgeting for the first time?",
        answer:
          "Start with your take-home income, list your fixed bills, estimate your everyday spending, and give savings a place in the plan. Keep the first version simple, then refine it after a month of tracking.",
      },
      {
        question: "How much should I save every month?",
        answer:
          "A strong target is to start with something sustainable and increase it over time. Even a small automatic transfer each month is enough to build momentum and create the habit.",
      },
      {
        question: "What's the best budgeting app for individuals?",
        answer:
          "The best app is the one you will actually use consistently. Look for fast expense logging, clear category tracking, and a way to separate bills, savings, and everyday spending.",
      },
      {
        question: "How do I stop overspending?",
        answer:
          "Track spending regularly, set simple category limits, and review where the money went before the month gets away from you. Small visibility improvements usually create the biggest change.",
      },
      {
        question: "Should I track every expense?",
        answer:
          "Yes, especially when you are learning your habits. Tracking every expense makes it easier to spot leaks, understand your cash flow, and adjust your budget with confidence.",
      },
    ],
  },
  {
    slug: "budgeting-for-couples",
    title: "Budgeting for Couples",
    description:
      "Manage shared bills, split expenses fairly, and build a household plan that supports both partners.",
    hero: "Managing money together does not have to be complicated. Learn how to split expenses, organize household bills, create shared budgets, and save for goals with practical guides for every stage of life.",
    sourceMarkdown: couplesBudgetingIntro,
    featuredGuideSlugs: [
      "how-to-split-bills-fairly",
      "joint-vs-separate-bank-accounts",
      "financial-goals-for-couples",
      "wedding-budget-guide",
      "shared-credit-cards",
      "moving-in-together",
      "budgeting-after-having-a-baby",
      "saving-for-your-childrens-education",
      "building-an-emergency-fund",
      "household-expenses",
    ],
    features: [
      "Shared Budget Space",
      "Bill Splitting",
      "AI Expense Tracking",
      "Shared Pockets",
      "Receipt Scanner",
      "Settlements",
    ],
    faqs: [
      {
        question: "How should couples split bills?",
        answer:
          "Choose a system you both understand. Equal splits work well for many households, income-based splits can feel fairer when earnings differ, and responsibility-based splits reduce the number of transfers.",
      },
      {
        question: "Should couples combine finances?",
        answer:
          "There is no single right answer. Many couples use a hybrid setup with shared money for household needs and separate money for personal spending.",
      },
      {
        question: "What's the best budgeting app for couples?",
        answer:
          "Look for a tool that supports shared expenses, clear settlements, and one source of truth for the household budget. Shared visibility matters more than the exact feature list.",
      },
      {
        question: "Should couples share a credit card?",
        answer:
          "A shared card can simplify some recurring spending, but it works best when both partners agree on usage rules, payment responsibility, and how the balance is reviewed.",
      },
      {
        question: "How do we save for goals together?",
        answer:
          "Pick shared goals, assign monthly contributions, and review progress together. Automating the savings habit makes it much easier to stay aligned.",
      },
    ],
  },
];

export const solutionGuides: SolutionGuide[] = [
  {
    categorySlug: "budgeting-for-individuals",
    slug: "how-to-start-budgeting",
    title: "How to Start Budgeting",
    excerpt:
      "A beginner-friendly guide to building a first budget, choosing simple categories, and starting with a system that lasts.",
    content: startBudgetingIndividuals,
    keywords: [
      "budgeting for beginners",
      "how to start budgeting",
      "personal budget",
    ],
  },
  {
    categorySlug: "budgeting-for-individuals",
    slug: "financial-goals-for-individuals",
    title: "Financial Goals for Individuals",
    excerpt:
      "Learn how to turn savings targets into a monthly plan that is realistic, flexible, and easy to track.",
    content: financialGoalsIndividuals,
    keywords: ["financial goals", "personal savings plan", "money goals"],
  },
  {
    categorySlug: "budgeting-for-individuals",
    slug: "the-50-30-20-budget-rule",
    title: "The 50/30/20 Budget Rule",
    excerpt:
      "Understand the 50/30/20 framework, when it works well, and when a custom budget split makes more sense.",
    content: budgetRuleIndividuals,
    keywords: ["50/30/20 budget rule", "budget split", "simple budgeting"],
  },
  {
    categorySlug: "budgeting-for-individuals",
    slug: "zero-based-budgeting",
    title: "Zero-Based Budgeting",
    excerpt:
      "See how zero-based budgeting gives every dollar a job and helps you make more intentional money decisions.",
    content: zeroBasedIndividuals,
    keywords: [
      "zero based budgeting",
      "intentional spending",
      "budgeting method",
    ],
  },
  {
    categorySlug: "budgeting-for-individuals",
    slug: "how-to-track-expenses",
    title: "How to Track Expenses",
    excerpt:
      "Choose a tracking system that fits your routine and makes your spending visible without becoming a chore.",
    content: trackExpensesIndividuals,
    keywords: ["track expenses", "spending tracker", "expense tracking"],
  },
  {
    categorySlug: "budgeting-for-individuals",
    slug: "how-to-stop-overspending",
    title: "How to Stop Overspending",
    excerpt:
      "Practical habits and guardrails that help you break overspending patterns and stay on budget longer.",
    content: stopOverspendingIndividuals,
    keywords: ["stop overspending", "spending habits", "budget control"],
  },
  {
    categorySlug: "budgeting-for-individuals",
    slug: "building-an-emergency-fund",
    title: "Building an Emergency Fund",
    excerpt:
      "Set a realistic emergency fund target, choose a timeline, and make progress with consistent contributions.",
    content: buildingEmergencyFundIndividuals,
    keywords: ["emergency fund", "savings buffer", "financial safety net"],
  },
  {
    categorySlug: "budgeting-for-individuals",
    slug: "how-to-create-a-monthly-budget",
    title: "How to Create a Monthly Budget",
    excerpt:
      "A step-by-step guide to planning income, bills, spending, savings, and review for the month ahead.",
    content: monthlyBudgetIndividuals,
    keywords: ["monthly budget", "budget planning", "budget template"],
  },
  {
    categorySlug: "budgeting-for-couples",
    slug: "how-to-split-bills-fairly",
    title: "How to Split Bills Fairly",
    excerpt:
      "A practical guide to choosing a bill-splitting method that feels fair and stays simple to maintain.",
    content: splitBillsFairly,
    keywords: ["split bills fairly", "couples budgeting", "shared expenses"],
  },
  {
    categorySlug: "budgeting-for-couples",
    slug: "joint-vs-separate-bank-accounts",
    title: "Joint vs Separate Bank Accounts",
    excerpt:
      "Compare shared, separate, and hybrid setups so you can pick the account structure that fits your relationship.",
    content: jointVsSeparateAccounts,
    keywords: ["joint account", "separate accounts", "couples finances"],
  },
  {
    categorySlug: "budgeting-for-couples",
    slug: "financial-goals-for-couples",
    title: "Financial Goals for Couples",
    excerpt:
      "Create shared money goals that both partners understand and can work toward together.",
    content: financialGoalsCouples,
    keywords: ["couples financial goals", "shared goals", "household planning"],
  },
  {
    categorySlug: "budgeting-for-couples",
    slug: "wedding-budget-guide",
    title: "Wedding Budget Guide",
    excerpt:
      "Plan a wedding budget without losing sight of the financial life you are building after the ceremony.",
    content: weddingBudgetGuide,
    keywords: ["wedding budget", "wedding planning", "marriage finances"],
  },
  {
    categorySlug: "budgeting-for-couples",
    slug: "shared-credit-cards",
    title: "Shared Credit Cards",
    excerpt:
      "Weigh the pros and cons of shared credit cards and decide whether they fit your household.",
    content: sharedCreditCards,
    keywords: ["shared credit card", "couples credit cards", "shared spending"],
  },
  {
    categorySlug: "budgeting-for-couples",
    slug: "moving-in-together",
    title: "Moving in Together",
    excerpt:
      "A simple guide to organizing money, bills, and expectations before sharing a home.",
    content: movingInTogether,
    keywords: [
      "moving in together",
      "shared household budget",
      "couples money",
    ],
  },
  {
    categorySlug: "budgeting-for-couples",
    slug: "budgeting-after-having-a-baby",
    title: "Budgeting After Having a Baby",
    excerpt:
      "Adjust your budget for new recurring costs, childcare planning, and changing family priorities.",
    content: budgetingAfterBaby,
    keywords: ["new parents budget", "baby expenses", "family budgeting"],
  },
  {
    categorySlug: "budgeting-for-couples",
    slug: "saving-for-your-childrens-education",
    title: "Saving for Your Children's Education",
    excerpt:
      "Build a long-term plan for education costs with regular contributions and clear priorities.",
    content: savingChildrenEducation,
    keywords: ["education savings", "college fund", "family goals"],
  },
  {
    categorySlug: "budgeting-for-couples",
    slug: "building-an-emergency-fund",
    title: "Building an Emergency Fund",
    excerpt:
      "Set a couple-friendly emergency fund target and make steady progress toward household security.",
    content: buildingEmergencyFundCouples,
    keywords: ["couples emergency fund", "shared savings", "household buffer"],
  },
  {
    categorySlug: "budgeting-for-couples",
    slug: "household-expenses",
    title: "Household Expenses",
    excerpt:
      "Organize monthly bills and household costs so shared spending stays visible and manageable.",
    content: householdExpenses,
    keywords: ["household expenses", "monthly bills", "shared budgeting"],
  },
];

export function findSolutionCategory(categorySlug: string) {
  return solutionCategories.find((category) => category.slug === categorySlug);
}

export function findSolutionGuide(categorySlug: string, solutionSlug: string) {
  return solutionGuides.find(
    (guide) =>
      guide.categorySlug === categorySlug && guide.slug === solutionSlug,
  );
}

export function getSolutionGuidesByCategory(categorySlug: string) {
  return solutionGuides.filter((guide) => guide.categorySlug === categorySlug);
}

export function getSolutionCategoryOverview() {
  return solutionCategories.map((category) => ({
    ...category,
    guideCount: getSolutionGuidesByCategory(category.slug).length,
  }));
}
