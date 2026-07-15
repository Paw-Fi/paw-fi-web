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
        "Moneko monitors visible notifications from the Android apps you explicitly select, including Gmail if you enable it. Financially plausible previews are securely analyzed by AI. Completed expenses, income, refunds, and recurring payments can be logged to your chosen Space and Wallet; promotions and uncertain messages are ignored.",
    },
    {
      question: "Is it secure to let Moneko read my notifications?",
      answer:
        "Moneko only considers notifications from apps you explicitly enable. Ordinary messages without monetary details and security-code notifications stay on your device. Financial candidates are sent securely to Moneko's AI for classification, and ignored notification text is not retained. Your data is never sold.",
    },
    {
      question: "Which apps can I track with this feature?",
      answer:
        "Moneko detects recent notifications from installed apps. You can enable banking, credit card, payment, shopping, or email apps such as Gmail individually. Moneko reads only their visible Android notification previews, not your mailbox or app account.",
    },
    {
      question: "Do I need to leave Moneko open for this to work?",
      answer:
        "No. Once set up, the capture service runs in the background. It will process notifications even when your phone is locked or you are using other apps.",
    },
    {
      question: "Why aren't my transactions showing up?",
      answer:
        "Ensure that: 1. Auto Capture is enabled in Settings. 2. Notification Access is granted in Android system settings. 3. The specific app is toggled on in the Supported Apps list. 4. The notification visibly includes enough evidence of a completed transaction, including an amount and currency. Moneko intentionally ignores promotions, pending or declined payments, reminders, unresolved transfers, and uncertain messages.",
    },
  ],
  howToSteps: [
    {
      name: "Enable Auto Capture",
      text:
        "Open Moneko Settings, tap 'Auto Transaction Capture', and toggle 'Enable Auto Capture' on.",
    },
    {
      name: "Grant Notification Access",
      text:
        "If prompted, follow the steps to grant Moneko 'Notification Access' in your Android system settings. This allows the app to read incoming notifications in the background.",
    },
    {
      name: "Select Destination",
      text:
        "Choose the Space and Wallet where you want captured transactions to be saved.",
    },
    {
      name: "Enable Supported Apps",
      text:
        "In the 'Supported Apps' section, toggle on the banking or payment apps you want Moneko to monitor.",
    },
  ],
  content: `# How to Automatically Track Transactions via Android Notifications

Moneko can automatically capture completed expenses, income, refunds, and recurring payments from notifications sent by Android apps you select.

You can select banking, payment, shopping, and email apps such as Gmail. Moneko reads only the notification preview shown by Android. It does not connect to or read your mailbox.

---

## How It Works

When an enabled app sends a financially plausible notification:

1. **Private candidate check**: Moneko looks for monetary evidence on your device. Ordinary messages and security-code notifications are not uploaded.
2. **AI classification**: The visible notification preview is securely analyzed to determine whether it represents a completed expense, income, refund, recurring payment, promotion, pending event, or another message type.
3. **Safe decision**: Only high-confidence completed transactions are saved. Promotions, pending or declined payments, reminders, unresolved transfers, and uncertain messages are ignored.
4. **Recurring reconciliation**: A confirmed recurring payment creates a schedule only when one does not already exist. Existing schedules are not duplicated.
5. **Notification**: Moneko tells you when a candidate was ignored or matched to an existing recurring schedule.

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

- **Local Privacy Gate**: Ordinary messages without monetary evidence and security-code notifications stay on your device.
- **Secure AI Classification**: Financial candidates from enabled apps are sent securely to Moneko's AI for classification.
- **Targeted Monitoring**: Moneko *only* looks at notifications from the apps you have explicitly enabled.
- **No Mailbox Access**: Enabling Gmail gives Moneko access only to visible Android notification previews, not your inbox or Google account.
- **Limited Retention**: Ignored raw notification text is not retained. Saved transactions keep only the derived transaction details needed by Moneko.
- **No Data Selling**: Your transaction data belongs to you. We never sell or share your information with third parties.
- **Secure Sync**: Background sync credentials are stored in your device's secure hardware enclave.

---

## Troubleshooting

### Transactions are not being captured
- **Check Permissions**: Go to Android Settings → Apps → Special app access → Notification access and ensure Moneko is allowed.
- **Check App Toggles**: Ensure the bank app is enabled in Moneko's Auto Capture settings.
- **Notification Content**: Ensure your bank app notifications actually include the transaction amount and merchant name. If the notification just says "You have a new alert," Moneko cannot extract the data.
- **Completed Transactions Only**: Invoices, renewal notices, pending authorizations, declined payments, and promotions are not proof that money moved and will not be logged.
- **Refunds and Income**: Clear refund, reversal credit, salary, deposit, and payment-received notifications are logged as income rather than expenses.
- **Battery Optimization**: Some Android devices aggressively kill background tasks. Ensure Moneko is set to "Don't optimize" or "Unrestricted" in battery settings.

### Captured transactions are in the wrong Space
You can change the destination at any time in the **Auto Transaction Capture** settings page. Existing transactions can be moved manually in the transaction details view.

### Multiple currencies
Moneko detects the currency symbol or code in the notification. Ensure your Wallet's currency matches the notifications being received for the most accurate tracking.
`,
};
