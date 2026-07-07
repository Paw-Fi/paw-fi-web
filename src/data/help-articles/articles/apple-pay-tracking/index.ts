import type { HelpArticle } from "../../types";

export const applePayTrackingArticle: HelpArticle = {
  id: "apple-pay-tracking",
  number: "2.4",
  slug: "automatically-track-apple-pay-transactions-moneko",
  title: "How to Automatically Track Apple Pay Transactions in Moneko",
  description:
    "Learn how to automatically track Apple Pay transactions in Moneko using iOS Shortcuts. Set up Wallet automation, map the amount and merchant, and log purchases automatically.",
  categoryId: "automation-planning",
  readTime: 6,
  keywords: [
    "automatically track Apple Pay transactions in Moneko",
    "Moneko Apple Pay integration",
    "Apple Pay expense tracking",
    "Apple Pay transaction tracker",
    "automatic Apple Pay logging",
    "Wallet automation Moneko",
    "iOS Shortcuts Apple Pay automation",
    "Capture Wallet Transaction Moneko",
    "track Apple Pay purchases",
  ],
  faqItems: [
    {
      question: "Can Moneko automatically track Apple Pay transactions?",
      answer: "Yes. Moneko can automatically track Apple Pay transactions using iOS Shortcuts automation.",
    },
    {
      question: "How do I set up Apple Pay transaction tracking in Moneko?",
      answer:
        "Open Moneko, go to Settings, tap Apple Pay Integration, then tap Start Setup and follow the Shortcuts automation steps.",
    },
    {
      question: "Do I need to manually enter Apple Pay transactions?",
      answer:
        "No. Once the automation is set up, Apple Pay purchases are logged automatically in Moneko.",
    },
    {
      question: "Does Moneko access my bank or card directly?",
      answer: "No. Moneko does not access your bank or card directly for this feature.",
    },
    {
      question: "How does Apple Pay tracking work in Moneko?",
      answer:
        "It works through iOS Shortcuts automation using a Wallet trigger and the Moneko Capture Wallet Transaction action.",
    },
    {
      question: "What action should I choose in Shortcuts?",
      answer: "Choose Capture Wallet Transaction from Moneko.",
    },
    {
      question: 'Why is the shortcut not asking me to map fields when I choose "Capture Wallet Transactions"?',
      answer: 'You need to tap Create New Shortcut first, then select Capture Wallet Transactions from the list. If you skip the "Create New Shortcut" step and try to add the action directly, the Shortcuts app may not prompt you to configure the required fields (merchant, amount, and date).',
    },
    {
      question: "What variables do I need to map?",
      answer: "Map: Amount to Shortcut Input → Amount, and Merchant to Shortcut Input → Merchant.",
    },
    {
      question: "Should I enable Run Immediately?",
      answer:
        "Yes. Open the automation again and turn on Run Immediately and disable Ask Before Running if prompted.",
    },
    {
      question: "Do I need to set this up every time?",
      answer: "No. Set it up once, and your Apple Pay purchases will be tracked automatically in Moneko.",
    },
  ],
  howToSteps: [
    {
      name: "Start Setup in Moneko",
      text: "Go to Settings → Apple Pay Integration and tap Start Setup.",
    },
    {
      name: "Create Personal Automation",
      text: "In the Shortcuts app, create a new automation with the Wallet trigger.",
    },
    {
      name: "Create New Shortcut",
      text: "Tap Create New Shortcut first, then choose Capture Wallet Transaction from the list.",
    },
    {
      name: "Add Moneko Action",
      text: "Search for Capture Wallet Transaction and map the Amount and Merchant variables.",
    },
    {
      name: "Enable Run Immediately",
      text: "Set the automation to Run Immediately so it logs without asking.",
    },
  ],
  content: `# How to Automatically Track Apple Pay Transactions in Moneko

You can automatically track your **Apple Pay transactions** in Moneko.

Once set up, every Apple Pay purchase shows up automatically.

No manual input.  
No extra friction.  
Just tap, pay, and it is logged.

This setup works through **iOS Shortcuts automation**.

---

## Before You Start

Make sure Moneko is updated to the latest version before setting up Apple Pay transaction tracking.

You will need to set up the automation once. After that, your Apple Pay purchases will be tracked automatically in Moneko.

---

## Step 1: Open Apple Pay Integration in Moneko

1. Open **Moneko**.
2. Go to **Settings**.
3. Tap **Apple Pay Integration**.
4. Tap **Start Setup**.

### Expected Result

Moneko opens the Apple Pay setup flow and guides you toward the Shortcuts automation setup.

---

## Step 2: Open Shortcuts

1. Tap **Open Shortcuts**.
2. Go to the **Automation** tab at the bottom.

### Expected Result

You are now in the Shortcuts app, ready to create the automation.

---

## Step 3: Create a Personal Automation

1. Tap the **+** button.
2. Select **Create Personal Automation**.
3. Choose **Wallet** as the trigger.
4. Tap **Next**.

### Expected Result

The automation is now set to run when a Wallet transaction happens.

---

## Step 4: Create New Shortcut

1. Tap **Create New Shortcut** first.
2. Then choose **Capture Wallet Transaction** from the list.

<img src="https://www.moneko.io/blogs/create-new-shortcut.jpeg" alt="Create New Shortcut screen in iOS Shortcuts app showing the step to tap Create New Shortcut before selecting Capture Wallet Transactions" class="w-full rounded-lg border border-border shadow-sm" />

### Expected Result

The shortcut workflow is initialized correctly and the Moneko action is ready to be configured.

---

## Step 5: Add the Moneko Action

1. Tap **Add Action**.
2. Search for **Moneko**.
3. Select **Capture Wallet Transaction**.

### Expected Result

The Moneko action is added to your automation.

---

## Step 6: Map the Transaction Amount

1. Tap **Amount**.
2. Select **Select Variable**.
3. Choose **Shortcut Input**.
4. Tap the variable again.
5. Select **Amount**.

### Expected Result

The Apple Pay transaction amount is connected to the Moneko action.

---

## Step 7: Map the Merchant Name

1. Tap **Merchant**.
2. Select **Select Variable**.
3. Choose **Shortcut Input**.
4. Tap the variable again.
5. Select **Merchant**.

### Expected Result

The Apple Pay merchant name is connected to the Moneko action.

---

## Step 8: Save and Enable the Automation

1. Tap the **check icon** to save.
2. Open the automation again.
3. Turn on **Run Immediately**.
4. Disable **Ask Before Running** if prompted.

### Expected Result

The automation is saved and allowed to run automatically.

---

## Step 9: Finish Setup

You are done.

Now every Apple Pay transaction will be logged automatically in Moneko.

### Expected Result

When you make a purchase with Apple Pay, Moneko captures the transaction automatically through the Shortcuts automation.

---

## Good to Know

### Your Data Stays Secure

Your data is stored securely and never shared.

### Moneko Does Not Access Your Bank or Card Directly

Moneko does not connect directly to your bank or card for this feature.

Apple Pay transaction tracking works using **iOS Shortcuts automation**.

### You Only Need to Set It Up Once

After the automation is created and enabled, your Apple Pay purchases will be tracked automatically in Moneko.

---

## Troubleshooting Common Issues

### I Cannot Find Apple Pay Integration in Moneko

Make sure you have updated Moneko to the latest version.

Then go to:

**Moneko → Settings → Apple Pay Integration**

### I Cannot Find the Automation Tab

Open the **Shortcuts** app and look for the **Automation** tab at the bottom.

### I Cannot Find Wallet as a Trigger

When creating a Personal Automation, choose **Wallet** as the trigger.

### I Cannot Find the Moneko Action

In Shortcuts, tap **Add Action**, then search for **Moneko**.

Choose **Capture Wallet Transaction**.

### My Transaction Amount Is Not Being Captured

Check that **Amount** is mapped correctly:

**Amount → Select Variable → Shortcut Input → Amount**

### My Merchant Name Is Not Being Captured

Check that **Merchant** is mapped correctly:

**Merchant → Select Variable → Shortcut Input → Merchant**

### The Automation Asks Before Running

Open the automation again and turn on **Run Immediately**.

If prompted, disable **Ask Before Running**.

### Apple Pay Transactions Are Not Logging Automatically

Check that:

- Moneko is updated to the latest version
- the Wallet automation was created
- you tapped **Create New Shortcut** before choosing the action
- the **Capture Wallet Transaction** action was added
- **Amount** is mapped to **Shortcut Input → Amount**
- **Merchant** is mapped to **Shortcut Input → Merchant**
- **Run Immediately** is turned on
- **Ask Before Running** is disabled if prompted

### The Shortcut Is Not Asking Me to Map Fields

You need to tap **Create New Shortcut** first, then select **Capture Wallet Transactions** from the list. If you skip the "Create New Shortcut" step and try to add the action directly, the Shortcuts app may not prompt you to configure the required fields (merchant, amount, and date). Starting with "Create New Shortcut" ensures the workflow is initialized correctly and the mapping step appears as expected.
`,
};
