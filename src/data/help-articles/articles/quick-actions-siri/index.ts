import type { HelpArticle } from "../../types";

export const quickActionsSiriArticle: HelpArticle = {
  id: "quick-actions-siri",
  number: "2.6",
  slug: "quick-actions-siri-shortcuts-moneko",
  title: "How to Use Quick Actions and Siri Shortcuts in Moneko",
  description:
    "Learn how to log expenses faster in Moneko using Press & Hold Quick Action and Siri Shortcuts. Open voice, receipt photo, or quick text logging with fewer steps.",
  categoryId: "logging-expenses",
  readTime: 3,
  keywords: [
    "Moneko quick actions and Siri Shortcuts",
    "Moneko quick action",
    "press and hold quick action",
    "Moneko Siri Shortcut",
    "log expense with Siri",
    "quick text expense",
    "voice expense logging",
    "receipt photo shortcut",
    "log expenses without opening app",
  ],
  faqItems: [
    {
      question: "What is Press & Hold Quick Action in Moneko?",
      answer:
        "Press & Hold Quick Action lets you choose what happens when you press and hold the + button.",
    },
    {
      question: "What quick action options can I choose?",
      answer: "You can choose Voice, Receipt photo, or Quick text.",
    },
    {
      question: "How do I set a quick action in Moneko?",
      answer:
        "Open Moneko, tap the top right three dots, go to Settings, tap Press and hold quick action, then select your preferred option.",
    },
    {
      question: "How do I use the quick action?",
      answer:
        "Press and hold the + button. Moneko will open directly in your selected logging mode.",
    },
    {
      question: "Can I log expenses with Siri?",
      answer:
        "Yes. Add Log Expense from Moneko in the Shortcuts app, then say “Hey Siri, log expense.”",
    },
    {
      question: "How do I set up the Moneko Siri Shortcut?",
      answer: "Open the Shortcuts app, tap the + button, search for Moneko, then add Log Expense.",
    },
    {
      question: "Can I run the shortcut from the Home Screen?",
      answer: "Yes. After setup, you can add the shortcut to your Home Screen.",
    },
    {
      question: "Can I log expenses from the lock screen?",
      answer: "Yes. After setting up the Siri Shortcut, you can use it from the lock screen.",
    },
    {
      question: "Do I need to open Moneko to use Siri Shortcuts?",
      answer:
        "No. Siri Shortcuts let you start expense logging without opening Moneko manually.",
    },
  ],
  howToSteps: [
    {
      name: "Configure Quick Action",
      text: "Go to Settings → Press and hold quick action and choose your shortcut.",
    },
    {
      name: "Add Siri Shortcut",
      text: "In the iOS Shortcuts app, search for Moneko and add the Log Expense action.",
    },
    {
      name: "Log instantly",
      text: "Press and hold the + button or use Siri to add expenses without extra steps.",
    },
  ],
  content: `# How to Use Quick Actions and Siri Shortcuts in Moneko

You can speed up how you log expenses in Moneko with **Quick Actions** and **Siri Shortcuts**.

These features reduce extra taps, so logging feels faster and more natural.

Use them when you want to:
- start voice logging faster
- open receipt photo logging quickly
- jump straight into quick text entry
- log expenses without opening Moneko

---

## Press & Hold Quick Action

The **Press & Hold Quick Action** lets you choose what happens when you press and hold the **+** button.

![Quick Action Settings](/help/quick-actions-siri/01.png)

Instead of tapping through extra steps, Moneko opens directly in your selected logging mode.

You can choose:

- **Voice**
- **Receipt photo**
- **Quick text**

---

## How to Set Your Default Quick Action

To choose what happens when you press and hold the **+** button:

1. Open **Moneko**.
2. Tap the **top right three dots**.
3. Go to **Settings**.
4. Tap **Press and hold quick action**.
5. Select your preferred option.

### Expected Result

Your selected action becomes the default for pressing and holding the **+** button.

---

## How to Use Press & Hold Quick Action

After setup:

1. Press and hold the **+** button.
2. Moneko opens directly in your selected logging mode.

No extra taps needed.

### Example

If you choose **Receipt photo**, pressing and holding the **+** button opens receipt photo logging directly.

---

## Siri Shortcuts

**Siri Shortcuts** let you log expenses without opening Moneko.

![Siri Shortcuts Setup](/help/quick-actions-siri/02.png)

This is useful when you want to log something quickly while walking, paying, or using your phone from the lock screen.

---

## How to Set Up a Siri Shortcut for Moneko

To set up the shortcut:

1. Open the **Shortcuts** app.
2. Tap the **+** button.
3. Search for **Moneko**.
4. Add **Log Expense**.

### Expected Result

The **Log Expense** shortcut is added to your Shortcuts app.

---

## How to Use the Moneko Siri Shortcut

After setup, you can:

![Using Siri Shortcut](/help/quick-actions-siri/03.png)

- run it from the **Shortcuts** app
- add it to your **Home Screen**
- say **“Hey Siri, log expense”**
- use it from the **lock screen**

### Expected Result

Moneko starts the expense logging flow without requiring you to open the app manually.

---

## Troubleshooting Common Issues

### Press and Hold Does Not Open My Preferred Mode

Check your selected quick action:

**Moneko → top right three dots → Settings → Press and hold quick action**

Then select your preferred option again.

### I Cannot Find Press and Hold Quick Action

Open Moneko, tap the **top right three dots**, go to **Settings**, then look for **Press and hold quick action**.

### I Cannot Find Moneko in the Shortcuts App

Open the **Shortcuts** app, tap the **+** button, then search for **Moneko**.

### Siri Does Not Start Expense Logging

Check that **Log Expense** has been added in the Shortcuts app.

Then try saying:

- “Hey Siri, log expense”

### I Want to Log from the Lock Screen

Set up **Log Expense** in the Shortcuts app first.

After setup, you can use it from the lock screen.

![Lock Screen Access](/help/quick-actions-siri/04.png)
`,
};
