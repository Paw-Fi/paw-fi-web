import type { HelpArticle } from "../../types";

export const financialMonthDateTimezoneArticle: HelpArticle = {
  id: "financial-month-date-timezone",
  number: "3.7",
  slug: "financial-month-date-timezone-corrections-moneko",
  title: "Financial Months, Dates, Timezones, and Corrections",
  description:
    "Learn how Moneko groups a financial month, how dates and your preferred timezone affect periods and recurring activity, and what changes after correcting history.",
  categoryId: "budgeting-pockets",
  readTime: 5,
  keywords: [
    "financial month in Moneko",
    "budget month start day",
    "month starts on payday",
    "wrong transaction month",
    "Moneko timezone",
    "travel timezone transaction date",
    "correct historical transaction",
  ],
  faqItems: [
    {
      question: "What is a financial month?",
      answer:
        "A financial month is the budgeting cycle Moneko uses for monthly views. It can match the calendar month or start on another day, such as payday.",
    },
    {
      question: "Can my financial month start on payday?",
      answer:
        "Yes. Choose the financial-month start day that matches your pay or billing cycle. For example, a start day of the 15th makes the July cycle run from July 15 through August 14.",
    },
    {
      question:
        "Why is a purchase in a different month from my bank statement?",
      answer:
        "Your bank statement may use calendar-month or posting-date rules, while Moneko groups records by their saved transaction date and your selected financial cycle. Check the transaction date and the cycle boundary before changing anything.",
    },
    {
      question: "Does changing timezone change old transaction dates?",
      answer:
        "No. Changing your preferred timezone does not rewrite a saved transaction date. It can change which local day is today and when an unconfirmed recurring occurrence becomes due, so review dates before confirming or correcting records while travelling.",
    },
    {
      question: "What happens when I correct an old transaction date?",
      answer:
        "The corrected transaction is included in the financial cycle that contains its corrected date. This can update the related Pocket, Wallet totals, and reports for both the old and new periods.",
    },
  ],
  howToSteps: [
    {
      name: "Choose a financial-month start day",
      text: "In Settings, choose the day that should begin your budgeting cycle, such as your payday.",
    },
    {
      name: "Review the selected period",
      text: "Before interpreting a monthly total, check the cycle start and end dates rather than assuming it is a calendar month.",
    },
    {
      name: "Correct the original record",
      text: "Open the transaction and review its date, amount, currency, Space, and Wallet before saving a historical correction.",
    },
  ],
  content: `# Financial Months, Dates, Timezones, and Corrections

Moneko can organize monthly budgeting around the cycle that fits your life, not only the first and last day of a calendar month. Before comparing a Pocket, Wallet, or report to a bank statement, check the selected financial cycle and the transaction dates behind it.

---

## Financial Month vs. Calendar Month

A **calendar month** runs from the first day through the last day of that month. A **financial month** is your selected budgeting cycle.

If your financial month starts on the 15th, the cycle labelled July runs from July 15 through August 14. This can better match a payday or billing cycle, but it means a July financial-month total will not necessarily match a July calendar-month bank statement.

Monthly Pockets, Wallet summaries, and reports use the selected financial cycle. Daily views use one local calendar day.

---

## Set a Month That Fits Your Pay Cycle

Choose the financial-month start day in **Settings**. Pick a day you can recognize easily, such as the day your main income arrives.

After changing it, review the period label and its start and end dates before making decisions from a total. The change changes how Moneko groups existing history into monthly comparisons; it does not create, delete, or move transactions.

> **Before you change it:** a new cycle boundary can recast historical Pocket, Wallet, and report comparisons. It is useful for a consistent routine, but do not expect a previous monthly total to remain grouped the same way.

---

## Dates and Your Preferred Timezone

Moneko uses your preferred timezone to resolve local dates such as today and the timing of recurring reminders or due occurrences. When travelling or after changing timezone, review the date on a new or edited transaction before saving.

Changing timezone does not rewrite the date already saved on an existing transaction. It can change when the app considers a local day to start, whether a future date is available, and when an unconfirmed recurring item becomes due. A paid or received recurring occurrence cannot be confirmed with a date later than today in your preferred timezone.

---

## Correct a Transaction in the Wrong Period

If a purchase belongs in a different period, correct the original ordinary transaction rather than adding an offsetting entry. Review its date, amount, category, currency, Space, and Wallet before saving.

The correction is counted in the financial cycle containing the corrected date. That can change:

- the Pocket that includes the transaction
- Wallet income, spending, or balance history
- monthly reports and financial-health comparisons
- recurring history when you correct a confirmed occurrence

For a scheduled recurring item, use the recurring occurrence controls. A schedule is planning information until it is confirmed as paid or received.

---

## When a Total Looks Wrong

Check these in order:

1. The selected Space and financial cycle.
2. The transaction's saved date and whether the financial cycle crosses calendar months.
3. The preferred timezone if you recently travelled or changed settings.
4. The selected currencies: rows remain native, while aggregates can be converted to the display currency.
5. Whether a recurring item is scheduled, due, confirmed, or skipped.

## Related Guides

- [How to Use Pockets to Organize Your Spending in Moneko](/help/how-to-use-pockets-to-organize-your-spending)
- [How to Set Up Recurring Expenses and Income in Moneko](/help/recurring-expenses-income-moneko)
- [Multi-Currency Selection and Primary Currency](/help/multi-currency-selection-primary-currency-moneko)
- [Common Moneko Discrepancies and Safe Troubleshooting](/help/common-moneko-discrepancies-troubleshooting)
`,
};
