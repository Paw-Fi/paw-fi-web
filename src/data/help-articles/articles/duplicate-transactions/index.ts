import type { HelpArticle } from "../../types";

export const duplicateTransactionsArticle: HelpArticle = {
  id: "duplicate-transactions",
  number: "2.3",
  slug: "avoid-and-fix-duplicate-transactions-moneko",
  title: "Avoid and Fix Duplicate Transactions",
  description:
    "Find out why the same purchase can appear twice, check which record is real, and correct duplicates without distorting your budgets or balances.",
  categoryId: "logging-expenses",
  readTime: 4,
  keywords: [
    "duplicate transactions Moneko",
    "Moneko duplicate expense",
    "same transaction twice",
    "duplicate receipt transaction",
    "duplicate bank transaction",
    "delete duplicate expense",
    "Moneko totals wrong duplicate",
  ],
  faqItems: [
    {
      question: "Why do I have the same transaction twice in Moneko?",
      answer:
        "A duplicate can happen when the same purchase is recorded through more than one source, when a save is repeated after uncertainty about its result, or when two similar purchases are mistaken for one another. Check the source, time, amount, currency, Space, and Wallet before deleting anything.",
    },
    {
      question: "Should I add a negative transaction to cancel a duplicate?",
      answer:
        "No. Open the duplicated ordinary transaction and delete the extra record after you have identified it. An offsetting transaction can make categories, Pockets, Wallets, reports, and shared balances harder to understand.",
    },
    {
      question: "What if I cannot tell which transaction is the duplicate?",
      answer:
        "Leave both records in place while you compare their source, date, merchant, amount, currency, Space, Wallet, and pending status. Contact support with redacted diagnostics if the two records still cannot be identified safely.",
    },
  ],
  howToSteps: [
    {
      name: "Compare the two records",
      text: "Open each transaction and compare its source, time, amount, currency, Space, Wallet, category, and pending status.",
    },
    {
      name: "Keep the verified record",
      text: "Keep the record that matches the purchase and its intended source. Do not create an opposite transaction to compensate for the other one.",
    },
    {
      name: "Delete the extra record",
      text: "Delete only the confirmed duplicate, then check the affected Pocket, Wallet, report, or shared balance again.",
    },
  ],
  content: `# Avoid and Fix Duplicate Transactions

Seeing the same purchase twice can make spending, Pocket progress, Wallet balances, and shared calculations look wrong. Do not delete both entries or add an opposite transaction immediately. First identify whether the records are truly duplicates and which source should remain.

---

## Check whether the entries are actually duplicates

Open both transactions and compare:

- amount and currency
- date and time
- merchant or description
- Space and Wallet
- category and transaction type
- source and pending status

Two purchases at the same merchant can be legitimate, particularly when one is a tip, a partial payment, a reimbursement, or a separate purchase made close together. A transaction in a personal Space is also not the same record as a similar transaction in a household Space.

---

## Common ways duplicates happen

A duplicate can appear when the same purchase is entered from two different sources, such as a manual entry and a receipt capture. It can also happen when someone repeats a save because they are unsure whether it completed.

If you see a pending record, wait for its status to resolve before entering the purchase again. A locally saved pending record may reconcile after connectivity returns. Repeating the capture while it is pending can create a second record.

For an AI-captured entry, open the saved transaction first. [AI Capture: Accuracy, Review, and Corrections](/help/ai-capture-accuracy-and-corrections) explains how to correct one record rather than creating a compensating entry.

---

## Remove a confirmed duplicate safely

Once you know which record is extra:

1. Keep the transaction that matches the intended purchase and source.
2. Open the confirmed duplicate.
3. Delete that record.
4. Recheck the affected Pocket, Wallet, report, and any shared split or settlement.

Do not enter a negative expense or a second transfer to cancel a duplicate. That creates additional history which can make reports and shared balances less trustworthy.

---

## If the duplicate involves shared spending

Before deleting a shared transaction, compare the payer and split lines as well as the amount. One entry may be the actual shared expense while another is a personal reimbursement or a separate purchase. If a split or settlement has changed since the transaction was created, check the current balance after removing only the confirmed duplicate.

See [How settlements work in Moneko](/help/how-settlements-work-in-moneko) for shared-balance context.

---

## When to contact support

If the source of the entries is unclear, leave them unchanged and contact support with a redacted description. Include the date range, Space, Wallet, currency, amount, status, and what you expected. Do not send passwords, bank credentials, or full financial exports.

For a broader investigation checklist, see [Common Moneko discrepancies and troubleshooting](/help/common-moneko-discrepancies-troubleshooting).
`,
};
