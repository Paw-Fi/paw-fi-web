import type { HelpArticle } from "../../types";

export const bankSyncSecurityArticle: HelpArticle = {
  id: "bank-sync-security",
  number: "4.1",
  slug: "is-bank-information-secure-after-syncing",
  title: "Is My Bank Information Secure After Syncing?",
  description:
    "Understand how Moneko protects your bank data, what Plaid handles, and how your information is used after you connect an account.",
  categoryId: "bank-sync",
  readTime: 3,
  keywords: [
    "bank sync security",
    "is Plaid safe",
    "bank data secure",
    "connect bank safe",
    "Moneko privacy",
    "bank information protected",
    "Plaid security",
    "sync bank account safe",
  ],
  faqItems: [
    {
      question: "Is it safe to connect my bank account to Moneko?",
      answer:
        "Yes. Moneko uses Plaid, a trusted financial data provider used by thousands of apps and banks. Your bank credentials are never stored on Moneko's servers.",
    },
    {
      question: "Does Moneko store my bank login details?",
      answer:
        "No. Moneko never sees or stores your bank username or password. Plaid handles the secure connection with your bank and only shares transaction and balance data with Moneko.",
    },
    {
      question: "How is my bank data used?",
      answer:
        "Your synced transaction data is used only to power your Moneko wallets, spending insights, and budgets. Moneko does not sell your data, use it for advertising, or share it with third parties for marketing purposes.",
    },
    {
      question: "Can I disconnect my bank account at any time?",
      answer:
        "Yes. You can remove a connected bank account or disconnect Plaid at any time from the app settings or your Plaid portal.",
    },
  ],
  howToSteps: [
    {
      name: "Connect through Plaid",
      text: "When you tap Connect Bank, you are redirected to Plaid's secure login flow to authenticate with your bank.",
    },
    {
      name: "Sync transactions securely",
      text: "Plaid sends encrypted transaction and balance data to Moneko, which is stored securely on our servers.",
    },
    {
      name: "Stay in control",
      text: "You can disconnect the account or delete your data at any time from your Moneko settings.",
    },
  ],
  content: `# Is My Bank Information Secure After Syncing?

Yes. Connecting your bank account to Moneko is designed to be secure and private. We partner with Plaid, a leading financial data provider used by thousands of apps and financial institutions, to handle the connection between Moneko and your bank.

---

## What Plaid Does

Plaid creates a secure, read-only connection between your bank and Moneko. When you connect an account:
- You enter your bank credentials directly into Plaid's secure login screen.
- Plaid verifies your identity with your bank.
- Plaid sends encrypted transaction and balance data to Moneko.

---

## What Moneko Does Not Store

Moneko **never** stores your bank username or password. Those credentials are handled entirely by Plaid and your bank. We only receive the transaction and balance information needed to update your Moneko wallets and insights.

---

## How Moneko Protects Your Data

- **Encrypted storage**: Synced bank data is stored securely on Moneko's servers.
- **Read-only access**: The connection is read-only, meaning Moneko cannot move money or make changes to your bank account.
- **Limited use**: Your data is used only to provide Moneko features, such as wallet balances, spending tracking, and financial insights.
- **No data selling**: Moneko does not sell your bank data, use it for advertising, or share it with third parties for marketing purposes.

---

## You Stay in Control

You can disconnect a linked bank account at any time from the app settings. If you choose to disconnect, Moneko will stop receiving new transactions from that account. You can also manage or revoke Plaid connections through your Plaid portal at any time.

---

## What If I Have More Questions?

If you have any concerns about security or privacy, you can contact our support team at hello@moneko.io.
`,
};
