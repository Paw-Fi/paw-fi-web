import type { HelpArticle } from "../../types";

export const importTransactionsCsvArticle: HelpArticle = {
  id: "import-transactions-csv",
  number: "1.6",
  slug: "import-transactions-from-csv-moneko",
  title: "How to Import Transactions from a CSV File",
  description:
    "Bring historical transactions into Moneko from a CSV or TSV export using the import wizard, with column mapping, duplicate detection, and preview review.",
  categoryId: "getting-started",
  readTime: 5,
  keywords: [
    "import CSV Moneko",
    "import transactions CSV",
    "CSV import Moneko",
    "TSV import Moneko",
    "import spreadsheet transactions",
    "map CSV columns",
    "import bank CSV",
    "Moneko CSV import wizard",
    "import text file transactions",
  ],
  faqItems: [
    {
      question: "What CSV formats does Moneko support?",
      answer:
        "Moneko accepts CSV (comma-separated), TSV (tab-separated), and TXT (plain text delimited) files. The import wizard auto-detects the delimiter, so you do not need to configure it manually.",
    },
    {
      question: "Which columns does Moneko need in a CSV file?",
      answer:
        "The required columns are Date and Amount. If your file uses separate columns for money in and money out, enable the Split Debit/Credit toggle and map both the Debit and Credit columns. Optional columns include Category, Description, Merchant, Currency, Type, Reference, and Balance.",
    },
    {
      question: "Does Moneko auto-detect the column mapping?",
      answer:
        "Yes. Moneko matches column headers against known synonyms and samples row values to assign a confidence score. If confidence is high and at least 70% of sampled rows parse cleanly, the mapping step is skipped and you go straight to preview. You can always review the mapping from the preview if needed.",
    },
    {
      question: "What if my CSV uses a different date format?",
      answer:
        "Moneko parses common date formats automatically. If a row shows a date error in the preview, tap the row to open the edit sheet and fix the date manually. Using unambiguous dates (such as YYYY-MM-DD) before importing reduces errors.",
    },
    {
      question: "Will importing a CSV create duplicate transactions?",
      answer:
        "Duplicate skipping is enabled by default. Moneko detects duplicates within the same file and against transactions already in your account. Flagged duplicates are shown in the preview and excluded from the import unless you turn off the Skip Duplicates toggle.",
    },
    {
      question: "Can I import a CSV with multiple currencies?",
      answer:
        "Yes. Map the Currency column so each row keeps its native currency. When all rows share one currency, Moneko auto-selects it for the target wallet. When rows are mixed, Moneko uses your primary currency and the account picker filters to matching wallets.",
    },
    {
      question: "My CSV import failed with an encoding error. What should I do?",
      answer:
        "Re-save the file as UTF-8 encoding. Non-UTF-8 files can fail with a text-encoding error. Most spreadsheet apps offer UTF-8 as an export option under Save As or Export.",
    },
  ],
  howToSteps: [
    {
      name: "Open the import wizard",
      text: "Tap the AI capture button on the Home screen, then choose Files to open the import wizard.",
    },
    {
      name: "Select a source and pick your CSV",
      text: "Choose the app you are importing from (or Other), then tap the file row and select your CSV, TSV, or TXT export.",
    },
    {
      name: "Map columns if needed",
      text: "If auto-mapping confidence is low, confirm the Date and Amount mappings (or Debit and Credit with the split toggle), then tap Next.",
    },
    {
      name: "Review and confirm",
      text: "In the preview, choose your target wallet, review valid rows and duplicates, edit or remove rows as needed, then tap Import.",
    },
  ],
  content: `# How to Import Transactions from a CSV File

CSV (comma-separated values) is the most common export format from budgeting apps, banks, and spreadsheet tools. Moneko's import wizard makes it straightforward to bring historical transactions in from a CSV, TSV, or TXT file.

---

## What you need before importing

- A CSV, TSV, or TXT export from your bank, budgeting app, or spreadsheet.
- The file should contain at least a **Date** column and an **Amount** column (or separate **Debit** and **Credit** columns).
- Optional but helpful columns: Category, Description, Merchant, Currency, Type, Reference, and Balance.
- Save the file as **UTF-8 encoding** to avoid text-encoding errors.

If your tool exports in a proprietary format, open it in a spreadsheet app and re-save it as CSV before importing.

---

## Step 1: Open the import wizard

1. Open the **Home** screen in the Moneko mobile app.
2. Tap the **AI capture button** (the round action button).
3. In the sheet that appears, choose **Files**.

![Choose the Files option](/help/import-files/choose_file_option.png)

The import wizard opens with a three-step timeline: Select File, Map Columns, Preview.

---

## Step 2: Select a source and pick your file

1. Choose the app you are importing from. Moneko supports YNAB, Monarch, Copilot, PocketGuard, Splitwise, EveryDollar, Cashew, Mint, Goodbudget, Spendee, and Other.
2. A hint card tells you exactly which file to upload for that source.
3. Tap the **file row** to open the file picker.
4. Select your CSV, TSV, or TXT file.

Moneko parses the file locally and auto-maps the columns. If the mapping confidence is high and most sample rows parse cleanly, you skip straight to the preview. Otherwise, you land on the Map Columns step.

---

## Step 3: Map columns (if needed)

If the auto-mapping confidence is low, you will see the Map Columns step.

**Required fields:**
- **Date** — the transaction date.
- **Amount** — the transaction amount, OR enable the **Split Debit/Credit** toggle and map both **Debit** (money out) and **Credit** (money in) columns. Moneko computes amount = credit − debit.

**Optional fields:**
- Category, Description, Merchant, Currency, Type (expense/income), Reference, and Balance.

To map a field:
1. Tap the field row.
2. Pick the matching column from the action sheet.
3. Choose **None** to leave a field unmapped.

A **format badge** may appear showing the detected bank or app format (for example Chase, Bank of America, Wells Fargo, Revolut, N26, Wise, PayPal, or Debit/Credit Split). This confirms Moneko recognized the layout.

Tap **Next** when the required fields are mapped.

---

## Step 4: Preview and confirm

The preview step is where you verify everything before saving.

**Summary card:**
- Total rows, valid rows, rows with errors, and duplicates.
- Choose where transactions go: your **personal account** or a **shared household space**.
- Pick the specific **wallet/account** that will receive the transactions. The list filters to accounts matching the currency of your rows.

**Row list:**
- Tap any row to open the edit sheet and fix the date, amount, category, description, merchant, currency, or income/expense type.
- When you change a category, Moneko offers to apply the same category to all matching transactions at once.
- Rows with errors are excluded from the import automatically.

**Options:**
- **Skip Duplicates** toggle (on by default) — rows that already exist in Moneko are not imported again.
- If the mapping step was auto-skipped, a banner lets you go back and review the mapping.

When you are ready, tap **Import (N)** to save the valid rows.

---

## After the import

A progress dialog shows live status as Moneko saves rows in batches. When the import finishes, a completion dialog reports:

- **Imported:** rows successfully saved.
- **Failed:** rows that could not be saved.
- **Duplicates:** rows skipped because they already existed.

Moneko then refreshes your data so the new transactions appear immediately in your dashboard, analytics, and wallet balances.

---

## CSV import tips

- **Use UTF-8 encoding.** If you get an encoding error, re-save the file as UTF-8 from your spreadsheet app.
- **Unambiguous dates.** Formats like YYYY-MM-DD reduce parsing errors. If a date fails, fix it in the preview edit sheet.
- **One currency per file is cleanest.** If your file has mixed currencies, map the Currency column so each row keeps its native currency.
- **Split large files.** Very large CSVs are processed in batches of 250 rows. If a file is extremely large, consider splitting it into smaller files for easier review.
- **Export from the source, not a screenshot.** Use the official CSV export from your bank or app rather than manually retyping data.

---

## Troubleshooting CSV imports

| Problem | Solution |
|---------|----------|
| Encoding error | Re-save the file as UTF-8 encoding |
| Wrong columns mapped | Go back to Map Columns from the preview and re-map manually |
| Rows showing date errors | Tap the row in preview and fix the date format |
| Rows showing amount errors | Tap the row and fix the amount, or check for non-numeric characters |
| Too many duplicates flagged | Turn off Skip Duplicates if you confirmed the rows are genuinely missing |
| Session expired | Sign back into Moneko and retry the import |

---

## Related help

- [Importing transaction history safely](/help/importing-history-safely-moneko)
- [How to import and export data in Moneko](/help/how-to-import-and-export-data-in-moneko)
- [How to import transactions from an Excel file](/help/import-transactions-from-excel-moneko)
- [How to import transactions from a PDF statement](/help/import-transactions-from-pdf-moneko)
- [Migrating from other budgeting apps](/help/migrate-from-other-budgeting-apps-moneko)
`,
};
