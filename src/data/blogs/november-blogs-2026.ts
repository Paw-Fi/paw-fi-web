import type { Blog } from "@/components/blogs/blogs.typing";
import { authorsData, tags } from "./authors";
import budget403030 from "./november-2026/40-30-30-budgeting-rule.md?raw";
import budget602020 from "./november-2026/60-20-20-budgeting-rule.md?raw";
import discretionary from "./november-2026/discretionary-income-definition-examples.md?raw";
import fixed from "./november-2026/fixed-expenses-examples.md?raw";
import gross from "./november-2026/gross-income-definition-calculation.md?raw";
import trip from "./november-2026/how-to-budget-for-a-trip.md?raw";
import financeApp from "./november-2026/how-to-choose-personal-finance-app.md?raw";
import subscriptions from "./november-2026/how-to-find-and-cancel-unused-subscriptions.md?raw";
import carLoan from "./november-2026/how-to-pay-off-car-loan-faster.md?raw";
import variable from "./november-2026/variable-expenses-definition-examples.md?raw";
import health from "./november-2026/what-is-financial-health.md?raw";
import cover403030 from "@/assets/images/blogs/november-2026/The 40_30_30 Budget Rule.png";
import cover602020 from "@/assets/images/blogs/november-2026/The 60_20_20 Budget Rule.png";
import coverDiscretionary from "@/assets/images/blogs/november-2026/Understanding Discretionary Income.png";
import coverFixed from "@/assets/images/blogs/november-2026/Fixed Expenses_ Examples and Budgeting.png";
import coverGross from "@/assets/images/blogs/november-2026/Gross Income Explained Simply.png";
import coverTrip from "@/assets/images/blogs/november-2026/How to Budget for a Trip.png";
import coverFinanceApp from "@/assets/images/blogs/november-2026/How to Choose a Personal Finance App.png";
import coverSubscriptions from "@/assets/images/blogs/november-2026/Cancelling Unused Subscriptions Made Simple.png";
import coverCarLoan from "@/assets/images/blogs/november-2026/Pay Off Your Car Loan Faster.png";
import coverVariable from "@/assets/images/blogs/november-2026/Variable Expenses_ A Cosy Budget Desk.png";
import coverHealth from "@/assets/images/blogs/november-2026/Cute Financial Health Desk Dashboard.png";

interface Article {
  slug: string;
  title: string;
  description: string;
  seoTitle?: string;
  keywords: string;
  source: string;
  coverImage: string;
}

