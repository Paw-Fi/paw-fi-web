import type { HelpArticle } from "../../types";

export const negativeWalletBalanceAfterPlaidSyncArticle: HelpArticle = {
  id: "negative-wallet-balance-after-plaid-sync",
  number: "4.3",
  slug: "negative-wallet-balance-after-plaid-sync",
  title: "Why Is My Wallet Balance Negative After Plaid Sync?",
  description:
    "Understand why a wallet can show a negative balance after connecting to Plaid and how to fix it by setting the correct opening balance.",
  categoryId: "bank-sync",
  readTime: 3,
  keywords: [
    "negative wallet balance",
    "Plaid sync",
    "wallet balance wrong",
    "opening balance",
    "bank import",
    "Plaid 24 months",
    "synced wallet negative",
    "Moneko wallet Plaid",
  ],
  faqItems: [
    {
      question: "Why is my wallet negative after I synced with Plaid?",
      answer:
        "Plaid only imports up to the past 24 months of transactions. Moneko calculates the wallet balance from those imported transactions. If the imported expenses are higher than the imported income, the balance can appear negative, even if your real account balance is positive.",
    },
    {
      question: "How do I fix a negative wallet balance after Plaid sync?",
      answer:
        "Set the wallet's opening balance to the account balance from before the imported Plaid transaction period started. This gives Moneko the correct starting point.",
    },
    {
      question: "Does Plaid import my full bank history?",
      answer:
        "No. Plaid typically provides transaction history for up to the past 24 months, depending on your bank. It does not include your full lifetime account history.",
    },
  ],
  howToSteps: [
    {
      name: "Check the imported transaction range",
      text: "Open the wallet and look at the oldest transactions to see how far back Plaid imported.",
    },
    {
      name: "Find the pre-sync account balance",
      text: "Get the account balance from your bank for the date just before the imported period started.",
    },
    {
      name: "Set the wallet opening balance",
      text: "Edit the wallet and set its opening balance to that pre-sync amount. Moneko will recalculate the balance from there.",
    },
  ],
  content: `# Why Is My Wallet Balance Negative After Plaid Sync?

After connecting a bank account through Plaid, you may notice that the wallet balance in Moneko is negative, even though your actual bank account balance is positive. This happens because of how Moneko calculates wallet balances from imported transactions.

---

## Why the Balance Can Look Negative

Moneko calculates your wallet balance from the transactions Plaid imported. It does not automatically know how much money was already in the account before that imported period.

Plaid can only provide transaction history for up to the past 24 months. If your account had money in it before that period, Moneko does not see that starting balance. When the imported expenses are higher than the imported income, the wallet can appear negative.

For example:
- Your bank account has $5,000 today.
- Plaid imports 24 months of transactions.
- During that period, you received $8,000 and spent $10,000.
- Moneko calculates the balance as -$2,000 because it never saw the $5,000 that was already there before the import.

---

## How to Fix It

Set the wallet's opening balance to the account balance from before the imported Plaid transaction period started.

1. Open the wallet in Moneko.
2. Tap **Edit** or open the wallet settings.
3. Find the **Opening Balance** field.
4. Enter the balance the account had on the day before Plaid's oldest imported transaction.
5. Save the change.

Moneko will add that opening balance to the imported transactions, and the wallet balance should now match your real account balance.

---

## What If I Don't Know the Exact Pre-Sync Balance?

If you are not sure what the balance was before the import, you can:
- Check your bank statements for the month before the oldest imported transaction.
- Contact your bank for a historical balance.
- Estimate the balance based on the difference between the current Moneko balance and your actual bank balance.

---

## Will This Happen Again?

No. Once the opening balance is set, Moneko will continue calculating the balance correctly as new transactions are imported. You only need to set the opening balance once, when you first connect the account.
`,
};
