import { searchLogoDevCandidates } from "./logo-dev-discovery.ts";
import { type LogoDevCandidate } from "./merchant-resolution.ts";
import {
  canonicalMerchantDomain,
  persistCanonicalMerchant,
  resolveMerchant,
} from "./merchant-resolver.ts";
import { selectMerchantCandidateByRegionalContext } from "./merchant-regional-selection.ts";

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
  autoResolveCandidates?: boolean;
}

interface MerchantAnalysisDependencies {
  discoverCandidates?: (
    merchant: string,
    secretKey: string,
  ) => Promise<LogoDevCandidate[]>;
  selectCandidate?: typeof selectMerchantCandidateByRegionalContext;
}

export interface AnalyzedMerchantIdentity {
  merchantId: string;
  merchantDomain: string | null;
  merchantStructuredName: string | null;
  merchantResolutionSource: string | null;
}

async function loadCanonicalMerchant(
  supabase: MerchantAnalysisContext["supabase"],
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
  supabase: MerchantAnalysisContext["supabase"];
  userId: string;
  logoDevSecretKey?: string;
  preferredTimezone?: string;
  autoResolveCandidates?: boolean;
  dependencies?: MerchantAnalysisDependencies;
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
          ? () =>
            params.dependencies?.discoverCandidates
              ? params.dependencies.discoverCandidates(
                merchant,
                params.logoDevSecretKey!,
              )
              : searchLogoDevCandidates(
                merchant,
                params.logoDevSecretKey!,
                params.autoResolveCandidates === true ? 4_000 : 8_000,
              )
          : undefined,
      });

      let canonicalMerchant = await loadCanonicalMerchant(
        params.supabase,
        resolution.merchantId,
      );
      if (
        !canonicalMerchant &&
        !evidencedDomain &&
        resolution.candidates.length > 0 &&
        (params.autoResolveCandidates === true ||
          (resolution.candidates.length > 1 &&
            (params.preferredTimezone || merchantCountry)))
      ) {
        try {
          const selectCandidate = params.dependencies?.selectCandidate ??
            selectMerchantCandidateByRegionalContext;
          const selected = await selectCandidate({
            merchant,
            candidates: resolution.candidates,
            preferredTimezone: params.preferredTimezone,
            merchantCountry,
            transactionCurrency: typeof item?.currency === "string"
              ? item.currency
              : null,
            ...(params.autoResolveCandidates === true
              ? { timeoutMs: 5_000 }
              : {}),
          });
          console.log("[merchant-enrichment] candidate_selection_result", {
            itemIndex,
            merchant,
            candidateCount: resolution.candidates.length,
            selected: selected != null,
            selectedDomain: selected?.domain ?? null,
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
            } else {
              console.warn(
                "[merchant-enrichment] candidate_normalization_failed",
                {
                  itemIndex,
                  merchant,
                  selectedDomain: selected.domain,
                  hasNormalizedName: typeof normalizedName === "string" &&
                    normalizedName.length > 0,
                  hasError: Boolean(normalizedNameError),
                },
              );
            }
          }
        } catch (error) {
          console.warn(
            "[merchant-resolution] AI candidate selection failed",
            {
              errorName: error instanceof Error ? error.name : "UnknownError",
              errorCode: typeof (error as { code?: unknown })?.code === "string"
                ? (error as { code: string }).code
                : null,
            },
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
            : canonicalMerchant
            ? "ai_selected"
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
              : params.autoResolveCandidates === true
              ? "headless_ai_candidate"
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

/**
 * Resolves one already-extracted semantic merchant through the exact same
 * internal, evidenced-domain, and Logo.dev pipeline used by Analyze Expense.
 * Input-specific parsers should converge here after they have identified the
 * merchant; this helper deliberately does not reinterpret raw notification or
 * statement text.
 */
export async function resolveAnalyzedMerchantIdentity(params: {
  merchant: string;
  currency?: string | null;
  merchantUrl?: string | null;
  merchantCountry?: string | null;
  supabase: MerchantAnalysisContext["supabase"];
  userId: string;
  logoDevSecretKey?: string;
  preferredTimezone?: string;
  dependencies?: MerchantAnalysisDependencies;
}): Promise<AnalyzedMerchantIdentity | null> {
  const merchant = params.merchant.trim();
  if (!merchant) return null;

  const [enriched] = await enrichAnalyzedMerchantItems({
    items: [{
      merchant,
      ...(params.currency ? { currency: params.currency } : {}),
      ...(params.merchantUrl ? { merchantUrl: params.merchantUrl } : {}),
      ...(params.merchantCountry
        ? { merchantCountry: params.merchantCountry }
        : {}),
    }],
    supabase: params.supabase,
    userId: params.userId,
    logoDevSecretKey: params.logoDevSecretKey,
    preferredTimezone: params.preferredTimezone,
    autoResolveCandidates: true,
    dependencies: params.dependencies,
  });
  const merchantId = typeof enriched?.merchant_id === "string"
    ? enriched.merchant_id.trim()
    : "";
  if (!merchantId) return null;

  return {
    merchantId,
    merchantDomain: typeof enriched.merchant_domain === "string"
      ? enriched.merchant_domain.trim() || null
      : null,
    merchantStructuredName:
      typeof enriched.merchant_structured_name === "string"
        ? enriched.merchant_structured_name.trim() || null
        : null,
    merchantResolutionSource:
      typeof enriched.merchant_resolution_source === "string"
        ? enriched.merchant_resolution_source.trim() || null
        : null,
  };
}
