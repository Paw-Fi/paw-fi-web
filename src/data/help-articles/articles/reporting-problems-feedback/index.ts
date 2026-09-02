import type { HelpArticle } from "../../types";

export const reportingProblemsFeedbackArticle: HelpArticle = {
  id: "reporting-problems-feedback",
  number: "7.1",
  slug: "report-a-problem-request-feature-contact-support-moneko",
  title: "Report a Problem, Request a Feature, or Contact Support",
  description:
    "Send the right details for a Moneko problem, billing question, privacy concern, or product request without sharing sensitive financial information.",
  categoryId: "security-privacy",
  readTime: 4,
  keywords: [
    "Moneko support",
    "report Moneko bug",
    "Moneko feature request",
    "contact Moneko",
    "Moneko billing help",
    "Moneko privacy concern",
    "Moneko troubleshooting",
  ],
  faqItems: [
    {
      question: "How do I report a bug in Moneko?",
      answer:
        "Contact Moneko support with a short description of what happened, when it happened, the affected Space or Wallet if relevant, and the steps that reproduce it. Do not send passwords, bank login credentials, or full card numbers.",
    },
    {
      question: "How do I request a new feature?",
      answer:
        "Describe the problem you are trying to solve, the workflow you use today, and what outcome would make the feature useful. A request is not a promise of delivery, but this context makes it easier to evaluate.",
    },
    {
      question:
        "What should I include when a total or transaction looks wrong?",
      answer:
        "Include the screen or metric, the date range, Space, Wallet, currency, source of the entry, and whether the item is pending. Redact personal information in screenshots before sharing them.",
    },
  ],
  howToSteps: [
    {
      name: "Identify the request type",
      text: "Separate a product request from a current app problem, billing question, or privacy and security concern.",
    },
    {
      name: "Collect safe diagnostics",
      text: "Write down the affected screen, time, Space or Wallet, date range, currency, and steps taken. Redact sensitive values in any screenshot.",
    },
    {
      name: "Contact support",
      text: "Email hello@moneko.io with the concise summary and diagnostics. Use the account email if you need help locating account-specific records.",
    },
  ],
  content: `# Report a Problem, Request a Feature, or Contact Support

If something in Moneko does not look right, the fastest path is to describe the type of help you need and the smallest set of safe details that let support investigate. A product request, a current data problem, a billing issue, and a privacy concern need different information.

---

## Choose the right kind of request

### Report a current problem

Use this for a missing, duplicate, pending, or incorrectly calculated item; an app error; or a feature that is not behaving as expected. Include:

- what you expected and what happened instead
- the screen where you saw it
- when it happened and the relevant date range
- the affected Space, Wallet, Pocket, or transaction source when applicable
- the steps that reproduce the issue

For money totals, also include the selected currency and whether the transaction is pending. See [Common Moneko discrepancies and troubleshooting](/help/common-moneko-discrepancies-troubleshooting) before deleting or recreating entries.

### Request a feature or integration

Use this for a missing bank, currency, report, capture method, or workflow improvement. Explain the outcome you need, not only the proposed interface. For example: “I need to separate work reimbursements from personal spending in a report” gives more useful context than “add a button.”

A feature request is feedback, not a commitment or delivery date. Keep using the current supported workflow until Moneko confirms a change is available.

### Ask about billing, privacy, or security

For a subscription or payment question, state the purchase channel and the issue without including payment-card details. For a privacy or security concern, describe the concern and the account email you use with Moneko; do not send passwords, one-time codes, bank credentials, or full account numbers.

Read the [Privacy Policy](https://www.moneko.io/privacy-policy) for the current legal terms. If you want a copy of your records before a major change, follow [Exporting your data without lock-in](/help/exporting-data-without-lock-in-moneko).

---

## Send a useful, privacy-safe report

Email **hello@moneko.io** with a short subject such as “Duplicate transaction in household Space” or “Feature request: additional currency.” Include the following where relevant:

- your account email
- your device and app version
- a short timeline of the issue
- the affected Space, Wallet, date range, and currency
- a redacted screenshot or screen recording
- the exact error message, if one appears

Redact names, account numbers, addresses, email content, receipt details, and transaction amounts unless they are essential to the issue. Never share your password, bank login credentials, payment-card number, verification code, or full export file by email.

---

## Before you contact support

Do not delete a transaction, reconnect an account, or repeat a save solely to make an issue disappear. That can make duplicates or missing-history investigations harder. First check the relevant guide:

- [Offline mode, pending saves, sync, and changing devices](/help/offline-pending-saves-sync-changing-devices-moneko)
- [Transfers, refunds, reimbursements, and cash](/help/transfers-credit-card-payments-refunds-cash-moneko)
- [Privacy and security standards](/help/moneko-privacy-and-security-standards)

If you have already changed something, say what you changed and when. That context is often enough to distinguish a display issue from a transaction that needs correction.
`,
};
