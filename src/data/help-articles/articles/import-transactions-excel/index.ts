import type { HelpArticle } from "../../types";

export const importTransactionsExcelArticle: HelpArticle = {
  id: "import-transactions-excel",
  number: "1.7",
  slug: "import-transactions-from-excel-moneko",
  title: "How to Import Transactions from an Excel File",
  description:
    "Import historical transactions from XLSX or XLS spreadsheet exports into Moneko, including multi-sheet workbooks, column mapping, and preview review.",
  categoryId: "getting-started",
  readTime: 5,
  keywords: [
    "import Excel Moneko",
    "import transactions Excel",
    "XLSX import Moneko",
    "XLS import Moneko",
    "import spreadsheet transactions",
    "multi-sheet Excel import",
    "import workbook Moneko",
    "Moneko Excel import wizard",
    "import Excel budget data",
  ],
  faqItems: [
    {
      question: "What Excel formats does Moneko support?",
      answer:
        "Moneko accepts both XLSX (modern Excel) and XLS (legacy Excel) files. The import wizard parses every sheet in the workbook and lets you choose which sheet to import.",
    },
    {
      question: "How does Moneko handle Excel files with multiple sheets?",
      answer:
        "When a workbook has more than one sheet, a sheet selector appears as a row of tabs in the Map Columns step. Moneko defaults to the sheet with the most rows, but you can tap any tab to switch. The column mapping and preview update for the selected sheet.",
    },
    {
      question: "Which columns does Moneko need in an Excel file?",
      answer:
        "The required columns are Date and Amount. If your spreadsheet uses separate columns for money in and money out, enable the Split Debit/Credit toggle and map both Debit and Credit. Optional columns include Category, Description, Merchant, Currency, Type, Reference, and Balance.",
    },
    {
      question: "Can I import multiple sheets at once?",
      answer:
        "You import one sheet at a time. After importing the first sheet, run the wizard again and select the next sheet from the tab selector. This lets you choose a different target wallet for each sheet, which is useful when a workbook has separate tabs for different accounts or months.",
    },
    {
      question: "What if my Excel file has no data?",
      answer:
        "If Moneko finds no data in the Excel file, it shows an error message and lets you pick a different file. Make sure the sheet you want to import actually contains transaction rows with headers.",
    },
    {
      question: "Does Moneko auto-detect the column mapping for Excel files?",
      answer:
        "Yes. Moneko matches column headers against known synonyms and samples row values. If confidence is high and at least 70% of sampled rows parse cleanly, the mapping step is skipped. You can always review the mapping from the preview.",
    },
    {
      question: "Will importing an Excel file create duplicate transactions?",
      answer:
        "Duplicate skipping is enabled by default. Moneko detects duplicates within the file and against existing transactions. Flagged duplicates are shown in the preview and excluded unless you turn off Skip Duplicates.",
    },
  ],
  howToSteps: [
    {
      name: "Open the import wizard",
      text: "Tap the AI capture button on the Home screen, then choose Files to open the import wizard.",
    },
    {
      name: "Select a source and pick your Excel file",
      text: "Choose the app you are importing from (or Other), then tap the file row and select your XLSX or XLS export.",
    },
    {
      name: "Choose a sheet if needed",
      text: "If the workbook has multiple sheets, use the sheet selector tabs to pick the sheet you want to import.",
    },
    {
      name: "Map columns and preview",
      text: "Confirm column mappings, then review valid rows and duplicates in the preview before tapping Import.",
    },
  ],
  content: `# How to Import Transactions from an Excel File

Excel (XLSX and XLS) is a popular format for budgeting spreadsheets and app exports. Moneko's import wizard supports Excel files directly, including workbooks with multiple sheets.

---

## What you need before importing

- An XLSX or XLS export from your budgeting app, bank, or spreadsheet.
- The file should contain at least a **Date** column and an **Amount** column (or separate **Debit** and **Credit** columns).
- Optional but helpful columns: Category, Description, Merchant, Currency, Type, Reference, and Balance.
- Make sure the sheet you want to import has clear column headers and transaction data below them. Moneko auto-detects the header row and skips leading metadata rows.

If your data is in a Google Sheet, export it as XLSX or CSV first.

---

## Step 1: Open the import wizard

1. Open the **Home** screen in the Moneko mobile app.
2. Tap the **AI capture button** (the round action button).
3. In the sheet that appears, choose **Files**.

![Choose the Files option](/help/import-files/choose_file_option.png)

The import wizard opens with a three-step timeline: Select File, Map Columns, Preview.

---

## Step 2: Select a source and pick your Excel file

1. Choose the app you are importing from. Moneko supports YNAB, Monarch, Copilot, PocketGuard, Splitwise, EveryDollar, Cashew, Mint, Goodbudget, Spendee, and Other.
2. A hint card tells you which file to upload for that source.
3. Tap the **file row** to open the file picker.
4. Select your XLSX or XLS file.

Moneko parses all sheets in the workbook. If there is more than one sheet, it defaults to the sheet with the most rows.

---

## Step 3: Choose a sheet (multi-sheet workbooks)

If your workbook has multiple sheets, a **sheet selector** appears as a row of tabs in the Map Columns step.

- The tab for the default sheet (most rows) is highlighted.
- Tap any tab to switch to a different sheet.
- The column mapping and preview update for the selected sheet.

This is useful when a single export workbook contains separate tabs for different accounts or different months. Import each sheet one at a time, choosing the right target wallet for each.

If no data is found in the Excel file, Moneko shows an error and lets you pick a different file.

---

## Step 4: Map columns (if needed)

Moneko auto-detects column mappings by matching headers and sampling values. If confidence is high, this step is skipped.

**Required fields:**
- **Date** — the transaction date.
- **Amount** — the transaction amount, OR enable the **Split Debit/Credit** toggle and map both **Debit** and **Credit** columns.

**Optional fields:**
- Category, Description, Merchant, Currency, Type, Reference, and Balance.

To map a field, tap it and pick the matching column from the action sheet, or choose **None** to leave it unmapped.

A **format badge** may appear showing the detected bank or app format. Tap **Next** when the required fields are mapped.

---

## Step 5: Preview and confirm

The preview step is where you verify everything before saving.

**Summary card:**
- Total rows, valid rows, rows with errors, and duplicates.
- Choose where transactions go: your **personal account** or a **shared household space**.
- Pick the specific **wallet/account** that will receive the transactions.

**Row list:**
- Tap any row to open the edit sheet and fix details.
- When you change a category, Moneko offers to apply it to all matching transactions.
- Rows with errors are excluded automatically.

**Options:**
- **Skip Duplicates** toggle (on by default).
- If mapping was auto-skipped, a banner lets you review it.

Tap **Import (N)** to save the valid rows.

---

## After the import

A progress dialog shows live status as Moneko saves rows in batches. The completion dialog reports imported, failed, and skipped counts. Moneko refreshes your data so new transactions appear immediately.

To import another sheet from the same workbook, run the wizard again, pick the same file, and select the next sheet from the tab selector.

---

## Excel import tips

- **One sheet per import.** Import each sheet separately so you can choose the right target wallet for each.
- **Keep headers clear.** Moneko detects the header row automatically and skips leading metadata rows (like "Account: Checking" or "Downloaded: 2024-01-01"), but make sure your column headers are clear and recognizable.
- **Use unambiguous dates.** Formats like YYYY-MM-DD reduce parsing errors.
- **Split very large workbooks.** If a sheet has thousands of rows, consider splitting it for easier review.

---

## Troubleshooting Excel imports

| Problem | Solution |
|---------|----------|
| No data found in Excel file | Make sure the selected sheet has headers and transaction rows |
| Wrong sheet selected by default | Use the sheet selector tabs to switch to the correct sheet |
| Wrong columns mapped | Go back to Map Columns from the preview and re-map manually |
| Rows showing errors | Tap the row in preview and fix the date, amount, or currency |
| Session expired | Sign back into Moneko and retry the import |

---

## Related help

- [Importing transaction history safely](/help/importing-history-safely-moneko)
- [How to import and export data in Moneko](/help/how-to-import-and-export-data-in-moneko)
- [How to import transactions from a CSV file](/help/import-transactions-from-csv-moneko)
- [How to import transactions from a PDF statement](/help/import-transactions-from-pdf-moneko)
- [Migrating from other budgeting apps](/help/migrate-from-other-budgeting-apps-moneko)
`,
};
