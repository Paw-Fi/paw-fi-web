import type { HelpArticle } from "../../types";

export const importingHistorySafelyArticle: HelpArticle = {
  id: "importing-history-safely",
  number: "1.4",
  slug: "importing-history-safely-moneko",
  title: "Importing Transaction History Safely",
  description:
    "Import a spreadsheet or statement export without duplicating or misclassifying your existing Moneko transactions.",
  categoryId: "getting-started",
  readTime: 5,
  keywords: [
    "import transaction history",
    "import transactions safely",
    "Moneko CSV import",
    "Moneko Excel import",
    "import bank statement",
    "import spreadsheet",
    "upload transaction file",
    "map import columns",
    "import duplicates",
    "fix failed import",
  ],
  faqItems: [
    {
      question: "Which files can I import into Moneko?",
      answer:
        "The transaction import wizard accepts CSV, TSV, TXT, PDF, XLSX, and XLS files. Use an export from your bank, spreadsheet, or previous app rather than a receipt image.",
    },
    {
      question: "Can I review my import before it is saved?",
      answer:
        "Yes. The wizard shows a preview with valid rows, errors, and possible duplicates. You can review the column mapping and edit or remove a preview row before confirming the import.",
    },
    {
      question: "Will importing duplicate my existing transactions?",
      answer:
        "Duplicate skipping is enabled by default. Review rows marked as duplicates before importing, especially if the same history was previously added manually or from another source.",
    },
    {
      question: "What if only some rows import?",
      answer:
        "Moneko shows imported, failed, and skipped counts when the import finishes. Review the highlighted rows or error message before trying again so you do not re-import rows that already succeeded.",
    },
  ],
  howToSteps: [
    {
      name: "Make a backup",
      text: "Export the transaction records you want to preserve before a large import.",
    },
    {
      name: "Map and preview",
      text: "Confirm the target Space and Wallet, review the column mapping, then inspect errors and duplicates in the preview.",
    },
    {
      name: "Confirm and check the result",
      text: "Import only after the preview looks right, then use the completion counts to decide whether any rows need correction.",
    },
  ],
  content: `# Importing Transaction History Safely

Importing can save time when you are moving from a spreadsheet, bank export, or another money app. Check the file, its destination, and the preview before confirming. An import adds transactions; it is not a replacement for checking your existing records.

Before a large import, create an [Excel export of the transaction records you need to keep](/help/exporting-data-without-lock-in-moneko). Keep that file somewhere secure until you have checked the imported results.

---

## Files the transaction import accepts

The transaction import wizard accepts these file types:

- CSV
- TSV
- TXT
- PDF
- XLSX
- XLS

Use a transaction or statement export where possible. Receipt photos and images are not part of the transaction-file import flow.

For a spreadsheet-style file, Moneko needs a **date** and either an **amount** column or separate **debit** and **credit** columns. You can also map category, description, merchant, currency, type, reference, and balance columns when they are available.

Use unambiguous dates before importing. If the file has a currency column, map it so Moneko can keep that row in its stated currency. When no currency is available for a row, the import uses the app's selected default currency.

---

## Review the destination first

In the import wizard, select the Space and Wallet that should receive the history. The preview shows the selected destination before you confirm.

Do not import into a shared Space unless that history is meant to be visible there. If you are unsure which Wallet should hold the transactions, stop and create or select the correct one before importing.

---

## Map columns, then inspect the preview

Moneko may recognize column headers automatically. That is a starting point, not a reason to skip the review.

1. Confirm the Date and Amount mapping, or the Debit and Credit mapping.
2. Map optional fields only when the source column matches the label.
3. Open the preview and inspect the valid, error, and duplicate counts.
4. Tap a preview row to correct it or remove it before importing.

The preview marks rows with problems such as an invalid date, invalid amount, missing currency, unknown type, or invalid category. Correct those rows before proceeding. Invalid rows are not imported.

---

## Avoid duplicates

**Skip duplicates** is enabled by default. The preview identifies possible duplicates within the file and transactions that appear to match existing Moneko records.

Leave duplicate skipping on unless you have confirmed that a flagged record is genuinely missing. Compare the date, amount, currency, merchant or description, Wallet, and source before changing the setting. Be especially careful when the same period was added manually, imported from a bank connection, or imported from a previous file.

---

## If the import is only partly successful

Large imports are processed in batches, so an import can finish with a mix of imported, failed, and skipped rows. The completion message shows each count and may include an error message.

Do not upload the entire file again immediately. First, note the completion counts, return to the preview, and correct the rows that failed. Check that rows reported as imported are present before importing only the remaining records.

Moneko does not present this workflow as a one-tap undo. If the imported history is materially wrong, keep your backup export, stop further imports, and contact support with the file type, the destination Space and Wallet, the imported/failed/skipped counts, and a screenshot of the error with private financial details redacted.

---

## Related help

- [Exporting your data without lock-in](/help/exporting-data-without-lock-in-moneko)
- [Common Moneko discrepancies and troubleshooting](/help/common-moneko-discrepancies-troubleshooting)
`,
};
