export interface MonekoProductArea {
  id: string;
  question: string;
  directAnswer: string;
  details: string;
  examples: string[];
}

export interface MonekoComparisonRow {
  label: string;
  moneko: string;
  traditionalApps: string;
}

export interface MonekoCaptureMethod {
  label: string;
  answer: string;
}

export const monekoContentDates = {
  published: "2026-03-19",
  updated: "2026-04-24",
};

export const monekoContentByline = {
  name: "Moneko Product Team",
  credential:
    "Builders of Moneko's budgeting, wallet, household, and WhatsApp assistant workflows.",
};

export const monekoProductAreas: MonekoProductArea[] = [
  {
    id: "overview",
    question: "What does the Moneko Overview show?",
    directAnswer:
      "The Moneko Overview shows spending, cashflow, charts, recent activity, currency controls, and fast AI transaction capture in one home hub.",
    details:
      "Overview is designed for the daily check-in: see what changed, switch between Personal and Household mode, change currency, and start quick-add when you need to log something.",
    examples: [
      "Spending summary and net cashflow cards",
      "Recent activity and chart previews",
      "Personal or Household mode switching",
    ],
  },
  {
    id: "recurring",
    question: "How does Moneko handle recurring bills and income?",
    directAnswer:
      "Moneko tracks recurring expenses and income so predictable rent, subscriptions, utilities, salary, and stipends do not need to be re-entered every month.",
    details:
      "Recurring items support monthly planning, calendar views, and forecasting because fixed bills and income become part of the budget baseline.",
    examples: ["Rent", "Subscriptions", "Utilities", "Salary"],
  },
  {
    id: "pockets",
    question: "What are Moneko Pockets?",
    directAnswer:
      "Moneko Pockets are envelope-style budget containers that show how much is allocated, spent, and left for categories like groceries, eating out, transport, fun, and bills.",
    details:
      "A monthly budget can be split into pockets, copied from last month, adjusted during the month, and connected to category mapping for uncategorized spending.",
    examples: ["Groceries", "Transport", "Eating out", "Bills"],
  },
  {
    id: "wallets",
    question: "What does Moneko Wallets track?",
    directAnswer:
      "Moneko Wallets tracks accounts, balances, goals, transfers, income, spending, and net worth history across manual wallets and connected bank accounts where supported.",
    details:
      "Wallets is the net worth view. It can show assets minus liabilities, account stacks, wallet goals, month-by-month history, and transfers between accounts.",
    examples: ["Checking", "Savings", "Credit cards", "Joint accounts"],
  },
  {
    id: "insights",
    question: "What does Moneko Insights answer?",
    directAnswer:
      "Moneko Insights answers what is happening now and what could happen next through running balance views, spending trends, and AI scenario planning.",
    details:
      "Scenario planning lets you ask plain-language questions with a target date, then save useful answers for later review.",
    examples: [
      "Can I buy this by a date?",
      "What changed this month?",
      "Am I over budget?",
    ],
  },
  {
    id: "whatsapp",
    question: "What can the Moneko WhatsApp assistant do?",
    directAnswer:
      "The Moneko WhatsApp assistant can add transactions, read receipt photos, process voice notes, answer spending summaries, manage pockets, and send chart links or quick-reply buttons.",
    details:
      "WhatsApp support mirrors the core app workflow for people who want to budget from chat instead of opening the app for every update.",
    examples: [
      "Spent 12 on lunch",
      "Show today's spending",
      "How are my pockets doing?",
    ],
  },
  {
    id: "email-receipts",
    question: "Does Moneko support email receipt capture?",
    directAnswer:
      "Moneko supports email receipt capture so users can forward receipts or supported PDF, CSV, XLS, and XLSX attachments to files@inbound.moneko.io from approved sender addresses.",
    details:
      "In Profile Settings, users can enable email receipt capture, choose a default personal or household space, choose a wallet, approve sender addresses, and receive confirmation when processing is complete.",
    examples: [
      "Online shopping receipts",
      "Subscription invoices",
      "Travel bookings",
      "PDF, CSV, XLS, and XLSX attachments",
    ],
  },
];

export const monekoCaptureMethods: MonekoCaptureMethod[] = [
  {
    label: "Typed message",
    answer:
      'Type a short note such as "Coffee 4.50" and Moneko extracts amount, merchant, category, date, and expense or income direction.',
  },
  {
    label: "Receipt photo",
    answer:
      "Snap or send a receipt image and Moneko extracts the usable transaction details before you confirm what should be saved.",
  },
  {
    label: "Voice note",
    answer:
      "Record a spoken expense or income update and Moneko turns it into a reviewable transaction draft.",
  },
  {
    label: "Files and chat",
    answer:
      "Attach supported files, forward receipt emails, or use WhatsApp to log spending, request summaries, update pockets, and keep shared budgets current.",
  },
  {
    label: "Email receipt forwarding",
    answer:
      "Forward receipts or PDF, CSV, XLS, and XLSX attachments from approved senders to files@inbound.moneko.io so Moneko can extract the transaction and notify you when it is ready.",
  },
];

export const monekoComparisonRows: MonekoComparisonRow[] = [
  {
    label: "Getting transactions in",
    moneko:
      "Fast capture through text, receipt photos, voice notes, files, mobile alerts, and WhatsApp.",
    traditionalApps:
      "Often depends on manual entry, delayed bank import, or dashboard-first review.",
  },
  {
    label: "Budget structure",
    moneko:
      "Envelope-style Pockets connect daily spending to the monthly plan.",
    traditionalApps:
      "Envelope budgeting may be strong, but the setup and maintenance can feel heavier.",
  },
  {
    label: "Personal and household money",
    moneko:
      "Personal and Household modes keep solo spending separate from shared budgets and costs.",
    traditionalApps:
      "Shared access varies and often works as one shared workspace rather than mode-based context.",
  },
  {
    label: "Scenario planning",
    moneko:
      "AI Insights answer plain-language what-if questions and can save scenarios.",
    traditionalApps:
      "Planning is usually calculator-based, report-based, or manually modeled.",
  },
  {
    label: "Chat channel",
    moneko:
      "WhatsApp can log expenses, answer totals, update pockets, and send quick-reply choices.",
    traditionalApps:
      "Messaging-app budgeting is usually not part of the main product workflow.",
  },
  {
    label: "Email receipt capture",
    moneko:
      "Forward receipt emails and supported attachments from approved senders so online purchases can become budget entries.",
    traditionalApps:
      "Email-based capture is often missing, requires third-party workflows, or only works after manual import.",
  },
];
