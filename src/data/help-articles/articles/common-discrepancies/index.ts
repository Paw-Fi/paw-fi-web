import type { HelpArticle } from "../../types";

export const commonDiscrepanciesArticle: HelpArticle = {
  id: "common-discrepancies",
  number: "4.5",
  slug: "common-moneko-discrepancies-troubleshooting",
  title: "Common Moneko Discrepancies and Safe Troubleshooting",
  description:
    "Use a safe triage order for a missing, duplicate, or unexpected Moneko balance, Pocket, report, or shared amount.",
  categoryId: "getting-started",
  readTime: 7,
  keywords: [
    "Moneko balance wrong",
    "Moneko transaction missing",
    "Moneko duplicate transaction",
    "Moneko Pocket wrong",
    "Moneko report discrepancy",
    "Moneko settlement wrong",
    "Moneko support troubleshooting",
    "Moneko sync issue",
  ],
  faqItems: [
    {
      question: "Why is my Wallet, Pocket, or report wrong in Moneko?",
      answer:
        "Start with the selected Space, period, Wallet, currency, and pending state. Then check the underlying transaction or recurring commitment before changing or deleting anything.",
    },
    {
      question: "Why is a transaction missing from Moneko?",
      answer:
        "Check the date range, selected Space, Wallet, currency filter, and whether the original device was offline. A Wallet detail also shows only transactions bound to that Wallet and its native currency.",
    },
    {
      question: "What should I do about a duplicate transaction?",
      answer:
        "Do not immediately delete one. Compare the date, amount, currency, merchant, Wallet, source, and whether one record is a transfer, refund, or bank import. Correct only the confirmed duplicate.",
    },
    {
      question: "What should I send Moneko Support?",
      answer:
        "Share the affected Space, period, Wallet, amount, currency, transaction type, source, approximate time, and a redacted screenshot or error. Never include account numbers, card numbers, passwords, or authentication codes.",
    },
  ],
  content: `# Common Moneko Discrepancies and Safe Troubleshooting

If a balance, Pocket, report, settlement, or transaction looks wrong, do not fix it by adding a compensating entry. First identify the records and filters behind the number. This avoids double-counting and preserves the information needed to correct the real cause.

## Start With This Triage Order

Check these seven things before editing or deleting anything:

1. **Scope:** Are you in the correct personal or shared Space?
2. **Period:** Is the selected financial period the one you intended?
3. **Wallet:** Is the transaction assigned to the Wallet you are inspecting? Wallet details are restricted to that Wallet and its native currency.
4. **Currency:** Which currencies are selected, and is the value a native row or a converted aggregate?
5. **Source:** Is it a manual entry, a connected-account import, a recurring occurrence, a Wallet transfer, a refund, or a balance adjustment?
6. **State:** Was it saved while offline, is the bank-provider transaction pending, or did the app show an error?
7. **Record details:** Check the date, amount, category, payer/split where relevant, and any linked Wallet.

## A Transaction Is Missing

Check the selected period, Space, Wallet, and currency filter first. A Wallet detail will not show transactions assigned to another Wallet or a different currency. If the entry was created while offline, reconnect the original device and open Moneko before recreating it.

For a recurring item, distinguish the scheduled occurrence from a confirmed transaction. A future scheduled item can affect planning without appearing as a completed expense or income.

## You See a Duplicate

Compare both records before deleting either one. Look for a matching date, amount, currency, merchant, Wallet, and source. One record may be an imported transaction while the other is a manual entry; a Wallet transfer has matching outgoing and incoming entries; and a refund is a separate income event rather than a duplicate purchase.

Only remove or correct the record you can confirm is duplicated. Do not remove a transaction just because a total changed after synchronization.

## A Wallet Balance Looks Wrong

Review the opening balance, wallet-bound transactions, internal transfers, and any balance adjustment. For connected accounts, imported history may not include the full account history; an opening balance may be needed to represent money that existed before the imported period. See the Plaid balance guide for that case.

When multiple currencies are selected, the Wallet overview can show a converted aggregate, while each Wallet card remains in its own native currency. Compare like with like before deciding the balance is wrong.

## A Pocket, Report, or Settlement Looks Wrong

For a Pocket, confirm the Pocket's currency, selected period, and transactions assigned to it. For a report, use the report drill-down checklist to separate actual transactions from future recurring commitments and converted totals.

For a shared balance or settlement, check the shared Space, payer, participant shares, dates, and existing settlement history. Do not add a second settlement merely to make a balance reach zero.

## Before a Destructive Action

Do not reinstall the app, sign out, bulk-delete records, disconnect a bank connection, or add a balancing transaction as a first response. Preserve the affected records and capture their details first. If an offline change has not appeared elsewhere, reconnect the original device and allow it to synchronize.

## A Privacy-Safe Support Template

Copy this into a support request after redacting sensitive details:

> **Issue:** [missing / duplicate / wrong Wallet / wrong Pocket / wrong report / wrong settlement]\n+> **When it happened:** [date and approximate time]\n+> **Space and period:** [personal or shared Space; selected period]\n+> **Wallet and currency:** [Wallet name; currency]\n+> **Record details:** [amount, type, category, source, and whether it was offline or pending]\n+> **What I expected / what I see:** [short comparison]\n+> **Error or screenshot:** [redacted; no account numbers, card numbers, passwords, or codes]

## Related Guides

- [How to Understand a Report, Health Signal, or Number in Moneko](/help/understand-reports-financial-health-numbers-moneko)
- [Transfers, Card Payments, Refunds, and Cash in Moneko](/help/transfers-credit-card-payments-refunds-cash-moneko)
- [Offline Saves, Sync, and Changing Devices in Moneko](/help/offline-pending-saves-sync-changing-devices-moneko)
- [Why Is My Wallet Balance Negative After Plaid Sync?](/help/negative-wallet-balance-after-plaid-sync)
`,
};
