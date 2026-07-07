import type { HelpArticle } from "../../types";

export const androidNotificationCaptureArticle: HelpArticle = {
  id: "android-notification-capture",
  number: "2.5",
  slug: "automatically-track-android-notifications-moneko",
  title: "How to Automatically Track Transactions via Android Notifications",
  description:
    "Learn how to set up Moneko to automatically capture transactions from your bank and payment app notifications on Android. No manual entry required.",
  categoryId: "automation-planning",
  readTime: 5,
  keywords: [
    "android notification capture",
    "automatic expense tracking android",
    "track bank notifications",
    "moneko auto capture",
    "android wallet automation",
    "automatic transaction logging",
  ],
  faqItems: [
    {
      question: "How does Android Notification Capture work?",
      answer:
        "Moneko monitors notifications from your selected banking and payment apps. When a transaction notification arrives, Moneko automatically extracts the amount, merchant, and currency, then logs it to your chosen Space and Wallet.",
    },
    {
      question: "Is it secure to let Moneko read my notifications?",
      answer:
        "Yes. Moneko only reads notifications from apps you explicitly enable. The content is processed locally to extract transaction details and then synced to your secure Moneko account. Your data is never sold or shared.",
    },
    {
      question: "Which apps can I track with this feature?",
      answer:
        "Moneko detects recent notifications from banking, credit card, and payment apps (like Venmo, Cash App, or your bank's app). You can toggle specific apps on or off in the feature settings.",
    },
    {
      question: "Do I need to leave Moneko open for this to work?",
      answer:
        "No. Once set up, the capture service runs in the background. It will process notifications even when your phone is locked or you are using other apps.",
    },
    {
      question: "Why aren't my transactions showing up?",
      answer:
        "Ensure that: 1. Auto Capture is enabled in Settings. 2. Notification Access is granted in Android system settings. 3. The specific app is toggled on in the Supported Apps list. 4. Your bank app actually sends notifications with transaction amounts.",
    },
  ],
  howToSteps: [
    {
      name: "Enable Auto Capture",
      text: "Open Moneko Settings, tap 'Auto Transaction Capture', and toggle 'Enable Auto Capture' on.",
    },
    {
      name: "Grant Notification Access",
      text: "If prompted, follow the steps to grant Moneko 'Notification Access' in your Android system settings. This allows the app to read incoming notifications in the background.",
    },
    {
      name: "Select Destination",
      text: "Choose the Space and Wallet where you want captured transactions to be saved.",
    },
    {
      name: "Enable Supported Apps",
      text: "In the 'Supported Apps' section, toggle on the banking or payment apps you want Moneko to monitor.",
    },
  ],
  content: `# How to Automatically Track Transactions via Android Notifications

Moneko can automatically capture your spending by reading notifications from your bank and payment apps on Android.

This feature eliminates manual entry by instantly logging transactions as soon as you receive a push notification from your bank.

---

## How It Works

When a supported app (like your bank, Venmo, or Cash App) sends you a notification about a purchase:

1. **Detection**: Moneko's background service identifies the notification.
2. **Extraction**: It securely extracts the **Merchant name**, **Amount**, and **Currency**.
3. **Logging**: The transaction is automatically added to your designated **Space** and **Wallet**.
4. **Categorization**: Moneko's AI organizes the transaction into the correct category for your budget.

---

## Setting Up Auto Capture on Android

Follow these steps to enable background tracking:

### 1. Enable the Feature
Open **Moneko** → Tap the **three-dot menu** → **Settings** → **Auto Transaction Capture**. Toggle on **Enable Auto Capture**.

### 2. Grant System Permissions
Android requires a special permission called **Notification Access** for apps to read notifications in the background.
- Tap **Grant Access** when prompted.
- Find **Moneko** in the list of apps.
- Toggle on **Allow Notification Access**.

### 3. Configure Destinations
Choose where your money should go:
- **Destination Space**: Select your Personal space or a Shared household.
- **Wallet**: Select the specific account (e.g., "Main Checking") that should receive these transactions.

### 4. Enable Specific Apps
Moneko will show a list of "Recent Apps" that have sent notifications.
- Scroll to the **Supported Apps** section.
- Toggle on only the apps you want Moneko to track.
- *Note: If an app hasn't sent a notification recently, it might not appear in the list yet. Simply make a small transaction or wait for the next alert.*

---

## Security and Privacy

We take your financial privacy seriously:

- **Local Processing**: Notifications are processed on your device to extract only what's necessary (Amount, Merchant, Date).
- **Targeted Monitoring**: Moneko *only* looks at notifications from the apps you have explicitly enabled.
- **No Data Selling**: Your transaction data belongs to you. We never sell or share your information with third parties.
- **Secure Sync**: Background sync credentials are stored in your device's secure hardware enclave.

---

## Troubleshooting

### Transactions are not being captured
- **Check Permissions**: Go to Android Settings → Apps → Special app access → Notification access and ensure Moneko is allowed.
- **Check App Toggles**: Ensure the bank app is enabled in Moneko's Auto Capture settings.
- **Notification Content**: Ensure your bank app notifications actually include the transaction amount and merchant name. If the notification just says "You have a new alert," Moneko cannot extract the data.
- **Battery Optimization**: Some Android devices aggressively kill background tasks. Ensure Moneko is set to "Don't optimize" or "Unrestricted" in battery settings.

### Captured transactions are in the wrong Space
You can change the destination at any time in the **Auto Transaction Capture** settings page. Existing transactions can be moved manually in the transaction details view.

### Multiple currencies
Moneko detects the currency symbol or code in the notification. Ensure your Wallet's currency matches the notifications being received for the most accurate tracking.
`,
};
