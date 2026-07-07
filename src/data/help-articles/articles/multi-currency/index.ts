import type { HelpArticle } from "../../types";

export const multiCurrencyArticle: HelpArticle = {
  id: "multi-currency",
  number: "3.6",
  slug: "multi-currency-selection-primary-currency-moneko",
  title: "Multi-Currency Selection and Primary Currency",
  description:
    "Learn how to manage multiple currencies in Moneko, understand the role of your Primary Currency, and how to track spending across different countries.",
  categoryId: "budgeting-pockets",
  readTime: 5,
  keywords: [
    "multi-currency",
    "primary currency",
    "change currency",
    "track multiple currencies",
    "foreign exchange",
    "travel spending",
    "base currency",
  ],
  faqItems: [
    {
      question: "What is a Primary Currency?",
      answer:
        "Your Primary Currency is the main currency for your Moneko account. It is used as the default for new transactions, home screen widgets, and your overall financial profile.",
    },
    {
      question: "Can I track more than one currency?",
      answer:
        "Yes, Moneko Plus users can select multiple currencies to display in their home feed. This allows you to see transactions in different currencies (e.g., USD and EUR) side-by-side.",
    },
    {
      question: "How do I change my Primary Currency?",
      answer:
        "Open the Currency Selector, find your desired currency, and tap the 'Primary' badge or star icon. This will sync your choice to your profile across all devices.",
    },
    {
      question: "How does selecting multiple currencies affect my dashboard?",
      answer:
        "When you select multiple currencies, your transaction feed and spending cards will include data from all selected currencies. Aggregate totals (like 'Total Spent this Month') will typically filter to show totals per currency or convert based on your primary selection.",
    },
    {
      question: "Is multi-currency available on the free plan?",
      answer:
        "Free users can select one currency for their account. Tracking multiple currencies simultaneously is a premium feature included in Moneko Plus.",
    },
  ],
  howToSteps: [
    {
      name: "Open Currency Selector",
      text: "Tap the currency code (e.g., USD) in the home screen header or go to Settings → Currency.",
    },
    {
      name: "Select Currencies",
      text: "Toggle the checkboxes for all currencies you want to include in your dashboard feed.",
    },
    {
      name: "Set Primary Currency",
      text: "Tap the 'Primary' badge next to your main currency. This currency will be the default for all new entries.",
    },
    {
      name: "Save and Sync",
      text: "Tap 'Save'. Your primary currency will be synced to your account, and your home feed will update instantly.",
    },
  ],
  content: `# Multi-Currency Selection and Primary Currency

Whether you travel frequently, live between countries, or manage international investments, Moneko's multi-currency support ensures your dashboard reflects your global financial life.

---

## The Concept of a Primary Currency

In Moneko, one currency is always designated as your **Primary Currency**. Think of this as your "home" or "base" currency.

### What the Primary Currency Does:
1. **Default for New Entries**: When you tap the **+** button to log an expense, Moneko automatically selects your Primary Currency.
2. **Widget Display**: Home screen widgets and system shortcuts use the Primary Currency for a quick glance at your balances.
3. **Account Profile**: Your preferred currency is saved to your secure profile, ensuring a consistent experience when you log in from new devices.
4. **Aggregate Trends**: While you can view transactions in many currencies, your main financial health rings and monthly summaries often use the Primary Currency as the standard for comparison.

---

## Tracking Multiple Currencies (Moneko Plus)

For users who manage money in different regions, **Moneko Plus** unlocks the ability to select multiple "Active" currencies.

### How Multi-Selection Works:
- **Feed Filtering**: Your Home feed will show transactions from all selected currencies. If you spend in USD and EUR, both will appear in your recent history.
- **Card-Level Visibility**: Spending cards (like "Where the money went") will filter their data based on your selection.
- **Organization**: You can reorder your selected currencies in the selector modal to keep your most-used ones at the top.

*Note: Free users are restricted to one active currency at a time.*

---

## How to Manage Your Currencies

1. **Access the Selector**: Tap the currency indicator in the top header of the Home screen.
2. **Search**: Use the search bar to find any of the 150+ supported global currencies.
3. **Toggle Active Status**: Use the checkboxes to add or remove currencies from your dashboard.
4. **Change Primary**: Tap the **Primary** badge or the star icon next to a currency to promote it.
5. **Reorder**: Press and hold a currency card to drag it up or down in your list for faster access.

---

## Currency Conversion and Rates

Moneko Plus includes a built-in **Currency Converter** and supports live exchange rates.

- **Manual Conversion**: Access the converter via the Currency Selector or Settings to quickly check rates between any two currencies.
- **Historical Tracking**: When you log a transaction in a foreign currency, Moneko can record the exchange rate at that moment, ensuring your historical data remains accurate even as markets shift.

---

## Troubleshooting

### My currency isn't appearing in the feed
Ensure that the currency is **checked** in the Currency Selector. Even if a currency is your "Primary," it must also be part of your "Selected" set to appear in the dashboard feed.

### I can't select more than one currency
Multi-currency selection is a **Moneko Plus** feature. If your subscription has expired or you are on the free plan, the app will automatically enforce a single primary currency selection.

### Incorrect exchange rates
Live rates are updated periodically. For the most precise records, we recommend checking the rate at the time of purchase and manually adjusting it in the transaction details if your bank's rate differed significantly.
`,
};
