import type { HelpArticle } from "../../types";

export const exportingDataWithoutLockInArticle: HelpArticle = {
  id: "exporting-data-without-lock-in",
  number: "1.5",
  slug: "exporting-data-without-lock-in-moneko",
  title: "Exporting Your Data Without Lock-In",
  description:
    "Create an Excel copy of transactions or a ZIP of receipts before a major change, account deletion, or move away from Moneko.",
  categoryId: "getting-started",
  readTime: 4,
  keywords: [
    "export Moneko data",
    "export transactions",
    "download transaction history",
    "Moneko Excel export",
    "export receipts ZIP",
    "backup financial data",
    "leave Moneko",
    "delete Moneko account",
    "account deletion export",
    "download spreadsheet",
  ],
  faqItems: [
    {
      question: "Can I export my transactions from Moneko?",
      answer:
        "Yes. Moneko exports selected transaction records as an Excel (.xlsx) file that you can open in Excel and compatible spreadsheet apps.",
    },
    {
      question: "Can I export only one Space or date range?",
      answer:
        "Yes. Choose all available Spaces, your personal Space, or one household Space, then choose a From and To date before exporting.",
    },
    {
      question: "Can I download my receipt files?",
      answer:
        "Choose the receipts ZIP export for the selected scope and date range. It includes receipt files that are available for the selected transactions; it is separate from the Excel transaction export.",
    },
    {
      question: "Should I export before deleting my account?",
      answer:
        "Yes. Account deletion is irreversible in the app. Export and check the transaction and receipt copies you need before you confirm deletion.",
    },
  ],
  howToSteps: [
    {
      name: "Choose the records",
      text: "Select Excel transactions or a receipts ZIP, then choose the Space scope and From/To dates.",
    },
    {
      name: "Save and inspect the copy",
      text: "Store the shared export securely and open it before relying on it as a backup.",
    },
    {
      name: "Delete only after checking",
      text: "If you plan to delete your account, complete exports first and verify the files before confirming deletion in Settings.",
    },
  ],
  content: `# Exporting Your Data Without Lock-In

You can take a usable copy of your transaction history out of Moneko. Use an export before a bulk import, a major cleanup, a device or app change, or account deletion. An export is a copy of the records in the scope and date range you choose, not an unspecified archive of every kind of account data.

---

## What Moneko exports

Moneko offers two export types:

- **Excel (.xlsx):** transaction records for the selected scope and date range.
- **Receipts ZIP:** receipt files available for transactions in the selected scope and date range.

The Excel export can be opened in Microsoft Excel and compatible spreadsheet applications. It includes transaction fields such as date, account, user, description, merchant, category, amount, currency, and type. It is not a receipt-file archive. Choose the separate receipts ZIP when you need receipt files.

---

## Choose a precise scope and date range

Before exporting, choose one of these scopes:

- all available Spaces
- your personal Space
- one household Space

Then set the **From** and **To** dates. Check both selections before you export, particularly if you have personal and shared history with similar transactions. A household export is limited to the household Space you choose; a personal export does not include household records.

If there are no transactions in the chosen scope and date range, Moneko does not create an empty transaction export. If you choose a receipts ZIP and there are no available receipts in that selection, there is no receipts ZIP to save.

---

## A practical backup routine

Export an Excel file after a meaningful period of tracking, before a large import, and before deleting your account. If receipts matter to your records, create a separate receipts ZIP for the same scope and date range.

After sharing or saving an export, open it and check its date range, Space, row count, and a few transaction details. Store it in a location you control and protect it as you would any financial file. Once exported, the file is outside Moneko's app protections and sharing controls.

---

## Before deleting your account

In **Settings**, choose **Delete Account** and complete the confirmation by typing **DELETE**. The app describes this action as permanent and it cannot be undone there.

Before you confirm, export the transaction history and receipt files you need, save them securely, and verify that they open. Do not rely on being able to sign back in or recover deleted records after the deletion succeeds. For the current legal scope and retention terms for an account-deletion request, see the [Privacy Policy](https://www.moneko.io/privacy-policy).

---

## Related help

- [Importing transaction history safely](/help/importing-history-safely-moneko)
- [Privacy and security standards](/help/moneko-privacy-and-security-standards)
`,
};
