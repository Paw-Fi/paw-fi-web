// Template loader for dashboard templates
import { dashboardTemplate1 } from "./dashboard-templates/template1.ts";
import { dashboardTemplate2 } from "./dashboard-templates/template2.ts";
import { dashboardTemplate3 } from "./dashboard-templates/template3.ts";

// Template metadata
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
      name: "Financial Focus",
      description: "A dashboard focused on financial health and action items",
      category: "finance"
    },
    widgets: dashboardTemplate1
  },
  "2": {
    info: {
      id: "2",
      name: "Personal Goals",
      description: "Track your personal goals and financial metrics",
      category: "personal"
    },
    widgets: dashboardTemplate2
  },
  "3": {
    info: {
      id: "3",
      name: "Long-term Planning",
      description: "Focus on retirement, savings goals, and insurance",
      category: "planning"
    },
    widgets: dashboardTemplate3
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
