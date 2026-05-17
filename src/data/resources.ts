export interface Resource {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  link: string;
  category: string;
  logoUrl?: string;
  tags?: string[];
}

export const resources: Resource[] = [
  {
    id: "kopivo",
    name: "Kopivo",
    description: "Kopivo is a multipurpose ecosystem of professional tools designed to handle everything from PDF and invoice management to media optimization and developer utilities, all working fast and directly in the browser.",
    longDescription: "Kopivo is a multipurpose ecosystem of professional tools designed to handle everything from PDF and invoice management to media optimization and developer utilities. The platform focuses on privacy and performance, ensuring all tools work fast and directly in your browser without uploading your sensitive data to servers.",
    link: "https://kopivo.com/",
    category: "Productivity",
    tags: ["PDF", "Invoices", "Media Optimization", "Developer Tools"],
  },
  {
    id: "liquify",
    name: "Liquify",
    description: "Liquify is a forward-looking budget planner built around envelopes—not expense tracking. Set your monthly income, assign money to bills, savings, and goals, and see what's safe to spend today without guilt or surprises.",
    longDescription: "Liquify is a forward-looking budget planner built around envelopes—not expense tracking. Set your monthly income, assign money to bills, savings, and goals, and see what's safe to spend today without guilt or surprises. The platform focuses on giving you permission to spend by showing you exactly what's available after all your obligations are covered.",
    link: "https://getliquify.com/",
    category: "Budgeting",
    tags: ["Envelope Budgeting", "Monthly Planning", "Permission to Spend", "Profiles"],
  },
  {
    id: "milbudget",
    name: "MilBudget",
    description: "MilBudget is a budgeting app specifically for U.S. military members and all of the pay issues/benefits that come with being a military member.",
    longDescription: "MilBudget is a budgeting app specifically designed for U.S. military members, addressing the unique pay structures, benefits, and financial challenges that come with military service. The app helps service members manage their finances with features tailored to military-specific compensation and benefits.",
    link: "https://milbudget.app",
    category: "Budgeting",
    tags: ["Military", "Budgeting", "Benefits", "Pay Management"],
  },
];
