import type { Blog } from "@/components/blogs/blogs.typing";
import { authorsData } from "./authors";
import coverImage from "@assets/images/blogs/4.0.0/4.0.0.png";
import merchantLogosImage from "@assets/images/blogs/4.0.0/01-merchant-logos.png";
import notificationCaptureImage from "@assets/images/blogs/4.0.0/02-ios-notification-capture.png";
import recurringAndMadImage from "@assets/images/blogs/4.0.0/03-custom-recurring-and-mad.png";

const update400Blog: Blog = {
  id: "moneko-update-4-0-0",
  slug: "moneko-update-4-0-0",
  title: "Moneko 4.0.0: Easier-to-Recognize Spending and Faster Capture",
  excerpt:
    "Moneko 4.0.0 brings merchant logos, an iOS 27 notification capture shortcut, more flexible recurring schedules, Moroccan Dirham support, and accessibility improvements.",
  content: `
Moneko 4.0.0 is here. This update is about making everyday money tracking easier to follow and more comfortable to use: recognize transactions more quickly, capture spending from a supported iPhone notification shortcut, and make the app work better for more people and more routines.

Here is what changed, and what it means when you use Moneko.

## Recognize transactions at a glance

Moneko can now use AI to find a merchant logo for a transaction. When a logo is available, it gives you a quick visual cue in your spending history, so a list of purchases is easier to scan than a list of names and amounts alone.

The logo is there to help identify the merchant. Your transaction details and spending records remain the important information.

<figure class="my-8">
  <img src="${merchantLogosImage}" alt="Moneko transaction list showing recognizable merchant logos for Netflix, Uber, Starbucks, Spotify, Apple, and Amazon" class="w-full rounded-lg border border-border shadow-sm" loading="lazy" />
  <figcaption class="mt-2 text-center text-sm text-muted-foreground">Merchant logos make everyday transactions easier to recognize in Moneko.</figcaption>
</figure>

## Capture a transaction from an iPhone notification

If you use an iPhone running iOS 27, you can use Moneko's notification shortcut to log and save a transaction from a notification received from another app. It gives you a quicker route from seeing a payment notification to keeping the expense in your budget.

This is a shortcut you choose to use; it does not mean Moneko reads every notification on your phone automatically. Availability depends on the supported iOS version and shortcut setup.

<p>Need a hand setting it up? <a href="/help/automatically-track-transactions-from-iphone-notifications-moneko">Learn how to set it up</a>.</p>

<figure class="my-8">
  <img src="${notificationCaptureImage}" alt="Moneko mascot beside an iPhone payment notification and the matching saved transaction" class="w-full rounded-lg border border-border shadow-sm" loading="lazy" />
  <figcaption class="mt-2 text-center text-sm text-muted-foreground">On supported iPhones, choose the shortcut to turn a payment notification into a Moneko transaction.</figcaption>
</figure>

## Set recurring transactions to your schedule

Recurring transactions now support custom frequencies. That helps when a payment repeats on a schedule that does not fit the usual weekly or monthly choices. Your recurring items can better reflect how and when you actually pay.

## A little more room for different currencies

Moneko now supports Moroccan Dirham (MAD). We also improved currency recognition across imported transactions, budgets, wallets, and payment analysis, helping those amounts keep the currency they belong to.

<figure class="my-8">
  <img src="${recurringAndMadImage}" alt="Moneko recurring transaction on a custom two-week schedule alongside a wallet balance in Moroccan Dirham (MAD)" class="w-full rounded-lg border border-border shadow-sm" loading="lazy" />
  <figcaption class="mt-2 text-center text-sm text-muted-foreground">Custom schedules and Moroccan Dirham support make Moneko fit more real-world routines.</figcaption>
</figure>

## More comfortable to use across the app

We refined screens across Moneko for a more consistent experience. On iOS 26 and later, the app also supports Apple's Liquid Glass design. And if you use larger text, we improved how content fits across dashboards, charts, transaction lists, wallets, pockets, recurring payments, household views, sign-in, and onboarding.

These changes are intended to make information easier to see and use without asking everyone to use the app in exactly the same way.

## A steadier everyday experience

Alongside the visible updates, Moneko 4.0.0 includes bug fixes and general stability improvements. Not every improvement has a new button or screen, but they help the parts you already rely on feel more dependable.

## What to try first

- Look through recent transactions and see how merchant logos help you scan the list.
- If you are on iOS 27, set up the notification shortcut when you want a quicker way to save a payment notification as a transaction.
- Review your recurring transactions if you have a schedule that needs a custom frequency.
- If you use MAD, choose it when recording or reviewing amounts in that currency.

Thanks for using Moneko and for helping us make everyday money tracking clearer and easier.
`,
  coverImage,
  author: authorsData.find((author) => author.id === "moneko-team")!,
  tags: [
    { id: "tag-update", name: "Product Update", slug: "product-update" },
    { id: "tag-44", name: "Budgeting", slug: "budgeting" },
    { id: "tag-ai", name: "AI", slug: "ai" },
    { id: "tag-currency", name: "Currency", slug: "currency" },
  ],
  publishedAt: "2026-09-23T09:00:00Z",
  readTime: 3,
  featured: true,
  seo: {
    metaTitle: "Moneko 4.0.0 Update: Merchant Logos, iOS Capture and More",
    metaDescription:
      "See what is new in Moneko 4.0.0: AI merchant logos, iOS 27 notification capture, custom recurring frequencies, MAD support, and accessibility improvements.",
    keywords:
      "Moneko 4.0.0, Moneko update, merchant logos, iOS 27 notification capture, custom recurring transactions, Moroccan Dirham, MAD",
  },
};

export default update400Blog;
