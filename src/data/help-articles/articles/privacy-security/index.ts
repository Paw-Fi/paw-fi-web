import type { HelpArticle } from "../../types";

export const privacySecurityArticle: HelpArticle = {
  id: "privacy-security",
  number: "6.2",
  slug: "moneko-privacy-and-security-standards",
  title: "Privacy and Security Standards",
  description:
    "Learn about Moneko's commitment to your financial privacy, data ownership, encryption, and why we never sell your data.",
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
        "Only you. If you explicitly join a shared Space (Household), other members of that specific Space can see the transactions logged there, but not your Personal space data.",
    },
    {
      question: "Where is my data stored?",
      answer:
        "Your data is stored in secure, encrypted databases provided by Supabase (PostgreSQL). We use bank-grade AES-256 encryption for data at rest.",
    },
    {
      question: "Can I delete all my data?",
      answer:
        "Yes. You have full ownership. You can export your data to CSV/Excel or wipe your entire account and all associated data with one click in the app settings.",
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

## Technical Security Measures

### Encryption
- **At Rest**: All user data is stored using AES-256 bank-grade encryption.
- **In Transit**: Data sent between your device and our servers is protected using TLS 1.2+ (SSL) encryption.

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
- **AI Categorization**: We use secure, private AI instances that do not "train" on your personal data to improve models for other users.

---

## Data Ownership & Portability

We don't believe in "lock-in." You can take your data with you whenever you want.

- **Excel/CSV Export**: Download your entire transaction history with one tap.
- **One-Click Wipe**: If you decide to leave Moneko, you can delete your account and every trace of your data from our servers instantly.

---

## Compliance

Moneko is designed to align with modern privacy standards, including GDPR and CCPA principles, giving you the "Right to be Forgotten" and the right to data portability.

For more detailed information, please review our full [Privacy Policy](https://www.moneko.io/privacy).
`,
};
