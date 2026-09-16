export interface NormalizedMerchantDescriptor {
  name: string;
  displayName: string;
  isUseful: boolean;
}

export interface LogoDevCandidate {
  name: string;
  domain: string;
}

export interface MerchantDescriptorEvidence {
  rawText?: string | null;
  rawTextIsMerchantDescriptor?: boolean;
}

/**
 * A language-agnostic, mechanical fingerprint for search candidates only.
 * SQL is authoritative for persisted evidence keys. Never use this to infer a
 * canonical merchant or remove semantic parts of a descriptor.
 */
export function normalizeMerchantDescriptor(
  merchant: string | null | undefined,
  evidence: MerchantDescriptorEvidence = {},
): NormalizedMerchantDescriptor {
  // This deliberately mirrors merchant_resolution_descriptor_key in SQL.
  // A source adapter must explicitly opt raw text in; account linkage alone
  // never grants it merchant-descriptor semantics.
  const descriptor = String(merchant ?? "")
    .normalize("NFC")
    .trim() ||
    (evidence.rawTextIsMerchantDescriptor
      ? String(evidence.rawText ?? "")
        .normalize("NFC")
        .trim()
      : "");
  const displayName = descriptor.replace(/\s+/g, " ").trim();
  const normalized = displayName.toLowerCase();
  return {
    name: normalized,
    displayName,
    isUseful: normalized.length > 0,
  };
}

export function buildMerchantSearchQueries(merchantEvidence: string): string[] {
  const normalized = normalizeMerchantDescriptor(merchantEvidence);
  return normalized.isUseful ? [normalized.displayName] : [];
}
