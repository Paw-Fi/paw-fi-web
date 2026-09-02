import type { HelpArticle } from "../../types";

export const notificationsRemindersArticle: HelpArticle = {
  id: "notifications-reminders",
  number: "2.8",
  slug: "notifications-reminders-and-ios-widgets",
  title: "Manage Moneko Notifications, Reminders, and Widgets",
  description:
    "Understand notification permissions, delivery limits, reminders, and where to verify the latest financial information.",
  categoryId: "getting-started",
  readTime: 3,
  keywords: [
    "Moneko notifications",
    "Moneko reminders",
    "push notifications",
    "budget reminder",
    "Moneko widgets",
  ],
  faqItems: [
    {
      question: "What permission do Moneko notifications need?",
      answer:
        "Allow Moneko notifications in your device's system settings. Without that permission, the device cannot display Moneko push notifications.",
    },
    {
      question: "Can I turn Moneko notifications off?",
      answer:
        "Yes. Disable Moneko notifications in your device's system notification settings. This stops display on that device, not the underlying financial records in Moneko.",
    },
    {
      question: "Are reminders and notifications guaranteed to arrive?",
      answer:
        "No. Delivery depends on an active registered device token, network availability, and the operating system's notification handling. Treat Moneko as the source of truth, not a notification.",
    },
    {
      question: "Do notifications or widgets work offline?",
      answer:
        "Push delivery requires connectivity. Widgets can show data previously written by Moneko, but no offline freshness guarantee is made.",
    },
  ],
  content: `# Manage Moneko Notifications, Reminders, and Widgets

Moneko can send push notifications to registered mobile devices, including payment-processing summaries and reminder-style nudges. Notifications are optional and depend on your device allowing Moneko to display them.

## Enable or disable notifications

When Moneko asks for notification permission, choose **Allow** if you want push alerts on that device. To stop them later, open your device's system notification settings, choose **Moneko**, and turn notifications off. This changes notification display only; it does not delete your transactions, budgets, or reminders.

## Delivery limits

Notifications require a registered active device token, network access, and operating-system delivery. A device can delay, suppress, or group alerts. Moneko also avoids duplicate delivery for the same notification event. Do not use a missing notification as proof that a payment, receipt import, or reminder did not happen; open Moneko to check the underlying record.

## Reminders

Moneko's daily-nudge service can create reminder notifications when its conditions are met. The current product documentation does not promise a custom reminder schedule or an offline reminder queue. If reminders are not useful, disable Moneko notifications at the device level.

## Widgets

The supported widget implementation is covered in [Add Moneko widgets to an iOS home screen](/help/ios-home-screen-widgets). Widgets are views of data last written by Moneko, not a real-time or offline freshness guarantee.

## Related information

- [Add Moneko widgets to an iOS home screen](/help/ios-home-screen-widgets)
- [Android notification capture](/help/automatically-track-android-notifications-moneko)
- [Offline mode and sync](/help/offline-pending-saves-sync-changing-devices-moneko)
`,
};
