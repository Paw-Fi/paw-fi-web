import type { HelpArticle } from "../../types";

export const emailReceiptsArticle: HelpArticle = {
  id: "email-receipts",
  number: "2.5",
  slug: "how-to-track-email-receipts-and-online-purchases",
  title: "How to Track Email Receipts and Online Purchases",
  description:
    "Turn online purchase receipts into clean Moneko expense records automatically by forwarding them to your dedicated Moneko inbound email.",
  categoryId: "automation-planning",
  readTime: 4,
  keywords: [
    "email receipts",
    "online purchases",
    "automation",
    "receipt capture",
    "forward receipts",
    "Moneko email tracking",
  ],
  faqItems: [
    {
      question: "How does email receipt capture work?",
      answer:
        "You forward your receipt emails or supported attachments to a dedicated Moneko email address, and Moneko automatically extracts the details and logs the expense.",
    },
    {
      question: "What is the inbound email address?",
      answer: "Forward your receipts to files@inbound.moneko.io.",
    },
    {
      question: "What file types are supported as attachments?",
      answer: "Moneko supports PDF, CSV, XLS, and XLSX attachments.",
    },
    {
      question: "Do I need to approve my email address?",
      answer:
        "Yes. For security, Moneko only processes emails from approved sender addresses that you configure in your Profile Settings.",
    },
    {
      question: "Where are the expenses logged?",
      answer:
        "Expenses are logged to your default Space and Wallet, which you can choose in your Email Receipt settings.",
    },
  ],
  howToSteps: [
    {
      name: "Enable the feature",
      text: "Go to Profile Settings in Moneko and enable Email Receipt Capture.",
    },
    {
      name: "Approve senders",
      text: "Add the email addresses you will be forwarding receipts from to the approved list.",
    },
    {
      name: "Forward a receipt",
      text: "Send a receipt email or attachment to files@inbound.moneko.io.",
    },
  ],
  content: `# How to Track Email Receipts and Online Purchases

Moneko lets you turn online purchase receipts into clean expense records with zero manual work.

By forwarding your receipt emails or supported attachments to your dedicated Moneko inbound address, you can keep your budget updated without retyping every detail.

---

## How It Works

Email receipt capture uses AI to read your forwarded emails and files, extracting the amount, merchant, date, and items.

Supported attachment types include:
- **PDF**
- **CSV**
- **XLS**
- **XLSX**

---

## How to Set Up Email Receipt Capture

Before you can start forwarding receipts, you need to enable the feature and approve your sender email addresses.

1. Open **Moneko**.
2. Go to **Profile Settings**.
3. Tap **Email Receipt Capture**.
4. Enable the feature.
5. **Approve Sender Addresses:** Add the email addresses you use (e.g., your personal Gmail or work email).
6. **Choose Default Space & Wallet:** Select where you want these expenses to be logged by default.

### Expected Result
Moneko is now ready to receive and process emails from your approved addresses.

---

## How to Forward a Receipt

Once setup is complete, logging an online purchase is as simple as forwarding an email.

1. Open your receipt email (e.g., from Amazon, Uber, or your airline).
2. Forward it to: **files@inbound.moneko.io**
3. Wait for the confirmation.

### Expected Result
Moneko will process the email, extract the transaction details, and log the expense in your selected Space. You will receive a phone notification when processing is complete.

---

## Best Practices for Email Receipts

- **Forward immediately:** Forward receipts as soon as you receive them to keep your budget current.
- **Check attachments:** Ensure your invoices or receipts are in supported formats like PDF or Excel.
- **Review extracted data:** While Moneko AI is highly accurate, it’s a good habit to occasionally check the logged expenses for any specific details you might want to adjust.

---

## Troubleshooting Common Issues

### My Receipt Was Not Processed
Make sure you forwarded the email from an **approved sender address**. If the email address is not in your approved list, Moneko will ignore it for security reasons.

### I Cannot Find the Logged Expense
Check your **default Space and Wallet** settings in the Email Receipt Capture menu. The expense may have been logged to a different Space than you are currently viewing.

### The Amount Is Incorrect
If an email contains multiple totals (e.g., a subtotal and a grand total), ensure the grand total is clearly visible. You can always edit the transaction details in Moneko if needed.
`,
};
