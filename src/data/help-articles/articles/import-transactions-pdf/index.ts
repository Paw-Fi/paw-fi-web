import type { HelpArticle } from "../../types";

export const importTransactionsPdfArticle: HelpArticle = {
  id: "import-transactions-pdf",
  number: "1.8",
  slug: "import-transactions-from-pdf-moneko",
  title: "How to Import Transactions from a PDF Statement",
  description:
    "Extract transactions from digital PDF bank and credit card statements into Moneko using AI-powered PDF import, with limits, tips, and troubleshooting.",
  categoryId: "getting-started",
  readTime: 4,
  keywords: [
    "import PDF Moneko",
    "import transactions PDF",
    "PDF bank statement import",
    "import PDF statement Moneko",
    "extract transactions PDF",
    "Moneko PDF import",
    "import credit card statement PDF",
    "AI PDF import Moneko",
  ],
  faqItems: [
    {
      question: "Can Moneko import transactions from a PDF?",
      answer:
        "Yes. Moneko uses AI to extract transactions from digital PDF bank and credit card statements. Pick a PDF file in the import wizard and Moneko sends it to a secure import service that reads the statement and returns a structured table of transactions.",
    },
    {
      question: "What is the maximum PDF file size?",
      answer:
        "PDFs must be under 20MB. For best results, split long statements into smaller files of 1 to 5 pages each. Very long PDFs can time out or hit the page limit.",
    },
    {
      question: "Does Moneko work with scanned PDF statements?",
      answer:
        "Moneko works best with digital (text-based) PDFs. If you only have a scanned image, make sure it is clear and high-contrast. If Moneko cannot extract transactions, the error message will suggest using a clearer scan or a digital statement.",
    },
    {
      question: "What happens after Moneko extracts transactions from a PDF?",
      answer:
        "The extracted transactions go through the same Map Columns and Preview steps as CSV imports. You can review, edit, and confirm before anything is saved.",
    },
    {
      question: "My PDF import failed. What should I do?",
      answer:
        "First, check the file size (under 20MB) and page count (ideally 1 to 5 pages). Split long PDFs into smaller files. Use a digital text-based PDF rather than a scanned image. If it still fails, export a CSV from your bank's website instead, which is more reliable than PDF.",
    },
    {
      question: "Is my PDF data secure during import?",
      answer:
        "The PDF is sent to Moneko's secure import service for processing. The service extracts transaction data and returns it to your device. The processing happens over an authenticated, encrypted connection.",
    },
    {
      question: "Can I import multiple PDF statements?",
      answer:
        "Yes. Import each PDF file one at a time through the wizard. After the first import completes, run the wizard again with the next PDF file. Choose the appropriate target wallet for each statement.",
    },
  ],
  howToSteps: [
    {
      name: "Open the import wizard",
      text: "Tap the AI capture button on the Home screen, then choose Files to open the import wizard.",
    },
    {
      name: "Select a source and pick your PDF",
      text: "Choose a source (or Other), then tap the file row and select your PDF bank or credit card statement.",
    },
    {
      name: "Wait for AI extraction",
      text: "Moneko sends the PDF to its secure import service, which reads the statement and returns a structured table of transactions.",
    },
    {
      name: "Map, preview, and confirm",
      text: "Confirm column mappings if needed, review the extracted rows in the preview, choose your target wallet, then tap Import.",
    },
  ],
  content: `# How to Import Transactions from a PDF Statement

Moneko can extract transactions from digital PDF bank and credit card statements using AI. This is useful when your bank does not offer a CSV export but does provide downloadable PDF statements.

---

## What you need before importing

- A **digital (text-based) PDF** bank or credit card statement. Moneko works best with text-based PDFs rather than scanned images.
- File size **under 20MB**.
- Ideally **1 to 5 pages** per file. Split longer statements into smaller files for best results.
- An active internet connection (the PDF is processed by Moneko's secure import service).

If your bank offers a CSV export, use that instead — CSV is more reliable than PDF for transaction import.

---

## Step 1: Open the import wizard

1. Open the **Home** screen in the Moneko mobile app.
2. Tap the **AI capture button** (the round action button).
3. In the sheet that appears, choose **Files**.

![Choose the Files option](/help/import-files/choose_file_option.png)

The import wizard opens with a three-step timeline: Select File, Map Columns, Preview.

---

## Step 2: Select a source and pick your PDF

1. Choose a source app (or **Other** if your bank is not listed).
2. A hint card tells you which file to upload.
3. Tap the **file row** to open the file picker.
4. Select your PDF statement.

Moneko checks the file size. If the PDF is over 20MB, you will see an error telling you to reduce the file size or split it into smaller files.

---

## Step 3: Wait for AI extraction

Moneko sends the PDF to its secure import service, which uses AI to read the statement and extract a structured table of transactions. A progress dialog shows the analysis status while this happens.

The extraction service:
- Reads the text from the PDF.
- Identifies transaction rows (date, description, amount).
- Returns a structured table that feeds into the normal Map Columns and Preview steps.

This process works best with digital (text-based) PDFs. Scanned image PDFs may fail if the image quality is low.

---

## Step 4: Map columns (if needed)

After extraction, Moneko auto-maps the columns. If confidence is high, this step is skipped.

**Required fields:**
- **Date** and **Amount** (or **Debit** and **Credit** with the split toggle).

**Optional fields:**
- Category, Description, Merchant, Currency, Type, Reference, and Balance.

Confirm the mappings and tap **Next**.

---

## Step 5: Preview and confirm

Review the extracted transactions in the preview:

- **Summary card:** total rows, valid rows, errors, and duplicates.
- **Target:** choose your personal account or a shared household space, and pick the wallet that receives the transactions.
- **Row list:** tap any row to edit the date, amount, category, description, merchant, currency, or type.
- **Skip Duplicates** toggle is on by default.

Tap **Import (N)** to save the valid rows.

---

## After the import

The completion dialog reports imported, failed, and skipped counts. Moneko refreshes your data so the new transactions appear immediately.

To import another PDF statement, run the wizard again with the next file.

---

## PDF import limits and tips

| Limit | Detail |
|-------|--------|
| Maximum file size | 20MB |
| Recommended page count | 1 to 5 pages per file |
| Best format | Digital (text-based) PDF |
| Scanned PDFs | Use only if clear and high-contrast |
| Processing | Sent to Moneko's secure import service via encrypted connection |

**Tips for best results:**
- **Split long statements.** If your statement is 10+ pages, split it into 1-5 page chunks and import each separately.
- **Use digital PDFs.** Download the statement from your bank's website rather than scanning a paper copy.
- **Check extraction quality.** Always review the preview before confirming. AI extraction is good but not perfect — fix any rows that look wrong.
- **Prefer CSV when available.** If your bank offers a CSV export, use that instead of PDF. CSV is more reliable because the data is already structured.
- **One statement per import.** Import each PDF file separately so you can choose the right target wallet for each account.

---

## Troubleshooting PDF imports

| Problem | Solution |
|---------|----------|
| PDF too large | Split into smaller files under 20MB, ideally 1-5 pages each |
| PDF too long / page limit | Split into smaller files of 1-5 pages |
| Could not extract transactions | Use a digital (text-based) PDF or a clearer scan. Try a CSV export from your bank instead |
| Processing timed out | Split the PDF into smaller files and try again |
| Wrong columns mapped | Go back to Map Columns from the preview and re-map manually |
| Session expired | Sign back into Moneko and retry the import |
| Service temporarily unavailable | Wait a moment and retry. If it persists, contact support@moneko.io |

---

## Related help

- [Importing transaction history safely](/help/importing-history-safely-moneko)
- [How to import and export data in Moneko](/help/how-to-import-and-export-data-in-moneko)
- [How to import transactions from a CSV file](/help/import-transactions-from-csv-moneko)
- [How to import transactions from an Excel file](/help/import-transactions-from-excel-moneko)
- [Migrating from other budgeting apps](/help/migrate-from-other-budgeting-apps-moneko)
`,
};
