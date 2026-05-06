import type { HelpArticle } from "../../types";

export const aiScenarioPlanningArticle: HelpArticle = {
  id: "ai-scenario-planning",
  number: "4.2",
  slug: "ai-scenario-planning-moneko",
  title: "Plan Your Spending with AI in Moneko",
  description:
    "Learn how to use AI Scenario Planning in Moneko to plan future purchases, compare timelines, test expenses, and understand what your money can support.",
  categoryId: "automation-planning",
  readTime: 5,
  featured: true,
  keywords: [
    "AI Scenario Planning in Moneko",
    "Moneko AI spending planner",
    "plan spending with AI",
    "financial scenario planning",
    "AI budget planner",
    "future spending planner",
    "cash flow planning",
    "spending decision tool",
    "Moneko beta feature",
  ],
  faqItems: [
    {
      question: "What is AI Scenario Planning in Moneko?",
      answer:
        "AI Scenario Planning is a beta feature that helps you evaluate future money decisions using your actual data in Moneko.",
    },
    {
      question: "What can I ask AI Scenario Planning?",
      answer:
        "You can ask future spending questions such as “Can I buy an iPhone before May 2026?”, “Can we afford a trip next year?”, or “Should I upgrade my laptop this year?”",
    },
    {
      question: "What question format works best?",
      answer: "A useful format is: “Can I … before [date]?”",
    },
    {
      question: "What data does Moneko use for AI Scenario Planning?",
      answer:
        "Moneko can use your current balance, average monthly surplus, recurring income and expenses, budget allocations, and cash flow trends.",
    },
    {
      question: "What does Moneko show in the analysis?",
      answer:
        "For each scenario, Moneko provides a clear verdict, reasoning, what the decision impacts, and what needs to change if it is not realistic.",
    },
    {
      question: "Can I use AI Scenario Planning for shared goals?",
      answer: "Yes. You can use it to plan shared goals in a Space.",
    },
    {
      question: "Can I use it to compare timelines?",
      answer: "Yes. You can use AI Scenario Planning to compare timelines for a purchase.",
    },
    {
      question: "Can I use it for unexpected expenses?",
      answer: "Yes. You can test unexpected expenses as scenarios.",
    },
    {
      question: "Is AI Scenario Planning a beta feature?",
      answer: "Yes. AI Scenario Planning is currently in beta.",
    },
    {
      question: "Why does the response look limited?",
      answer:
        "Because the feature is currently in beta, you may see limited formats or responses while it continues improving.",
    },
  ],
  howToSteps: [
    {
      name: "Open AI Scenario Planning",
      text: "Navigate to the AI Planning or Insights section of the app.",
    },
    {
      name: "Ask a future question",
      text: "Type a question like 'Can I buy a laptop by September?'",
    },
    {
      name: "Review the analysis",
      text: "Moneko will provide a verdict and reasoning based on your current financial trends.",
    },
  ],
  content: `# Plan Your Spending with AI in Moneko

**AI Scenario Planning** helps you decide what to do next with your money.

Instead of only showing what you already spent, it helps you explore future decisions. You can use it to ask questions like:
- Can I buy an iPhone before May 2026?
- Can we afford a trip next year?
- Should I upgrade my laptop this year?

This feature works like a financial sandbox, helping you test decisions before making them.

> **Note:** AI Scenario Planning is currently in beta. You may see limited formats or responses while the feature continues improving.

---

## What You Can Ask

AI Scenario Planning is designed for future money questions. A useful format is:
**“Can I … before [date]?”**

![AI Scenario Question](/help/ai-scenario-planning/01.png)

Example:
**“Can I buy an iPhone before May 2026?”**

### Expected Result
Moneko analyzes your scenario and gives you context to help understand whether the decision looks realistic.

---

## How to Use AI Scenario Planning

To use the feature:
1. Open the **AI Scenario Planning** feature.
2. Enter a question starting with: **“Can I … before [date]?”**
3. Submit your question to get an analysis.

### Expected Result
Moneko reviews your question and returns an analysis based on your actual money data.

---

## How AI Scenario Planning Works

Moneko uses your actual data to evaluate the scenario. This can include:
- current balance
- average monthly surplus
- recurring income and expenses
- budget allocations
- cash flow trends

By using your own data, Moneko can give more relevant context than a generic budgeting answer.

---

## What You Will See

For each scenario, Moneko provides:
- a clear verdict
- the reasoning behind it
- what the decision impacts
- what needs to change if the scenario is not realistic

![AI Scenario Analysis](/help/ai-scenario-planning/02.png)

You get context, not just a simple yes or no.

### Example Outcome
If a purchase does not look realistic by your target date, Moneko can help explain what would need to change, such as your timeline, spending, savings, or cash flow.

---

## When to Use AI Scenario Planning

Use AI Scenario Planning when you want to explore different money decisions before acting. It can help you:
- compare timelines for a purchase
- decide between spending and saving
- plan shared goals in a Space
- test unexpected expenses

This makes it useful for both personal and shared financial planning.

---

## Troubleshooting Common Issues

### My Question Did Not Work Well
Try using a clearer format. Questions that include a goal and a date (e.g., "Can I buy an iPhone before May 2026?") are easier to analyze.

### The Answer Is Not What I Expected
Moneko evaluates the scenario using your actual data. If the result looks different than expected, check whether your data (Wallets, Pockets, Recurring) is up to date.

### I Want to Plan a Shared Goal
Use AI Scenario Planning inside the relevant shared Space. This helps the scenario reflect the data connected to that group context.
`,
};
