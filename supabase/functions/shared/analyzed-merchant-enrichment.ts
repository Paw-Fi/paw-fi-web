import {
  type AnalyzeRequestBody,
  type ProgressCallback,
  runAnalyzeExpense,
  selectMerchantCandidateByRegionalContext,
} from "./analyze-core.ts";
import { searchLogoDevCandidates } from "./logo-dev-discovery.ts";
import {
  canonicalMerchantDomain,
  persistCanonicalMerchant,
  resolveMerchant,
} from "./merchant-resolver.ts";

interface CanonicalMerchantIdentity {
  id: string;
  canonical_name: string;
  domain: string;
}

export interface MerchantAnalysisContext {
  supabase: any;
  userId: string;
  logoDevSecretKey?: string;
  preferredTimezone?: string;
}

const MERCHANT_IDENTITY_FIELDS = [
  "merchant_id",
  "merchant_domain",
  "merchant_structured_name",
  "merchant_resolution_source",
] as const;

function transactionIdentityKey(item: Record<string, unknown>): string {
  return [
    item.type,
    item.date,
    Number(item.amount).toFixed(2),
    String(item.merchant ?? "")
      .trim()
      .toLocaleLowerCase(),
  ].join("|");
}

export function preserveAnalyzedMerchantIdentity(params: {
  items: Array<Record<string, unknown>>;
  analyzedItems: Array<Record<string, unknown>>;
}): Array<Record<string, unknown>> {
  const identities = new Map<string, Record<string, unknown>>();
  for (const analyzedItem of params.analyzedItems) {
    if (typeof analyzedItem.merchant_id !== "string") continue;
    const key = transactionIdentityKey(analyzedItem);
    if (identities.has(key)) {
      identities.delete(key);
      continue;
    }
    identities.set(key, analyzedItem);
  }

  return params.items.map((item) => {
    const analyzedItem = identities.get(transactionIdentityKey(item));
    if (!analyzedItem) return item;
    return {
      ...item,
      ...Object.fromEntries(
        MERCHANT_IDENTITY_FIELDS.flatMap((field) =>
          analyzedItem[field] == null ? [] : [[field, analyzedItem[field]]]
        ),
      ),
    };
  });
}

export async function runEnrichedTransactionAnalysis(params: {
  body: AnalyzeRequestBody;
  apiKey: string;
  merchantContext: MerchantAnalysisContext;
  onProgress?: ProgressCallback;
  transformItems?: (items: any[]) => any[] | Promise<any[]>;
}): Promise<any> {
  const result = await runAnalyzeExpense(
    {
      ...params.body,
      preferredTimezone: params.merchantContext.preferredTimezone,
    },
    params.apiKey,
    params.onProgress,
  );
  if (!result.success || !Array.isArray(result.items)) return result;

  const transformedItems = params.transformItems
    ? await params.transformItems(result.items)
    : result.items;
  return {
    ...result,
    items: await enrichAnalyzedMerchantItems({
      items: transformedItems,
      ...params.merchantContext,
    }),
  };
}

async function loadCanonicalMerchant(
  supabase: any,
  merchantId: string | null,
): Promise<CanonicalMerchantIdentity | null> {
  if (!merchantId) return null;
  const { data, error } = await supabase
    .from("merchants")
    .select("id, canonical_name, domain")
    .eq("id", merchantId)
    .maybeSingle();
  if (error || !data?.id || !data?.canonical_name || !data?.domain) return null;
  return data as CanonicalMerchantIdentity;
}

