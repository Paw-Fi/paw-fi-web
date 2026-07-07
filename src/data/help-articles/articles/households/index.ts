import type { HelpArticle } from "../../types";

export const householdsArticle: HelpArticle = {
  id: "households",
  number: "3.5",
  slug: "managing-shared-spaces-households-moneko",
  title: "Managing Shared Spaces and Households",
  description:
    "Learn how to create shared Spaces, invite members, manage roles, and track shared spending with partners, family, or roommates.",
  categoryId: "budgeting-pockets",
  readTime: 6,
  keywords: [
    "shared spaces",
    "households",
    "invite members",
    "share expenses with partner",
    "couple budgeting",
    "group spending",
    "shared wallet",
  ],
  faqItems: [
    {
      question: "What is the difference between a Space and a Household?",
      answer:
        "A Space is a general term for any financial area in Moneko. A Household is a type of shared Space designed for ongoing collaboration with others, like a partner or roommates.",
    },
    {
      question: "How many people can I invite to a Space?",
      answer:
        "Moneko Plus allows you to invite multiple members to any Space. Free plans are typically limited to personal use or a single shared Space depending on current trial terms.",
    },
    {
      question: "What are the different member roles?",
      answer:
        "There are three roles: 1. Owner: Full control, can delete the Space. 2. Admin: Can invite/remove members and manage settings. 3. Member: Can log expenses and view data but cannot manage members.",
    },
    {
      question: "Can I hide my personal expenses from a shared Space?",
      answer:
        "Yes. Expenses logged in your 'Personal' space are never visible to members of other Spaces. Only transactions logged directly within a shared Space are visible to its members.",
    },
    {
      question: "How do I settle up with others?",
      answer:
        "Moneko tracks 'who paid' and 'who owes' for every shared expense. You can view the 'Settlement' view in the Space details to see exactly who needs to pay whom to square up.",
    },
  ],
  howToSteps: [
    {
      name: "Create a new Space",
      text: "Tap the Space selector at the top of the home screen, then tap 'Add Space'. Choose 'Household' for shared use.",
    },
    {
      name: "Invite members",
      text: "Open the Space settings, go to 'Members', and tap 'Invite'. You can send a link or an email invitation.",
    },
    {
      name: "Log shared expenses",
      text: "Switch to the shared Space before logging. Everyone in the Space will see the transaction instantly.",
    },
    {
      name: "Manage roles",
      text: "As an owner or admin, you can tap a member's name in the settings to change their role or remove them.",
    },
  ],
  content: `# Managing Shared Spaces and Households

Shared financial spaces are the core of Moneko. Whether you're a couple managing a home, roommates splitting rent, or a group on vacation, Spaces keep everyone on the same page.

---

## Types of Spaces

Moneko uses **Spaces** to separate different financial lives:

- **Personal**: Your private budget. Nobody else can ever see this.
- **Household**: Permanent shared spaces for couples, families, or long-term roommates.
- **Group/Trip**: Temporary spaces for vacations or specific events.
- **Portfolio**: Advanced spaces for managing investments or business entities (Moneko Plus).

---

## Inviting Members

Sharing a Space is easy:

1. Tap your current **Space Name** at the top of the home screen.
2. Select the **Settings (gear icon)** for the Space you want to share.
3. Tap **Members**.
4. Tap **Invite Member**.
5. Choose to send an **Email Invite** or generate a **Share Link**.

### Invite Expiration
By default, share links expire after **7 days**. If a member hasn't joined by then, you'll need to generate a new link.

---

## Member Roles and Permissions

When you invite someone, you can manage what they can do:

- **Owner**: The person who created the Space. Has full control, including the ability to delete the entire Space.
- **Admin**: Can invite new members, remove existing members (except the Owner), and change Space settings.
- **Member**: Can log expenses, upload receipts, and view all transactions and budgets within that Space.

---

## Privacy and Visibility

A common question is: *"Can my partner see my personal bank account?"*

**The answer is No.**

- **Personal is Private**: Transactions in your Personal space are strictly for your eyes only.
- **Explicit Sharing**: Only transactions logged *inside* a shared Space are visible to other members.
- **Selective Wallet Sync**: If you connect a bank via Plaid, you choose which specific accounts (Wallets) are shared with the Space. You can keep your savings account private while sharing your joint checking account.

---

## Settle Up and Balances

Moneko doesn't just track spending; it tracks **who owes what**.

In a shared Space, when you log an expense, you can specify:
- **Who paid**: Defaults to you, but can be changed.
- **The Split**: Equal split, percentage-based, or specific amounts.

### The Settlement View
Go to the **Space Details** to see the net balance. Moneko calculates the most efficient way for everyone to settle their debts. 

*Example: "Alex owes Taylor $45.00"*

Once a payment is made outside the app (e.g., via Venmo or bank transfer), you can mark it as **Settled** in Moneko to reset the balances.

---

## Pro-Tips for Shared Spaces

- **Default Split**: Set a default split ratio in Space Settings (e.g., 50/50 or 60/40) so you don't have to choose it every time you log an expense.
- **Shared Budgets**: Create "Pockets" within the shared Space (like "Groceries" or "Rent") to track group progress against monthly goals.
- **Nudges**: Enable 'Sharing Nudges' in settings to get notified whenever another member logs a large expense or when a budget is nearly reached.
`,
};
