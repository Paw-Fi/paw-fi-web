// Source of truth matches mobile category_constants.dart

const LIFE_AND_HOME = [
  "groceries",
  "food & drinks",
  "restaurants",
  "takeout & delivery",
  "coffee & tea",
  "snacks",
  "household supplies",
  "cleaning supplies",
  "home repairs",
  "home services",
  "furniture",
  "appliances",
  "home decor",
  "rent",
  "mortgage",
  "electricity",
  "water",
  "heating & gas",
  "internet",
  "phone bill",
  "trash & recycling",
  "home security",
  "laundry / dry cleaning",
  "moving costs",
  "storage",
  "clothing & shoes",
];

const TRAVEL_AND_TRANSPORT = [
  "public transport",
  "taxi & ride apps",
  "fuel / gas",
  "parking",
  "tolls",
  "car repairs",
  "car insurance",
  "car parts",
  "car rental",
  "bike / scooter",
  "travel",
  "flights",
  "hotels",
  "travel insurance",
  "travel activities",
  "luggage & travel gear",
  "passport & visa fees",
];

const HEALTH_AND_WELLNESS = [
  "medical care",
  "pharmacy",
  "dental care",
  "eye care",
  "mental health",
  "therapy",
  "fitness & gym",
  "sports & exercise",
  "supplements",
  "personal care",
  "beauty & cosmetics",
  "spa & massage",
];

const KIDS = [
  "childcare",
  "school supplies",
  "kids activities",
  "kids clothing",
  "toys & games",
  "baby supplies",
];

const PETS = [
  "pet food",
  "pet treats",
  "vet visits",
  "pet medicine",
  "pet grooming",
  "pet supplies",
  "pet insurance",
  "pet boarding / sitting",
];

const WORK_AND_LEARNING = [
  "work supplies",
  "home office",
  "software tools",
  "cloud storage",
  "courses & classes",
  "books & study materials",
  "exams & certificates",
  "coworking space",
  "professional services",
  "business expenses",
  "ads & marketing",
  "licensing & fees",
];

const FUN_AND_SOCIAL = [
  "movies & shows",
  "music & streaming",
  "games & apps",
  "hobbies",
  "crafts & art",
  "sports clubs",
  "concerts & events",
  "bars & drinks",
  "dating",
  "parties & hosting",
  "gifts",
  "charity",
  "collectibles",
];

const MONEY_IN_OUT = [
  "income",
  "salary",
  "bonus",
  "tips",
  "freelance income",
  "rental income",
  "interest income",
  "cashback",
  "pension",
  "refunds",
  "transfers",
  "savings",
  "investments",
  "loan payments",
  "debt payments",
  "bank fees",
  "taxes",
  "fines",
];

const COMMUNITY_AND_SERVICES = [
  "government services",
  "post & delivery",
  "religious & spiritual",
  "community events",
  "environmental / green",
];

const MISC = ["miscellaneous", "other", "uncategorized"];

const LIFE_AND_HOME_PALETTE = [
  "#1D4ED8",
  "#2563EB",
  "#3B82F6",
  "#60A5FA",
  "#93C5FD",
];

const TRAVEL_AND_TRANSPORT_PALETTE = [
  "#C2410C",
  "#EA580C",
  "#F97316",
  "#FFA94D",
  "#FFC78A",
];

const HEALTH_AND_WELLNESS_PALETTE = [
  "#0F766E",
  "#10B981",
  "#34D399",
  "#4ADE80",
  "#A7F3D0",
];

const KIDS_PALETTE = ["#BE123C", "#F43F5E", "#FB7185", "#FDA4AF", "#FECDD3"];

const PETS_PALETTE = ["#D97706", "#F59E0B", "#FBBF24", "#FCD34D", "#FDE68A"];

const WORK_AND_LEARNING_PALETTE = [
  "#312E81",
  "#4338CA",
  "#4F46E5",
  "#6366F1",
  "#A5B4FC",
];

const FUN_AND_SOCIAL_PALETTE = [
  "#9D174D",
  "#C026D3",
  "#E879F9",
  "#F472B6",
  "#F9A8D4",
];

const MONEY_IN_OUT_PALETTE = [
  "#166534",
  "#15803D",
  "#16A34A",
  "#22C55E",
  "#4ADE80",
];

const COMMUNITY_AND_SERVICES_PALETTE = [
  "#0F172A",
  "#1F2937",
  "#334155",
  "#475569",
  "#94A3B8",
];

