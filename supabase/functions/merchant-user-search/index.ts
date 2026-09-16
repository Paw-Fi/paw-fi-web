/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { authenticateUser } from "../shared/auth.ts";
import { corsHeaders } from "../shared/cors.ts";
import { type LogoDevCandidate } from "../shared/merchant-resolution.ts";
import { searchLogoDevCandidates } from "../shared/logo-dev-discovery.ts";
import {
  cachedLogoDevCandidates,
  canonicalMerchantDomain,
  persistCanonicalMerchant,
  persistConservativeDomainMerchant,
  searchMerchantCandidates,
} from "../shared/merchant-resolver.ts";

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validQuery(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const query = value.trim();
  return query.length > 0 && query.length <= 100 ? query : null;
}

async function loadEditableExpense(params: {
  supabase: any;
  userId: string;
  transactionId: string;
}): Promise<any | null> {
  const { data: expense, error } = await params.supabase
    .from("expenses")
    .select(
      "id, user_id, household_id, merchant, raw_text, merchant_structured_name, bank_account_id",
    )
    .eq("id", params.transactionId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !expense) return null;
  // Corrections train user-scoped evidence. Do not let a household role create
  // a mapping for the member who originally created a shared transaction.
  return expense.user_id === params.userId ? expense : null;
}

