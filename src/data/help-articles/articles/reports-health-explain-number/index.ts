import type { HelpArticle } from "../../types";

export const reportsHealthExplainNumberArticle: HelpArticle = {
  id: "reports-health-explain-number",
  number: "4.4",
  slug: "understand-reports-financial-health-numbers-moneko",
  title: "How to Understand a Report, Health Signal, or Number in Moneko",
  description:
    "Check the period, scope, currencies, transactions, and forecasts behind a Moneko report before relying on a number.",
  categoryId: "automation-planning",
  readTime: 6,
  keywords: [
    "explain this number Moneko",
    "Moneko report wrong",
    "Moneko financial health",
    "why is my spending different",
    "safe to spend calculation",
    "forecasted balance calculation",
    "monthly report calculation",
    "Moneko report drill down",
  ],
  faqItems: [
    {
      question: "Why is my Moneko total different from my bank balance?",
      answer:
        "A report total can use a selected financial period, Space, Wallet scope, currency selection, and forecast inputs. First compare the same period and Wallets, then review the underlying transactions before treating a difference as an error.",
    },
    {
      question: "Why is a transaction in USD but my report total is in EUR?",
      answer:
        "Transaction rows stay in their native currency. When more than one selected currency contributes to an aggregate, Moneko converts included values into the display/base currency before summing the total.",
    },
    {
      question: "What does Safe to Spend mean?",
      answer:
        "For the current report period, Safe to Spend is a daily planning amount based on the forecasted balance, remaining Pocket budget where applicable, future income, future obligations, and days remaining. It is not available for a completed period.",
    },
    {
      question: "Are recurring bills already paid in a report?",
      answer:
        "No. A scheduled recurring occurrence can affect current-period planning as an upcoming commitment. It becomes an actual transaction only when it is confirmed.",
    },
  ],
  content: `# How to Understand a Report, Health Signal, or Number in Moneko

Before acting on a Moneko number, check what it includes. A total can combine your selected period, Space, Wallets, currencies, actual transactions, and (for a current period) future commitments. The fastest way to explain a surprising number is to review those inputs in that order.

## Use This Drill-Down Checklist

For any spending, income, balance, forecast, or health signal, check:

1. **Period:** Is the report for the period you intended?
2. **Space:** Are you looking at your personal data or the correct shared Space?
3. **Wallets:** Are the Wallets you expect part of this view? A Wallet detail is scoped to that Wallet and its native currency.
4. **Currencies:** Which currencies are selected, and what is the display/base currency for the aggregate?
5. **Actual transactions:** Open the related rows and check their date, type, category, Wallet, and amount.
6. **Future commitments:** For a current period, review upcoming recurring income and expenses separately from confirmed transactions.
7. **Money movement:** Check whether an internal Wallet transfer, refund, reimbursement, or balance correction explains the difference.

If one of these inputs is wrong, correct that source record rather than adding an offsetting transaction just to make the total look right.

## Financial Month Versus Calendar Month

Moneko can use a financial month that starts on a day you choose, such as payday, instead of the first day of the calendar month. Reports, Pocket periods, and comparisons use that financial-cycle boundary. A purchase near the end of a calendar month may therefore belong to a different financial month than you expect.

Check the report period before comparing it with a bank statement, which may use calendar-month or statement-cycle dates.

## Actuals, Forecasts, and Health Signals

The monthly report separates what has happened from what may still happen:

- **Income, spending, and savings** are calculated from transactions in the selected period.
- **Current balance** reflects the report's current balance input.
- **Forecasted balance** starts with the current balance, then adds future income and subtracts future obligations through the end of the period.
- **Safe to Spend** is a current-period daily planning amount. It considers the forecasted balance, remaining budget capacity where applicable, future income, future obligations, and days remaining. It is not a promise of bank funds or a recommendation to spend.
- **Recurring schedules** are planning commitments until their occurrences are confirmed. For a completed period, recurring schedules are not included as completed-report activity.

A health signal summarizes those inputs. Use it as a prompt to inspect the report, not as a substitute for the underlying transactions.

## Why Totals and Rows Can Use Different Currencies

Moneko keeps each individual transaction, Wallet card, Pocket card, and detail row in its native currency. A cross-item total, such as spending, income, net cashflow, category totals, calendar totals, or net worth, converts selected currencies into the display/base currency before adding them together.

For example, if EUR is your display currency and you selected EUR and USD, a USD transaction remains USD in its row while its converted value contributes to a EUR aggregate. Selecting a currency controls which data is included; it does not convert every row.

## Transfers, Refunds, and Corrections

An internal Wallet transfer moves the same money between two tracked Wallets. It is not new income or new spending, so do not use a transfer to explain a purchase or repayment that should be recorded as an expense or income.

A refund or reimbursement is a real inflow. Review its date, amount, category, and Wallet before comparing spending or cashflow. If you adjusted a Wallet balance to match an external record, include that correction in your investigation too. Do not add duplicate entries to force a report or Wallet total to match.

## If the Number Still Looks Wrong

Take a screenshot of the report and the relevant transaction rows after hiding bank-account numbers, card numbers, and any private notes. Record the period, Space, Wallet, selected currencies, display currency, and whether the issue concerns an actual transaction or a future recurring commitment. Then follow the discrepancy guide below.

## Related Guides

- [Multi-Currency Selection and Primary Currency](/help/multi-currency-selection-primary-currency-moneko)
- [How to Set Up Recurring Expenses and Income in Moneko](/help/recurring-expenses-income-moneko)
- [How to Use Wallets in Moneko](/help/how-to-use-wallets-moneko)
- [Common Moneko Discrepancies and Safe Troubleshooting](/help/common-moneko-discrepancies-troubleshooting)
`,
};
