import type { HelpArticle } from "../../types";
import notificationCaptureSetupImage from "@assets/videos/helps/ios27_transactions_notification_capture/notification_capture_setup.jpg";
import notificationCaptureSetupVideo from "@assets/videos/helps/ios27_transactions_notification_capture/notification_setup_videocc.mp4";

export const iosNotificationCaptureArticle: HelpArticle = {
  id: "ios-notification-capture",
  number: "2.6",
  slug: "automatically-track-transactions-from-iphone-notifications-moneko",
  title:
    "How to Automatically Track Transactions from iPhone Notifications (iOS 27+)",
  description:
    "Set up Moneko on iOS 27 or later to check selected bank and payment notifications and save completed transactions automatically.",
  categoryId: "automation-planning",
  readTime: 7,
  keywords: [
    "iOS 27 notification capture Moneko",
    "iPhone notification transaction tracking",
    "automatically track bank notifications iPhone",
    "Moneko notification automation",
    "Capture Transaction Notification",
    "iOS notification expense tracking",
  ],
  faqItems: [
    {
      question: "Does Moneko read all of my iPhone notifications?",
      answer:
        "No. You choose which apps can trigger the Shortcuts automation. Apple passes the selected notification's title, subtitle, message, and source app to Moneko only when that automation runs.",
    },
    {
      question: "Which iPhone version supports this setup?",
      answer:
        "This setup requires an iPhone running iOS 27 or later and the latest version of Moneko that includes the Capture Transaction Notification action. Earlier iOS versions do not support this notification automation trigger.",
    },
    {
      question: "Will every selected notification become a transaction?",
      answer:
        "No. Moneko checks the notification first and saves only a supported completed transaction. Promotions, pending or declined events, internal transfers, credit-card payments, and uncertain messages may be ignored.",
    },
    {
      question: "Where will captured transactions be saved?",
      answer:
        "They are saved to the Destination Space and, when selected, Destination Wallet configured in the Moneko action. Choose the wallet that belongs to the selected Space.",
    },
    {
      question: "Can I use this when my internet connection is unavailable?",
      answer:
        "If Moneko cannot send the capture immediately because of a network or session problem, iOS can keep it in Moneko's secure pending queue for a later sync. The transaction is not confirmed until Moneko successfully processes it.",
    },
    {
      question:
        "Why does the shortcut say that the notification was already checked?",
      answer:
        "Moneko uses duplicate protection so the same notification is not saved twice. This message means the same capture was already accepted or checked recently.",
    },
  ],
  howToSteps: [
    {
      name: "Prepare Moneko",
      text: "Update Moneko, open Settings → Apple Pay Integration, turn on Apple Pay Sync, and choose the Destination Space and Destination Wallet.",
    },
    {
      name: "Create a notification automation",
      text: "Open Shortcuts, go to Automation, create a personal automation, and choose the Notification trigger.",
    },
    {
      name: "Choose source apps",
      text: "Select the bank, card, or payment apps whose notifications should trigger the automation.",
    },
    {
      name: "Add the Moneko action",
      text: "Create a new blank automation, search for Moneko, and select Capture Transaction Notification.",
    },
    {
      name: "Pass the notification details",
      text: "Map Notification Title to Title, Notification Subtitle to Subtitle, Notification Message to Body, and Source App Name to App.",
    },
    {
      name: "Save and test",
      text: "Save the automation and make sure the final action shows the selected Space, Wallet, notification fields, and source app before testing with a real completed payment notification.",
    },
  ],
  content: `<video src="${notificationCaptureSetupVideo}" controls playsInline preload="metadata" class="mb-8 w-full rounded-lg border border-border shadow-sm" aria-label="Video tutorial showing how to set up Moneko iOS notification transaction capture"></video>

# How to Automatically Track Transactions from iPhone Notifications

If your bank or payment app sends a notification after you pay, Moneko can use that notification to help record the transaction for you.

This feature uses the **Shortcuts** app on an iPhone running **iOS 27 or later**. You choose the apps that may trigger the automation, and the automation sends the notification details to Moneko's **Capture Transaction Notification** action.

Moneko then checks the notification. A clear, completed transaction can be saved to your chosen Space and Wallet. A notification that does not show a completed transaction is left alone.

> **Important:** This is not a bank connection. Moneko does not sign in to your bank or read your entire notification history. Apple runs the automation only for the apps and notifications that you choose.

---

## Before You Start

You need:

- An iPhone running **iOS 27 or later**.
- The latest version of **Moneko**.
- The **Shortcuts** app, which is included with iPhone.
- Notifications enabled for the bank, card, or payment apps you want to use.
- A Moneko account with Moneko Plus, which is required for this feature.

Before creating the automation, decide which Moneko **Space** and **Wallet** should receive these transactions.

---

## Step 1: Prepare Notification Capture in Moneko

1. Open **Moneko**.
2. Open **Settings**.
3. Tap **Apple Pay Integration**. On iPhone, this is the Moneko page that contains the automatic transaction capture setup.
4. Turn on **Apple Pay Sync**.
5. Under **Log Transactions To**, choose the **Destination Space**.
6. Choose the **Wallet** that belongs to that Space.
7. Tap **Start Setup**.

Moneko prepares the secure sign-in information that the Shortcuts action needs and opens the Shortcuts app when you continue.

> **Why do I see Apple Pay?** The iPhone integration page is also used for automatic transaction capture. The notification automation is a separate Shortcuts trigger, so you will choose **Notification** in the next step.

---

## Step 2: Create a Notification Automation in Shortcuts

1. Open the **Shortcuts** app if it is not already open.
2. Tap **Automation** at the bottom.
3. Tap the **+** button.
4. Choose **Notification**.
5. Select the bank, card, or payment apps whose notifications should be checked.
6. If you want to narrow the trigger further, use **Add Filter** and choose a **Message**, **Subtitle**, or **Title** filter.
7. Continue to the next screen.

Choose only apps that send useful completed-payment notifications. You can select more than one app, as shown in the example below.

---

## Step 3: Add the Moneko Action

1. Tap **New Blank Automation** if Shortcuts shows that option.
2. Tap **Add Action**.
3. Search for **Moneko**.
4. Choose **Capture Transaction Notification**.

The action has fields for the destination and the information coming from the notification. The destination values should match the Space and Wallet you selected in Moneko.

If Shortcuts shows a different destination than you expect, stop and correct it before saving. A Wallet must belong to the selected Space.

---

## Step 4: Connect the Notification Fields

The notification trigger provides four useful values: the app that sent the notification, its title, its subtitle, and its message or body.

Set the Moneko action up like this:

| Moneko field | Choose this value from the notification |
| --- | --- |
| **Notification Title** | **Title** |
| **Notification Subtitle** | **Subtitle** |
| **Notification Message** | **Body** |
| **Source App Name** | **App** |

To choose a value, tap the field, select **Select Variable** or the variable picker, choose the notification input, and then choose the matching value. The labels may appear as blue tokens in Shortcuts.

You should also see:

- **Destination Space**: the Moneko Space where the transaction should be saved.
- **Destination Wallet**: the Moneko Wallet where the transaction should be saved.

Do not type a fixed merchant, amount, or notification message. Those details must come from the notification so each run can process the current payment.

<img src="${notificationCaptureSetupImage}" alt="Finished iOS 27 Shortcuts notification automation showing selected payment apps and the Moneko Capture Transaction Notification action" class="w-full rounded-lg border border-border shadow-sm" />

---

## Step 5: Check the Finished Automation

Before you finish setting up the automation, compare your action with the example image:

- The trigger says **When I receive a notification from**.
- The bank or payment apps you chose are listed in the trigger.
- The action is **Capture Transaction Notification**.
- The Destination Space is correct.
- The Destination Wallet is correct.
- **Notification Title** uses **Title**.
- **Notification Subtitle** uses **Subtitle**.
- **Notification Message** uses **Body**.
- **Source App Name** uses **App**.

Keep **Show When Run** enabled if you want to see the action's result while testing. After you have confirmed that everything works, you can adjust that Shortcuts option to suit your preference.

---

## Step 6: Test It Safely

Make a small, real purchase with one of the selected apps, then wait for that app's completed-payment notification.

The notification should contain enough information for Moneko to understand what happened, such as the merchant or source, amount, currency, and a completed-payment message. Moneko checks the notification and then shows a result from the Shortcut.

The result can mean:

- **Captured**: Moneko accepted the completed transaction and saved it.
- **No completed transaction to save**: Moneko checked the notification but it was a promotion, pending event, declined payment, transfer, or another unsupported or unclear message.
- **Already checked**: duplicate protection prevented the same notification from being saved twice.
- **Saved for later**: the notification was queued securely because Moneko could not reach the service at that moment.

Open Moneko and check the selected Space and Wallet after a successful test.

---

## What Moneko Does and Does Not Capture

Moneko can process a notification when it contains enough evidence of a completed financial event. Depending on the notification, this may include an expense, income, refund, or recurring payment.

Moneko intentionally does not save every notification. It may ignore:

- Promotions and marketing messages.
- Pending, declined, or reversed events that do not confirm a completed transaction.
- Transfers between your own accounts or wallets.
- Credit-card payment messages that represent paying a card balance rather than a purchase.
- Notifications that do not contain enough reliable information.

This check helps prevent false transactions from appearing in your budget.

---

## Privacy and Security

- You choose which apps can trigger the automation.
- Apple provides the selected notification values to the Shortcut when the trigger runs.
- Moneko receives the notification title, subtitle, message, and source app that the action passes to it.
- Moneko checks the notification before saving anything.
- Moneko uses duplicate protection so the same notification is not saved twice.
- If a temporary network or session problem prevents an immediate request, Moneko can keep the capture in a secure pending queue for later synchronization.

Moneko does not connect directly to your bank or card for this feature.

---

## Troubleshooting

### I cannot find Apple Pay Integration

Update Moneko, then open **Moneko → Settings**. On iPhone, the integration is named **Apple Pay Integration** even when you are setting up notification capture.

If the feature is locked, your current Moneko plan may not include it.

### I cannot find the Notification trigger

This automation requires **iOS 27 or later**. Check **Settings → General → Software Update**, then update Moneko as well. Earlier iOS versions do not support this notification automation trigger.

### The notification never starts the automation

Check that:

- Notifications are enabled for the bank or payment app.
- The correct app is selected in the Shortcuts **Notification** trigger.
- The automation is saved and enabled.
- The bank or payment app actually displays the completed payment details in the notification.

### The Moneko action is missing

Tap **Add Action**, search for **Moneko**, and choose **Capture Transaction Notification**. If it is still missing, update Moneko and reopen Shortcuts after opening the Moneko integration page.

### Moneko receives the notification but does not save a transaction

Confirm that the notification describes a completed transaction and includes enough information to identify it. Moneko may ignore pending, declined, promotional, internal-transfer, card-payment, or unclear notifications by design.

### The amount, merchant, or app is missing

Check the variable mapping:

- **Notification Title → Title**
- **Notification Subtitle → Subtitle**
- **Notification Message → Body**
- **Source App Name → App**

Also check the original notification. If the app only says something general such as “You have a new alert,” Shortcuts cannot pass details that the notification does not contain.

### Transactions are going to the wrong place

Edit the **Capture Transaction Notification** action and check **Destination Space** and **Destination Wallet**. The selected Wallet should belong to the selected Space. Save the automation again after changing either value.

### I was offline when the notification arrived

Moneko may save the capture in its secure pending queue and retry it later. Reopen Moneko with an internet connection so pending captures can synchronize. If the notification was not queued successfully, run the test again after reconnecting.
`,
};