export async function enrichAnalyzedMerchantItems(params: {
  items: any[];
  supabase: any;
  userId: string;
  logoDevSecretKey?: string;
  preferredTimezone?: string;
}): Promise<any[]> {
  return await Promise.all(
    params.items.map(async (item: any, itemIndex: number) => {
      const { merchantCountry, ...publicItem } = item;
      const merchant = typeof item?.merchant === "string"
        ? item.merchant.trim()
        : "";
      if (!merchant) return publicItem;

      const { data: key, error: keyError } = await params.supabase.rpc(
        "merchant_resolution_descriptor_key",
        {
          p_merchant: merchant,
          p_raw_text: null,
          p_raw_text_is_merchant_descriptor: false,
        },
      );
      if (keyError || typeof key !== "string" || !key) return publicItem;

      const evidencedDomain = canonicalMerchantDomain(
        typeof item?.merchantUrl === "string" ? item.merchantUrl : null,
      );
      const resolution = await resolveMerchant({
        supabase: params.supabase,
        input: {
          userId: params.userId,
          descriptorKey: key,
          evidenceContextKey: "merchant_text",
          structuredKey: key,
          merchantDomain: evidencedDomain,
          mode: "INTERACTIVE_ANALYZE",
        },
        persistUnknownDomain: evidencedDomain != null,
        safeDiscoveryQuery: evidencedDomain == null ? key : null,
        beforeExternalFetch: async () => {
          const { data: allowed, error } = await params.supabase.rpc(
            "consume_merchant_search_quota",
            { p_user_id: params.userId, p_daily_limit: 20 },
          );
          if (error) throw error;
          if (allowed !== true) {
            throw new Error("MERCHANT_SEARCH_QUOTA_EXCEEDED");
          }
        },
        discover: evidencedDomain == null && params.logoDevSecretKey
          ? () => searchLogoDevCandidates(merchant, params.logoDevSecretKey!)
          : undefined,
      });

      let canonicalMerchant = await loadCanonicalMerchant(
        params.supabase,
        resolution.merchantId,
      );
      if (
        !canonicalMerchant &&
        !evidencedDomain &&
        itemIndex < 5 &&
        resolution.candidates.length > 1 &&
        (params.preferredTimezone || merchantCountry)
      ) {
        try {
          const selected = await selectMerchantCandidateByRegionalContext({
            merchant,
            candidates: resolution.candidates,
            preferredTimezone: params.preferredTimezone,
            merchantCountry,
            transactionCurrency: typeof item?.currency === "string"
              ? item.currency
              : null,
          });
          if (selected) {
            const { data: normalizedName, error: normalizedNameError } =
              await params.supabase.rpc("merchant_resolution_descriptor_key", {
                p_merchant: selected.name,
                p_raw_text: null,
                p_raw_text_is_merchant_descriptor: false,
              });
            if (
              !normalizedNameError &&
              typeof normalizedName === "string" &&
              normalizedName
            ) {
              canonicalMerchant = await persistCanonicalMerchant({
                supabase: params.supabase,
                canonicalName: selected.name,
                normalizedName,
                canonicalDomain: selected.domain,
                verificationStatus: "automatic",
                resolutionSource: "logo_dev_search",
                confidence: 0.75,
              });
            }
          }
        } catch (error) {
          console.warn(
            "[merchant-resolution] Regional candidate selection failed",
            error,
          );
        }
      }

      console.log(
        "[merchant-resolution]",
        JSON.stringify({
          outcome: resolution.suppressed
            ? "suppressed"
            : resolution.merchantId
            ? "internal_hit"
            : resolution.cacheHit
            ? "cache_hit"
            : resolution.candidates.length
            ? "candidate_ambiguous"
            : "unresolved",
          mode: "INTERACTIVE_ANALYZE",
          candidateCount: resolution.candidates.length,
        }),
      );

      return {
        ...publicItem,
        ...(canonicalMerchant
          ? {
            merchant_id: canonicalMerchant.id,
            merchant_domain: canonicalMerchant.domain,
            merchant_structured_name: canonicalMerchant.canonical_name,
            merchant_resolution_source: resolution.merchantId
              ? resolution.source
              : "timezone_regional_ai",
          }
          : resolution.merchantId
          ? { merchant_id: resolution.merchantId }
          : {}),
        ...(!canonicalMerchant && resolution.candidates.length
          ? { merchant_candidates: resolution.candidates }
          : {}),
      };
    }),
  );
}
