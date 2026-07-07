import type { HelpArticle } from "../../types";

export const monekoPlusArticle: HelpArticle = {
  id: "moneko-plus",
  number: "1.3",
  slug: "moneko-plus-premium-features-guide",
  title: "Moneko Plus: Premium Features Guide",
  description:
    "Explore the advanced features unlocked with Moneko Plus, including bank sync, multi-currency support, unlimited AI logging, and enhanced security.",
  categoryId: "getting-started",
  readTime: 5,
  featured: true,
  keywords: [
    "moneko plus",
    "premium features",
    "bank sync",
    "multi-currency",
    "ai logging",
    "plus plan",
    "subscription benefits",
  ],
  faqItems: [
    {
      question: "What is Moneko Plus?",
      answer:
        "Moneko Plus is our premium subscription that unlocks advanced automation, unlimited data, and professional-grade budgeting tools.",
    },
    {
      question: "Can I try Moneko Plus for free?",
      answer:
        "Yes, we offer a free trial for new users to explore all premium features before committing to a subscription.",
    },
    {
      question: "Does Plus include Bank Sync?",
      answer:
        "Yes, Moneko Plus includes secure bank synchronization via Plaid (available in supported regions like US and Canada).",
    },
    {
      question: "How many Spaces can I have with Plus?",
      answer:
        "Moneko Plus unlocks unlimited Spaces, allowing you to manage your personal, family, business, and travel finances separately.",
    },
    {
      question: "Is AI logging unlimited in Plus?",
      answer:
        "Yes, Plus users get unlimited access to our AI-powered natural language expense logging and receipt extraction.",
    },
  ],
  howToSteps: [
    {
      name: "Upgrade to Plus",
      text: "Open Moneko Settings and tap 'Upgrade to Plus' or tap any locked feature to see plan options.",
    },
    {
      name: "Select a Plan",
      text: "Choose between Monthly, Yearly, or Lifetime billing options.",
    },
    {
      name: "Complete Checkout",
      text: "Securely pay via Apple Pay, Google Play, or Stripe.",
    },
  ],
  content: `# Moneko Plus: Professional Budgeting Features

Moneko Plus is designed for users who want to take their financial tracking to the next level with automation, advanced insights, and unlimited organization.

---

## Everything Unlocked with Plus

When you upgrade to Moneko Plus, you gain access to our most powerful tools:

### 1. Advanced Automation
- **Bank Sync (Plaid)**: Connect your actual bank accounts to automatically import transactions.
- **Messaging App Capture**: Log expenses directly from **WhatsApp** and **Telegram**.
- **Email Receipt Import**: Forward digital receipts to Moneko to have them logged automatically.
- **Android Notification Capture**: Track spending in real-time from bank push notifications.

### 2. Powerful Budgeting & Organization
- **Unlimited Spaces**: Create as many Households, Trip folders, or Personal spaces as you need.
- **Unlimited Wallets**: Track every bank account, credit card, and cash stash.
- **Unlimited Pockets**: Detailed category breakdowns without limits.
- **Shared Budgets**: Collaborate on spending goals with partners and family.

### 3. Smart Insights & AI
- **Unlimited AI Logging**: Never fill out a form again. Use natural language to log everything.
- **AI Scenario Planning**: Test "What If" scenarios (e.g., "Can I afford a new car next year?") with our AI engine.
- **Advanced Health Reports**: Deep-dive details into your financial health rings and monthly trends.

### 4. Global Support
- **Multi-Currency**: Track transactions in any currency with live exchange rate conversions.
- **Currency Converter**: Built-in tool for quick manual conversions.
- **Priority Support**: Get faster help from our dedicated support team.

---

## Subscription Options

We offer flexible plans to fit your needs:

- **Monthly**: Best for short-term projects or testing the waters.
- **Yearly**: The most popular choice, offering significant savings over the monthly rate.
- **Lifetime**: A one-time payment for permanent access to all current and future Plus features.

---

## Security and Privacy

Plus features like Bank Sync and AI processing are built with the same "Privacy First" philosophy as our free app. We use bank-grade encryption and never sell your financial data.

---

## Managing Your Subscription

You can manage, change, or cancel your subscription at any time through:
- **iOS**: Apple App Store settings.
- **Android**: Google Play Store settings.
- **Web/Direct**: The "Manage Subscription" section in Moneko Settings.
`,
};
