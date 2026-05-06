import type { HelpArticle } from "../../types";

export const logExpenseArticle: HelpArticle = {
  id: "log-expense",
  number: "2.1",
  slug: "how-to-log-expense-moneko",
  title: "How to Log an Expense in Moneko",
  description:
    "Learn how to log an expense in Moneko using text, voice, receipts, chat-style input, shared expense notes, press-and-hold quick action, or Siri.",
  categoryId: "logging-expenses",
  readTime: 4,
  keywords: [
    "log an expense in Moneko",
    "add expense in Moneko",
    "Moneko expense logging",
    "quick expense tracker",
    "log shared expense",
    "Moneko receipt upload",
    "Moneko voice expense",
    "Siri expense logging",
    "split expense in Moneko",
  ],
  faqItems: [
    {
      question: "How do I log an expense in Moneko?",
      answer:
        "Tap the + button and enter the expense like a short message, such as Lunch 18 or Uber 24.",
    },
    {
      question: "Do I need to choose a category when logging an expense?",
      answer:
        "No. You do not need to choose categories while logging. Moneko organizes the expense for you, and you can edit details later if needed.",
    },
    {
      question: "Can I log expenses with voice?",
      answer: "Yes. You can log expenses by voice, such as saying “Lunch 18 with Sarah.”",
    },
    {
      question: "Can I upload receipts in Moneko?",
      answer: "Yes. You can upload a receipt, and Moneko will extract details when possible.",
    },
    {
      question: "How do I log a shared expense?",
      answer:
        "In a shared Space, include words like split or shared. For example: Dinner 120 split or Groceries 80 shared.",
    },
    {
      question: "Does Moneko track who paid and who owes what?",
      answer: "Yes. For shared expenses, Moneko tracks who paid and who owes what automatically.",
    },
    {
      question: "How do I make expense logging faster?",
      answer:
        "Set a press-and-hold quick action for the + button. Go to Moneko → three dots → Settings → Press and hold quick action.",
    },
    {
      question: "Can I log expenses with Siri?",
      answer:
        "Yes. Set up the Log Expense action in the Shortcuts app, then say “Hey Siri, log expense.”",
    },
    {
      question: "Can I log expenses from the lock screen?",
      answer:
        "Yes. After setting up Siri with the Shortcuts app, you can log expenses from the lock screen.",
    },
  ],
  howToSteps: [
    {
      name: "Tap the + button",
      text: "Open Moneko and tap the large plus icon at the bottom.",
    },
    {
      name: "Type or speak your expense",
      text: "Enter something like Lunch 18 or Groceries 60 shared.",
    },
    {
      name: "Save",
      text: "Moneko will extract the amount and details and save it to your current Space.",
    },
  ],
  content: `# How to Log an Expense in Moneko

Logging an expense in Moneko only takes a few seconds.

You do not need to fill out long forms or choose categories before saving an expense.

Just log it like a message, and Moneko handles the rest.

---

## The Simplest Way to Log an Expense

To add an expense:

1. Tap the **+** button.
2. Enter your expense like a short message.
3. Save it.

For example:

- Lunch 18
- Uber 24
- Groceries 60 shared

That’s it.

Moneko detects the amount, understands the expense, and organizes it for you.

### Expected Result

Your expense is logged quickly without needing to manually choose categories or complete extra fields.

---

## Log Expenses in the Way That Feels Fastest

Moneko lets you log expenses in the way that feels most natural to you.

You can use:

- text
- voice
- photos or receipts
- chat-style input

---

## Log an Expense with Text

Text is the fastest option when you already know the amount.

Examples:

- Dinner 45
- Coffee 5
- Taxi 30 split

Use short, natural entries. You do not need to write a full sentence.

### Expected Result

Moneko reads the text, detects the amount, and organizes the expense.

---

## Log an Expense with voice

You can also log expenses by voice.

For example, you can say:

- “Lunch 18 with Sarah”

This is useful when you are on the move or do not want to type.

### Expected Result

Moneko uses your voice entry to understand and record the expense.

---

## Log an Expense with a Photo or Receipt

If you have a receipt, you can upload it instead of typing everything manually.

Upload a receipt, and Moneko will extract details when possible.

This is useful for:
- keeping receipts connected to expenses
- checking details later
- saving proof of purchase
- tracking shared expenses more clearly

### Expected Result

Your receipt is saved with the expense, and Moneko extracts details when possible.

---

## Log an Expense in Chat Style

You can also log expenses using short chat-style messages.

Example:

- Taxi 30 split

This works well when you want to quickly record what happened without filling out a form.

### Expected Result

Moneko understands the message and logs the expense based on the information you entered.

---

## How to Log Shared Expenses

If you are in a shared Space, you can include how the expense should be split.

Examples:

- Dinner 120 split
- Groceries 80 shared
- Taxi 30 split

Moneko tracks who paid and who owes what automatically.

### Expected Result

The shared expense is recorded in the Space, and Moneko helps keep track of payment responsibility.

### Best Practice

Include words like **split** or **shared** when logging expenses that involve other people.

---

## Make Logging Faster with Press-and-Hold Quick Action

If you usually log expenses the same way, you can make the **+** button faster.

You can set a default action for when you press and hold the **+** button.

For example, your press-and-hold action can open:

- voice
- receipt photo
- quick text

To set it up:

1. Open **Moneko**.
2. Tap the **three dots** in the top right.
3. Go to **Settings**.
4. Select **Press and hold quick action**.
5. Choose your preferred action.

After that, press and hold the **+** button to jump straight into your selected logging method.

### Expected Result

You can log expenses faster by skipping extra taps.

---

## How to Log an Expense Without Opening Moneko

You can also log expenses using Siri.

To set it up in the Shortcuts app:

1. Open the **Shortcuts** app.
2. Tap **+**.
3. Search for **Moneko**.
4. Add **Log Expense**.

After setup, you can say:

- “Hey Siri, log expense”

You can even do this from the lock screen.

### Expected Result

Siri starts the Moneko expense logging shortcut without requiring you to open the app manually.

---

## Do You Need to Choose Categories?

No.

You do not need to organize anything while logging an expense.

Moneko is designed so you can log first and move on.

You can always edit details later if needed.

### Common Mistake to Avoid

Do not stop logging just because you are unsure about the category.

Save the expense first. You can adjust details later.

---

## Troubleshooting Common Issues

### Moneko Did Not Understand My Expense

Try entering the expense more clearly.

For example:

- Lunch 18
- Uber 24
- Dinner 120 split

Make sure the amount is included in the entry.

### I Logged an Expense in the Wrong Space

Expenses are added to the Space you are currently using.

Switch to the correct Space before logging expenses that belong somewhere else.

### I Cannot Find a Shared Expense

Check whether:
- you are in the correct shared Space
- the expense was saved successfully
- the entry included enough information, such as the amount

### My Shared Expense Did Not Split Correctly

When logging shared expenses, include words like:

- split
- shared

For example:

- Groceries 80 shared
- Dinner 120 split

### Siri Is Not Logging Expenses

Check that you added **Log Expense** from Moneko inside the Shortcuts app.

Then try saying:

- “Hey Siri, log expense”
`,
};