const MISC_PALETTE = ["#6B7280", "#9CA3AF", "#D1D5DB"];

function buildGroupColorMap(
  categories: string[],
  palette: string[],
): Record<string, string> {
  return categories.reduce(
    (acc, category, index) => {
      acc[category] = palette[index % palette.length];
      return acc;
    },
    {} as Record<string, string>,
  );
}

export const CATEGORY_COLOR_MAP: Record<string, string> = {
  ...buildGroupColorMap(LIFE_AND_HOME, LIFE_AND_HOME_PALETTE),
  ...buildGroupColorMap(TRAVEL_AND_TRANSPORT, TRAVEL_AND_TRANSPORT_PALETTE),
  ...buildGroupColorMap(HEALTH_AND_WELLNESS, HEALTH_AND_WELLNESS_PALETTE),
  ...buildGroupColorMap(KIDS, KIDS_PALETTE),
  ...buildGroupColorMap(PETS, PETS_PALETTE),
  ...buildGroupColorMap(WORK_AND_LEARNING, WORK_AND_LEARNING_PALETTE),
  ...buildGroupColorMap(FUN_AND_SOCIAL, FUN_AND_SOCIAL_PALETTE),
  ...buildGroupColorMap(MONEY_IN_OUT, MONEY_IN_OUT_PALETTE),
  ...buildGroupColorMap(COMMUNITY_AND_SERVICES, COMMUNITY_AND_SERVICES_PALETTE),
  ...buildGroupColorMap(MISC, MISC_PALETTE),
};

