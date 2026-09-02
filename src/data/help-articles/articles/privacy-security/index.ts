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
        "You control who sees your data. Members of a shared Space can see the transactions logged in that Space, but not your Personal space data. Moneko does not provide routine employee access; production access is restricted to authorized personnel and systems that need it to operate, secure, or support the service.",
    },
    {
      question: "Where is my data stored?",
      answer:
        "Your production application data is stored in secure, encrypted Supabase (PostgreSQL) databases in AWS's US East (Ohio) region (us-east-2). Third-party services may process data in other locations under their own terms.",
    },
    {
      question: "Is Moneko end-to-end encrypted?",
      answer:
        "No. Moneko encrypts data at rest with AES-256 and in transit with TLS 1.2+, but it is not an end-to-end encrypted service.",
    },
    {
      question: "What information is sent to Gemini, and is it retained?",
      answer:
        "The information depends on the AI feature: expense capture can send the text, receipt, image, or voice-derived information you submit, while guidance and scenario planning can send relevant Moneko financial context such as applicable transactions, balances, budgets, recurring items, and conversation context. We never send bank login credentials. We use Gemini's paid API, so prompts, attachments, and responses are not used to train Google's models. Google may retain API data for a limited period for safety, abuse prevention, and legal requirements; Moneko may retain the records and conversation history needed to provide the feature.",
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
- **Not End-to-End Encrypted**: Moneko is not an end-to-end encrypted service. Access to production data is restricted to authorized personnel and systems that need it to operate, secure, or support the service.

### Data Location
Our production application data is hosted by Supabase in AWS's US East (Ohio) region (us-east-2). Third-party services, including Plaid, Google Gemini, and payment providers, process data under their own terms and may use different locations.

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
- **AI Features**: Moneko uses Google Gemini. Expense capture can send the text, receipt, image, or voice-derived information you submit. Guidance and scenario planning can also send the relevant Moneko financial context needed to answer your request, including applicable transactions, balances, budgets, recurring items, and conversation context. We never send bank login credentials.
- **AI Data Use and Retention**: We use Gemini through its paid API. Prompts, attachments, and responses are not used to train Google's models. Google may retain API data for a limited period for safety, abuse prevention, and legal requirements. Moneko may retain the records and conversation history needed to provide the feature; you can delete your conversation history or account data from Moneko.

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
