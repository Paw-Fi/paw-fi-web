import type { HelpArticle } from "../../types";

export const openingBalancesWalletReconciliationArticle: HelpArticle = {
  id: "opening-balances-wallet-reconciliation",
  number: "3.4a",
  slug: "opening-balances-wallet-balance-reconciliation-moneko",
  title: "Opening Balances and Wallet Balance Reconciliation",
  description:
    "Set a useful starting point for a Wallet and investigate why its displayed balance differs from the balance you expect.",
  categoryId: "budgeting-pockets",
  readTime: 4,
  keywords: [
    "Moneko opening balance",
    "Moneko Wallet balance wrong",
    "reconcile Wallet balance",
    "Wallet does not match bank balance",
    "starting balance Moneko",
    "negative Wallet balance",
  ],
  faqItems: [
    {
      question: "What is an opening balance in Moneko?",
      answer:
        "An opening balance is the starting amount you choose for a Wallet before the transactions you plan to track in Moneko. It gives the Wallet a starting point; it is not a substitute for checking the transactions that affect the balance afterward.",
    },
    {
      question: "Why does my Wallet not match the amount I expect?",
      answer:
        "Check the Wallet's opening balance, the transactions assigned to it, transfers, date range, currency, and whether an item is pending. A difference can also mean the records available in Moneko do not cover the same history as the balance you are comparing.",
    },
    {
      question: "Should I create a fake transaction to fix a Wallet balance?",
      answer:
        "No. First identify the missing, duplicated, misassigned, or incorrectly dated record. Use a real opening balance for the starting point and correct the actual transaction or transfer that caused the difference.",
    },
  ],
  howToSteps: [
    {
      name: "Choose a starting date",
      text: "Decide the date from which you want the Wallet history in Moneko to be meaningful.",
    },
    {
      name: "Set the opening balance",
      text: "Use the Wallet's opening balance as the amount at that starting point, then keep subsequent income, expenses, and transfers accurate.",
    },
    {
      name: "Investigate the difference",
      text: "Compare the opening balance and each Wallet-linked transaction before changing the balance again.",
    },
  ],
  content: `# Opening Balances and Wallet Balance Reconciliation

A Wallet balance is only as useful as its starting point and the records that change it. An opening balance lets you begin tracking from a chosen point without entering older history one transaction at a time. It does not make a Wallet match an external account automatically.

---

## Choose a clear starting point

Before setting an opening balance, choose the date from which you want to track activity in Moneko. Use the amount that was in the Wallet at that point as the opening balance. From there, record the income, expenses, and transfers that affect the Wallet.

For example, if you start tracking a cash Wallet on June 1 with 200 in cash, set 200 as the opening balance. Purchases and income after June 1 should then explain changes to that amount.

Do not use an opening balance to hide a missing or duplicate transaction. That makes later reconciliation more difficult.

---

## When a Wallet does not match what you expect

Check these items in order:

1. **Opening balance:** Is it the amount from the same starting date as the history you are comparing?
2. **Wallet assignment:** Is every relevant transaction assigned to this Wallet rather than another Wallet or Space?
3. **Transfers:** Was money moved between Wallets recorded as a transfer rather than spending or income?
4. **Duplicates and pending items:** Is a purchase present twice, or is a saved item still pending?
5. **Date and currency:** Are you comparing the same period and native currency?

Use [Avoid and Fix Duplicate Transactions](/help/avoid-and-fix-duplicate-transactions-moneko) if the same purchase appears more than once. Use [Transfers, refunds, reimbursements, and cash](/help/transfers-credit-card-payments-refunds-cash-moneko) when the difference may be money moving between Wallets.

---

## Reconcile without distorting your history

If you find an incorrect record, edit or delete that record. If a transfer was entered as spending, correct it to the appropriate money-movement workflow. If activity belongs to a different Wallet or Space, move it only after confirming its source.

Avoid adding a fake expense, income, or transfer merely to force a displayed balance to match another number. It can make Pockets, reports, and shared balances inaccurate even when the Wallet total looks closer.

---

## Compare the same scope

An external account balance and a Moneko Wallet may be based on different available history, dates, pending activity, or currencies. Compare like with like before concluding that either is wrong. If you use a connected account, see [Bank Sync security and account connections](/help/bank-sync-security-moneko) for connection-specific context.

If you still cannot explain the difference, collect the Wallet name, starting date, date range, currency, relevant transaction sources, and redacted screenshots before contacting support. Do not send bank credentials or full financial exports.
`,
};
