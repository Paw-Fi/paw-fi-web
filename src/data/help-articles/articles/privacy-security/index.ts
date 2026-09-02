import type { HelpArticle } from "../../types";
import { productFacts } from "@/data/product-facts";

export const privacySecurityArticle: HelpArticle = {
  id: "privacy-security",
  number: "6.2",
  slug: "moneko-privacy-and-security-standards",
  title: "Privacy and Security Standards",
  description:
    "Learn how to review Moneko's current privacy terms, control your data, export records, and request account deletion.",
  categoryId: "security-privacy",
  readTime: 6,
  featured: true,
  keywords: [
    "privacy",
    "security",
    "data ownership",
    "encryption",
    "bank sync safety",
    "gdpr",
    "zero data selling",
  ],
  faqItems: [
    {
      question: "Does Moneko sell my data?",
      answer:
        "No. Never. Our business model is based on subscriptions (Moneko Plus), not advertising. Your financial data is yours and yours alone.",
    },
    {
      question: "Is my bank information safe?",
      answer:
        "Yes. When you use Bank Sync, Moneko uses Plaid, an industry leader in financial connectivity. Moneko never sees or stores your bank login credentials.",
    },
    {
      question: "Who can see my transactions?",
      answer:
        "You control who sees your data. Members of a shared Space can see the transactions logged in that Space, but not your Personal space data. Moneko does not provide routine employee access; production access is restricted to authorized personnel and systems that need it to operate, secure, or support the service.",
    },
    {
      question: "Where is my data stored?",
      answer: productFacts.privacy.statement,
    },
    {
      question: "Is Moneko end-to-end encrypted?",
      answer:
        "Moneko's current security practices and encryption statements are described in the Privacy Policy. Moneko is not presented as an end-to-end encrypted service.",
    },
    {
      question: "What information can AI features process?",
      answer:
        "AI features can process the information you submit and relevant Moneko context needed to respond. Review the Privacy Policy for the current providers, processing, retention, and data-use terms. Do not submit bank credentials or sensitive information that is not needed for your request.",
    },
    {
      question: "Can I delete all my data?",
      answer:
        "You can export available transaction records and receipt files before requesting account deletion. Deletion is irreversible in the app; review the Privacy Policy for the current deletion scope and retention terms.",
    },
  ],
  howToSteps: [
    {
      name: "Export Data",
      text: "Go to Settings → Data Management → Export to Excel to keep a local copy of your records.",
    },
    {
      name: "Wipe Account",
      text: "To permanently delete your account and all data, go to Settings → Profile → Delete Account.",
    },
  ],
  content: `# Privacy and Security Standards

At Moneko, we believe that your financial life is a private matter. We've built our platform with a "Security First" architecture to ensure that your data remains safe, secure, and under your control.

---

## Our Privacy Philosophy

### 1. You Own Your Data
Moneko is a tool for you, not a product made from your information. You have the right to access, export, and delete your data at any time.

### 2. Zero Data Selling
We do not sell, rent, or trade your personal or financial information to third parties. We don't show you ads, and we don't use your spending habits to market other financial products to you.

### 3. Subscription-Based Model
Moneko is funded by our users through **Moneko Plus**. This means our interests are aligned with yours: providing the best possible budgeting tool, not harvesting data for advertisers.

---

## Security and providers

The [Privacy Policy](https://www.moneko.io/privacy-policy) is the source of truth for current storage, security, processor, retention, and deletion terms. Moneko is not presented as an end-to-end encrypted service. Do not rely on old Help Centre language for a specific encryption method, data region, provider, or retention period.

### Secure Authentication
We use industry-standard authentication protocols (OAuth and JWT) to ensure that only authorized users can access their accounts. We support biometric login (FaceID/TouchID) for an extra layer of local security.

### Bank Sync Security (Plaid)
When you connect your bank:
- Moneko **never sees or stores** your bank username or password.
- Connections are handled by **Plaid**, which is used by thousands of financial institutions worldwide.
- You have the power to disconnect your bank at any time, which immediately revokes all access.

---

## Local Processing

Whenever possible, Moneko processes your data locally on your device. For example:
- **Android Notification Capture**: Push notifications are parsed on your phone to extract merchant and amount before being securely synced.
- **AI Features**: AI features can process the text, receipt, image, voice-derived information, and relevant Moneko context needed for your request. Do not submit bank login credentials.
- **AI Data Use and Retention**: Review the Privacy Policy for the current providers, data-use, and retention terms.

---

## Data Ownership & Portability

We don't believe in "lock-in." You can take your data with you whenever you want.

- **Excel/CSV Export**: Download your entire transaction history with one tap.
- **Account deletion:** Export the records you need first. App deletion is irreversible; the Privacy Policy describes the current deletion scope and retention terms.

---

## Compliance

For current legal privacy terms, review the full [Privacy Policy](https://www.moneko.io/privacy-policy).
`,
};
