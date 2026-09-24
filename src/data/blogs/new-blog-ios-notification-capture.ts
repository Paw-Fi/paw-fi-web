import { Blog } from "@/components/blogs/blogs.typing";
import { authorsData } from "./authors";
import notificationCaptureImage from "@assets/images/blogs/4.0.0/ios-notifications-capture.png";

const iosNotificationCaptureBlog: Blog = {
  id: "ios-notification-expense-tracking-2026",
  slug: "capture-transactions-from-iphone-notifications-ios-27",
  title: "How to Capture Transactions from iPhone Notifications on iOS 27",
  excerpt:
    "Learn how iOS 27 Shortcuts notification automation can send selected payment notifications to Moneko and turn supported completed transactions into expenses.",
  coverImage: notificationCaptureImage,
  readTime: 6,
  featured: false,
  author: authorsData.find((author) => author.id === "moneko-team")!,
  tags: [
    { id: "tag-44", name: "Budgeting", slug: "budgeting" },
    { id: "tag-13", name: "Personal Finance", slug: "personal-finance" },
  ],
  publishedAt: "2026-09-24T12:00:00Z",
  seo: {
    metaTitle: "iOS 27 Notification Capture on iPhone | Moneko",
    metaDescription:
      "See how to capture iPhone payment notifications on iOS 27 with Shortcuts. Moneko checks selected alerts and saves supported completed transactions.",
    keywords:
      "capture transactions from iPhone notifications, iOS notification capture, capture notifications on iPhone, iOS notification expense tracker, iOS 27 expense tracking, iPhone automatic expense tracker, payment notification expense tracker",
  },
  content: `## Can you capture transactions from notifications on iPhone?

Yes. **Moneko supports transaction capture from selected app notifications on iOS 27 or later.** You set up a Notification automation in Apple's Shortcuts app, choose which apps can trigger it, and add Moneko's **Capture Transaction Notification** action. When a selected app sends an alert, Shortcuts passes its notification details to Moneko to check for a supported completed transaction.

This is iOS notification capture for expense tracking: you decide which apps trigger the automation, and Moneko checks the details before saving a supported transaction.

This gives iPhone users another way to record spending without typing every purchase. It is an iOS notification expense tracking workflow configured by you: Moneko does not read every notification on your phone or connect directly to your bank.

For the complete setup, see [how to capture transactions from iPhone notifications on iOS 27](https://moneko.io/help/automatically-track-transactions-from-iphone-notifications-moneko). The guide walks through choosing apps, mapping notification fields, setting a destination Space and Wallet, and testing the automation.

## How iOS 27 notification capture works

The automation connects three pieces: a notification from an app you select, Apple's Shortcuts Notification trigger, and Moneko's capture action. The selected notification's title, subtitle, message, and source app can be passed to the action when the automation runs.

Moneko checks those details before saving anything. It can create a transaction when a notification contains enough evidence of a supported completed financial event. An unclear alert, promotion, pending or declined payment, internal transfer, or credit-card balance payment may be ignored. A notification does not automatically become an expense just because it mentions money.

This is different from bank syncing. Moneko does not sign in to your financial institution for this capture path, and it only receives the notification details passed by the automation you configured. The notification must include useful information; Shortcuts cannot supply a merchant or amount that the source app did not include.

For best results, choose apps that show the merchant or payment source, amount, currency, and a clear completed status in their notifications. Coverage depends on what each app displays and can change if its notification format changes. The automation handles new notifications that meet its trigger; it does not import a bank's full transaction history or recover purchases that never generated a useful alert.

### Notification capture, Apple Pay Shortcuts, and bank sync

These are different ways to add financial activity to a budget:

| Capture method | What it uses | Useful to know |
| --- | --- | --- |
| iOS 27 notification capture | Details from notifications sent by apps you select in Shortcuts | Requires a supported completed-transaction notification; it is not full bank history. |
| Apple Pay Wallet Shortcut | The Wallet transaction trigger for eligible Apple Pay purchases | This is separate from the Notification trigger. [See the Apple Pay Shortcut guide](/help/automatically-track-apple-pay-transactions-moneko). |
| Bank sync | A supported financial institution connection | This is a separate feature and is not required for notification capture. |
| Manual and receipt capture | Text, voice, receipt photos, or chat | Useful for cash, purchases without a helpful notification, and other spending. |

## Set up an iPhone notification expense tracker

To get started, update Moneko and open **Settings → Apple Pay Integration**. The iPhone integration screen also contains the settings used for notification capture. Turn on **Apple Pay Sync**, choose the destination Space and Wallet, and tap **Start Setup**.

Then open Apple's Shortcuts app and create a personal automation using the **Notification** trigger. Choose the bank, card, or payment apps whose alerts you want to use. Add Moneko's **Capture Transaction Notification** action and pass the notification's Title, Subtitle, Body, and App values into the matching Moneko fields. Check the destination Space and Wallet before saving.

The setup requires an iPhone running iOS 27 or later, the Moneko version that includes this action, and Moneko Plus. Availability also depends on the selected app sending a useful notification and the automation being configured correctly.

**[Follow the step-by-step iPhone notification capture setup guide](https://moneko.io/help/automatically-track-transactions-from-iphone-notifications-moneko).**

## Do you need Shortcuts to track expenses on iPhone?

Shortcuts is required for Moneko's iOS 27 notification automation and its separate Apple Pay Wallet transaction trigger. You do not need either automation to use Moneko: you can still add spending with text, voice, receipt photos, or chat.

Apple Pay capture and notification capture are two distinct methods. The Wallet transaction trigger is for eligible Apple Pay purchases. The Notification trigger can pass details from selected apps, such as a bank or payment app. If you want to capture payment alerts from other apps, use the [iPhone notification setup guide](https://moneko.io/help/automatically-track-transactions-from-iphone-notifications-moneko), rather than the Wallet transaction trigger instructions.

## Does Moneko automatically track expenses on iPhone?

Moneko can reduce manual expense entry on iPhone by capturing supported completed transactions from selected notifications through Shortcuts on iOS 27 or later. It does not track every purchase automatically: the source app must send a useful notification, you must select that app in the automation, and Moneko must be able to identify a supported completed transaction.

This is one capture option alongside Apple Pay Wallet Shortcuts, text, voice, receipt photos, and chat. It is not a replacement for a complete account history or bank connection. For Android notification capture, see [Moneko's Android notification tracking guide](/help/automatically-track-android-notifications-moneko).

## Frequently asked questions

### Can Moneko capture transactions from iOS notifications?

Yes. On iOS 27 or later, configure a Shortcuts Notification automation for apps you select and add Moneko's Capture Transaction Notification action. Moneko saves supported completed transactions when the selected notification contains enough information.

### Does Moneko read all notifications on my iPhone?

No. You choose the apps in the Shortcuts automation. Moneko receives only the notification details passed to its action when that automation runs.

### Does iPhone notification capture connect to my bank?

No. Notification capture processes details from a selected app notification. It does not require Moneko to sign in to your bank or provide direct bank access.

### Will every payment notification be saved?

No. Moneko checks whether the notification describes a supported completed transaction. It may ignore pending, declined, promotional, duplicate, unclear, or otherwise unsupported alerts.

### Can I use notification capture without Apple Pay?

Yes. The iOS 27 Notification automation is separate from the Apple Pay Wallet transaction trigger. You can select supported bank or payment apps whose notifications you want to send to Moneko.

### Is this available on Android too?

Moneko also supports notification capture on Android, with its own Android setup and notification-access permission. The iPhone workflow uses Shortcuts on iOS 27 or later.
`,
};

export default iosNotificationCaptureBlog;
