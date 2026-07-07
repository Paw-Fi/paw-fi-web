import individualBudgetingIntro from "../../Documentation/solutions/Budgeting for Individuals/0.0 Budgeting for Individuals.md?raw";
import couplesBudgetingIntro from "../../Documentation/solutions/Budgeting for Couples/0.0 intro_ Budgeting for Couples.md?raw";
import familyBudgetingIntro from "../../Documentation/solutions/Budgeting for Family/0.0 Budgeting for Families.md?raw";
import freelancersBudgetingIntro from "../../Documentation/solutions/Budgeting for Freelancers/0.0 Budgeting for Freelancers.md?raw";
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
import backToSchoolBudgetGuide from "../../Documentation/solutions/Budgeting for Family/Back-to-School Budget Guide_ How to Save Money on School Expenses (2026).md?raw";
import budgetingForFamilyOf4 from "../../Documentation/solutions/Budgeting for Family/Budgeting for a Family of 4_ A Practical Guide (2026).md?raw";
import familyEmergencyFundGuide from "../../Documentation/solutions/Budgeting for Family/Family Emergency Fund Guide_ How Much Should You Save.md?raw";
import familyFinancialGoals from "../../Documentation/solutions/Budgeting for Family/Family Financial Goals_ How to Plan Your Future Together (2026).md?raw";
import groceryBudgetForFamilies from "../../Documentation/solutions/Budgeting for Family/Grocery Budget for Families_ How to Spend Less Without Sacrificing Meals (2026).md?raw";
import howToCreateFamilyBudget from "../../Documentation/solutions/Budgeting for Family/How to Create a Family Budget_ A Practical Step-by-Step Guide (2026).md?raw";
import howToReduceHouseholdExpenses from "../../Documentation/solutions/Budgeting for Family/How to Reduce Household Expenses_ A Practical Guide (2026).md?raw";
import monthlyFamilyBudgetChecklist from "../../Documentation/solutions/Budgeting for Family/Monthly Family Budget Checklist_ A Practical Guide (2026).md?raw";
import budgetingWithIrregularIncome from "../../Documentation/solutions/Budgeting for Freelancers/Budgeting with Irregular Income_ A Practical Guide (2026).md?raw";
import cashFlowManagementForFreelancers from "../../Documentation/solutions/Budgeting for Freelancers/Cash Flow Management for Freelancers_ A Practical Guide (2026).md?raw";
import emergencyFundForFreelancers from "../../Documentation/solutions/Budgeting for Freelancers/Emergency Fund for Freelancers_ A Practical Guide (2026).md?raw";
import howToBudgetAsFreelancer from "../../Documentation/solutions/Budgeting for Freelancers/How to Budget as a Freelancer_ A Practical Guide (2026).md?raw";
import howToTrackBusinessExpenses from "../../Documentation/solutions/Budgeting for Freelancers/How to Track Business Expenses_ A Practical Guide (2026).md?raw";
import monthlyBudgetChecklistForFreelancers from "../../Documentation/solutions/Budgeting for Freelancers/Monthly Budget Checklist for Freelancers_ A Practical Guide (2026).md?raw";
import separatingBusinessAndPersonalExpenses from "../../Documentation/solutions/Budgeting for Freelancers/Separating Business and Personal Expenses_ A Practical Guide (2026).md?raw";

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
  {
    slug: "budgeting-for-families",
    title: "Budgeting for Families",
    description:
      "Build a family budget that works for everyone. Manage household expenses, plan for groceries, save for your children's future, and reach your family's financial goals together.",
    hero: "Build a family budget that works for everyone. Learn how to manage household expenses, plan for groceries, save for your children's future, and reach your family's financial goals together with practical, step-by-step budgeting guides.",
    sourceMarkdown: familyBudgetingIntro,
    featuredGuideSlugs: [
      "how-to-create-a-family-budget",
      "monthly-family-budget-checklist",
      "budgeting-for-a-family-of-4",
      "family-emergency-fund-guide",
      "grocery-budget-for-families",
      "how-to-reduce-household-expenses",
      "family-financial-goals",
      "back-to-school-budget-guide",
    ],
    features: [
      "Family Budget Spaces",
      "Shared Expense Tracking",
      "AI Receipt Scanner",
      "AI Expense Categorization",
      "Bill & Subscription Tracking",
      "Monthly Family Insights",
    ],
    faqs: [
      {
        question: "How do I create a family budget?",
        answer:
          "Start by calculating your household income, listing your essential expenses, setting shared financial goals, and tracking your spending each month.",
      },
      {
        question: "How much should a family save each month?",
        answer:
          "A strong target is to start with something sustainable and increase it over time. Even a small automatic transfer each month is enough to build momentum and create the habit.",
      },
      {
        question: "What's the best budgeting app for families?",
        answer:
          "The best app is the one you will actually use consistently. Look for shared budget spaces, clear category tracking, and a way to organize household bills and everyday spending.",
      },
      {
        question: "How do couples manage a shared budget?",
        answer:
          "Choose a system you both understand. Shared spaces work well for many households, and regular reviews keep everyone informed and aligned on spending decisions.",
      },
      {
        question: "How can I reduce my household expenses?",
        answer:
          "Track spending regularly, review where the money went, and look for opportunities to reduce recurring costs. Small visibility improvements usually create the biggest change.",
      },
    ],
  },
  {
    slug: "budgeting-for-freelancers",
    title: "Budgeting for Freelancers",
    description:
      "Learn how to budget as a freelancer, manage irregular income, track business expenses, improve cash flow, and prepare for taxes with practical budgeting guides.",
    hero: "Learn how to budget as a freelancer, manage irregular income, track business expenses, improve cash flow, and prepare for taxes with practical budgeting guides.",
    sourceMarkdown: freelancersBudgetingIntro,
    featuredGuideSlugs: [
      "how-to-budget-as-a-freelancer",
      "budgeting-with-irregular-income",
      "how-to-track-business-expenses",
      "separating-business-and-personal-expenses",
      "emergency-fund-for-freelancers",
      "monthly-budget-checklist-for-freelancers",
      "cash-flow-management-for-freelancers",
    ],
    features: [
      "Personal Budget Space",
      "Business Budget Space",
      "AI Expense Tracking",
      "Receipt Scanner",
      "Email Receipt Forwarding",
      "Voice Expense Logging",
      "Bank Sync",
      "Budget Pockets",
      "Recurring Expenses",
      "Monthly Insights",
    ],
    faqs: [
      {
        question: "How do I budget with irregular income?",
        answer:
          "Budget using your average monthly income and save extra income during busy months to cover slower periods.",
      },
      {
        question: "Should I separate personal and business expenses?",
        answer:
          "Yes. Separating your finances makes budgeting, expense tracking, and tax preparation much easier.",
      },
      {
        question: "How much should freelancers save for taxes?",
        answer:
          "Save a percentage of every payment you receive in a separate account based on your expected tax obligations.",
      },
      {
        question: "What's the best budgeting app for freelancers?",
        answer:
          "Look for a tool that supports both personal and business budgeting, expense tracking, and tax preparation. Clear visibility into cash flow matters most.",
      },
      {
        question: "How do I track business expenses?",
        answer:
          "Record expenses as they happen using a consistent system. Track software, equipment, travel, meals, and other business costs for tax deductions.",
      },
      {
        question: "How much emergency savings should freelancers have?",
        answer:
          "Many freelancers work toward three to six months of essential expenses, but building your first $500 or $1,000 is a great place to start.",
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
  {
    categorySlug: "budgeting-for-families",
    slug: "how-to-create-a-family-budget",
    title: "How to Create a Family Budget",
    excerpt:
      "A step-by-step guide to building a family budget that works for everyone, from setting shared goals to tracking household spending together.",
    content: howToCreateFamilyBudget,
    keywords: [
      "family budget",
      "household budgeting",
      "shared family finances",
    ],
  },
  {
    categorySlug: "budgeting-for-families",
    slug: "monthly-family-budget-checklist",
    title: "Monthly Family Budget Checklist",
    excerpt:
      "A practical checklist to help your family review income, expenses, and savings progress every month.",
    content: monthlyFamilyBudgetChecklist,
    keywords: [
      "family budget checklist",
      "monthly budget review",
      "household budget template",
    ],
  },
  {
    categorySlug: "budgeting-for-families",
    slug: "budgeting-for-a-family-of-4",
    title: "Budgeting for a Family of 4",
    excerpt:
      "Practical budgeting strategies and expense planning for households with four family members.",
    content: budgetingForFamilyOf4,
    keywords: [
      "family of 4 budget",
      "household of 4",
      "family budget planning",
    ],
  },
  {
    categorySlug: "budgeting-for-families",
    slug: "family-emergency-fund-guide",
    title: "Family Emergency Fund Guide",
    excerpt:
      "How much your family should save for emergencies and practical steps to build your household safety net.",
    content: familyEmergencyFundGuide,
    keywords: [
      "family emergency fund",
      "household savings",
      "family financial safety",
    ],
  },
  {
    categorySlug: "budgeting-for-families",
    slug: "grocery-budget-for-families",
    title: "Grocery Budget for Families",
    excerpt:
      "How to spend less on groceries without sacrificing meals, with practical tips for family meal planning.",
    content: groceryBudgetForFamilies,
    keywords: [
      "grocery budget",
      "family food budget",
      "meal planning savings",
    ],
  },
  {
    categorySlug: "budgeting-for-families",
    slug: "how-to-reduce-household-expenses",
    title: "How to Reduce Household Expenses",
    excerpt:
      "Practical strategies to lower your monthly bills and household costs without sacrificing quality of life.",
    content: howToReduceHouseholdExpenses,
    keywords: [
      "reduce household expenses",
      "lower monthly bills",
      "household cost cutting",
    ],
  },
  {
    categorySlug: "budgeting-for-families",
    slug: "family-financial-goals",
    title: "Family Financial Goals",
    excerpt:
      "How to plan your family's financial future together, from short-term savings to long-term dreams.",
    content: familyFinancialGoals,
    keywords: [
      "family financial goals",
      "shared family goals",
      "household financial planning",
    ],
  },
  {
    categorySlug: "budgeting-for-families",
    slug: "back-to-school-budget-guide",
    title: "Back-to-School Budget Guide",
    excerpt:
      "How to save money on school expenses and plan your back-to-school budget without overspending.",
    content: backToSchoolBudgetGuide,
    keywords: [
      "back to school budget",
      "school expenses",
      "family education costs",
    ],
  },
  {
    categorySlug: "budgeting-for-freelancers",
    slug: "how-to-budget-as-a-freelancer",
    title: "How to Budget as a Freelancer",
    excerpt:
      "A practical guide to budgeting with irregular income, covering essential expenses, tax savings, and cash flow management.",
    content: howToBudgetAsFreelancer,
    keywords: [
      "freelancer budget",
      "irregular income budgeting",
      "self-employed budget",
    ],
  },
  {
    categorySlug: "budgeting-for-freelancers",
    slug: "budgeting-with-irregular-income",
    title: "Budgeting with Irregular Income",
    excerpt:
      "Strategies for managing variable income, building buffers, and staying financially stable as a freelancer.",
    content: budgetingWithIrregularIncome,
    keywords: [
      "irregular income",
      "variable income budgeting",
      "freelance cash flow",
    ],
  },
  {
    categorySlug: "budgeting-for-freelancers",
    slug: "how-to-track-business-expenses",
    title: "How to Track Business Expenses",
    excerpt:
      "A practical guide to recording and organizing business expenses for tax deductions and financial clarity.",
    content: howToTrackBusinessExpenses,
    keywords: [
      "business expenses",
      "freelance expense tracking",
      "tax deductions",
    ],
  },
  {
    categorySlug: "budgeting-for-freelancers",
    slug: "separating-business-and-personal-expenses",
    title: "Separating Business and Personal Expenses",
    excerpt:
      "Why and how to keep your business and personal finances separate for better budgeting and tax preparation.",
    content: separatingBusinessAndPersonalExpenses,
    keywords: [
      "separate business finances",
      "business vs personal expenses",
      "freelance accounting",
    ],
  },
  {
    categorySlug: "budgeting-for-freelancers",
    slug: "emergency-fund-for-freelancers",
    title: "Emergency Fund for Freelancers",
    excerpt:
      "How much freelancers should save for emergencies and practical steps to build a safety net for slow months.",
    content: emergencyFundForFreelancers,
    keywords: [
      "freelancer emergency fund",
      "self-employed savings",
      "freelance financial safety",
    ],
  },
  {
    categorySlug: "budgeting-for-freelancers",
    slug: "monthly-budget-checklist-for-freelancers",
    title: "Monthly Budget Checklist for Freelancers",
    excerpt:
      "A practical checklist to help freelancers review income, expenses, tax savings, and cash flow every month.",
    content: monthlyBudgetChecklistForFreelancers,
    keywords: [
      "freelancer budget checklist",
      "monthly freelance review",
      "self-employed budget template",
    ],
  },
  {
    categorySlug: "budgeting-for-freelancers",
    slug: "cash-flow-management-for-freelancers",
    title: "Cash Flow Management for Freelancers",
    excerpt:
      "Strategies for managing cash flow, timing payments, and maintaining financial stability with variable income.",
    content: cashFlowManagementForFreelancers,
    keywords: [
      "freelance cash flow",
      "cash flow management",
      "self-employed income timing",
    ],
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