async function resolveEvidenceKey(params: {
  supabase: any;
  merchant: string | null;
}): Promise<string | null> {
  const { data, error } = await params.supabase.rpc(
    "merchant_resolution_descriptor_key",
    {
      p_merchant: params.merchant,
      p_raw_text: null,
      p_raw_text_is_merchant_descriptor: false,
    },
  );
  if (error) throw error;
  return typeof data === "string" && data.length > 0 ? data : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const logoDevSecretKey = Deno.env.get("LOGO_DEV_SECRET_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server configuration error" }, 500);
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateUser(req, supabase);
  if (!auth.success || !auth.userId) {
    return json({ error: "Unauthorized" }, 401);
  }

  const body = (await req.json().catch(() => null)) as
    | Record<
      string,
      unknown
    >
    | null;
  if (!body) return json({ error: "Invalid JSON body" }, 400);
  if (
    body.action !== "search" &&
    body.action !== "select" &&
    body.action !== "manual"
  ) {
    if (body?.action !== "clear") return json({ error: "Invalid action" }, 400);
  }
  const transactionId = typeof body.transactionId === "string"
    ? body.transactionId.trim()
    : "";
  if (body.action === "clear") {
    if (!transactionId) return json({ error: "Transaction is required" }, 400);
    const expense = await loadEditableExpense({
      supabase,
      userId: auth.userId,
      transactionId,
    });
    if (!expense) return json({ error: "Transaction not found" }, 404);
    const evidenceKey = await resolveEvidenceKey({
      supabase,
      merchant: expense.merchant ?? expense.merchant_structured_name,
    });
    if (evidenceKey) {
      const { error } = await supabase.rpc("apply_merchant_user_evidence", {
        p_transaction_id: expense.id,
        p_actor_user_id: auth.userId,
        p_action: "suppress",
        p_merchant_id: null,
      });
      if (error) {
        return json({ error: "Unable to reset merchant" }, 503);
      }
    }
    if (!evidenceKey) return json({ error: "Unable to reset merchant" }, 400);
    return json({ success: true });
  }
  const query = validQuery(body?.query);
  if (!query) {
    return json({ error: "A 1-100 character query is required" }, 400);
  }
  try {
    if (body.action === "search") {
      const safeQueryKey = await resolveEvidenceKey({
        supabase,
        merchant: query,
      });
      if (!safeQueryKey) return json({ success: true, candidates: [] });
      const searchableExpense = transactionId
        ? await loadEditableExpense({
          supabase,
          userId: auth.userId,
          transactionId,
        })
        : null;
      const descriptorKey = searchableExpense
        ? await resolveEvidenceKey({
          supabase,
          merchant: searchableExpense.merchant ??
            searchableExpense.merchant_structured_name,
        })
        : safeQueryKey;
      const structuredKey = searchableExpense?.merchant_structured_name
        ? await resolveEvidenceKey({
          supabase,
          merchant: searchableExpense.merchant_structured_name,
        })
        : safeQueryKey;
      const discovery = await searchMerchantCandidates({
        supabase,
        input: {
          userId: auth.userId,
          descriptorKey: safeQueryKey,
          evidenceContextKey: "merchant_text",
          structuredKey: safeQueryKey,
          mode: "INTERACTIVE_SEARCH",
        },
        suppressionInput: searchableExpense
          ? {
            userId: auth.userId,
            descriptorKey,
            evidenceContextKey: searchableExpense.merchant
              ? "merchant_text"
              : "merchant_absent",
            structuredKey,
            mode: "INTERACTIVE_SEARCH",
          }
          : undefined,
        normalizedQuery: safeQueryKey,
        allowDiscoveryWhenSuppressed: true,
        beforeExternalFetch: async () => {
          const { data: allowed, error } = await supabase.rpc(
            "consume_merchant_search_quota",
            {
              p_user_id: auth.userId,
              p_daily_limit: 20,
            },
          );
          if (error) throw error;
          if (allowed !== true) {
            throw new Error("MERCHANT_SEARCH_QUOTA_EXCEEDED");
          }
        },
        discover: logoDevSecretKey
          ? () => searchLogoDevCandidates(query, logoDevSecretKey)
          : undefined,
      });
      if (!logoDevSecretKey && discovery.candidates.length === 0) {
        return json(
          { error: "Merchant search is temporarily unavailable" },
          503,
        );
      }
      console.log(
        "[merchant-resolution]",
        JSON.stringify({
          outcome: discovery.candidates.length === 0
            ? "unresolved"
            : discovery.suppressed
            ? "suppressed_explicit_search"
            : discovery.cacheHit
            ? "cache_hit"
            : "candidate_ambiguous",
          mode: "INTERACTIVE_SEARCH",
          candidateCount: discovery.candidates.length,
        }),
      );
      return json({
        success: true,
        candidates: discovery.candidates,
        cacheHit: discovery.cacheHit,
        suppressed: discovery.suppressed,
      });
    }

    const selectedDomain = canonicalMerchantDomain(
      typeof body.selectedDomain === "string" ? body.selectedDomain : null,
    ) ?? "";
    const selectedName = typeof body.selectedName === "string"
      ? body.selectedName.trim()
      : "";
    const selectedSource = body.selectedSource === "manual"
      ? "manual"
      : body.selectedSource === "moneko"
      ? "moneko"
      : "logo_dev";
    const selectedMerchantId = typeof body.selectedMerchantId === "string"
      ? body.selectedMerchantId.trim()
      : "";
    if (!selectedDomain) {
      return json({ error: "Selected merchant domain is invalid" }, 400);
    }
    let candidate: LogoDevCandidate | undefined;
    // Exact evidence is always safe. A broad structured mapping is permitted
    // only when this trusted server-side discovery returned one domain.
    let allowStructuredLearning = false;
    let internalMerchant: {
      id: string;
      canonical_name: string;
      domain: string;
    } | null = null;
    if (selectedSource === "manual") {
      candidate = { name: selectedName, domain: selectedDomain };
    } else if (selectedSource === "moneko") {
      const { data } = await supabase
        .from("merchants")
        .select("id, canonical_name, domain")
        .eq("id", selectedMerchantId)
        .eq("canonical_name", selectedName)
        .eq("domain", selectedDomain)
        .maybeSingle();
      internalMerchant = data;
    } else {
      if (!logoDevSecretKey) {
        return json(
          { error: "Merchant search is temporarily unavailable" },
          503,
        );
      }
      const safeQueryKey = await resolveEvidenceKey({
        supabase,
        merchant: query,
      });
      if (!safeQueryKey) {
        return json({ error: "Selected merchant is invalid" }, 400);
      }
      const discovery = await cachedLogoDevCandidates({
        supabase,
        normalizedQuery: safeQueryKey,
        mode: "INTERACTIVE_SEARCH",
        beforeExternalFetch: async () => {
          const { data: allowed, error } = await supabase.rpc(
            "consume_merchant_search_quota",
            { p_user_id: auth.userId, p_daily_limit: 20 },
          );
          if (error) throw error;
          if (allowed !== true) {
            throw new Error("MERCHANT_SEARCH_QUOTA_EXCEEDED");
          }
        },
        fetchCandidates: () => searchLogoDevCandidates(query, logoDevSecretKey),
      });
      candidate = discovery.candidates.find(
        (item) =>
          canonicalMerchantDomain(item.domain) === selectedDomain &&
          item.name === selectedName,
      );
      allowStructuredLearning = new Set(
        discovery.candidates
          .map((item) => canonicalMerchantDomain(item.domain))
          .filter((domain): domain is string => Boolean(domain)),
      ).size === 1;
    }
    if (!transactionId || (!candidate && !internalMerchant)) {
      return json({ error: "Selected merchant is invalid" }, 400);
    }

    const expense = await loadEditableExpense({
      supabase,
      userId: auth.userId,
      transactionId,
    });
    if (!expense) {
      return json({ error: "Transaction not found" }, 404);
    }

    const evidenceKey = await resolveEvidenceKey({
      supabase,
      merchant: expense.merchant ?? expense.merchant_structured_name,
    });
    if (!evidenceKey) {
      return json(
        { error: "Transaction has no usable merchant descriptor" },
        400,
      );
    }
    const selectedCandidate = candidate ?? {
      name: internalMerchant!.canonical_name,
      domain: internalMerchant!.domain,
    };
    const normalizedCandidate = await resolveEvidenceKey({
      supabase,
      merchant: selectedCandidate.name,
    });
    if (!normalizedCandidate) {
      return json({ error: "Selected merchant name is invalid" }, 400);
    }
    const merchant = internalMerchant ??
      (selectedSource === "manual"
        ? await persistConservativeDomainMerchant({
          supabase,
          canonicalDomain: selectedDomain,
          resolutionSource: "manual",
        })
        : await persistCanonicalMerchant({
          supabase,
          canonicalName: candidate!.name,
          normalizedName: normalizedCandidate,
          canonicalDomain: selectedDomain,
          verificationStatus: "user_confirmed",
          resolutionSource: "user_correction",
        }));

    const { error: updateError } = await supabase.rpc(
      "apply_merchant_user_evidence",
      {
        p_transaction_id: expense.id,
        p_actor_user_id: auth.userId,
        p_action: "map",
        p_merchant_id: merchant.id,
        p_allow_structured_learning: allowStructuredLearning,
      },
    );
    if (updateError) throw updateError;
    console.log(
      "[merchant-resolution]",
      JSON.stringify({
        outcome: "user_confirmed",
        mode: "INTERACTIVE_SEARCH",
        structuredLearning: allowStructuredLearning,
      }),
    );
    return json({ success: true, merchant });
  } catch (error) {
    console.error("[merchant-user-search]", error);
    return json({ error: "Merchant search is temporarily unavailable" }, 503);
  }
});
