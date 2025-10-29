export const CATEGORY_COLOR_MAP: Record<string, string> = {
  transfers: "#8B5CF6",
  shopping: "#EC4899",
  utilities: "#3B82F6",
  entertainment: "#F59E0B",
  restaurants: "#10B981",
  food: "#F97316",
  groceries: "#06B6D4",
  transport: "#EF4444",
  transportation: "#EF4444",
  health: "#14B8A6",
  medical: "#0EA5E9",
  text: "#22D3EE",
  education: "#A855F7",
  tuition: "#A855F7",
  subscriptions: "#6366F1",
  services: "#6366F1",
  housing: "#3B82F6",
  rent: "#2563EB",
  mortgage: "#1D4ED8",
  bills: "#1E293B",
  insurance: "#0284C7",
  savings: "#34D399",
  investment: "#22C55E",
  investments: "#22C55E",
  income: "#16A34A",
  salary: "#15803D",
  bonus: "#0F766E",
  travel: "#0EA5E9",
  flights: "#0284C7",
  vacation: "#0EA5E9",
  pets: "#F472B6",
  kids: "#FB7185",
  family: "#F97316",
  gifts: "#FACC15",
  charity: "#14B8A6",
  fees: "#6B7280",
  loan: "#1E3A8A",
  loans: "#1E3A8A",
  debt: "#1F2937",
  "personal care": "#F472B6",
  beauty: "#DB2777",
  entertainment_subscriptions: "#6366F1",
  misc: "#9CA3AF",
  uncategorized: "#9CA3AF",
  other: "#9CA3AF",
};

export const ALLOWED_CATEGORIES = new Set<string>(Object.keys(CATEGORY_COLOR_MAP));

const FALLBACK_COLOR = CATEGORY_COLOR_MAP.other ?? "#9CA3AF";

export function resolveCategoryColor(category: string): string {
  const key = category.trim().toLowerCase();
  return CATEGORY_COLOR_MAP[key] ?? FALLBACK_COLOR;
}
