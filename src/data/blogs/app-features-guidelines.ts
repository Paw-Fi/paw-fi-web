import { authorsData } from "./authors";

export const APP_FEATURES_GUIDELINES=[
    {
  id: "blog-53",
  slug: "how-to-set-up-email-receipt-capture-in-moneko",
  title: "How to Set Up Email Receipt Capture in Moneko",
  excerpt:
    "Forward online receipts to Moneko and let the app turn them into logged transactions automatically. This friendly guide shows you how to enable email receipt capture, approve sender emails, choose a wallet, and send your first receipt.",
  content: `
## What is Email Receipt Capture?

Email receipt capture is a simple way to log online purchases without typing everything by hand.

Instead of opening Moneko and entering the merchant, amount, date, category, and wallet yourself, you can forward a receipt email to Moneko. Moneko reads the key details, records the transaction, and lets you know when it is ready.

It is especially useful for:
*   Online shopping receipts
*   Travel bookings
*   Subscription invoices
*   App store receipts
*   Digital bills
*   CSV, XLS, XLSX, or PDF attachments you want to record

The setup only takes a few minutes.

## Step 1: Open Email Receipt Capture

In Moneko, go to your profile settings and open **Email receipt capture**.

<div class="flex flex-col sm:flex-row gap-4 my-6">
  <div class="flex-1">
    <img src="https://www.moneko.io/blogs/settings.png" alt="Profile settings page showing menu options" class="w-full rounded-lg border border-border shadow-sm" />
    <p class="text-muted-foreground text-sm text-center mt-2">Navigate to Profile Settings</p>
  </div>
  <div class="flex-1">
    <img src="https://www.moneko.io/blogs/email_receipt_capture.png" alt="Email receipt capture setup page" class="w-full rounded-lg border border-border shadow-sm" />
    <p class="text-muted-foreground text-sm text-center mt-2">Email Receipt Capture Setup</p>
  </div>
</div>

You will see the setup page with a short explanation: forward your online purchase receipts and Moneko will log them automatically.

This page has three important areas:
*   **Setup:** Turn the feature on and choose where transactions should be saved.
*   **Forwarding:** Copy the Moneko forwarding email address.
*   **Approved senders:** Decide which email addresses are allowed to send receipts.

## Step 2: Turn On Email Receipt Capture

Switch on **Email receipt capture**.

Once enabled, Moneko will be ready to accept receipts from your approved email addresses. This keeps the feature intentional and secure, because Moneko only processes receipts from senders you have approved.

## Step 3: Choose Your Default Space

Next, choose the **Default space**.

This tells Moneko where automatically captured transactions should go. For example, you can send receipts to:
*   Your personal space
*   A shared household
*   A portfolio or business-style space, if you use one

If most of your online purchases are personal, choose **Personal**. If you are tracking family spending with someone else, choose your shared household instead.

## Step 4: Choose Your Default Wallet

After choosing a space, choose the **Default wallet**.

This is the wallet Moneko will use when it saves transactions from forwarded receipts. Pick the wallet that best matches how you usually pay online, such as your main card, current account, or spending wallet.

You can always adjust the transaction later if a receipt belongs somewhere else.

## Step 5: Copy the Forwarding Email

In the **Forwarding** section, copy the Moneko forwarding address:

**files@inbound.moneko.io**

This is the email address you will forward receipts to.

A good tip is to save it as a contact called **Moneko Receipts** in your email app. That makes it easier to forward receipts quickly from Gmail, Outlook, Apple Mail, or any other inbox.

## Step 6: Add Approved Senders

Moneko protects your account by only processing attachments from approved senders.

Your Moneko account email is included by default. If you receive shopping receipts at another email address, tap **Add** under **Approved senders** and enter that email address.

For example, you may want to add:
*   Your personal shopping email
*   A shared household email
*   A work or business receipt email
*   A secondary inbox used for subscriptions

Only receipts forwarded from approved sender addresses can be processed by Moneko.

## Step 7: Forward Your First Receipt

Now send a test receipt.

Open a receipt email from an approved sender and forward it to:

**files@inbound.moneko.io**

You can forward the email itself or include a supported attachment. Moneko supports **PDF, CSV, XLS, and XLSX** files.

After Moneko receives it, the app extracts the useful details and records the transaction in your selected space and wallet.

## What Happens Next?

Once the receipt is processed and added to your Moneko account, Moneko sends a confirmation email and a phone notification.

That means you do not need to keep checking manually. Forward the receipt, let Moneko handle the details, and review the result when it is ready.

## A Simple Example

Imagine you buy a pair of headphones online.

Normally, you might need to open your budgeting app, type the store name, enter the amount, choose a category, pick the wallet, and save it.

With email receipt capture, the flow is much lighter:

1.  Buy something online.
2.  Receive the receipt in your inbox.
3.  Forward it to **files@inbound.moneko.io**.
4.  Moneko reads the receipt and logs the transaction.
5.  You get notified when it is done.

That is it.

## Tips for Best Results

*   Forward receipts from an approved sender email.
*   Make sure the receipt includes the merchant, date, and amount.
*   Use PDF, CSV, XLS, or XLSX attachments when available.
*   Choose the right default wallet before forwarding lots of receipts.
*   Add extra approved senders if you use more than one shopping inbox.

## Why This Matters

Small purchases are easy to miss. Online orders, subscriptions, delivery apps, and travel bookings can quickly pile up, especially when receipts are scattered across your inbox.

Email receipt capture helps close that gap. Instead of relying on memory, you can forward receipts as they arrive and keep your Moneko records up to date with much less effort.

It is not just about saving time. It is about making your money picture cleaner, calmer, and easier to trust.

## The Moneko Takeaway

Moneko email receipt capture turns your inbox into a simple transaction source.

Enable the feature, choose your default space and wallet, approve your sender emails, then forward receipts to **files@inbound.moneko.io** whenever you want Moneko to log them automatically.

No manual entry. No hunting through old receipts. Just forward the email and let Moneko do the rest.
  `,
  coverImage:
    "https://firebasestorage.googleapis.com/v0/b/paw-fi-3c4f7.firebasestorage.app/o/email_template_photos%2F1.5.8.png?alt=media&token=622047a7-3c7b-4d27-8185-772e839d2411",
  author: authorsData[4],
tags: [
    { id: "tag-44", name: "Budgeting", slug: "budgeting" },
    { id: "tag-13", name: "Personal Finance", slug: "personal-finance" },
    { id: "tag-45", name: "Financial Planning", slug: "financial-planning" },
    { id: "tag-56", name: "Financial Health", slug: "financial-health" },
  ],
  publishedAt: "2026-04-23T00:00:00.000Z",
  readTime: 5,
  featured: true,
  hideCreditLabel:true,
  seo: {
    metaTitle: "How to Set Up Email Receipt Capture in Moneko",
    metaDescription:
      "Learn how to set up Moneko email receipt capture, approve sender emails, choose a default wallet, and forward receipts for automatic transaction logging.",
    keywords:
      "Moneko email receipt capture, email receipt import, automatic receipt logging, budget app receipts, forward receipts to Moneko, expense tracking",
  },
}

]