import type { HelpArticle } from "../../types";

export const recurringExpensesIncomeArticle: HelpArticle = {
  id: "recurring-expenses-income",
  number: "4.1",
  slug: "recurring-expenses-income-moneko",
  title: "How to Set Up Recurring Expenses and Income in Moneko",
  description:
    "Learn how to set up recurring expenses and income in Moneko, automate regular transactions, update budgets, use reminders, and edit recurring items anytime.",
  categoryId: "logging-expenses",
  readTime: 5,
  keywords: [
    "recurring expenses and income in Moneko",
    "Moneko recurring expenses",
    "Moneko recurring income",
    "automate expenses in Moneko",
    "recurring transactions",
    "subscription tracking",
    "monthly rent tracker",
    "recurring salary tracking",
    "budget automation",
  ],
  faqItems: [
    {
      question: "What are recurring expenses and income in Moneko?",
      answer:
        "Recurring expenses and income are transactions that repeat regularly and can be logged automatically by Moneko.",
    },
    {
      question: "What can I set as recurring?",
      answer:
        "You can set rent, utilities, subscriptions, gym memberships, loan or debt payments, salary, freelance income, transfers, allowances, or anything else that repeats.",
    },
    {
      question: "How do I create a recurring item?",
      answer:
        "Go to the Recurring tab, tap the + button, choose Expense or Income, enter the details, set the frequency and start date, turn on reminder if needed, then tap Save.",
    },
    {
      question: "Can I create recurring income?",
      answer: "Yes. When creating a recurring item, choose Income.",
    },
    {
      question: "Can I create recurring expenses?",
      answer: "Yes. When creating a recurring item, choose Expense.",
    },
    {
      question: "Does Moneko log recurring items automatically?",
      answer: "Yes. When a recurring item is active, Moneko logs it automatically on schedule.",
    },
    {
      question: "Do recurring items update my budget?",
      answer: "Yes. Recurring items update your budgets when they are logged.",
    },
    {
      question: "Do recurring items appear in summaries and projections?",
      answer: "Yes. Recurring items appear in summaries and projections.",
    },
    {
      question: "Can I turn on reminders?",
      answer: "Yes. You can turn on reminder when setting up or editing a recurring item.",
    },
    {
      question: "Can I edit a recurring item later?",
      answer: "Yes. Open the Recurring tab, tap the item, update the details, and save changes.",
    },
  ],
  howToSteps: [
    {
      name: "Open Recurring tab",
      text: "Navigate to the Recurring section in Moneko.",
    },
    {
      name: "Add new item",
      text: "Tap the + button and select whether it is an Expense or Income.",
    },
    {
      name: "Set frequency",
      text: "Choose how often the item repeats (e.g., monthly, weekly) and save.",
    },
  ],
  videoId: "iXiYPbVd2uU",
  content: `# How to Set Up Recurring Expenses and Income in Moneko

Recurring lets you automate expenses and income that happen regularly.

You do not need to remember or re-enter the same transaction every time. Set it once, and Moneko logs it automatically on schedule.

---

## What You Can Set as Recurring

You can use recurring for regular expenses, regular income, and repeated money movement. Common examples include:

- rent
- utilities
- subscriptions
- gym memberships
- loan or debt payments
- salary or freelance income
- transfers or allowances

Anything that repeats can be automated.

---

## How to Set Up a Recurring Item

To create a recurring item:

![Creating Recurring Item](/help/recurring/01.png)

1. Go to the **Recurring** tab.
2. Tap the **+** button.
3. Choose **Expense** or **Income**.
4. Enter the details.
5. Set the frequency and start date.
6. Turn on reminder if needed.
7. Tap **Save**.

### Expected Result
Your recurring item is saved and will be logged automatically based on the schedule you set.

---

## How Recurring Works

When a recurring item is active, Moneko handles it for you. Moneko will:
- log it automatically on schedule
- update your budgets
- include it in summaries
- include it in projections

You do not need to log the same transaction again manually.

---

## Why Use Recurring Expenses?

Recurring expenses help you stay on top of fixed spending. Use recurring expenses for payments that repeat, such as rent, utilities, and subscriptions.

![Recurring Overview](/help/recurring/02.png)

This helps you:
- see how much money is already committed
- avoid forgetting regular payments
- understand how much you can still spend

---

## Why Use Recurring Income?

Recurring income helps make your cash flow more predictable. Use recurring income for money that comes in regularly, such as salary, freelance income, or allowances.

When regular income is included, Moneko can give you a clearer view of your monthly money flow.

---

## How to Edit or Update a Recurring Item

You can update a recurring item anytime. To edit:
1. Open the **Recurring** tab.
2. Tap an item.
3. Update the details.
4. Save changes.

---

## Troubleshooting Common Issues

### My Recurring Item Did Not Log
Check whether the item is active, the frequency is set correctly, and the start date is correct.

### My Budget Looks Different After Adding Recurring
This is expected. Recurring items update your budgets automatically when they are logged.

### I Need a Reminder
When setting up or editing a recurring item, turn on **reminder** if needed.
`,
};