export const ALLOWED_CATEGORIES = new Set<string>(
  Object.keys(CATEGORY_COLOR_MAP),
);

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

  if (normalized == "default" || normalized == "unknown") {
    return "other";
  }

  // Direct match - category is already in our allowed list
  if (ALLOWED_CATEGORIES.has(normalized)) {
    return normalized;
  }

  // Debug: Log what we're trying to match (only for first few unknown categories)
  // console.log(`[normalizeCategory] Checking: "${normalized}" (original: "${raw}")`);
  // console.log(`[normalizeCategory] ALLOWED_CATEGORIES size: ${ALLOWED_CATEGORIES.size}`);

  // Plaid detailed category codes mapping to our plain-language categories
  const plaidMappings: Record<string, string> = {
    // Income
    income_dividends: "investments",
    income_interest_earned: "interest income",
    income_retirement_pension: "pension",
    income_tax_refund: "refunds",
    income_unemployment: "income",
    income_wages: "salary",
    income_other_income: "income",

    // Transfers
    transfer_in_cash_advances_and_loans: "loan payments",
    transfer_in_deposit: "transfers",
    transfer_in_investment_and_retirement_funds: "investments",
    transfer_in_savings: "savings",
    transfer_in_account_transfer: "transfers",
    transfer_in_other_transfer_in: "transfers",
    transfer_out_investment_and_retirement_funds: "investments",
    transfer_out_savings: "savings",
    transfer_out_withdrawal: "transfers",
    transfer_out_account_transfer: "transfers",
    transfer_out_other_transfer_out: "transfers",

    // Loan payments
    loan_payments_car_payment: "loan payments",
    loan_payments_credit_card_payment: "debt payments",
    loan_payments_personal_loan_payment: "loan payments",
    loan_payments_mortgage_payment: "mortgage",
    loan_payments_student_loan_payment: "loan payments",
    loan_payments_other_payment: "loan payments",

    // Bank fees
    bank_fees_atm_fees: "bank fees",
    bank_fees_foreign_transaction_fees: "bank fees",
    bank_fees_insufficient_funds: "bank fees",
    bank_fees_interest_charge: "bank fees",
    bank_fees_overdraft_fees: "bank fees",
    bank_fees_other_bank_fees: "bank fees",

    // Entertainment & fun
    entertainment_casinos_and_gambling: "games & apps",
    entertainment_music_and_audio: "music & streaming",
    entertainment_sporting_events_amusement_parks_and_museums:
      "concerts & events",
    entertainment_tv_and_movies: "movies & shows",
    entertainment_video_games: "games & apps",
    entertainment_other_entertainment: "hobbies",

    // Food & drink
    food_and_drink_beer_wine_and_liquor: "bars & drinks",
    food_and_drink_coffee: "coffee & tea",
    food_and_drink_fast_food: "takeout & delivery",
    food_and_drink_groceries: "groceries",
    food_and_drink_restaurant: "restaurants",
    food_and_drink_vending_machines: "snacks",
    food_and_drink_other_food_and_drink: "food & drinks",

    // General merchandise / shopping
    general_merchandise_bookstores_and_newsstands: "books & study materials",
    general_merchandise_clothing_and_accessories: "clothing & shoes",
    general_merchandise_convenience_stores: "snacks",
    general_merchandise_department_stores: "miscellaneous",
    general_merchandise_discount_stores: "miscellaneous",
    general_merchandise_electronics: "appliances",
    general_merchandise_gifts_and_novelties: "gifts",
    general_merchandise_office_supplies: "work supplies",
    general_merchandise_online_marketplaces: "miscellaneous",
    general_merchandise_pet_supplies: "pet supplies",
    general_merchandise_sporting_goods: "sports & exercise",
    general_merchandise_superstores: "miscellaneous",
    general_merchandise_tobacco_and_vape: "miscellaneous",
    general_merchandise_other_general_merchandise: "miscellaneous",

    // Home improvement
    home_improvement_furniture: "furniture",
    home_improvement_hardware: "home repairs",
    home_improvement_repair_and_maintenance: "home repairs",
    home_improvement_security: "home security",
    home_improvement_other_home_improvement: "home services",

    // Medical & wellness
    medical_dental_care: "dental care",
    medical_eye_care: "eye care",
    medical_nursing_care: "medical care",
    medical_pharmacies_and_supplements: "pharmacy",
    medical_primary_care: "medical care",
    medical_veterinary_services: "vet visits",
    medical_other_medical: "medical care",

    // Personal care
    personal_care_gyms_and_fitness_centers: "fitness & gym",
    personal_care_hair_and_beauty: "beauty & cosmetics",
    personal_care_laundry_and_dry_cleaning: "laundry / dry cleaning",
    personal_care_other_personal_care: "personal care",

    // General services
    general_services_accounting_and_financial_planning: "professional services",
    general_services_automotive: "car repairs",
    general_services_childcare: "childcare",
    general_services_consulting_and_legal: "professional services",
    general_services_education: "courses & classes",
    general_services_insurance: "insurance",
    general_services_postage_and_shipping: "post & delivery",
    general_services_storage: "storage",
    general_services_other_general_services: "professional services",

    // Government & non-profit
    government_and_non_profit_donations: "charity",
    government_and_non_profit_government_departments_and_agencies:
      "government services",
    government_and_non_profit_tax_payment: "taxes",
    government_and_non_profit_other_government_and_non_profit:
      "government services",

    // Transportation
    transportation_bikes_and_scooters: "bike / scooter",
    transportation_gas: "fuel / gas",
    transportation_parking: "parking",
    transportation_public_transit: "public transport",
    transportation_taxis_and_ride_shares: "taxi & ride apps",
    transportation_tolls: "tolls",
    transportation_other_transportation: "travel",

    // Travel
    travel_flights: "flights",
    travel_lodging: "hotels",
    travel_rental_cars: "car rental",
    travel_other_travel: "travel",

    // Rent & utilities
    rent_and_utilities_gas_and_electricity: "heating & gas",
    rent_and_utilities_internet_and_cable: "internet",
    rent_and_utilities_rent: "rent",
    rent_and_utilities_sewage_and_waste_management: "trash & recycling",
    rent_and_utilities_telephone: "phone bill",
    rent_and_utilities_water: "water",
    rent_and_utilities_other_utilities: "electricity",
  };

  if (plaidMappings[normalized]) {
    return plaidMappings[normalized];
  }

  const categoryMappings: Record<string, string> = {
    // Life & Home
    restaurant: "restaurants",
    dining: "restaurants",
    food: "food & drinks",
    cafe: "coffee & tea",
    coffee: "coffee & tea",
    tea: "coffee & tea",
    takeout: "takeout & delivery",
    delivery: "takeout & delivery",
    grocery: "groceries",
    snack: "snacks",
    cleaning: "cleaning supplies",
    laundry: "laundry / dry cleaning",
    rent: "rent",
    mortgage: "mortgage",
    electric: "electricity",
    "water bill": "water",
    "gas bill": "heating & gas",
    internet: "internet",
    phone: "phone bill",
    mobile: "phone bill",
    trash: "trash & recycling",
    security: "home security",
    move: "moving costs",
    "storage unit": "storage",
    clothes: "clothing & shoes",
    clothing: "clothing & shoes",

    // Travel & Daily Transport
    uber: "taxi & ride apps",
    lyft: "taxi & ride apps",
    taxi: "taxi & ride apps",
    ride: "taxi & ride apps",
    gas: "fuel / gas",
    fuel: "fuel / gas",
    parking: "parking",
    toll: "tolls",
    car: "car repairs",
    bike: "bike / scooter",
    scooter: "bike / scooter",
    flight: "flights",
    airline: "flights",
    hotel: "hotels",
    airbnb: "hotels",
    trip: "travel",
    traveling: "travel",
    visa: "passport & visa fees",
    passport: "passport & visa fees",
    luggage: "luggage & travel gear",

    // Health & Wellness
    doctor: "medical care",
    hospital: "medical care",
    pharmacy: "pharmacy",
    medicine: "pharmacy",
    dentist: "dental care",
    dental: "dental care",
    vision: "eye care",
    optometrist: "eye care",
    mental: "mental health",
    therapy: "therapy",
    counseling: "therapy",
    gym: "fitness & gym",
    sport: "sports & exercise",
    sports: "sports & exercise",
    supplement: "supplements",
    spa: "spa & massage",
    massage: "spa & massage",
    haircut: "personal care",
    salon: "personal care",
    beauty: "beauty & cosmetics",

    // Kids & Pets
    daycare: "childcare",
    school: "school supplies",
    toy: "toys & games",
    baby: "baby supplies",
    pet: "pet supplies",
    vet: "vet visits",
    groomer: "pet grooming",
    boarding: "pet boarding / sitting",

    // Work & Learning
    office: "home office",
    software: "software tools",
    subscription: "software tools",
    cloud: "cloud storage",
    course: "courses & classes",
    class: "courses & classes",
    book: "books & study materials",
    exam: "exams & certificates",
    certificate: "exams & certificates",
    cowork: "coworking space",
    marketing: "ads & marketing",
    advertising: "ads & marketing",
    license: "licensing & fees",
    licensing: "licensing & fees",
    business: "business expenses",
    service: "professional services",

    // Fun & Social
    movie: "movies & shows",
    cinema: "movies & shows",
    streaming: "music & streaming",
    music: "music & streaming",
    game: "games & apps",
    hobby: "hobbies",
    craft: "crafts & art",
    club: "sports clubs",
    concert: "concerts & events",
    event: "concerts & events",
    bar: "bars & drinks",
    drink: "bars & drinks",
    date: "dating",
    party: "parties & hosting",
    gift: "gifts",
    donation: "charity",
    charity: "charity",
    collectible: "collectibles",

    // Money In / Money Out
    payroll: "salary",
    wage: "salary",
    wages: "salary",
    tip: "tips",
    tips: "tips",
    freelance: "freelance income",
    contract: "freelance income",
    "rent income": "rental income",
    "rental income": "rental income",
    rental: "rental income",
    interest: "interest income",
    "cash back": "cashback",
    cashback: "cashback",
    pension: "pension",
    refund: "refunds",
    transfer: "transfers",
    investment: "investments",
    dividend: "investments",
    loan: "loan payments",
    debt: "debt payments",
    bank: "bank fees",
    fee: "bank fees",
    tax: "taxes",
    fine: "fines",
    savings: "savings",
  };

  if (categoryMappings[normalized]) {
    return categoryMappings[normalized];
  }

  for (const [pattern, target] of Object.entries(categoryMappings)) {
    if (normalized.includes(pattern) || pattern.includes(normalized)) {
      return target;
    }
  }

  for (const allowedCategory of ALLOWED_CATEGORIES) {
    if (
      normalized.includes(allowedCategory) ||
      allowedCategory.includes(normalized)
    ) {
      return allowedCategory;
    }
  }

  console.warn(
    `[normalizeCategory] Unknown category "${raw}" mapped to "other"`,
  );
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
  "income",
  "salary",
  "bonus",
  "tips",
  "freelance income",
  "rental income",
  "interest income",
  "cashback",
  "pension",
  "refunds",
  "transfers",
  "investments",
] as const;

export function getIncomeCategories(): string[] {
  return [...INCOME_CATEGORIES];
}

// Expense-only canonical categories (excludes income-focused categories and umbrella 'income')
export function getExpenseCategories(): string[] {
  const incomeCategories: string[] = [...INCOME_CATEGORIES];
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
