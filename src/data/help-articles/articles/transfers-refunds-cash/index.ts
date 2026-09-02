import type { HelpArticle } from "../../types";

export const transfersRefundsCashArticle: HelpArticle = {
  id: "transfers-refunds-cash",
  number: "3.7",
  slug: "transfers-credit-card-payments-refunds-cash-moneko",
  title: "Transfers, Card Payments, Refunds, and Cash in Moneko",
  description:
    "Choose between an internal Wallet transfer, an expense, and income so moving money does not get counted twice.",
  categoryId: "budgeting-pockets",
  readTime: 6,
  keywords: [
    "Moneko transfer counted as spending",
    "credit card payment Moneko",
    "cash withdrawal Moneko",
    "ATM withdrawal Moneko",
    "Moneko refund",
    "Moneko reimbursement",
    "transfer versus expense",
    "avoid double counting card payment",
  ],
  faqItems: [
    {
      question:
        "Why did a transfer change my Wallet balances but not count as spending?",
      answer:
        "A Wallet transfer moves money between two Wallets you track. It creates an outgoing and incoming Wallet entry, so it changes both balances without becoming a new purchase or income.",
    },
    {
      question:
        "Can I transfer money between Wallets with different currencies?",
      answer:
        "No. Moneko transfers require two different Wallets with the same native currency. Currency conversion is for aggregate display, not a cross-currency transfer workflow.",
    },
    {
      question: "How should I record a refund or reimbursement?",
      answer:
        "Record money that comes back to you as income. Moneko includes a Refund income category; use another suitable income category when the money is not a refund. Do not create an internal transfer unless the money is only moving between two Wallets you track.",
    },
    {
      question: "How should I record cash from an ATM?",
      answer:
        "If you track both the source Wallet and a cash Wallet in the same currency, move the amount between them as a Wallet transfer. Record later cash purchases as expenses from the cash Wallet.",
    },
  ],
  content: `# Transfers, Card Payments, Refunds, and Cash in Moneko

The rule is simple: use a **Wallet transfer** only when the same money moves between two Wallets you track in Moneko. Use an **expense** when money paid for something, and **income** when money came back to you. This prevents one movement from being counted as spending twice.

## Choose the Right Record

### Is this money moving between two Wallets you track?

Use a **Wallet transfer** when both answers are yes:

1. The money left one tracked Wallet and arrived in another tracked Wallet.
2. Both Wallets use the same native currency.

For example, moving EUR from a bank Wallet to a cash Wallet is a transfer. Moneko updates both Wallet balances and represents the movement as outgoing and incoming transfer entries. It is not a new expense or income.

Transfers cannot use the same Wallet twice and cannot move money between different currencies. Do not use a transfer as a currency-conversion shortcut.

### Did you buy something or pay a fee?

Create or keep an **expense**. It should remain an expense even if you paid with cash, a card, or a bank account. Check its Wallet, date, amount, currency, and category.

### Did money come back to you?

Create or keep **income**. Moneko has a Refund income category for a returned purchase. For a reimbursement that is not a merchant refund, use the income category that best describes it. This is a real inflow, not an internal transfer, unless the money is only moving between your own tracked Wallets.

## Credit-Card Payments Without Double Counting

Start with the purchase, not the payment:

1. The purchase is an expense and should be recorded once.
2. If you track the card and the paying account as separate Wallets in Moneko and they use the same currency, the repayment between them is a Wallet transfer.
3. If the payment is already represented by a connected-account import, review it before adding anything manually. Do not add a second expense for the same card repayment.

This keeps the purchase in spending and treats the repayment as money movement between Wallets rather than another purchase.

## Cash Withdrawals and Cash Spending

For a withdrawal from a tracked bank Wallet into a tracked cash Wallet, create a same-currency Wallet transfer. After that, record each cash purchase as its own expense from the cash Wallet.

If you do not track a separate cash Wallet, record only what you can verify and avoid creating both a withdrawal expense and the later cash purchases. That would count the same cash twice.

## Refunds and Reimbursements

When a store reverses a purchase or someone repays you, record the returned money once as income and attach it to the Wallet that received it. Check the original expense before deciding whether you need to correct its category, amount, or date as well.

Do not delete the original purchase just because a later refund arrived unless the purchase itself never happened. A refund and a cancelled purchase are different situations.

## Before Correcting a Difference

1. Confirm the Space, Wallet, date, currency, and amount.
2. Search for an existing transaction, imported entry, transfer, or refund before adding a new record.
3. Check whether the issue is a Wallet balance, a spending total, or a report forecast; those can include different inputs.
4. Correct the original record where possible. Do not add a compensating transaction solely to force a total to match.

## Related Guides

- [How to Use Wallets in Moneko](/help/how-to-use-wallets-moneko)
- [How Categories Work in Moneko](/help/how-categories-work-moneko)
- [Why Is My Wallet Balance Negative After Plaid Sync?](/help/negative-wallet-balance-after-plaid-sync)
- [Common Moneko Discrepancies and Safe Troubleshooting](/help/common-moneko-discrepancies-troubleshooting)
`,
};
