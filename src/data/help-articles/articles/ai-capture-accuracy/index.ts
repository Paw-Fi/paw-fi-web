import type { HelpArticle } from "../../types";

export const aiCaptureAccuracyArticle: HelpArticle = {
  id: "ai-capture-accuracy",
  number: "2.1a",
  slug: "ai-capture-accuracy-and-corrections",
  title: "AI Capture: Accuracy, Review, and Corrections",
  description:
    "Use text, voice, receipts, and files to capture a transaction quickly, then edit or undo a saved entry safely if its extracted details are wrong.",
  categoryId: "logging-expenses",
  readTime: 5,
  keywords: [
    "Moneko AI capture",
    "receipt scanner wrong amount",
    "receipt scan incorrect",
    "AI logged wrong transaction",
    "voice expense wrong",
    "edit AI expense",
    "undo AI transaction",
    "correct receipt category",
    "AI transaction auto save",
  ],
  faqItems: [
    {
      question: "Why did Moneko read my receipt or voice note incorrectly?",
      answer:
        "AI capture interprets the information supplied in text, audio, a photo, or a file. Blurry images, multiple totals, missing dates, and ambiguous wording can produce an incomplete or incorrect saved transaction. Open it and correct the details.",
    },
    {
      question: "Does AI capture save a transaction automatically?",
      answer:
        "Yes. Ordinary AI capture saves parsed transactions immediately so they can appear in your activity without an extra confirmation step. Check the saved entry and edit or delete it if anything is wrong.",
    },
    {
      question: "How do I undo an AI transaction I already saved?",
      answer:
        "Open the saved ordinary transaction and edit or delete it. Do not create a duplicate opposite transaction just to compensate for a capture mistake.",
    },
    {
      question: "Can AI decide who paid a shared bill or how it is split?",
      answer:
        "It can propose an allocation only when the source provides enough evidence. Review the active Space, payer, and each share before saving; a shared split is an explicit saved allocation.",
    },
  ],
  howToSteps: [
    {
      name: "Choose a capture input",
      text: "Use the app's AI capture control to submit text, a voice note, a receipt photo, or a supported file.",
    },
    {
      name: "Check the saved transaction",
      text: "After capture, open the saved transaction and check its amount, date, category, currency, Space, Wallet, and any shared payer or split.",
    },
    {
      name: "Correct rather than duplicate",
      text: "Open a saved ordinary transaction to edit or delete a mistake instead of adding a compensating entry.",
    },
  ],
  content: `# AI Capture: Accuracy, Review, and Corrections

AI capture helps turn a short description, voice note, receipt photo, or supported file into a transaction. Ordinary AI capture saves parsed items immediately so you can log spending with less typing. It does not replace your review of a financial record: check the saved entry and edit or delete it when needed.

## What Moneko can extract

Depending on what you submit, Moneko can propose the amount, date, category, merchant or description, expense or income type, and other transaction details. A clear input works best: include an amount and enough context to identify the purchase.

For a shared expense, also check the active Space, payer, and allocation. A proposed split is not a reason to skip the review: the saved payer and split determine household member shares and settlement calculations.

## Check the saved transaction

After capture, open the saved transaction and check these fields:

- Amount and currency, especially when a receipt has subtotal, tax, tip, and total.
- Date and merchant or description.
- Category and expense or income type.
- Active Space and Wallet.
- Payer and every split line for a shared expense.

If the input is ambiguous, correct the missing facts in the saved entry. For example, a clear note such as "Dinner 120 EUR yesterday, Alex paid, 60/60" is safer than relying on an image with more than one total.

## If the capture is wrong

For a saved transaction, open its details and edit or delete the record. Deleting the mistaken entry is the practical undo action. Do not add a second, opposite transaction simply to offset a capture error, because that can distort Pockets, Wallets, reports, and shared balances.

If a retryable connection issue occurs after you save, Moneko keeps a local pending mutation and reconciles it in the background. A terminal rejection restores the prior state and shows an error. Check the actual transaction record before retrying manually so you do not create a duplicate.

## Limits to know

AI capture cannot verify a receipt against your bank statement or know unstated facts. It can be wrong about an amount, date, category, currency, Space, Wallet, payer, or split when the source does not make that information clear. You remain responsible for the final record.

For a confirmed recurring shared occurrence, amount changes require a revalidated split allocation. Use the recurring editor for recurring records rather than treating the occurrence as an ordinary transaction.

## Related guides

- [How to log an expense in Moneko](/help/how-to-log-expense-moneko)
- [How to split expenses in Moneko](/help/how-to-split-expenses-moneko)
- [How to use Wallets in Moneko](/help/how-to-use-wallets-moneko)
`,
};
