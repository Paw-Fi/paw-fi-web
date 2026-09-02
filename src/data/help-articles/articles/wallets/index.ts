import type { HelpArticle } from "../../types";
import { productFacts } from "@/data/product-facts";

export const walletsArticle: HelpArticle = {
  id: "wallets",
  number: "3.4",
  slug: "how-to-use-wallets-moneko",
  title: "How to Use Wallets in Moneko",
  description:
    "Learn how to use Wallets in Moneko to track balances, manage cash and bank accounts, transfer money, and connect your spending with Pockets.",
  categoryId: "budgeting-pockets",
  readTime: 6,
  keywords: [
    "use Wallets in Moneko",
    "Moneko Wallets",
    "create wallet in Moneko",
    "track balances in Moneko",
    "Moneko wallet balance",
    "Moneko net worth",
    "wallet transactions",
    "transfer between wallets",
    "primary wallet",
  ],
  faqItems: [
    {
      question: "What are Wallets in Moneko?",
      answer:
        "Wallets let you track your actual money, balances, and net worth in Moneko.",
    },
    {
      question: "Where do Wallets live?",
      answer:
        "Wallets live inside a Space. Each Space can have multiple wallets.",
    },
    {
      question: "What can I use Wallets for?",
      answer:
        "You can use Wallets to track cash, bank accounts, savings, travel funds, and other places where your money lives.",
    },
    {
      question: "How do I create a wallet?",
      answer:
        "Go to the Wallets tab, tap + New Wallet, enter a name, set an initial balance, choose an icon and color, then tap Save.",
    },
    {
      question: "Can a Space have multiple wallets?",
      answer: "Yes. Each Space can have multiple wallets.",
    },
    {
      question: "Are Wallets shared in a shared Space?",
      answer:
        "Yes. If you share a Space, you also share the wallets inside it. Everyone sees the same balances and transactions.",
    },
    {
      question: "Does each wallet have its own currency?",
      answer: productFacts.walletCurrencies.statement,
    },
    {
      question: "What can I see in the Wallets tab?",
      answer:
        "At the top of the Wallets tab, you can see total balance across all wallets, monthly trend, and total income and spending.",
    },
    {
      question: "How do Wallets work when logging transactions?",
      answer:
        "When you log a transaction, you can select a wallet. The transaction updates your category and your wallet balance.",
    },
    {
      question: "How do I set a default wallet?",
      answer:
        "Open a wallet and set it as Primary. It will be selected automatically when logging.",
    },
    {
      question: "Can I transfer money between wallets?",
      answer:
        "Yes. Go to the Wallets tab, tap Transfer, select From and To, enter the amount, optionally add a note, then tap Save.",
    },
    {
      question: "Can I use a Wallet as a savings tracker?",
      answer:
        "Yes. Create a Wallet for the money you want to track and record the transactions that change its balance. A Wallet shows where money is held; use Pockets for spending limits.",
    },
    {
      question: "What is the difference between Wallets and Pockets?",
      answer:
        "Wallets track where your money is. Pockets track what you spend on.",
    },
    {
      question:
        "Why is my wallet showing a negative balance after syncing with Plaid?",
      answer:
        "Connected-account history can differ by institution and account. If the available history does not explain the starting amount, set an opening balance from the point where you begin tracking and review the imported records before changing it again.",
    },
  ],
  howToSteps: [
    {
      name: "Create your Wallets",
      text: "Go to the Wallets tab and add accounts like Cash, Bank, or Savings.",
    },
    {
      name: "Connect to transactions",
      text: "Select a Wallet when logging an expense to update its balance automatically.",
    },
    {
      name: "Manage money movement",
      text: "Use the Transfer feature to move funds between Wallets within the same Space.",
    },
  ],
  videoId: "8LSJN9ka6a8",
  content: `# How to Use Wallets in Moneko

Wallets let you track your actual money, balances, and net worth in Moneko.

Before, Moneko focused mainly on spending. Now, you can also see how much money you have across your wallets.

Use Wallets to track places where your money lives, such as:
- cash
- bank accounts
- savings
- travel funds

---

## How Spaces, Wallets, and Pockets Connect

Moneko has three layers:
- **Spaces** → different parts of your life
- **Wallets** → where your money lives
- **Pockets** → what you spend on

These layers work together to help you understand both your balance and your spending.

### Spaces
A Space is a separate area for a part of your life. It can be Personal, Couple, Trip, or Group. Each Space is independent.

### Wallets
Wallets live inside a Space. Each Space can have multiple wallets. If you share a Space, you also share the wallets inside it. Everyone in the shared Space sees the same balances and transactions.

### Currency
${productFacts.walletCurrencies.statement}

---

## How to Create a Wallet

To create a new wallet:

![Wallet Creation](/help/wallets/01.jpg)

1. Go to the **Wallets** tab.
2. Tap **+ New Wallet**.
3. Enter a wallet name.
4. Set an initial balance.
5. Choose an icon and color.
6. Optional: set a goal.
7. Tap **Save**.

### Expected Result
Your new wallet is created inside the current Space and can be used when logging transactions.

---

## What You Can Do with Wallets

### See Your Total Balance
At the top of the **Wallets** tab, you can see your total balance across all wallets, monthly trend, and total income and spending.

![Wallet Overview](/help/wallets/02.jpg)

### Use Wallets When Logging Transactions
When you log a transaction, you can select a wallet. Each transaction updates both your category and your wallet balance.

### Set a Default Wallet
You can set a wallet as your **Primary** wallet so it is selected automatically when logging.

---

## Transfer Between Wallets

You can move money between wallets with a transfer.

![Wallet Transfer](/help/wallets/03.jpg)

1. Go to the **Wallets** tab.
2. Tap **Transfer**.
3. Select **From** and **To**.
4. Enter the amount.
5. Optional: add a note.
6. Tap **Save**.

### Expected Result
The transfer updates the balances of both selected wallets.

---

## View Wallet Details
Tap a wallet to see more information, including its balance, recent transactions, and insights.

---

## Track Goals with Wallets
You can set a goal for a wallet. Progress updates automatically as money is added. This is useful for wallets like Savings or a Travel fund.

---

## How Wallets Work with Budgets

Wallets and Pockets work together, but they do different jobs:
- **Wallets** track where your money is.
- **Pockets** track what you spend on.

When you spend money:
1. Money comes from a wallet.
2. The transaction is categorized into a Pocket.

This keeps your balance and budget aligned.

---

## Troubleshooting Common Issues

### I Cannot Find My Wallet
Make sure you are in the correct Space. Wallets live inside Spaces, so a wallet created in one Space will not appear in another Space.

### My Wallet Balance Looks Wrong
Check whether the transaction was logged to the correct wallet, the initial balance was entered correctly, and transfers were saved correctly.

### My Wallet Shows a Negative Balance After Syncing
A negative wallet balance after syncing is usually because Moneko calculates the balance from the transactions Plaid imported, not from your full lifetime bank history.

Available connected-account history can differ by institution and account. If there was already money in the account before the available history, Moneko may not have enough records to explain the starting balance. Imported expenses can then make a Wallet appear negative.

To fix it, set the wallet's opening balance to the account balance from before the imported Plaid transaction period started.

### My Shared Space Wallets Are Visible to Other People
This is expected. If you share a Space, you also share the wallets inside it.

### I Want One Wallet Selected Automatically
Open the wallet and set it as **Primary**. It will be selected automatically when logging.
`,
};
