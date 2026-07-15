import type { HelpArticle } from "../../types";

export const splitExpensesArticle: HelpArticle = {
  id: "split-expenses",
  number: "2.2",
  slug: "how-to-split-expenses-moneko",
  title: "How to Split Expenses in Moneko",
  description:
    "Learn how to split expenses in Moneko, customize shared bills, edit splits later, see who owes what, and settle balances inside a shared Space.",
  categoryId: "logging-expenses",
  readTime: 4,
  keywords: [
    "split expenses in Moneko",
    "Moneko expense splitting",
    "split bills in Moneko",
    "shared expense splitting",
    "shared Space expenses",
    "settle up in Moneko",
    "track who owes what",
    "split transactions",
    "shared money app",
  ],
  faqItems: [
    {
      question: "How does Moneko split expenses?",
      answer:
        "When you log an expense in a shared Space, Moneko splits it according to your Auto Split setting in household settings. You can configure the default split type (equal, percentage, or shares) for your Space.",
    },
    {
      question: "Can I split an expense unevenly?",
      answer:
        "Yes. You can include the custom split while logging the expense, such as Dinner 120, 80 for me, 40 for Bob.",
    },
    {
      question: "What happens if I do not specify a split?",
      answer:
        "If you do not specify a custom split while logging, Moneko applies the default split configured in your household Auto Split settings.",
    },
    {
      question: "Can I edit a split after logging an expense?",
      answer:
        "Yes. Tap the transaction, open details, edit the split, then save.",
    },
    {
      question: "Can I change who paid for an expense?",
      answer: "Yes. You can edit who paid from the transaction details.",
    },
    {
      question: "Where can I see who owes what?",
      answer:
        "On the main page of your shared Space, you can see total spent by each person, number of transactions, and who owes whom.",
    },
    {
      question: "How do I settle up in Moneko?",
      answer: "Tap the summary widget, open Settle Up, then tap Settle.",
    },
    {
      question: "Does Moneko update balances automatically?",
      answer:
        "Yes. Moneko updates shared balances automatically based on expenses, splits, and settlements.",
    },
    {
      question: "Do I need a spreadsheet to split expenses?",
      answer:
        "No. Moneko lets you manage shared expenses, balances, and settlements in one place.",
    },
  ],
  howToSteps: [
    {
      name: "Log in a shared Space",
      text: "Add an expense inside a shared Space to enable splitting features.",
    },
    {
      name: "Automatic or custom split",
      text: "Let Moneko split it evenly, or specify individual amounts in your message.",
    },
    {
      name: "Check and settle",
      text: "Review balances in the summary widget and use Settle Up to clear debts.",
    },
  ],
  content: `# How to Split Expenses in Moneko

Splitting expenses in Moneko is simple.

When you use a shared Space, Moneko can split expenses automatically, let you adjust the split when needed, and help you settle everything in one place.

You do not need spreadsheets, manual calculations, or a separate bill-splitting app.

If you are moving from Splitwise, read the [Moneko vs Splitwise comparison](/splitwise-alternative) to understand the free-plan limits, shared-ledger differences, and how Moneko connects splits to a complete household budget.

---

## Automatic Splitting in a Shared Space

When you log an expense in a shared Space, Moneko splits it according to your Auto Split settings.

### Configuring Default Split Behavior

To set how expenses are split by default for your Space:

1. Open your shared Space
2. Go to **Settings**
3. Find the **Auto Split** section
4. Toggle **Auto split** on
5. Choose your default split type:
   - **Equal** - Split evenly among all members
   - **Percentage** - Split by percentage for each member
   - **Shares** - Split by shares for each member
6. Configure the split for each member
7. Save your settings

![Auto Split Settings](/help/split-expenses/01.png)

For example, if you have Auto Split set to **Equal** and there are two people in the Space, entering "Dinner 120" splits it as:

- 60 / 60

If you have Auto Split set to **Percentage** with 70% for you and 30% for Bob, entering "Dinner 120" splits it as:

- 84 / 36

### Expected Result

The expense is added to the shared Space and split according to your configured Auto Split settings.

---

## How to Customize a Split While Logging

If the split is not equal, you can say how it should be split while logging the expense.

For example:

- Dinner 120, 80 for me, 40 for Bob
- Taxi 50, I paid all
- Groceries 90, 30 for me, 60 for others

Moneko understands the split from your entry and adjusts it automatically.

If you do not specify a custom split, the expense stays evenly split.

### Expected Result

The expense is recorded with the custom split you included in your message.

### Best Practice

Include the total amount and how much each person should cover when the split is uneven.

---

## How to Edit a Split Later

If something is wrong or missing, you can edit the split anytime.

![Editing a Split](/help/split-expenses/01%20Edit%20the%20Split.png)

To edit a split:

1. Tap the transaction.
2. Open the transaction details.
3. Edit the split.
4. Save your changes.

You can change:

- who paid
- how much each person owes

Updates apply instantly for everyone in the Space.

### Expected Result

The shared transaction updates for everyone in the Space after you save the edited split.

---

## How to See Who Owes What

Moneko keeps track of shared balances automatically.

![Shared Balances](/help/split-expenses/02%20Shared%20Balance.png)

On the main page of your shared Space, you can see:

- total spent by each person
- number of transactions
- who owes whom

This helps everyone understand the current balance without checking manually.

### Expected Result

You can quickly see shared spending and balances from the main page of the shared Space.

---

## How to Settle Up

When you want to clear balances, use **Settle Up**.

![Settling Up](/help/split-expenses/03%20Settle%20Up.png)

To settle up:

1. Tap the **summary widget**.
2. Open **Settle Up**.
3. Tap **Settle**.

Moneko records the settlement and updates everything automatically.

### Expected Result

The balance is cleared or updated after settlement is recorded.

---

## Troubleshooting Common Issues

### My Expense Split Evenly, but I Wanted a Custom Split

If you do not specify a custom split, Moneko splits the expense evenly by default.

To use a custom split, include the split while logging.

For example:

- Dinner 120, 80 for me, 40 for Bob

### I Entered the Wrong Split

You can edit it later.

Tap the transaction, open details, edit the split, then save.

### I Cannot See Who Owes What

Make sure you are viewing the main page of the correct shared Space.

Balances are shown based on the transactions inside that Space.

### The Balance Looks Wrong

Check whether:

- the expense was added to the correct Space
- the split was entered correctly
- the correct person was marked as the payer
- any missing transaction needs to be added

### I Settled Up, but the Balance Changed

This can happen when new expenses are added after settlement.

Moneko updates balances automatically based on the latest transactions and settlements in the Space.
`,
};
