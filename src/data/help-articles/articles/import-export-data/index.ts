import type { HelpArticle } from "../../types";

export const importExportDataArticle: HelpArticle = {
  id: "import-export-data",
  number: "1.4",
  slug: "how-to-import-and-export-data-in-moneko",
  title: "How to Import and Export Data in Moneko",
  description:
    "Learn how to import files, receipts, bank statements, and spreadsheets into Moneko, then export transactions or receipts from a full Space or filtered transaction list.",
  categoryId: "getting-started",
  readTime: 4,
  keywords: [
    "import and export data in Moneko",
    "Moneko import data",
    "Moneko export transactions",
    "import receipts in Moneko",
    "export receipts in Moneko",
    "upload bank statement to Moneko",
    "export Space transactions",
    "Moneko CSV import",
    "Moneko Excel export",
  ],
  faqItems: [
    {
      question: "What file types can I import into Moneko?",
      answer: "Moneko supports JPG, PNG, PDF, CSV, Excel files, and plain text.",
    },
    {
      question: "Can I import bank statements into Moneko?",
      answer: "Yes. You can import bank or credit card statements using the Files option.",
    },
    {
      question: "Can I import Excel budgeting sheets?",
      answer:
        "Yes. Moneko supports Excel files, so you can import spreadsheet-based budgeting data.",
    },
    {
      question: "How do I import a file into Moneko?",
      answer:
        "Go to the Space where you want the data, tap the + button, select Files, then choose your file.",
    },
    {
      question: "How do I import a receipt?",
      answer: "Tap the + button, select Gallery or take a photo, then upload your receipt.",
    },
    {
      question: "Where are receipts saved?",
      answer: "Receipts are saved with your transactions for easy reference.",
    },
    {
      question: "How do I export all transactions from a Space?",
      answer:
        "Select your Space from the top left, tap the three dot menu, then tap Export transactions.",
    },
    {
      question: "Can I export receipts from Moneko?",
      answer: "Yes. You can export receipts as a ZIP file.",
    },
    {
      question: "Can I export only specific transactions?",
      answer:
        "Yes. Go to Overview, tap View all transactions, apply filters such as a date range, then tap the download icon.",
    },
    {
      question: "What export format should I use for transactions?",
      answer: "Use the Excel file option to export transactions.",
    },
  ],
  howToSteps: [
    {
      name: "Select the target Space",
      text: "Open the Space where you want to import data or from which you want to export.",
    },
    {
      name: "Use the + button to import",
      text: "Tap + and select Files or Gallery to bring data into Moneko.",
    },
    {
      name: "Use the Space menu to export",
      text: "Tap the three-dot menu in your Space and select Export transactions.",
    },
  ],
  content: `# How to Import and Export Data in Moneko

Moneko makes it easy to bring your existing data into the app and export it whenever you need.

You can import:
- bank exports
- credit card statements
- receipts
- invoices
- spreadsheets
- plain text

You can also export your transactions or receipts in just a few taps.

This gives you more flexibility when managing your money, reviewing past spending, or keeping your own records outside Moneko.

---

## What You Can Import into Moneko

Moneko supports several file types for importing data.

You can import:

- **Photos:** JPG and PNG files
- **PDF files**
- **CSV files**
- **Excel files**
- **Plain text**

You can use these import options for:

- bank statements
- credit card statements
- Excel budgeting sheets
- receipts
- invoices

### Expected Result

After importing a supported file, Moneko analyzes the file and organizes the transactions for you.

---

## How to Import Files into Moneko

Use this option when you want to import a file such as a bank statement, credit card statement, CSV file, Excel file, PDF, or plain text document.

1. Go to the **Space** where you want to import the data.
2. Tap the **+** button.
3. Select **Files**.
4. Choose the file you want to upload.
5. Moneko will analyze and organize the transactions for you.

### Important

Make sure you are in the correct Space before importing.

Imported data is added to the Space you are currently using.

### Expected Result

Your imported file is processed, and the related transactions are organized inside the selected Space.

---

## How to Import Receipts into Moneko

Use this option when you want to save a receipt with your transactions.

1. Tap the **+** button.
2. Select **Gallery** or take a photo.
3. Upload your receipt.

Receipts are saved with your transactions so you can find them again later.

This is useful when you want to:
- keep proof of purchase
- review transaction details
- store invoices
- keep shared spending easier to verify

### Expected Result

Your receipt is uploaded and saved with your transactions for easy reference.

---

## How to Export Data from Moneko

There are two ways to export data in Moneko:

1. Export a full Space
2. Export specific transactions

Choose the option that matches what you need.

---

## Option 1: Export a Full Space

Use this option when you want to export all transaction data or receipts from a Space.

![Exporting Transactions](/help/import-export-data/01%20export-data.png)

1. Select your **Space** from the top left.
2. Tap the **three dot menu**.
3. Tap **Export transactions**.
4. Choose the export format you need.

You can export:

- **Excel file:** for transactions
- **ZIP file:** for receipts

### Expected Result

Moneko exports the selected Space data, so you can keep a copy outside the app.

### Best Practice

Use a full Space export when you want a complete record of your transactions or receipts from that Space.

---

## Option 2: Export Specific Transactions

Use this option when you only want to export certain transactions.

For example, you may want to export transactions from a specific date range.

1. Go to **Overview**.
2. Tap **View all transactions**.
3. Apply filters, such as a date range.
4. Tap the **download icon**.

### Expected Result

Moneko exports only the transactions that match your selected filters.

### Best Practice

Use filters before exporting if you only need a specific set of transactions.

---

## Troubleshooting Common Issues

### I Imported Data into the Wrong Space

Imported data is added to the Space you are currently using.

Switch to the correct Space before importing your file or receipt.

### I Cannot Find My Imported Transactions

Check whether:
- you are viewing the correct Space
- the file format is supported
- the import finished processing

### My Receipt Is Not Showing Where I Expected

Receipts are saved with your transactions.

Check the relevant transaction inside the Space where you uploaded the receipt.

### I Only Want to Export Some Transactions

Go to **Overview**, tap **View all transactions**, apply filters such as a date range, then tap the **download icon**.

### I Want to Export Receipts

Export the full Space and choose the **ZIP file** option for receipts.
`,
};
