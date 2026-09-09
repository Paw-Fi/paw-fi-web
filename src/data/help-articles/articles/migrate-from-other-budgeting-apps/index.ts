import type { HelpArticle } from "../../types";

export const migrateFromOtherBudgetingAppsArticle: HelpArticle = {
  id: "migrate-from-other-budgeting-apps",
  number: "1.9",
  slug: "migrate-from-other-budgeting-apps-moneko",
  title: "Migrating from Other Budgeting Apps to Moneko",
  description:
    "Move your historical transactions into Moneko from almost any budgeting app using the import wizard.",
  categoryId: "getting-started",
  readTime: 5,
  keywords: [
    "migrate to Moneko",
    "switch to Moneko",
    "budgeting app migration",
    "transfer transactions to Moneko",
    "import transactions from other apps",
    "move data to Moneko",
  ],
  faqItems: [
    {
      question: "Which apps can I migrate from into Moneko?",
      answer:
        "Moneko's import wizard has built-in source options for several popular budgeting apps. For any tool not listed, choose Other and upload a CSV, Excel, TXT, or PDF export.",
    },
    {
      question: "What file format should I export from my current app?",
      answer:
        "CSV is the most common and reliable format. Moneko also accepts TSV, TXT, PDF, and Excel (XLSX/XLS) files. When you select a source app in the wizard, a hint card tells you which file format to upload for that source.",
    },
    {
      question: "Will my categories transfer over?",
      answer:
        "Transactions import with their category text. Moneko maps categories to its own category system, and you can remap individual categories during the preview step by tapping a row.",
    },
    {
      question: "How long does a migration take?",
      answer:
        "Most imports complete in under a minute. Very large files are processed in batches of 250 rows and may take a few minutes. PDF imports depend on file size and page count.",
    },
    {
      question: "Can I import into a shared household space?",
      answer:
        "Yes. In the preview step, use the Import Into selector to choose your personal account or any shared household space you belong to. The wallet picker then filters to wallets in that space.",
    },
    {
      question: "Does Moneko auto-detect the columns in my export?",
      answer:
        "Yes. Moneko matches column headers against known synonyms (such as date, amount, outflow, inflow, payee, memo, category, debit, credit, and many more) and samples row values to assign a confidence score. If confidence is high and most sample rows parse cleanly, the mapping step is skipped entirely.",
    },
  ],
  howToSteps: [
    {
      name: "Export from your current app",
      text: "Use your current app's export feature to download a CSV, TSV, Excel, or PDF file of your transaction history.",
    },
    {
      name: "Open the Moneko import wizard",
      text: "Tap the AI capture button on the Home screen, choose Files, and select your app from the source list.",
    },
    {
      name: "Import and review",
      text: "Pick your exported file, confirm column mappings if needed, review the preview, choose your target wallet, and tap Import.",
    },
  ],
  content: `# Migrating from Other Budgeting Apps to Moneko

Moneko's import wizard makes it easy to move your historical transactions from almost any budgeting app. The wizard supports CSV, TSV, TXT, PDF, and Excel (XLSX/XLS) files.

---

## How the import wizard works

Every migration follows the same three-step process:

1. **Select File** — pick your source app and upload an export file.
2. **Map Columns** — match columns in your file to Moneko fields (often auto-detected).
3. **Preview & Confirm** — review rows, choose a target wallet, and import.

To start: open the **Home** screen, tap the **AI capture button**, and choose **Files**.

![Choose the Files option](/help/import-files/choose_file_option.png)

Moneko supports CSV, TSV, TXT, PDF, and Excel (XLSX/XLS) files. When you select a known source app, the wizard shows a hint card telling you which file to upload for that source.

Moneko auto-detects columns by matching headers against known synonyms (date, amount, outflow, inflow, payee, memo, category, debit, credit, merchant, currency, type, reference, balance, and many more) and by sampling row values. If the mapping confidence is high and most sample rows parse cleanly, the Map Columns step is skipped and you go straight to preview.

---

## After your migration

Once your transactions are imported:

1. **Review your categories.** Tap any row in the preview to remap categories to Moneko's built-in categories. When you change a category, Moneko offers to apply the same category to all matching transactions at once.
2. **Set up Pockets.** After import, create Moneko Pockets to organize your budget however you like.
3. **Check your wallet balances.** Imported transactions update your wallet balances. If balances look wrong, check for missing or duplicated transactions.
4. **Review recurring series.** If Moneko detected a recurring transaction series during import, you can review it in the preview and choose to release the series or keep it grouped.
5. **Export a backup.** After a successful migration, export an Excel copy of your transactions as a backup.

---

## Related help

- [Importing transaction history safely](/help/importing-history-safely-moneko)
- [How to import and export data in Moneko](/help/how-to-import-and-export-data-in-moneko)
- [How to import transactions from a CSV file](/help/import-transactions-from-csv-moneko)
- [How to import transactions from an Excel file](/help/import-transactions-from-excel-moneko)
- [How to import transactions from a PDF statement](/help/import-transactions-from-pdf-moneko)
- [Exporting your data without lock-in](/help/exporting-data-without-lock-in-moneko)
`,
};
