export interface TransactionCategorizationInput {
  type: string;
  amount: number;
  currency: string;
  date: string;
  category?: string;
  description?: string;
  merchant?: string;
}

export interface TransactionCategoryCluster {
  id: string;
  memberIndexes: number[];
  representative: {
    type: "expense" | "income";
    amount: number;
    currency: string;
    date: string;
    description: string;
  };
  evidence: {
    normalizedText: string;
    descriptions: string[];
    merchants: string[];
    existingCategories: string[];
  };
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function normalizeWidthAndLatinMarks(raw: string): string {
  let out = "";
  for (const char of raw.normalize("NFKC")) {
    const withoutMarks = char.normalize("NFD").replace(/\p{M}+/gu, "");
    out += /\p{Script=Latin}/u.test(withoutMarks) ? withoutMarks : char;
  }
  return out;
}

export function normalizeCategorizationText(raw: unknown): string {
  if (typeof raw !== "string") return "";

  return normalizeWidthAndLatinMarks(raw)
    .toLowerCase()
    .replace(/\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/gu, " ")
    .replace(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/gu, " ")
    .replace(/\b(?:no|num|nr|n)\s*\d+\b/giu, " ")
    .replace(/[$€£¥₹]?\s*\d+(?:[.,]\d+)*(?:\s*(?:[a-z]{3}|円|元|원))?/giu, " ")
    .replace(/\b(?=[\p{L}\p{N}]*\d{3,})[\p{L}\p{N}]+\b/gu, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildClusterKey(item: TransactionCategorizationInput): string {
  const type = item.type === "income" ? "income" : "expense";
  const primaryText = normalizeCategorizationText(
    [item.merchant, item.description].filter(Boolean).join(" "),
  );

  if (primaryText.length < 3) {
    return `${type}|row|${crypto.randomUUID()}`;
  }

  return `${type}|${primaryText}`;
}

export function buildTransactionCategoryClusters(
  items: TransactionCategorizationInput[],
): TransactionCategoryCluster[] {
  const buckets = new Map<
    string,
    { indexes: number[]; normalizedText: string }
  >();

  items.forEach((item, index) => {
    const key = buildClusterKey(item);
    const normalizedText = key.split("|").slice(1).join("|");
    const existing = buckets.get(key);
    if (existing) {
      existing.indexes.push(index);
      return;
    }
    buckets.set(key, { indexes: [index], normalizedText });
  });

  return Array.from(buckets.entries())
    .map(([id, bucket]) => {
      const members = bucket.indexes.map((index) => items[index]);
      const first = members[0];
      const type: "expense" | "income" = first?.type === "income"
        ? "income"
        : "expense";
      const descriptions = uniqueStrings(
        members.map((item) => item.description),
      ).slice(0, 5);
      const merchants = uniqueStrings(members.map((item) => item.merchant))
        .slice(
          0,
          5,
        );
      const existingCategories = uniqueStrings(
        members.map((item) => item.category),
      ).slice(0, 5);
      const representativeText =
        bucket.normalizedText && !bucket.normalizedText.startsWith("row|")
          ? bucket.normalizedText
          : descriptions[0] || merchants[0] || "transaction";

      return {
        id,
        memberIndexes: bucket.indexes,
        representative: {
          type,
          amount: Number(first?.amount) || 0,
          currency: first?.currency || "",
          date: first?.date || "",
          description: representativeText,
        },
        evidence: {
          normalizedText: representativeText,
          descriptions,
          merchants,
          existingCategories,
        },
      };
    })
    .sort((a, b) => a.memberIndexes[0] - b.memberIndexes[0]);
}
