import type { HelpArticle } from "../../types";

export const connectBankFeatureAvailabilityArticle: HelpArticle = {
  id: "connect-bank-feature-availability",
  number: "4.2",
  slug: "why-cant-i-see-connect-bank-feature",
  title: "Why Can't I See the Connect Bank Feature in the App?",
  description:
    "Learn why the Connect Bank option may not appear in your app and which regions currently support bank connections through Plaid.",
  categoryId: "bank-sync",
  readTime: 2,
  keywords: [
    "connect bank feature missing",
    "connect bank button not showing",
    "Plaid regions",
    "bank connection not available",
    "supported banks",
    "US Canada bank sync",
    "Connect Bank unavailable",
    "Moneko bank connection",
  ],
  faqItems: [
    {
      question: "Why don't I see the Connect Bank option in my app?",
      answer:
        "The Connect Bank feature is only available in supported regions. If you are outside the United States or Canada, the button is hidden because Plaid does not support bank connections in your location yet.",
    },
    {
      question: "Which regions support Connect Bank?",
      answer:
        "Moneko currently supports bank connections through Plaid in the United States and Canada. This is determined by your device's timezone and region settings.",
    },
    {
      question: "Will Connect Bank be available in my country soon?",
      answer:
        "We are working to expand bank connection support to more regions. For now, you can still log transactions manually or use other import options available in the app.",
    },
  ],
  howToSteps: [
    {
      name: "Check your region",
      text: "Make sure your device timezone and region are set to a supported location, such as the United States or Canada.",
    },
    {
      name: "Open the Wallets tab",
      text: "Go to the Wallets tab and look for the Connect Bank button at the top of the screen.",
    },
    {
      name: "Use manual tracking if unavailable",
      text: "If the button is not shown, you can still add wallets and log transactions manually to track your spending.",
    },
  ],
  content: `# Why Can't I See the Connect Bank Feature in the App?

The Connect Bank feature lets you link a bank account through Plaid so transactions can be imported automatically. If you do not see this option, it is most likely because your region is not currently supported.

---

## Supported Regions

Moneko currently supports bank connections through Plaid in:
- **United States**
- **Canada**

The app checks your device's timezone and region settings to decide whether to show the Connect Bank option. If you are outside these regions, the button is hidden because Plaid does not support bank connections in your location yet.

---

## Common Reasons the Button Is Hidden

### You Are Outside a Supported Region
If your device is set to a timezone or region outside the United States or Canada, the Connect Bank button will not appear.

### Your Timezone Is Unknown or Offset-Only
Some timezone settings only provide an offset (for example, UTC+5) without a specific region. The app needs a named region like America/New_York or America/Toronto to enable bank connections.

### The Feature Is Not Enabled for Your Space
Bank connections are tied to the currency and region of your Space. If your Space is set to a region that does not support Plaid, the Connect Bank option will not be shown.

---

## What You Can Do Instead

If Connect Bank is not available in your region, you can still track your money in Moneko by:
- Adding wallets manually
- Logging transactions one by one
- Using other import options available in your region

---

## Will Connect Bank Come to My Region?

We are working to expand support to more countries over time. When Plaid becomes available in your region, the Connect Bank option will appear automatically in the app.
`,
};
