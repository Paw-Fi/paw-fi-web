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
  healthcare: "#14B8A6",
  fitness: "#14B8A6",
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
  refund: "#10B981",
  gift: "#34D399",
  gifts: "#34D399",
  rental: "#059669",
  freelance: "#10B981",
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

/**
 * Smart category normalization with robust fallback handling
 * Maps various category inputs to standardized categories with intelligent matching
 */
export function normalizeCategory(raw: string | null): string {
  if (!raw) return "other";
  
  const normalized = raw.trim().toLowerCase();
  
  // Direct match first
  if (ALLOWED_CATEGORIES.has(normalized)) {
    return normalized;
  }
  
  // Smart matching for common variations and typos
  const categoryMappings: Record<string, string> = {
    // Food & Dining
    "restaurant": "restaurants",
    "dining": "restaurants", 
    "cafe": "restaurants",
    "coffee": "food",
    "takeout": "food",
    "delivery": "food",
    
    // Transportation
    "uber": "transport",
    "lyft": "transport", 
    "taxi": "transport",
    "gas": "transport",
    "fuel": "transport",
    "parking": "transport",
    "car": "transport",
    
    // Health & Fitness
    "gym": "gym",
    "fitness": "gym",
    "workout": "gym",
    "health club": "gym",
    "gym membership": "gym membership",
    "yoga": "gym",
    "pilates": "gym",
    "doctor": "healthcare",
    "hospital": "healthcare",
    "pharmacy": "healthcare",
    "medicine": "healthcare",
    
    // Shopping
    "clothes": "shopping",
    "clothing": "shopping",
    "electronics": "shopping",
    "amazon": "shopping",
    "retail": "shopping",
    
    // Housing
    "rent": "rent",
    "mortgage": "mortgage",
    "apartment": "housing",
    "home": "housing",
    "maintenance": "housing",
    
    // Utilities
    "electric": "utilities",
    "water": "utilities",
    "gas bill": "utilities",
    "internet": "utilities",
    "phone": "utilities",
    "mobile": "utilities",
    
    // Entertainment
    "movies": "entertainment",
    "cinema": "entertainment",
    "streaming": "entertainment",
    "netflix": "entertainment",
    "spotify": "entertainment",
    "games": "entertainment",
    
    // Education
    "school": "education",
    "course": "education",
    "books": "education",
    "learning": "education",
    
    // Financial
    "bank": "fees",
    "atm": "fees",
    "interest": "fees",
    "credit card": "fees",
    
    // Travel
    "hotel": "travel",
    "airbnb": "travel",
    "flight": "flights",
    "airline": "flights",
    
    // Income (map common words to canonical income categories)
    "payroll": "salary",
    "wage": "salary",
    "wages": "salary",
    "tip": "income",
    "tips": "income",
    "dividend": "investment",
    "dividends": "investment",
    "refund": "refund",
    "chargeback": "refund",
    "gift": "gift",
    "present": "gift",
    "rental": "rental",
    "rent income": "rental",
    "freelance": "freelance",
    "contract": "freelance",
    "contracting": "freelance",
    
    // Personal Care
    "haircut": "personal care",
    "salon": "personal care",
    "spa": "personal care",
    
    // Common typos and variations
    "grocery": "groceries",
    "utilties": "utilities",
    "entertainement": "entertainment",
    "transportation": "transport",
    "helathcare": "healthcare",
    "fitnes": "fitness",
  };
  
  // Check smart mappings
  if (categoryMappings[normalized]) {
    return categoryMappings[normalized];
  }
  
  // Partial matching for compound categories
  for (const [pattern, target] of Object.entries(categoryMappings)) {
    if (normalized.includes(pattern) || pattern.includes(normalized)) {
      return target;
    }
  }
  
  // Fallback: check if any allowed category is a substring
  for (const allowedCategory of ALLOWED_CATEGORIES) {
    if (normalized.includes(allowedCategory) || allowedCategory.includes(normalized)) {
      return allowedCategory;
    }
  }
  
  // Final fallback to "other"
  console.warn(`[normalizeCategory] Unknown category "${raw}" mapped to "other"`);
  return "other";
}

/**
 * Validates if a category is supported, returns fallback if not
 */
export function validateCategory(category: string): string {
  return normalizeCategory(category);
}

/**
 * Gets all available categories for UI/selection purposes
 */
export function getAllCategories(): string[] {
  return Array.from(ALLOWED_CATEGORIES).sort();
}

// Income-only canonical categories used for prompts and UI guidance
export const INCOME_CATEGORIES = [
  'salary',
  'freelance',
  'investment',
  'refund',
  'gift',
  'bonus',
  'rental',
  'other',
] as const;

export function getIncomeCategories(): string[] {
  return [...INCOME_CATEGORIES];
}

// Expense-only canonical categories (excludes income-focused categories and umbrella 'income')
export function getExpenseCategories(): string[] {
  const incomeCategories = [...INCOME_CATEGORIES, 'income'];
  return Array.from(ALLOWED_CATEGORIES)
    .filter((category: string) => incomeCategories.indexOf(category) === -1)
    .sort();
}

/**
 * Checks if a category exists in the allowed categories
 */
export function isCategoryAllowed(category: string): boolean {
  return ALLOWED_CATEGORIES.has(category.trim().toLowerCase());
}
