import type { HelpArticle } from "../../types";

export const whatIsMonekoArticle: HelpArticle = {
  id: "what-is-moneko",
  number: "1.1",
  slug: "what-is-moneko",
  title: "What is Moneko?",
  description:
    "Learn how Moneko tracks spending with AI-assisted budgeting, receipt capture, and selected payment notification capture on Android and iOS 27.",
  categoryId: "getting-started",
  readTime: 3,
  featured: true,
  keywords: [
    "Moneko",
    "AI budgeting",
    "expense tracking",
    "personal finance app",
    "iPhone automatic expense tracker",
    "iOS 27 notification capture",
  ],
  faqItems: [
    {
      question: "What is a shared expense tracker?",
      answer: "A shared expense tracker helps multiple people log, organize, and split expenses together in real time.",
    },
    {
      question: "Can Moneko split bills automatically?",
      answer: "Yes. Moneko helps track who paid, how expenses are split, and who owes what.",
    },
    {
      question: "Is Moneko good for couples?",
      answer: "Yes. Moneko is designed for shared budgeting scenarios including couples, roommates, and families.",
    },
    {
      question: "Can I upload receipts to expenses?",
      answer: "Yes. You can attach receipts directly to expenses for better organization and transparency.",
    },
    {
      question: "Can Moneko capture transactions from iPhone notifications?",
      answer: "Yes. On iOS 27 or later, configure a Shortcuts notification automation for apps you select and add Moneko's Capture Transaction Notification action. Moneko can save supported completed transactions from the details passed by that automation.",
    },
    {
      question: "Does Moneko work for travel expenses?",
      answer: "Yes. You can create dedicated Spaces for trips, vacations, and group events.",
    },
    {
      question: "Do I need to manually categorize expenses?",
      answer: "No. Moneko automatically helps organize expenses in the background.",
    },
    {
      question: "Can I track both personal and shared expenses?",
      answer: "Yes. Separate Spaces allow you to manage different types of budgets independently.",
    },
  ],
  videoId: "i1-91JNt87o",
  content: `# What is Moneko?

Moneko is a mobile-first budgeting and expense tracking app designed to help you capture spending quickly, organize money into monthly pockets, manage personal or household finances, and plan your financial future with AI.

Whether you're managing your own money or splitting expenses with a partner, Moneko adapts to how you actually live.

## Core Features

- **Quick Capture:** Log expenses in seconds using text, voice, receipt photos, or even via WhatsApp and Telegram.
- **Pockets:** Use envelope-style budgeting to see how much you have left in each category at a glance.
- **Spaces:** Keep your personal spending separate from shared household expenses or group trips.
- **Wallets:** Track your actual balances across cash, bank accounts, and savings.
- **AI Scenario Planning:** Ask questions about your future spending, like "Can I afford a new laptop next month?"
- **Automated Capture:** Capture supported completed transactions from selected app notifications on Android and, through a Shortcuts notification automation, on iOS 27 or later. Apple Pay Wallet capture uses a separate Shortcut; email receipt capture is also available.

## Why Moneko?

Most budgeting apps feel like work. They require you to fill out long forms and categorize every cent perfectly. Moneko removes that friction. 

By focusing on **natural language input** and **automatic organization**, Moneko helps you stay on top of your finances without the stress of manual maintenance.

---

### Next Steps

- [Learn more about shared expense tracking](/help/shared-expense-tracker-guide)
- [How to create your first Space](/help/how-to-create-your-first-space)
- [How to use Pockets to organize your spending](/help/how-to-use-pockets-to-organize-your-spending)
- [Capture transactions from iPhone notifications on iOS 27](/help/automatically-track-transactions-from-iphone-notifications-moneko)
- [Capture transactions from Android notifications](/help/automatically-track-android-notifications-moneko)
`,
};
