import type { HelpArticle } from "../../types";

export const iosWidgetsArticle: HelpArticle = {
  id: "ios-widgets",
  number: "2.7",
  slug: "ios-home-screen-widgets",
  title: "How to Add Moneko Widgets to Your iOS Home Screen",
  description:
    "Learn how to add Moneko widgets to your iOS home screen to view your budget envelopes, spending progress, and top categories at a glance. Widgets display data for your selected Space in a configurable currency (defaults to USD).",
  categoryId: "getting-started",
  readTime: 3,
  keywords: [
    "Moneko iOS widgets",
    "home screen widgets",
    "add widget iOS",
    "Moneko widget setup",
    "iOS home screen customization",
    "budget widget",
    "spending widget",
    "financial insights widget",
  ],
  faqItems: [
    {
      question: "What are Moneko iOS widgets?",
      answer:
        "Moneko widgets are home screen widgets that display your financial data directly on your iOS home screen without opening the app.",
    },
    {
      question: "What data do Moneko widgets show?",
      answer:
        "Moneko widgets show your spending totals, remaining budget, budget progress, and either your budget envelopes (Pockets) or top spending categories depending on the widget type you choose.",
    },
    {
      question: "How do I add a Moneko widget to my home screen?",
      answer:
        "Press and hold on an empty area of your home screen, tap the + button in the top left corner, search for Moneko, select either Budget Envelopes or Top Categories widget, choose the size and position, then configure which Space to display.",
    },
    {
      question: "What widget sizes are available?",
      answer:
        "Moneko widgets come in different sizes (small, medium, large) for home screen, plus lock screen widgets (circular and rectangular) for quick access from your lock screen.",
    },
    {
      question: "Do widgets use my selected currency?",
      answer:
        "Yes, all Moneko widgets use the same currency you have selected in the Moneko app settings. The currency cannot be changed through the widget itself.",
    },
    {
      question: "Do I need to open the app to see widget data?",
      answer:
        "No, widgets display your data directly on the home screen. However, they may need to refresh periodically to show the latest information.",
    },
    {
      question: "Can I have multiple Moneko widgets?",
      answer:
        "Yes, you can add multiple Moneko widgets showing different types of data, different Spaces, or different sizes to your home screen and lock screen.",
    },
    {
      question: "How do I remove a Moneko widget?",
      answer:
        "Press and hold on the widget, then tap Remove Widget from the menu that appears.",
    },
  ],
  howToSteps: [
    {
      name: "Enter Edit Mode",
      text: "Press and hold on an empty area of your iOS home screen until the apps start jiggling.",
    },
    {
      name: "Add Widget",
      text: "Tap the + button in the top left corner of the screen.",
    },
    {
      name: "Select Moneko",
      text: "Search for Moneko in the widget gallery and select it.",
    },
    {
      name: "Choose Widget",
      text: "Swipe to choose the Moneko widget type and size you want to add.",
    },
    {
      name: "Position Widget",
      text: "Drag the widget to your desired location on the home screen, then tap Done.",
    },
  ],
  content: `# How to Add Moneko Widgets to Your iOS Home Screen

Moneko widgets let you view your financial data directly on your iOS home screen without opening the app.

Widgets display your spending, budget progress, and financial insights at a glance, making it easy to stay on top of your finances throughout the day.

Use widgets when you want to:
- check your spending without opening the app
- see budget progress at a glance
- monitor category breakdowns
- get quick financial insights

---

## What Are Moneko Widgets?

Moneko widgets are home screen widgets that display your financial data in real-time.

![Moneko Widgets on Home Screen](/help/ios-widgets/01.png)

Moneko offers two widget types:

**Budget Envelopes Widget**
Shows your budget envelopes (Pockets) with individual progress tracking.

**Top Categories Widget**
Shows your spending breakdown by category with visual bar charts.

All widgets use the currency you have selected in the Moneko app settings.

---

## How to Add a Moneko Widget

To add a Moneko widget to your iOS home screen:

1. **Press and hold** on an empty area of your home screen until the apps start jiggling
2. Tap the **+ button** in the top left corner
3. Search for **Moneko** in the widget gallery
4. **Swipe** to choose the widget type (Budget Envelopes or Top Categories) and size you want
5. Tap **Add Widget**
6. **Configure** which Space to display (Personal or Household)
7. **Drag** the widget to your desired position
8. Tap **Done** in the top right corner

### Expected Result

The Moneko widget appears on your home screen. If you see "Long press to edit", long-press the widget and configure the Space setting.

---

## Choosing Widget Size

Moneko widgets come in different sizes:

- **Small** - Shows spent amount with progress bar and quick action buttons
- **Medium** - Shows spent, remaining budget, progress, and action buttons (Add/Scan)
- **Large (Budget Envelopes)** - Shows spent, remaining, progress, and list of budget envelopes with individual progress
- **Large (Top Categories)** - Shows spending with vertical bar chart of top categories

Swipe left and right in the widget gallery to preview different sizes before adding.

### Expected Result

Choose the size that fits your home screen layout and shows the amount of information you need.

---

## Positioning Your Widget

After adding a widget:

1. **Press and hold** the widget until it starts jiggling
2. **Drag** it to your desired position
3. You can also **drag it to another home screen page**
4. Tap **Done** when satisfied with the position

### Expected Result

The widget is positioned where you want it on your home screen.

---

## Multiple Widgets

You can add multiple Moneko widgets to show different types of data:

- Add a Budget Envelopes widget to track your budget progress
- Add a Top Categories widget to see spending breakdowns
- Add widgets for different Spaces (Personal vs Household)
- Mix different sizes to fit your home screen layout

Each widget can be customized independently with its own Space setting.

---

## Currency Display

All Moneko widgets automatically use the currency you have selected in the Moneko app:

- Open **Moneko**
- Check your **Currency** preference on top right corner
- All widgets will display amounts in this currency

### Expected Result

Your widgets show consistent currency formatting with the rest of the app.

---

## Removing a Widget

To remove a Moneko widget from your home screen:

1. **Press and hold** the widget
2. Tap **Remove Widget** from the menu
3. Confirm removal if prompted

### Expected Result

The widget is removed from your home screen. This does not delete any data from Moneko.

---

## Troubleshooting Common Issues

### Widget Shows "Long press to edit"

This means the widget needs Space configuration:

- Long-press the widget
- Select **Edit Widget**
- Choose which Space to display (Personal or Household)

### Widget Shows No Data

If your widget shows no data or outdated information:

- Ensure you have configured the Space setting
- Ensure you have an active internet connection
- Open the Moneko app to trigger a data refresh
- Wait a few moments for the widget to update

### Widget Uses Wrong Currency

If your widget shows the wrong currency, change it in the Moneko app:

- Open **Moneko**
- Go to **Settings**
- Select your preferred **Currency**
- The widget will automatically update to use the new currency

### Cannot Find Moneko in Widget Gallery

Make sure you have the latest version of Moneko installed from the App Store.

Older versions may not include widget support.

### Widget Takes Up Too Much Space

Try a smaller widget size:

- Remove the current widget
- Add it again and choose a smaller size (small or medium instead of large)

### Widget Not Updating

Widgets update periodically. For immediate updates:

- Open the Moneko app
- Navigate to any screen
- Return to the home screen
- The widget should refresh with latest data

---

## Lock Screen Widgets

Moneko also offers lock screen widgets for quick access without unlocking your phone:

- **Circular** - Shows a quick add button for logging expenses
- **Rectangular** - Shows a "Scan Receipt" button for quick receipt capture

Lock screen widgets are perfect for quickly logging expenses while on the go.

### How to Add Lock Screen Widgets

1. **Press and hold** on your lock screen until the customize options appear
2. Tap **Customize** at the bottom
3. Tap the **+** or lock screen widgets area
4. Search for **Moneko**
5. Select the circular or rectangular widget
6. Tap **Done**

### Expected Result

The Moneko lock screen widget appears and provides quick access to expense logging.
`,
};
