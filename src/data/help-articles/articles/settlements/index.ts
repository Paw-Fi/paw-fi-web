import type { HelpArticle } from "../../types";

export const settlementsArticle: HelpArticle = {
  id: "settlements",
  number: "2.10",
  slug: "how-settlements-work-in-moneko",
  title: "How Settlements Work in Moneko",
  description:
    "Understand who owes whom in a shared Space, what marking a balance settled does, and why a settlement is not a bank transfer.",
  categoryId: "logging-expenses",
  readTime: 4,
  keywords: [
    "Moneko settlement",
    "how to settle up in Moneko",
    "does Moneko move money",
    "who owes whom",
    "mark debt settled",
    "shared expense balance changed",
  ],
  faqItems: [
    {
      question: "Does Moneko move money when I settle up?",
      answer:
        "No. A settlement records that you and another member resolved a shared balance outside Moneko. It does not send, receive, or transfer money from a bank account.",
    },
    {
      question: "I paid Sam back. Should I mark it settled or add an expense?",
      answer:
        "If the payment only repays a shared balance, record a settlement. Add an expense only when there was a new purchase that should count as spending.",
    },
    {
      question: "Why did the amount someone owes change?",
      answer:
        "Balances are recalculated from the shared expenses, payer, participant shares, edits, deletions, and settlements in that Space. Editing an earlier expense can change a later suggested settlement.",
    },
    {
      question: "Can I undo or correct a settlement?",
      answer:
        "Open the settlement history or the related shared balance, then correct the settlement if the option is available. If you cannot find the record, do not add a duplicate payment; contact Support with the Space, members, amount, and date.",
    },
  ],
  content: `# How Settlements Work in Moneko

A settlement records that people in a shared Space have resolved part or all of what they owe each other. It does not move money, connect to a payment app, or create a bank transfer.

## What a Settlement Means

Moneko calculates shared balances from recorded expenses. For each expense, it considers the total amount, who paid, and each participant's share. When someone pays another person outside Moneko, record a settlement so the shared balance reflects that payment.

For example, if Alex paid a 60 EUR dinner split equally with Sam, Sam owes Alex 30 EUR. If Sam sends Alex 30 EUR using a bank or payment app, record a settlement for that repayment. Do not create another dinner expense.

## Settlement or New Expense?

Use a **settlement** when money repays an existing shared balance.

Use a **new expense** when people bought something new and it should appear in spending, a Pocket, a Wallet, and reports.

Use a **Wallet transfer** only when you are moving money between two same-currency Wallets you track in Moneko. A Wallet transfer is separate from a shared settlement.

## Why the Suggested Amount Can Change

The amount shown is a current calculation, not a fixed invoice. It can change when a member adds, edits, deletes, or corrects a shared expense or its split. Check the shared Space, date, payer, and participant shares before recording a settlement.

Settlement history stays intact. New shared expenses and corrections that are still allowed can change the current balance after a settlement has been recorded.

## Before You Mark a Balance Settled

1. Confirm the people and shared Space are correct.
2. Check that the payment happened outside Moneko.
3. Review the amount and currency.
4. Record the settlement once.
5. Keep payment evidence in your bank or payment app if you may need to resolve a disagreement later.

## If a Shared Balance Looks Wrong

Do not create a second settlement to force the number to zero. First review recent shared expenses, their payer, split, date, and any existing settlements. Then use the relevant transaction or settlement correction flow. For help, provide the Space name, members involved, amount, currency, and date, but redact bank-account numbers and payment credentials.

## Related Guides

- [How to split expenses in Moneko](/help/how-to-split-expenses-moneko)
- [How to use Wallets in Moneko](/help/how-to-use-wallets-moneko)
`,
};