const articles: Article[] = [
  {
    slug: "40-30-30-budgeting-rule",
    title: "The 40/30/30 Budget Rule: How It Works & Examples",
    description:
      "Learn the 40/30/30 budget split, test whether your essential costs fit 40%, and compare it with 50/30/20 using a realistic monthly example.",
    keywords:
      "40/30/30 budget rule, 40/30/30 budget, 40/30/30 rule example, 40/30/30 vs 50/30/20",
    source: budget403030,
    coverImage: cover403030,
  },
  {
    slug: "60-20-20-budgeting-rule",
    title: "The 60/20/20 Budget Rule: How It Works & Examples",
    description:
      "See how a 60/20/20 budget divides take-home income, test it against essential costs, and compare it with 50/30/20 using a worked example.",
    keywords:
      "60/20/20 budget rule, 60/20/20 budget, 60/20/20 rule example, 60/20/20 vs 50/30/20",
    source: budget602020,
    coverImage: cover602020,
  },
  {
    slug: "discretionary-income-definition-examples",
    title: "What Is Discretionary Income? Definition and Examples",
    seoTitle:
      "What Is Discretionary Income? Definition, Examples, and How to Calculate It",
    description:
      "Learn how to calculate discretionary income, how it differs from discretionary spending and disposable income, and what to include in a household budget.",
    keywords:
      "discretionary income definition, discretionary spending definition, how to calculate discretionary income, discretionary income vs disposable income, discretionary expenses examples, discretionary definition",
    source: discretionary,
    coverImage: coverDiscretionary,
  },
  {
    slug: "fixed-expenses-examples",
    title: "Fixed Expenses: Examples, Checklist, and How to Budget for Them",
    description:
      "See common fixed expense examples, learn how they differ from variable costs, and use a checklist to plan monthly and annual bills.",
    keywords:
      "fixed expenses examples, examples of fixed expenses, fixed expenses list, fixed vs. variable expenses, monthly budget expenses, recurring bills, annual expenses budget",
    source: fixed,
    coverImage: coverFixed,
  },
  {
    slug: "gross-income-definition-calculation",
    title: "Gross Income: What It Means and How to Calculate It",
    description:
      "Learn what gross income means, how to calculate annual and monthly gross pay, and how it differs from net income and take-home pay.",
    keywords:
      "gross income, gross income definition, how to calculate gross income, gross monthly income, gross vs. net income, gross pay, take-home pay",
    source: gross,
    coverImage: coverGross,
  },
  {
    slug: "how-to-budget-for-a-trip",
    title: "How to Budget for a Trip: A Practical Checklist and Worked Example",
    seoTitle: "How to Budget for a Trip: Costs, Checklist, and Savings Plan",
    description:
      "Plan a realistic trip budget for transport, lodging, food, activities, and unexpected costs. Use a worked example, checklist, and savings schedule.",
    keywords:
      "how to budget for a trip, travel budget checklist, vacation budget, trip cost estimate, how much to save for a trip, daily travel budget",
    source: trip,
    coverImage: coverTrip,
  },
  {
    slug: "choose-personal-finance-app",
    title: "How to Choose a Personal Finance App",
    seoTitle:
      "How to Choose a Personal Finance App: Features, Costs, and Privacy",
    description:
      "Compare personal finance apps by budgeting method, expense tracking, shared features, privacy, and cost to find one that fits how you manage money.",
    keywords:
      "personal finance app, budgeting app, expense tracking app, personal finance software, household budgeting app",
    source: financeApp,
    coverImage: coverFinanceApp,
  },
  {
    slug: "how-to-find-and-cancel-unused-subscriptions",
    title: "How to Find and Cancel Unused Subscriptions",
    seoTitle: "How to Find and Cancel Unused Subscriptions: A Practical Guide",
    description:
      "Find forgotten subscriptions, cancel unwanted recurring payments, and reduce monthly expenses with this step-by-step guide and subscription audit checklist.",
    keywords:
      "how to find and cancel unused subscriptions, find forgotten subscriptions, subscription audit checklist, cancel recurring subscriptions, track subscription spending",
    source: subscriptions,
    coverImage: coverSubscriptions,
  },
  {
    slug: "how-to-pay-off-car-loan-faster",
    title: "How to Pay Off Your Car Loan Faster: Strategies to Save Money",
    description:
      "Learn how extra principal payments, lump sums, and refinancing may shorten a car loan. See a worked payoff example and what to check with your lender.",
    keywords:
      "how to pay off car loan faster, pay off car loan early, extra principal payment car loan, car loan prepayment penalty, auto loan payoff amount, refinance auto loan",
    source: carLoan,
    coverImage: coverCarLoan,
  },
  {
    slug: "variable-expenses-definition-examples",
    title: "What Are Variable Expenses? Examples & Budgeting Tips",
    description:
      "Learn what variable expenses are, see common examples, and build a practical budget for costs that change from month to month.",
    keywords:
      "variable expenses, variable expenses examples, fixed vs variable expenses, how to budget for variable expenses",
    source: variable,
    coverImage: coverVariable,
  },
  {
    slug: "what-is-financial-health",
    title: "What Is Financial Health? 7 Signs and How to Improve It",
    description:
      "Understand financial health through seven practical signs, assess your spending, savings, debt, and planning, and choose a realistic next step.",
    keywords:
      "financial health, signs of financial health, how to improve financial health, financial health checklist, financial stability, financial well-being",
    source: health,
    coverImage: coverHealth,
  },
];

export const NOVEMBER_BLOGS_2026: Blog[] = articles.map((article) => {
  const content = article.source
    .slice(article.source.search(/^# /m))
    .replace(/^# [^\n]*(?:\n+|$)/, "")
    .trim()
    .replace(/\]\(\[(https?:\/\/[^\]]+)\]\(\1\)\)/g, "]($1)")
    .replace(
      "$900everysixmonths,themonthlyplanningamountis`$900 ÷ 6 \\= \\$150`. If an annual membership costs $480, its monthly planning amount is` \\$480 ÷ 12 \\= \\$40\\`.",
      "$900 every six months, the monthly planning amount is `$900 ÷ 6 = $150`. If an annual membership costs $480, its monthly planning amount is `$480 ÷ 12 = $40`.",
    )
    .replace(
      ", and [goal Pockets](https://www.moneko.io/solutions/budgeting-for-individuals/financial-goals-for-individuals) can help you follow progress toward a target",
      "",
    );

  return {
    id: `november-2026-${article.slug}`,
    slug: article.slug,
    title: article.title,
    excerpt: article.description,
    content,
    coverImage: article.coverImage,
    hideCreditLabel: true,
    author: authorsData[4],
    tags: [
      tags.find((tag) => tag.id === "tag-44")!,
      tags.find((tag) => tag.id === "tag-13")!,
    ],
    publishedAt: "2026-11-25T00:00:00.000Z",
    readTime: Math.max(1, Math.ceil(content.split(/\s+/).length / 200)),
    featured: false,
    seo: {
      metaTitle: article.seoTitle ?? article.title,
      metaDescription: article.description,
      keywords: article.keywords,
    },
  };
});
