import type { HelpArticle } from "../../types";

export const categoriesArticle: HelpArticle = {
  id: "categories",
  number: "3.3",
  slug: "how-categories-work-moneko",
  title: "How Categories Work in Moneko",
  description:
    "Learn how categories work in Moneko, how AI assigns categories automatically, how to change incorrect categories, and how to create custom categories.",
  categoryId: "budgeting-pockets",
  readTime: 4,
  keywords: [
    "categories in Moneko",
    "Moneko categories",
    "automatic expense categories",
    "AI expense categorization",
    "change transaction category",
    "custom categories in Moneko",
    "category settings",
    "default categories",
    "expense organization",
  ],
  faqItems: [
    {
      question: "What are categories in Moneko?",
      answer: "Categories organize your transactions so you can see where your money goes.",
    },
    {
      question: "Do I need to choose a category when logging an expense?",
      answer: "No. Moneko assigns categories automatically by AI when you log a transaction.",
    },
    {
      question: "What types of transactions can Moneko categorize?",
      answer: "Moneko can assign categories when you add an expense using text, voice, photo, or chat.",
    },
    {
      question: "How do I change a transaction category?",
      answer: "Open the transaction, tap the category, then select a new category.",
    },
    {
      question: "What does “Update preference for similar transactions?” mean?",
      answer: "It asks whether Moneko should remember the category change for similar transactions in the future.",
    },
    {
      question: "Should I tap Yes or No when updating category preferences?",
      answer: "Tap Yes if you want Moneko to remember the rule for similar transactions. Tap No if you only want to update the current transaction.",
    },
    {
      question: "Can Moneko learn my category preferences?",
      answer: "Yes. When you confirm a preference, similar transactions will use the same category going forward.",
    },
    {
      question: "Can I create custom categories?",
      answer: "Yes. Go to Settings → Categories, then tap Create Category.",
    },
    {
      question: "Can I turn default categories on or off?",
      answer: "Yes. You can turn default categories on or off from the Categories page.",
    },
    {
      question: "When should I create custom categories?",
      answer: "Create custom categories when you want to track specific types of expenses or organize spending in your own way.",
    },
  ],
  howToSteps: [
    {
      name: "Log a transaction",
      text: "Moneko will automatically assign a category using AI.",
    },
    {
      name: "Change if needed",
      text: "Open the transaction and select a new category to correct it.",
    },
    {
      name: "Update preferences",
      text: "Confirm if you want Moneko to apply the same category to similar transactions in the future.",
    },
  ],
  content: `# How Categories Work in Moneko

Categories help organize your transactions so you can see where your money goes.

In Moneko, categories are assigned automatically by AI.

You do not need to select a category when logging an expense. Just add the transaction, and Moneko organizes it for you.

---

## How Categories Are Assigned

When you log a transaction, Moneko assigns a category automatically.

You can add an expense using:

- text
- voice
- photo
- chat

After you add the transaction, Moneko will:

- assign a category instantly
- save the transaction
- organize it right away

### Expected Result

Your transaction is categorized automatically without needing to choose a category manually.

---

## How to Change a Category

If a transaction is assigned to the wrong category, you can change it anytime.

To change a category:

1. Open the transaction.
2. Tap the category.
3. Select a new category.

After updating, you will see this prompt:

**Update preference for similar transactions?**

You can choose:

- **Yes** → Moneko will remember this rule for similar transactions
- **No** → only this transaction is updated

### Expected Result

The selected transaction uses the new category. If you choose **Yes**, Moneko also uses that preference for similar transactions in the future.

---

## How Category Learning Works

Moneko learns from the preferences you confirm.

When you choose **Yes** on the prompt, similar transactions will use the same category going forward.

This means:

- similar transactions are categorized more accurately
- you do not need to correct the same type of transaction again
- your categories improve automatically over time

### Example

If you change a coffee shop transaction to a specific category and confirm the preference, similar transactions can use that category next time.

### Best Practice

Choose **Yes** when you want Moneko to remember the rule for future similar transactions.

Choose **No** when the change only applies to one transaction.

---

## Custom Categories

You can create your own categories to better match how you spend.

Use custom categories when you want to:

- track specific types of expenses
- organize spending in your own way
- add categories that are not covered by the defaults

You do not need to create many categories at the start.

Use the default categories first, then add new ones when you need them.

---

### How to Open Category Settings

To manage categories:

1. Tap the **top right three dots**.
2. Go to **Settings**.
3. Scroll to **Categories**.

### Expected Result

You will see the category settings page where you can manage default and custom categories.

---

### What You Can Do in Category Settings

From the Categories page, you can:

- turn default categories on or off
- create custom categories
- choose icons and styles

---

### How to Create a Custom Category

To create a custom category:

1. Tap **Create Category**.
2. Enter a name.
3. Choose an icon.
4. Tap **Save**.

The new category will now appear when editing transactions.

### Expected Result

Your custom category is saved and available when changing transaction categories.

---

## Troubleshooting Common Issues

### I Do Not See a Category While Logging

This is expected.

You do not need to select a category when logging an expense. Moneko assigns one automatically after the transaction is added.

### A Transaction Has the Wrong Category

Open the transaction, tap the category, and select a new category.

After updating, choose whether Moneko should remember the preference for similar transactions.

### Similar Transactions Keep Getting the Wrong Category

When correcting a category, tap **Yes** when asked:

**Update preference for similar transactions?**

This helps Moneko remember your preference going forward.

### I Only Want to Update One Transaction

When you see the preference prompt, tap **No**.

Only the selected transaction will be updated.

### I Want to Create My Own Category

Go to:

**top right three dots → Settings → Categories → Create Category**

Then enter a name, choose an icon, and tap **Save**.

### I Have Too Many Categories

Use the defaults first and only add custom categories when you need them.

You can also turn default categories on or off from the Categories page.
`,
};
