import type { HelpArticle } from "../../types";

export const aiAssistantBoundariesArticle: HelpArticle = {
  id: "ai-assistant-boundaries",
  number: "4.3",
  slug: "what-moneko-ai-assistant-can-and-cannot-do",
  title: "What the Moneko AI Assistant Can and Cannot Do",
  description:
    "Use Moneko AI to understand your tracked money and explore plans, while keeping control of your records and knowing when to check the underlying data.",
  categoryId: "automation-planning",
  readTime: 4,
  keywords: [
    "Moneko AI assistant",
    "what can Moneko AI do",
    "Moneko AI financial advice",
    "Moneko AI explain spending",
    "Moneko AI limitations",
    "Moneko AI wrong answer",
  ],
  faqItems: [
    {
      question:
        "Can the Moneko AI assistant move money or make a bank transfer?",
      answer:
        "No. Moneko AI does not move money, initiate bank transfers, pay bills, or access your bank credentials. It helps you understand and plan around the financial information you track in Moneko.",
    },
    {
      question: "Is a Moneko AI answer financial, investment, or tax advice?",
      answer:
        "No. AI responses are informational planning support, not financial, investment, legal, or tax advice. Make important decisions using your own judgment and, when appropriate, a qualified professional.",
    },
    {
      question: "What should I do if an AI answer looks wrong?",
      answer:
        "Check the underlying transactions, date range, Space, Wallet, currency, and recurring items first. Correct the source record when it is wrong, then ask again with the missing context.",
    },
  ],
  howToSteps: [
    {
      name: "Ask a specific question",
      text: "Name the period, Space, Wallet, currency, or future date that matters to your question.",
    },
    {
      name: "Check the source records",
      text: "Compare the answer with the transactions, recurring items, and balances it depends on before acting on it.",
    },
    {
      name: "Correct the record, not the explanation",
      text: "Edit or delete an incorrect transaction, then repeat the question after the source data is accurate.",
    },
  ],
  content: `# What the Moneko AI Assistant Can and Cannot Do

Moneko AI can help you understand the information you track and explore a future-money question. It is a planning and explanation tool, not a replacement for your judgment or an authority that can act on your behalf.

---

## Useful questions to ask

Ask about a specific part of the data you have recorded. Clear questions include a period, Space, Wallet, currency, or date.

- “Why is my spending higher this month?”
- “Which categories changed from last month?”
- “Can I explore the effect of this purchase before July?”
- “What should I check when this total does not match what I expected?”

For a future purchase or timing question, use [AI Scenario Planning](/help/ai-scenario-planning-moneko). It is a beta planning feature that uses the financial context available in Moneko; it does not guarantee an outcome.

---

## What AI cannot do

Moneko AI cannot:

- move money, initiate a bank transfer, pay a bill, or access bank credentials
- file taxes or provide financial, investment, legal, or tax advice
- verify a receipt against a bank statement or infer facts that are missing from your records
- make an external account balance, a forecast, or a suggestion certain

Treat an answer as a starting point for review. Important financial decisions should use current source records and, where appropriate, qualified professional advice.

---

## When an answer does not look right

An answer can only reflect the data and context available to it. Before relying on it, check:

- the selected Space and whether personal and household activity are separate
- the date range and financial-month setting
- the Wallets and currencies included in the total
- pending, missing, duplicate, or incorrectly categorized transactions
- recurring items and whether a value is an actual record or a forecast

Correct the underlying transaction or setting rather than adding an offsetting entry to force a different total. Then ask the question again with the corrected context. For a structured check, use [Reports, Health, and “explain this number”](/help/understand-reports-financial-health-numbers-moneko) or [Common discrepancies and troubleshooting](/help/common-moneko-discrepancies-troubleshooting).

---

## Keep control of your records

AI capture can save an ordinary transaction from text, voice, a receipt, or a supported file. Open the saved entry to check it, then edit or delete it if necessary. See [AI Capture: Accuracy, Review, and Corrections](/help/ai-capture-accuracy-and-corrections) for the correction workflow.

When an AI response is unclear, start with a narrower question and include the relevant period or context. If the underlying data still looks wrong after checking it, contact support with a privacy-safe description of the issue instead of sharing credentials or full financial exports.
`,
};
