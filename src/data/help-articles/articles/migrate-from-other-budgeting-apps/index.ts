import type { HelpArticle } from "../../types";

export const migrateFromOtherBudgetingAppsArticle: HelpArticle = {
  id: "migrate-from-other-budgeting-apps",
  number: "1.9",
  slug: "migrate-from-other-budgeting-apps-moneko",
  title: "Migrating from Other Budgeting Apps to Moneko",
  description:
    "Move your historical transactions from YNAB, Goodbudget, Monarch, Copilot, PocketGuard, Splitwise, EveryDollar, Cashew, Mint, and Spendee into Moneko using the import wizard.",
  categoryId: "getting-started",
  readTime: 7,
  keywords: [
    "migrate to Moneko",
    "switch to Moneko",
    "import from YNAB",
    "import from Goodbudget",
    "import from Monarch",
    "import from Copilot",
    "import from Mint",
    "import from Spendee",
    "import from EveryDollar",
    "import from Cashew",
    "import from Splitwise",
    "import from PocketGuard",
    "YNAB to Moneko",
    "Goodbudget to Moneko",
    "Mint to Moneko",
    "budgeting app migration",
    "transfer transactions to Moneko",
  ],
  faqItems: [
    {
      question: "Which apps can I migrate from into Moneko?",
      answer:
        "Moneko's import wizard has built-in source options for YNAB, Monarch, Copilot, PocketGuard, Splitwise, EveryDollar, Cashew, Mint, Goodbudget, and Spendee. For any other tool, choose Other and upload a CSV, Excel, TXT, or PDF export.",
    },
    {
      question: "What file format should I export from my current app?",
      answer:
        "CSV is the most common and reliable format. Moneko also accepts TSV, TXT, PDF, and Excel (XLSX/XLS) files. When you select a source app in the wizard, a hint card tells you exactly which file format to upload for that source.",
    },
    {
      question: "Will my categories transfer over?",
      answer:
        "Transactions import with their category text. Moneko maps categories to its own category system, and you can remap individual categories during the preview step by tapping a row. For YNAB, the wizard notes that targets may not transfer.",
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

Moneko's import wizard makes it easy to move your historical transactions from almost any budgeting app. This guide covers each built-in source option and what the wizard tells you to upload.

---

## How the import wizard works

Every migration follows the same three-step process:

1. **Select File** — pick your source app and upload an export file.
2. **Map Columns** — match columns in your file to Moneko fields (often auto-detected).
3. **Preview & Confirm** — review rows, choose a target wallet, and import.

To start: open the **Home** screen, tap the **AI capture button**, and choose **Files**.

![Choose the Files option](/help/import-files/choose_file_option.png)

Moneko supports CSV, TSV, TXT, PDF, and Excel (XLSX/XLS) files. When you select a known source app, the wizard shows a hint card telling you exactly which file to upload for that source.

Moneko auto-detects columns by matching headers against known synonyms (date, amount, outflow, inflow, payee, memo, category, debit, credit, merchant, currency, type, reference, balance, and many more) and by sampling row values. If the mapping confidence is high and most sample rows parse cleanly, the Map Columns step is skipped and you go straight to preview.

---

## Migrating from YNAB (You Need A Budget)

1. Export your transactions from YNAB as a CSV or TSV file.
2. In Moneko, open the import wizard and select **YNAB** as the source.
3. The hint card says: "Upload YNAB export (CSV/TSV). Note: targets may not transfer."
4. Pick your exported file.
5. If your file uses separate outflow/inflow columns, enable the **Split Debit/Credit** toggle in the Map Columns step and map them to Debit and Credit.
6. In the preview, choose your target wallet and review the rows.
7. Tap **Import**.

**Note:** The wizard notes that YNAB targets may not transfer. Categories import as text and map to Moneko's category system. You can remap categories in the preview by tapping a row. After import, you can set up Moneko Pockets to organize your budget.

---

## Migrating from Goodbudget

1. Export your transactions from Goodbudget as a CSV file.
2. In Moneko, open the import wizard and select **Goodbudget** as the source.
3. The hint card says: "Upload Transactions CSV."
4. Pick your exported CSV.
5. In the Map Columns step, confirm which columns map to Date, Amount, Category, Description, and Merchant. Moneko auto-detects common header names.
6. In the preview, choose your target wallet and review the rows.
7. Tap **Import**.

**Note:** After import, you can set up Moneko Pockets to organize your budget however you like.

---

## Migrating from Monarch Money

1. Export your transactions from Monarch as a CSV file.
2. In Moneko, open the import wizard and select **Monarch** as the source.
3. The hint card says: "Upload Transactions CSV (all accounts). Optional: Balance history CSV."
4. Pick your transactions CSV.
5. In the Map Columns step, confirm the mappings if needed.
6. In the preview, choose the target wallet and review the rows.
7. Tap **Import**.

**Note:** The hint indicates the transactions CSV covers all accounts. If you want transactions in separate Moneko wallets, you may need to split the file by account before importing each part into the matching wallet. The optional Balance history CSV is not part of the transaction import flow.

---

## Migrating from Copilot Money

1. Export your transactions from Copilot as a CSV file.
2. In Moneko, open the import wizard and select **Copilot** as the source.
3. The hint card says: "Upload your Copilot transactions CSV export."
4. Pick your exported CSV.
5. In the Map Columns step, confirm the mappings if needed. If your file uses a single Amount column, map it to Amount (no Debit/Credit split needed).
6. In the preview, choose your target wallet, review the rows, and tap **Import**.

**Note:** After import, use the edit sheet in the preview to remap any categories to Moneko's built-in categories if you want them to match your budgets and pockets.

---

## Migrating from PocketGuard

1. Export your transactions from PocketGuard as a CSV file.
2. In Moneko, open the import wizard and select **PocketGuard** as the source.
3. The hint card says: "Upload your PocketGuard transactions CSV export."
4. Pick your exported CSV.
5. In the Map Columns step, confirm the mappings if needed.
6. In the preview, choose your target wallet, review the rows, and tap **Import**.

---

## Migrating from Splitwise

1. Export your expenses from Splitwise as a CSV file.
2. In Moneko, open the import wizard and select **Splitwise** as the source.
3. The hint card says: "Upload your Splitwise CSV export."
4. Pick your exported CSV.
5. In the Map Columns step, map the relevant columns to Date, Amount, Description, and Category.
6. In the preview, choose your target wallet and review the rows.
7. Tap **Import**.

**Note:** If you use Moneko's household feature, you can import shared expenses into a household space and use splits to allocate them among members.

---

## Migrating from EveryDollar

1. Export your transactions from EveryDollar as a CSV file.
2. In Moneko, open the import wizard and select **EveryDollar** as the source.
3. The hint card says: "Upload one or more monthly Transactions CSV exports."
4. Pick one monthly CSV to start.
5. In the Map Columns step, confirm the mappings if needed.
6. In the preview, choose your target wallet and review the rows.
7. Tap **Import**, then repeat the wizard for each additional monthly export.

**Note:** The hint indicates these are monthly exports, so you may need to import multiple files to cover your full history. After import, you can set up Moneko Pockets to organize your budget.

---

## Migrating from Cashew

1. Create a data file backup in Cashew.
2. In Moneko, open the import wizard and select **Cashew** as the source.
3. The hint card says: "Upload Cashew Data File backup (preferred)."
4. Pick your Cashew backup file. Moneko parses the file and extracts the transactions.
5. In the Map Columns step, confirm the mappings if needed.
6. In the preview, choose your target wallet, review the rows, and tap **Import**.

**Note:** The hint indicates the Data File backup is the preferred source. If you only have a CSV export, that works too — just choose Cashew or Other as the source.

---

## Migrating from Mint (discontinued)

1. Locate your Mint transactions CSV export.
2. In Moneko, open the import wizard and select **Mint** as the source.
3. The hint card says: "Upload one or more Mint Transactions CSV exports (may require multiple exports)."
4. Pick one Mint CSV to start.
5. In the Map Columns step, confirm the mappings. If your file has a Transaction Type column, map it to the Type field so Moneko knows which rows are income vs expense.
6. In the preview, choose your target wallet and review the rows.
7. Tap **Import**, then repeat for any additional Mint export files.

**Note:** The hint indicates you may need multiple exports to cover your full history. If you no longer have your Mint export, you can import from your bank's own CSV or PDF statement exports — choose **Other** as the source.

---

## Migrating from Spendee

1. Export your transactions from Spendee as a CSV or XLS file.
2. In Moneko, open the import wizard and select **Spendee** as the source.
3. The hint card says: "Upload CSV/XLS export (All wallets; free users limited to 365 days)."
4. Pick your exported file.
5. In the Map Columns step, confirm the mappings. If the export uses separate income/expense columns, enable the Split Debit/Credit toggle.
6. In the preview, choose your target wallet.
7. Review the rows and tap **Import**.

**Note:** The hint indicates the export covers all wallets and that free users are limited to 365 days of history. If you need older history, consider reconstructing those transactions from bank statements using the Other source.

---

## Migrating from any other app (Other)

If your app is not listed, use the **Other** option.

1. In Moneko, open the import wizard and select **Other** as the source.
2. The hint card says: "Upload a CSV, XLS/XLSX, TXT, or PDF export from your tool."
3. Pick your exported file. Moneko will attempt to auto-detect the columns.
4. In the Map Columns step, map the required fields (Date and Amount, or Debit + Credit with the split toggle) and any optional fields.
5. In the preview, choose your target wallet, review and edit rows, then tap **Import**.

**Tips:**
- If your tool only exports to PDF, Moneko can extract transactions from digital PDF statements (under 20MB, ideally 1-5 pages).
- If the export is in a proprietary format, open it in a spreadsheet app and save it as CSV first.
- The most important columns are Date and Amount — make sure those are present and unambiguous in your file.

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
