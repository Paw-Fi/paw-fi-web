export interface PassiveIncomePageVariant {
  meta: {
    title: string;
    description: string;
    keywords: string;
  };
  hero?: {
    title?: string;
  };
  article?: {
    title: string;
    tags?: string[];
  };
  [key: string]: unknown;
}

type PassiveIncomePagesMap = Record<string, PassiveIncomePageVariant>;

let passiveIncomePagesPromise: Promise<PassiveIncomePagesMap> | null = null;

async function loadPassiveIncomePages(): Promise<PassiveIncomePagesMap> {
  if (!passiveIncomePagesPromise) {
    passiveIncomePagesPromise = import(
      "@/data/home/passive-income-variants.json"
    ).then((module) => module.default as PassiveIncomePagesMap);
  }

  return passiveIncomePagesPromise;
}

export async function getPassiveIncomePage(
  slug: string,
): Promise<PassiveIncomePageVariant | undefined> {
  const pages = await loadPassiveIncomePages();
  return pages[slug];
}

export async function getPassiveIncomePageOrFallback(
  slug: string,
  fallbackSlug = "high-interest-portfolios",
): Promise<PassiveIncomePageVariant> {
  return (await getPassiveIncomePage(slug)) ?? (await getPassiveIncomePage(fallbackSlug))!;
}
