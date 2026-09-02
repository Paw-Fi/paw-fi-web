import type { HelpArticle } from "../../types";

export const whatsappTelegramArticle: HelpArticle = {
  id: "whatsapp-telegram",
  number: "2.3",
  slug: "log-expenses-via-whatsapp-telegram-moneko",
  title: "How to Log Expenses via WhatsApp and Telegram in Moneko",
  description:
    "Learn how to connect WhatsApp or Telegram to Moneko, then log expenses, split shared costs, upload receipts, add recurring payments, and check your budget by sending a message.",
  categoryId: "logging-expenses",
  readTime: 5,
  keywords: [
    "log expenses via WhatsApp and Telegram",
    "WhatsApp expense tracker",
    "Telegram expense tracker",
    "Moneko WhatsApp connection",
    "Moneko Telegram connection",
    "chat expense tracker",
    "log expenses in chat",
    "upload receipts in WhatsApp",
    "split expenses in Telegram",
    "check budget in chat",
  ],
  faqItems: [
    {
      question: "Can I log expenses through WhatsApp in Moneko?",
      answer:
        "Yes. Connect WhatsApp in Moneko settings, then send messages to Moneko to log expenses.",
    },
    {
      question: "Can I log expenses through Telegram in Moneko?",
      answer:
        "Yes. Connect Telegram in Moneko settings, then send messages to Moneko to log expenses.",
    },
    {
      question: "How do I connect WhatsApp or Telegram to Moneko?",
      answer:
        "Open Moneko, tap the three dot menu, go to Settings, then tap WhatsApp Connection or Telegram Connection and follow the steps.",
    },
    {
      question: "What can I do from WhatsApp or Telegram?",
      answer:
        "You can log expenses, upload receipts, split shared expenses, add recurring expenses, and ask simple budget questions.",
    },
    {
      question: "Can I split expenses in WhatsApp or Telegram?",
      answer:
        "Yes. Send a message like Dinner 120 split or Groceries 80 shared.",
    },
    {
      question: "Can I upload receipts through WhatsApp or Telegram?",
      answer:
        "Yes. You can send a receipt photo directly in chat, and Moneko will attach it to your expense.",
    },
    {
      question: "Can I add recurring expenses from chat?",
      answer:
        "Yes. Send a message like Rent 1200 monthly or Gym 50 every month.",
    },
    {
      question: "Can I check my budget in WhatsApp or Telegram?",
      answer:
        "Yes. You can ask questions like How much did I spend this month or What is my total balance.",
    },
    {
      question: "Do I need to open Moneko to log expenses?",
      answer:
        "No. Once WhatsApp or Telegram is connected, you can log expenses directly from chat.",
    },
  ],
  howToSteps: [
    {
      name: "Open Connection Settings",
      text: "Go to Settings in Moneko and select WhatsApp or Telegram Connection.",
    },
    {
      name: "Follow connection steps",
      text: "Complete the verification process to link your chat account.",
    },
    {
      name: "Send a message",
      text: "Start chatting with Moneko to log expenses or ask budget questions.",
    },
  ],
  content: `# How to Log Expenses via WhatsApp and Telegram in Moneko

Moneko works directly inside **WhatsApp** and **Telegram**.

You can log expenses, upload receipts, split shared costs, add recurring payments, and check your budget just by sending a message.

If you already talk about money in chat, this makes expense tracking feel instant and natural.

No forms.  
No app switching.  
Just send a message.

---

## How to Connect WhatsApp or Telegram to Moneko

Before you can log expenses from chat, connect WhatsApp or Telegram in Moneko.

![WhatsApp & Telegram Connection](/help/whatsapp-telegram/01.png)

To set it up:

1. Open **Moneko**.
2. Tap the **three dot menu** in the top right.
3. Go to **Settings**.
4. Tap **WhatsApp Connection** or **Telegram Connection**.
5. Follow the steps to connect.

Once connected, you can start chatting with Moneko directly.

### Expected Result

After connecting WhatsApp or Telegram, you can send messages to Moneko from chat to track expenses and check your budget.

---

## How to Log Expenses in Chat

To log an expense, send a short message like you normally would.

![Logging in Chat](/help/whatsapp-telegram/02.png)

Examples:

- Lunch 18
- Dinner 42
- Taxi 25
- Rent 1200

Moneko will:

- detect the amount
- categorize the expense
- add it to the right Space
- update your budget

### Expected Result

Your expense is logged from WhatsApp or Telegram without needing to open the app.

### Best Practice

Keep your message simple and include the expense name and amount.

---

## How to Log Shared Expenses in Chat

You can also split expenses directly from WhatsApp or Telegram.

Examples:

- Dinner 120 split
- Groceries 80 shared
- Dinner 120 with Alex

Moneko will:

- split the expense
- track who paid
- update balances

Everything stays in sync for your group.

### Expected Result

The shared expense is logged, split, and reflected in your group balances.

### Best Practice

Use words like **split**, **shared**, or include the person’s name when the expense involves someone else.

---

## How to Send Receipts in Chat

You can upload a receipt photo directly in WhatsApp or Telegram.

![Sending Receipts](/help/whatsapp-telegram/03.png)

Moneko will extract details and attach the receipt to your expense.

This is useful when you are out and want to log something quickly before you forget.

### Expected Result

The receipt is saved with your expense and available for easy reference later.

---

## How to Add Recurring Expenses from Chat

You can set recurring payments by sending a message.

Examples:

- Rent 1200 monthly
- Gym 50 every month
- Netflix 14 monthly

Moneko creates a recurring item from the details you provide. A scheduled item is a forecast until its occurrence is confirmed; it is not automatically treated as completed spending.

### Expected Result

The recurring item is added with the schedule you supplied. Confirm, skip, edit, or end occurrences from the recurring workflow as needed.

### Best Practice

Include both the amount and repeat timing, such as **monthly** or **every month**.

---

## How to Ask Simple Budget Questions in Chat

You can also check your spending from WhatsApp or Telegram.

Examples:

- How much did I spend this month
- How much left in groceries
- What is my total balance

Moneko will reply with a quick summary.

### Expected Result

You can get budget or balance information directly in chat.

---

## Troubleshooting Common Issues

### I Cannot Log Expenses from WhatsApp or Telegram

Make sure you have connected the correct chat app in Moneko.

Go to:

**Moneko → three dot menu → Settings → WhatsApp Connection or Telegram Connection**

Then follow the connection steps again if needed.

### Moneko Did Not Understand My Message

Try using a shorter message with a clear amount.

Examples:

- Lunch 18
- Taxi 25
- Groceries 80 shared

### My Expense Was Added to the Wrong Space

Moneko adds the expense to the right Space based on your chat setup.

If something looks wrong, open Moneko and check which Space the expense was added to.

### My Shared Expense Did Not Split Correctly

Use clear split words such as:

- split
- shared

Examples:

- Dinner 120 split
- Groceries 80 shared

### My Recurring Expense Was Not Created

Make sure your message includes a repeat timing.

Examples:

- Rent 1200 monthly
- Gym 50 every month

### I Cannot See My Receipt

Receipts are attached to expenses.

Check the related expense in Moneko after sending the receipt photo in chat.
`,
};
