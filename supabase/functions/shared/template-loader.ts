// Template loader for dashboard templates
import { dashboardTemplate1, dashboardTemplate2, dashboardTemplate3, dashboardTemplate4, dashboardTemplate5 } from "./dashboard-templates/template.ts";
export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category?: string;
}

// Available templates
export const templates: Record<string, { info: TemplateInfo; widgets: any[] }> = {
  "1": {
    info: {
      id: "1",
      name: "Financial Overview",
      description: "A high-level summary of your key metrics, financial health, and immediate actions.",
      category: "Finance"
    },
    widgets: dashboardTemplate1
  },
  "2": {
    info: {
      id: "2",
      name: "Goals & Future Planning",
      description: "Focus on long-term goals like retirement, major savings, and debt reduction.",
      category: "Planning"
    },
    widgets: dashboardTemplate2
  },
  "3": {
    info: {
      id: "3",
      name: "Spending Deep Dive",
      description: "Analyze your expenses, cash flow, and budgeting in detail.",
      category: "Budgeting"
    },
    widgets: dashboardTemplate3
  },
  "4": {
    info: {
      id: "4",
      name: "Assets & Protection",
      description: "Track your investments, insurance coverage, and employment benefits.",
      category: "Assets"
    },
    widgets: dashboardTemplate4
  },
  "5": {
    info: {
      id: "5",
      name: "Action Center",
      description: "A dashboard to manage your financial tasks, priorities, and personal goals.",
      category: "Productivity"
    },
    widgets: dashboardTemplate5
  }
};

/**
 * Get all available templates
 * @returns Array of template info objects
 */
export function getAllTemplates(): TemplateInfo[] {
  return Object.values(templates).map(template => template.info);
}

/**
 * Get a specific template by ID
 * @param templateId Template ID
 * @returns Template info and widgets, or null if not found
 */
export function getTemplateById(templateId: string): { info: TemplateInfo; widgets: any[] } | null {
  return templates[templateId] || null;
}
