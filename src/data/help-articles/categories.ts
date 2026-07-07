import type { HelpCategory } from "./types";

export const helpCategories: HelpCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    eyebrow: "Setup basics",
    description:
      "Learn what Moneko is, create your first Space, and move your data in or out safely.",
    iconName: "rocket",
  },
  {
    id: "logging-expenses",
    title: "Logging Expenses",
    eyebrow: "Capture spending",
    description:
      "Track purchases manually, with assistants, from Apple Pay, through email, or with quick actions.",
    iconName: "receipt",
  },
  {
    id: "budgeting-pockets",
    title: "Budgets & Pockets",
    eyebrow: "Organize money",
    description:
      "Use envelope budgeting, Pockets, categories, and Wallets to keep every dollar clear.",
    iconName: "wallet",
  },
  {
    id: "bank-sync",
    title: "Bank Sync",
    eyebrow: "Connect accounts",
    description:
      "Troubleshoot bank connections, Plaid imports, opening balances, and synced wallet balances.",
    iconName: "wallet",
  },
  {
    id: "automation-planning",
    title: "Automation & Planning",
    eyebrow: "Plan ahead",
    description:
      "Automate recurring activity and test spending decisions with AI scenario planning.",
    iconName: "sparkles",
  },
  {
    id: "security-privacy",
    title: "Security & Privacy",
    eyebrow: "Protect your data",
    description:
      "Learn how Moneko keeps your financial data safe with encryption, biometrics, and local processing.",
    iconName: "lock",
  },
];
