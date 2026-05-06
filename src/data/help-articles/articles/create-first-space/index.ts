import type { HelpArticle } from "../../types";

export const createFirstSpaceArticle: HelpArticle = {
  id: "create-first-space",
  number: "1.3",
  slug: "how-to-create-your-first-space",
  title: "How to Create Your First Space in Moneko",
  description:
    "Learn how to create your first Space in Moneko, switch between Spaces, and manage private or shared Spaces for personal spending, household expenses, trips, and group budgets.",
  categoryId: "getting-started",
  readTime: 4,
  featured: true,
  keywords: [
    "create Space in Moneko",
    "Moneko Spaces",
    "shared Space in Moneko",
    "private Space in Moneko",
    "manage Space in Moneko",
    "switch Spaces in Moneko",
    "Moneko Space settings",
    "Moneko shared expense Space",
  ],
  faqItems: [
    {
      question: "What is a Space in Moneko?",
      answer:
        "A Space is a separate money context in Moneko. Each Space keeps its own people, currency, recurring expenses and income, budgets and Pockets, summaries, and insights.",
    },
    {
      question: "How do I create a Space in Moneko?",
      answer:
        "Tap the Space name or icon in the top left corner, choose Create Space, enter a Space name, choose who can see and add expenses, then tap Continue.",
    },
    {
      question: "What is the difference between a private Space and a shared Space?",
      answer:
        "A private Space is only visible to you. A shared Space lets you invite other people so everyone can see and add expenses in the same Space.",
    },
    {
      question: "Why does my app content change when I switch Spaces?",
      answer:
        "Each Space has its own expenses, budgets, recurring items, summaries, and insights. When you switch Spaces, Moneko shows the data for the selected Space.",
    },
    {
      question: "Can I use Spaces for trips?",
      answer:
        "Yes. You can create a Trip Space to keep travel expenses separate from your personal or household spending.",
    },
    {
      question: "Can I edit a Space after creating it?",
      answer:
        "Yes. Switch to the Space, tap the three dot icon in the top right, then select Manage Shared Space to open Space Settings.",
    },
    {
      question: "Who can manage members in a shared Space?",
      answer: "Only the owner or admins can manage members or delete a shared Space.",
    },
    {
      question: "Can changes in one Space affect another Space?",
      answer: "No. Changes only apply to the Space you are currently managing.",
    },
  ],
  howToSteps: [
    {
      name: "Open the Space menu",
      text: "Tap the Space name or icon in the top left corner of the app.",
    },
    {
      name: "Start Create Space",
      text: "Tap Create Space in the menu.",
    },
    {
      name: "Configure your Space",
      text: "Enter a name, choose visibility (private or shared), and tap Continue.",
    },
  ],
  content: `# How to Create Your First Space in Moneko

If you are new to Moneko, one of the first things to understand is **Spaces**.

Spaces help keep your money organized.

Instead of putting every expense, budget, and reminder in one place, Moneko lets you separate different parts of your life into different Spaces.

This means your personal spending does not get mixed with:
- shared household expenses
- trip costs
- group spending
- family or couple expenses

Once you understand how Spaces work, the rest of Moneko becomes much easier to use.

---

## What Is a Space in Moneko?

You can think of a Space as a separate wallet or money context for a specific part of your life.

Each Space keeps its own data and does not mix with your other Spaces.

A Space has its own:
- people
- currency
- recurring expenses and income
- budgets and Pockets
- summaries and insights

For example, you might create:

- **Personal Space** for your own day-to-day spending
- **Couple or Family Space** for shared household expenses
- **Trip Space** for travel costs
- **Group Space** for roommates or friends

This helps you keep each part of your money clear and separate.

### Expected Result

After creating separate Spaces, you can view expenses, budgets, recurring items, and insights based on the specific Space you are using.

---

## Where to Find Your Spaces

You can find your Spaces from the top left corner of the app.

![Moneko Spaces Menu](/help/create-first-space/01.png)

To view your Spaces:

1. Open Moneko.
2. Tap the **Space name or icon** in the top left corner.
3. View your list of Spaces.
4. Choose a Space to switch into, or create a new one.

From this menu, you can:
- see all your Spaces
- switch between Spaces
- create a new Space

### Important

When you switch Spaces, you are not only changing one screen. You are changing the full money context inside the app.

It is like moving from one wallet to another.

---

## How to Create a New Space

Creating a Space only takes a few steps.

![Creating a New Space](/help/create-first-space/02.png)

1. Tap the **top left menu**.
2. Tap **Create Space**.
3. Enter a name for the Space.

   For example:
   - Living Expenses
   - Japan Trip
   - Family Budget
   - Personal Spending

4. Choose who can see and add expenses.
5. Tap **Continue**.

Your new Space is now ready to use.

### Expected Result

After creating the Space, Moneko will keep that Space’s expenses, people, currency, recurring expenses and income, budgets, Pockets, summaries, and insights separate from your other Spaces.

---

## Private Spaces vs Shared Spaces

When you create a Space, you can make it either **private** or **shared**.

### Private Space

A private Space is only visible to you.

Use a private Space for:
- personal spending
- private budgets
- individual recurring expenses or income
- your own financial summaries and insights

### Shared Space

A shared Space lets you invite other people.

In a shared Space:
- everyone sees the same expenses
- anyone can add expenses
- everything stays in sync automatically

This is useful for:
- couples
- families
- roommates
- friends
- trips
- group spending

There is no need to manually sync things later, and one person does not need to manage everything for the whole group.

### Best Practice

Use a shared Space when more than one person needs to see or add expenses.

Use a private Space when the money context only belongs to you.

---

## What Happens When You Switch Spaces?

Switching Spaces changes what you see across the app.

This includes:
- recurring payments
- budgets and Pockets
- summaries and insights

Each Space works like its own mini environment.

For example, if you switch from your **Personal Space** to your **Family Space**, you are now viewing a completely different set of:
- expenses
- budgets
- recurring items
- summaries
- insights

This is why the app content changes when you switch Spaces.

### Expected Result

After switching Spaces, Moneko updates the app to show the data that belongs to the selected Space.

### Common Mistake to Avoid

Do not assume an expense is missing just because you cannot see it right away.

You may simply be viewing a different Space.

---

## How to Edit a Space

To edit a Space, first switch to the Space you want to manage.

Then follow these steps:

1. Tap the **three dot icon** in the top right.
2. Select **Manage Shared Space**.
3. Open the **Space Settings** screen.

From Space Settings, you can:
- edit the Space name
- change the Space image
- invite new members
- see who is in the Space
- view member roles
- delete the Space if needed

Any changes you make only apply to the Space you are currently managing.

They do not affect your other Spaces.

---

## Who Can Manage a Shared Space?

If the Space is shared, only the **owner** or **admins** can manage members or delete the Space.

This means owner or admin permissions may be required to:
- invite new members
- manage members
- delete the Space

Personal Spaces can only be edited by you.

### Expected Result

Space management stays controlled, especially when multiple people are using the same shared Space.

---

## Troubleshooting Common Issues

### I Cannot Find an Expense

Check whether you are viewing the correct Space.

Since each Space has its own data, an expense created in one Space will not appear inside another Space.

### My Budgets or Pockets Look Different

Budgets and Pockets are separate for each Space.

If they look different, you may have switched into another Space.

### My Recurring Expenses or Income Changed

Recurring expenses and income belong to the Space where they were created.

Switch back to the correct Space to view the expected recurring items.

### I Cannot Manage Members in a Shared Space

Only the owner or admins can manage members or delete a shared Space.

If you do not see management options, you may not have the required role.

### I Edited a Space but Other Spaces Did Not Change

This is expected.

Changes only apply to the Space you are currently managing.
`,
};
