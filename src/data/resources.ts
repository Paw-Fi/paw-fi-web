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
];
