import type { HelpArticle } from "../../types";

export const offlineSyncDevicesArticle: HelpArticle = {
  id: "offline-sync-devices",
  number: "1.6",
  slug: "offline-pending-saves-sync-changing-devices-moneko",
  title: "Offline Saves, Sync, and Changing Devices in Moneko",
  description:
    "Understand how Moneko keeps local changes while offline, reconciles them when online, and how to avoid losing an unsynced entry.",
  categoryId: "getting-started",
  readTime: 5,
  keywords: [
    "Moneko offline mode",
    "Moneko pending save",
    "Moneko transaction not syncing",
    "Moneko sync another device",
    "Moneko changing phones",
    "did my expense save offline",
    "Moneko save queued",
    "Moneko sync troubleshooting",
  ],
  faqItems: [
    {
      question: "Did my entry save when I had no internet?",
      answer:
        "Moneko is local-first: supported app-data changes are stored locally and queued for synchronization. You can keep logging while offline; reconnect and open the app so queued work can reconcile.",
    },
    {
      question: "Does Pending always mean my offline save is still syncing?",
      answer:
        "Not necessarily. The current transaction Pending chip is used for bank-provider pending activity, not as a general local-sync badge. Check the entry itself after reconnecting instead of assuming its meaning.",
    },
    {
      question:
        "Should I create the entry again if it does not appear on another device?",
      answer:
        "No. First reconnect the original device, open Moneko, and check for the entry there. Creating a duplicate can make reconciliation and troubleshooting harder.",
    },
    {
      question: "What happens if a save cannot be accepted?",
      answer:
        "Retryable or offline failures remain queued for a later attempt. A terminal rejection restores the prior state and should show an app-level error, so review the original entry before trying again.",
    },
  ],
  content: `# Offline Saves, Sync, and Changing Devices in Moneko

Moneko is designed to keep supported app-data changes locally first, then synchronize them in the background. You can continue logging expenses while offline. When you reconnect and open the app, Moneko retries queued work and reconciles it with the account data.

## What Happens When You Save Offline

For supported local-first changes, Moneko saves the change and its synchronization work together on the device before attempting the network request. The updated transaction, transfer, Wallet, or Pocket can therefore remain visible while the connection is unavailable.

When connectivity returns, Moneko processes queued changes and replaces local optimistic records with the confirmed server records. A retryable connection problem stays queued; it is not a reason to create the same entry again.

## Pending, Synced, and Failed Are Different States

- **Locally saved / queued:** The change was stored on the device and is waiting to reconcile.
- **Synced:** The server accepted the change and Moneko reconciled its local record.
- **Retryable problem:** The change stays queued and Moneko can retry it later.
- **Terminal failure:** The server rejected the change. Moneko restores the prior state and shows an app-level error.

The visible **Pending** chip on a transaction has a narrower meaning today: it indicates a bank-provider transaction that is still pending, not every local save awaiting outbox synchronization. Do not infer that a missing or present chip proves whether a local offline save has synchronized.

## Safe Steps When You Get Back Online

1. Reconnect the device that created the entry.
2. Open Moneko and leave it open long enough for the entry and its related totals to refresh.
3. Check the original transaction, transfer, Wallet, or Pocket before creating anything new.
4. If a change disappeared after an error, use the visible error and the original record to decide whether to retry; do not add an offsetting duplicate.

## Changing Phones or Using Another Device

An unsynced change is still local to the device that made it. Before reinstalling the app, replacing a phone, signing out, or relying on another device:

1. Reconnect the original device and open Moneko.
2. Confirm the newest entries, transfers, and edits are present after synchronization.
3. Then sign in to the same Moneko account on the other device and verify the same Space, period, and currency selection.

If the original device is unavailable before its queued changes reconcile, do not recreate a long list from memory. Collect the available details for Support first so duplicate and missing records can be investigated safely.

## What to Send Support for a Sync Issue

Provide the approximate time of the action, device and app version, the Space, Wallet, amount, currency, transaction type, and any displayed error. A screenshot can help, but redact account numbers, card numbers, receipt payment details, and private notes. Say whether the entry was created offline and whether it appears on the original device, another device, or both.

## Related Guides

- [How to Log an Expense in Moneko](/help/how-to-log-expense-moneko)
- [How to Use Wallets in Moneko](/help/how-to-use-wallets-moneko)
- [Common Moneko Discrepancies and Safe Troubleshooting](/help/common-moneko-discrepancies-troubleshooting)
- [Moneko Privacy and Security Standards](/help/moneko-privacy-and-security-standards)
`,
};
