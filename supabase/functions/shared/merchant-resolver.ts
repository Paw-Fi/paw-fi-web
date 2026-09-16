import { type LogoDevCandidate } from "./merchant-resolution.ts";

export type MerchantResolutionMode =
  | "INTERNAL_ONLY"
  | "INTERACTIVE_SEARCH"
  | "INTERACTIVE_ANALYZE";

export interface MerchantResolutionInput {
  userId: string;
  descriptorKey: string | null;
  evidenceContextKey: string;
  structuredKey: string | null;
  merchantDomain?: string | null;
  mode: MerchantResolutionMode;
}

export interface InternalMerchantResolution {
  merchantId: string | null;
  suppressed: boolean;
  source:
    | "suppressed"
    | "user_exact"
    | "domain"
    | "user_structured"
    | "trusted_exact"
    | "trusted_structured"
    | "unresolved";
}

export interface MerchantSearchCandidate extends LogoDevCandidate {
  id?: string;
  source: "moneko" | "logo_dev";
}

/** One server-side domain contract for all merchant creation and lookup. */
export function canonicalMerchantDomain(
  value: string | null | undefined,
): string | null {
  const input = String(value ?? "").trim();
  if (!input) return null;
  try {
    const url = new URL(input.includes("://") ? input : `https://${input}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password || url.port) return null;
    let hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    if (hostname.startsWith("www.")) hostname = hostname.slice(4);
    if (
      !hostname.includes(".") ||
      hostname === "localhost" ||
      /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) ||
      hostname.includes(":") ||
      hostname.length > 253
    ) {
      return null;
    }
    const labels = hostname.split(".");
    if (
      labels.some(
        (label) =>
          !label ||
          label.length > 63 ||
          !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
      )
    ) {
      return null;
    }
    return hostname;
  } catch {
    return null;
  }
}

export function sanitizeLogoDevCandidates(value: unknown): LogoDevCandidate[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((candidate) => {
    const name = typeof candidate?.name === "string"
      ? candidate.name.trim()
      : "";
    const domain = canonicalMerchantDomain(candidate?.domain);
    if (!name || !domain || seen.has(domain)) return [];
    seen.add(domain);
    return [{ name, domain }];
  });
}

export interface MerchantResolutionResult extends InternalMerchantResolution {
  candidates: LogoDevCandidate[];
  cacheHit: boolean;
}

/** The single, policy-safe internal resolution order used by all callers. */
export async function resolveMerchantInternally(
  supabase: any,
  input: MerchantResolutionInput,
): Promise<InternalMerchantResolution> {
  if (input.descriptorKey) {
    const { data: exact } = await supabase
      .from("merchant_user_overrides")
      .select("merchant_id, action")
      .eq("user_id", input.userId)
      .eq("normalized_pattern", input.descriptorKey)
      .eq("evidence_context_key", input.evidenceContextKey)
      .maybeSingle();
    if (exact?.action === "suppress") {
      return { merchantId: null, suppressed: true, source: "suppressed" };
    }
    if (exact?.action === "map" && exact.merchant_id) {
      return {
        merchantId: exact.merchant_id,
        suppressed: false,
        source: "user_exact",
      };
    }
  }
  if (input.structuredKey) {
    const { data: structuredSuppression } = await supabase
      .from("merchant_user_overrides")
      .select("id")
      .eq("user_id", input.userId)
      .eq("normalized_pattern", input.structuredKey)
      .eq("evidence_context_key", "structured_merchant_name")
      .eq("action", "suppress")
      .maybeSingle();
    if (structuredSuppression) {
      return { merchantId: null, suppressed: true, source: "suppressed" };
    }
    const { data: structured } = await supabase
      .from("merchant_user_overrides")
      .select("merchant_id")
      .eq("user_id", input.userId)
      .eq("normalized_pattern", input.structuredKey)
      .eq("evidence_context_key", "structured_merchant_name")
      .eq("action", "map")
      .maybeSingle();
    if (structured?.merchant_id) {
      return {
        merchantId: structured.merchant_id,
        suppressed: false,
        source: "user_structured",
      };
    }
  }
  const canonicalDomain = canonicalMerchantDomain(input.merchantDomain);
  if (canonicalDomain) {
    const { data: domainMerchant, error } = await supabase
      .from("merchants")
      .select("id")
      .eq("domain", canonicalDomain)
      .maybeSingle();
    if (error) throw error;
    if (domainMerchant?.id) {
      return {
        merchantId: domainMerchant.id,
        suppressed: false,
        source: "domain",
      };
    }
  }
  for (
    const [key, source] of [
      [input.descriptorKey, "trusted_exact"],
      [input.structuredKey, "trusted_structured"],
    ] as const
  ) {
    if (!key) continue;
    const { data } = await supabase
      .from("merchant_aliases")
      .select("merchant_id")
      .eq("normalized_pattern", key)
      .eq("is_trusted", true)
      .limit(1);
    if (data?.[0]?.merchant_id) {
      return { merchantId: data[0].merchant_id, suppressed: false, source };
    }
  }
  return { merchantId: null, suppressed: false, source: "unresolved" };
}

export async function cachedLogoDevCandidates(params: {
  supabase: any;
  normalizedQuery: string;
  mode: MerchantResolutionMode;
  beforeExternalFetch?: () => Promise<void>;
  fetchCandidates: () => Promise<LogoDevCandidate[]>;
}): Promise<{ candidates: LogoDevCandidate[]; cacheHit: boolean }> {
  if (params.mode === "INTERNAL_ONLY") {
    return { candidates: [], cacheHit: false };
  }
  const { data: cached } = await params.supabase
    .from("merchant_search_cache")
    .select("candidates")
    .eq("normalized_query", params.normalizedQuery)
    .eq("provider", "logo_dev")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (cached) {
    console.log(
      "[merchant-resolution]",
      JSON.stringify({
        outcome: "cache_hit",
        provider: "logo_dev",
      }),
    );
    return {
      candidates: sanitizeLogoDevCandidates(cached.candidates),
      cacheHit: true,
    };
  }
  const leaseToken = crypto.randomUUID();
  const { data: claimed, error: claimError } = await params.supabase.rpc(
    "claim_merchant_search_refresh",
    {
      p_normalized_query: params.normalizedQuery,
      p_provider: "logo_dev",
      p_lease_token: leaseToken,
      p_lease_seconds: 15,
    },
  );
  if (claimError) throw claimError;
  if (claimed !== true) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const { data: refreshed } = await params.supabase
        .from("merchant_search_cache")
        .select("candidates")
        .eq("normalized_query", params.normalizedQuery)
        .eq("provider", "logo_dev")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (refreshed) {
        return {
          candidates: sanitizeLogoDevCandidates(refreshed.candidates),
          cacheHit: true,
        };
      }
    }
    throw new Error("MERCHANT_SEARCH_IN_PROGRESS");
  }
  try {
    await params.beforeExternalFetch?.();
    console.log(
      "[merchant-resolution]",
      JSON.stringify({
        outcome: "logo_dev_search",
        provider: "logo_dev",
      }),
    );
    const candidates = sanitizeLogoDevCandidates(
      await params.fetchCandidates(),
    );
    const { data: cached, error: cacheError } = await params.supabase.rpc(
      "complete_merchant_search_refresh",
      {
        p_normalized_query: params.normalizedQuery,
        p_provider: "logo_dev",
        p_lease_token: leaseToken,
        p_candidates: candidates,
        p_expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    );
    if (cacheError || cached !== true) {
      console.error(
        "[merchant-resolution]",
        JSON.stringify({
          outcome: "cache_write_failed",
          provider: "logo_dev",
        }),
      );
      await params.supabase.rpc("release_merchant_search_refresh", {
        p_normalized_query: params.normalizedQuery,
        p_provider: "logo_dev",
        p_lease_token: leaseToken,
      });
    }
    return { candidates, cacheHit: false };
  } catch (error) {
    await params.supabase.rpc("release_merchant_search_refresh", {
      p_normalized_query: params.normalizedQuery,
      p_provider: "logo_dev",
      p_lease_token: leaseToken,
    });
    throw error;
  }
}

async function merchantCandidateById(
  supabase: any,
  merchantId: string,
): Promise<MerchantSearchCandidate[]> {
  const { data, error } = await supabase
    .from("merchants")
    .select("id, canonical_name, domain")
    .eq("id", merchantId)
    .maybeSingle();
  if (error) throw error;
  const domain = canonicalMerchantDomain(data?.domain);
  return data?.id && data?.canonical_name && domain
    ? [{ id: data.id, name: data.canonical_name, domain, source: "moneko" }]
    : [];
}

export async function searchMerchantCandidates(params: {
  supabase: any;
  input: MerchantResolutionInput;
  suppressionInput?: MerchantResolutionInput;
  normalizedQuery: string;
  allowDiscoveryWhenSuppressed?: boolean;
  beforeExternalFetch?: () => Promise<void>;
  discover?: () => Promise<LogoDevCandidate[]>;
}): Promise<{
  candidates: MerchantSearchCandidate[];
  cacheHit: boolean;
  suppressed: boolean;
}> {
  const suppression = params.suppressionInput
    ? await resolveMerchantInternally(params.supabase, params.suppressionInput)
    : null;
  if (suppression?.suppressed && !params.allowDiscoveryWhenSuppressed) {
    return { candidates: [], cacheHit: false, suppressed: true };
  }
  const known = await resolveMerchantInternally(params.supabase, params.input);
  if (known.merchantId) {
    return {
      candidates: await merchantCandidateById(
        params.supabase,
        known.merchantId,
      ),
      cacheHit: false,
      suppressed: suppression?.suppressed ?? false,
    };
  }
  if (known.suppressed && !params.allowDiscoveryWhenSuppressed) {
    return { candidates: [], cacheHit: false, suppressed: true };
  }
  if (!known.suppressed) {
    const { data: direct, error } = await params.supabase
      .from("merchants")
      .select("id, canonical_name, domain")
      .eq("normalized_name", params.normalizedQuery)
      .not("domain", "is", null)
      .limit(10);
    if (error) throw error;
    const internal = (direct ?? []).flatMap((merchant: any) => {
      const domain = canonicalMerchantDomain(merchant.domain);
      return merchant.id && merchant.canonical_name && domain
        ? [
          {
            id: merchant.id,
            name: merchant.canonical_name,
            domain,
            source: "moneko" as const,
          },
        ]
        : [];
    });
    if (internal.length > 0) {
      return {
        candidates: internal,
        cacheHit: false,
        suppressed: suppression?.suppressed ?? false,
      };
    }
  }
  if (!params.discover || params.input.mode === "INTERNAL_ONLY") {
    return { candidates: [], cacheHit: false, suppressed: known.suppressed };
  }
  const discovered = await cachedLogoDevCandidates({
    supabase: params.supabase,
    normalizedQuery: params.normalizedQuery,
    mode: params.input.mode,
    beforeExternalFetch: params.beforeExternalFetch,
    fetchCandidates: params.discover,
  });
  return {
    candidates: discovered.candidates.map((candidate) => ({
      ...candidate,
      source: "logo_dev" as const,
    })),
    cacheHit: discovered.cacheHit,
    suppressed: known.suppressed || (suppression?.suppressed ?? false),
  };
}

/**
 * Central mode-aware resolver. Background callers pass INTERNAL_ONLY and can
 * never reach `discover`; interactive server handlers supply it explicitly.
 */
export async function resolveMerchant(params: {
  supabase: any;
  input: MerchantResolutionInput;
  safeDiscoveryQuery?: string | null;
  beforeExternalFetch?: () => Promise<void>;
  discover?: () => Promise<LogoDevCandidate[]>;
  persistUnknownDomain?: boolean;
}): Promise<MerchantResolutionResult> {
  const internal = await resolveMerchantInternally(
    params.supabase,
    params.input,
  );
  if (internal.suppressed || internal.merchantId) {
    return { ...internal, candidates: [], cacheHit: false };
  }
  const domain = canonicalMerchantDomain(params.input.merchantDomain);
  if (domain && params.persistUnknownDomain) {
    const merchant = await persistConservativeDomainMerchant({
      supabase: params.supabase,
      canonicalDomain: domain,
      resolutionSource: "evidenced_domain",
    });
    if (params.input.descriptorKey) {
      const { error } = await params.supabase.rpc(
        "record_automatic_merchant_evidence",
        {
          p_user_id: params.input.userId,
          p_merchant_id: merchant.id,
          p_normalized_pattern: params.input.descriptorKey,
          p_evidence_context_key: params.input.evidenceContextKey,
          p_evidence_type: "automatic_evidenced_domain",
        },
      );
      if (error) throw error;
    }
    return {
      merchantId: merchant.id,
      suppressed: false,
      source: "domain",
      candidates: [],
      cacheHit: false,
    };
  }
  if (
    params.input.mode === "INTERNAL_ONLY" ||
    !params.safeDiscoveryQuery ||
    !params.discover
  ) {
    return { ...internal, candidates: [], cacheHit: false };
  }
  const discovery = await cachedLogoDevCandidates({
    supabase: params.supabase,
    normalizedQuery: params.safeDiscoveryQuery,
    mode: params.input.mode,
    beforeExternalFetch: params.beforeExternalFetch,
    fetchCandidates: params.discover,
  });
  return {
    ...internal,
    candidates: discovery.candidates,
    cacheHit: discovery.cacheHit,
  };
}

/** Idempotent canonical-domain writer. Callers own evidence provenance. */
export async function persistCanonicalMerchant(params: {
  supabase: any;
  canonicalName: string;
  normalizedName: string;
  canonicalDomain: string;
  verificationStatus?: "automatic" | "user_confirmed";
  resolutionSource?:
    | "logo_dev_search"
    | "user_correction"
    | "manual"
    | "evidenced_domain";
  confidence?: number;
}): Promise<{ id: string; canonical_name: string; domain: string }> {
  const domain = canonicalMerchantDomain(params.canonicalDomain);
  if (!domain) throw new Error("MERCHANT_DOMAIN_INVALID");
  const existing = await params.supabase
    .from("merchants")
    .select("id, canonical_name, domain")
    .eq("domain", domain)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;
  const created = await params.supabase
    .from("merchants")
    .insert({
      canonical_name: params.canonicalName,
      normalized_name: params.normalizedName,
      domain,
      logo_identifier: domain,
      confidence: params.confidence ?? 1,
      verification_status: params.verificationStatus ?? "user_confirmed",
      resolution_source: params.resolutionSource ?? "user_correction",
    })
    .select("id, canonical_name, domain")
    .maybeSingle();
  if (!created.error && created.data) return created.data;
  if (created.error?.code !== "23505") throw created.error;
  const raced = await params.supabase
    .from("merchants")
    .select("id, canonical_name, domain")
    .eq("domain", domain)
    .maybeSingle();
  if (raced.error || !raced.data) {
    throw raced.error ?? new Error("MERCHANT_SAVE_FAILED");
  }
  return raced.data;
}

export const persistConservativeDomainMerchant = (params: {
  supabase: any;
  canonicalDomain: string;
  resolutionSource: "manual" | "evidenced_domain";
}) => {
  const domain = canonicalMerchantDomain(params.canonicalDomain);
  if (!domain) throw new Error("MERCHANT_DOMAIN_INVALID");
  return persistCanonicalMerchant({
    supabase: params.supabase,
    canonicalName: domain,
    normalizedName: domain,
    canonicalDomain: domain,
    verificationStatus: "automatic",
    resolutionSource: params.resolutionSource,
    confidence: 0.5,
  });
};

/** Backwards-compatible explicit-user writer. */
export const persistUserConfirmedMerchant = (params: {
  supabase: any;
  canonicalName: string;
  normalizedName: string;
  canonicalDomain: string;
}) => persistCanonicalMerchant(params);
