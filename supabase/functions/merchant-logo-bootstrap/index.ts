/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { authenticateUser } from "../shared/auth.ts";
import { corsHeaders } from "../shared/cors.ts";
import { searchLogoDevCandidates } from "../shared/logo-dev-discovery.ts";
import {
  canonicalMerchantDomain,
  persistCanonicalMerchant,
  resolveMerchant,
} from "../shared/merchant-resolver.ts";

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Explicit user bootstrap: groups safe structured names, never raw descriptors.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return response({ error: "Method not allowed" }, 405);
  }
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const logoKey = Deno.env.get("LOGO_DEV_SECRET_KEY");
  if (!url || !serviceRoleKey || !logoKey) {
    return response({ error: "Server configuration error" }, 500);
  }
  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateUser(req, supabase);
  if (!auth.success || !auth.userId) {
    return response({ error: "Unauthorized" }, 401);
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = typeof body.action === "string" ? body.action : "next";
  if (action === "start") {
    const { data, error } = await supabase.rpc(
      "start_merchant_logo_bootstrap",
      {
        p_user_id: auth.userId,
      },
    );
    if (error) return response({ error: "Unable to start merchant scan" }, 503);
    return response({ success: true, ...data });
  }
  const runId = typeof body.runId === "string" ? body.runId : "";
  if (!runId) return response({ error: "runId is required" }, 400);
  const { data: run } = await supabase
    .from("merchant_logo_bootstrap_runs")
    .select("id, total_groups, status")
    .eq("id", runId)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (!run) return response({ error: "Bootstrap run not found" }, 404);
  if (action === "cancel") {
    await supabase
      .from("merchant_logo_bootstrap_runs")
      .update({ status: "cancelled" })
      .eq("id", runId)
      .eq("user_id", auth.userId);
    return response({ success: true, cancelled: true });
  }
  const groupId = typeof body.groupId === "string" ? body.groupId : "";
  if (action === "skip") {
    await supabase
      .from("merchant_logo_bootstrap_groups")
      .update({ status: "skipped" })
      .eq("id", groupId)
      .eq("run_id", runId)
      .eq("user_id", auth.userId);
  }
  if (action === "select") {
    const { data: group } = await supabase
      .from("merchant_logo_bootstrap_groups")
      .select("id, structured_key, display_name")
      .eq("id", groupId)
      .eq("run_id", runId)
      .eq("user_id", auth.userId)
      .maybeSingle();
    const selectedDomain = canonicalMerchantDomain(
      typeof body.selectedDomain === "string" ? body.selectedDomain : null,
    );
    const selectedName = typeof body.selectedName === "string"
      ? body.selectedName.trim()
      : "";
    if (!group || !selectedDomain || !selectedName) {
      return response({ error: "Invalid merchant selection" }, 400);
    }
    const resolution = await resolveMerchant({
      supabase,
      input: {
        userId: auth.userId,
        descriptorKey: null,
        evidenceContextKey: "merchant_absent",
        structuredKey: group.structured_key,
        mode: "INTERACTIVE_SEARCH",
      },
      safeDiscoveryQuery: group.structured_key,
      beforeExternalFetch: async () => {
        const { data: allowed } = await supabase.rpc(
          "consume_merchant_search_quota",
          {
            p_user_id: auth.userId,
            p_daily_limit: 20,
          },
        );
        if (allowed !== true) throw new Error("MERCHANT_SEARCH_QUOTA_EXCEEDED");
      },
      discover: () => searchLogoDevCandidates(group.display_name, logoKey),
    });
    const selected = resolution.candidates.find(
      (candidate) =>
        candidate.name === selectedName &&
        canonicalMerchantDomain(candidate.domain) === selectedDomain,
    );
    if (!selected) {
      return response({ error: "Invalid merchant selection" }, 400);
    }
    const { data: normalizedName } = await supabase.rpc(
      "merchant_resolution_descriptor_key",
      {
        p_merchant: selected.name,
        p_raw_text: null,
        p_raw_text_is_merchant_descriptor: false,
      },
    );
    const merchant = await persistCanonicalMerchant({
      supabase,
      canonicalName: selected.name,
      normalizedName,
      canonicalDomain: selectedDomain,
      verificationStatus: "user_confirmed",
      resolutionSource: "user_correction",
    });
    await supabase.rpc("apply_merchant_bootstrap_mapping", {
      p_run_id: runId,
      p_group_id: groupId,
      p_user_id: auth.userId,
      p_merchant_id: merchant.id,
      p_user_confirmed: true,
    });
  }

  let quotaExhausted = false;
  if (action === "next") {
    const { data: groups, error } = await supabase
      .from("merchant_logo_bootstrap_groups")
      .select("id, structured_key, display_name, transaction_ids")
      .eq("run_id", runId)
      .eq("user_id", auth.userId)
      .eq("status", "pending")
      .order("structured_key")
      .limit(10);
    if (error) {
      return response({ error: "Unable to load merchant groups" }, 503);
    }
    for (const group of groups ?? []) {
      try {
        const resolution = await resolveMerchant({
          supabase,
          input: {
            userId: auth.userId,
            descriptorKey: null,
            evidenceContextKey: "merchant_absent",
            structuredKey: group.structured_key,
            mode: "INTERACTIVE_SEARCH",
          },
          safeDiscoveryQuery: group.structured_key,
          beforeExternalFetch: async () => {
            const { data: allowed, error: quotaError } = await supabase.rpc(
              "consume_merchant_search_quota",
              { p_user_id: auth.userId, p_daily_limit: 20 },
            );
            if (quotaError) throw quotaError;
            if (allowed !== true) {
              throw new Error("MERCHANT_SEARCH_QUOTA_EXCEEDED");
            }
          },
          discover: () => searchLogoDevCandidates(group.display_name, logoKey),
        });
        if (resolution.merchantId) {
          await supabase.rpc("apply_merchant_bootstrap_mapping", {
            p_run_id: runId,
            p_group_id: group.id,
            p_user_id: auth.userId,
            p_merchant_id: resolution.merchantId,
            p_user_confirmed: false,
          });
          continue;
        }
        const distinctDomains = new Set(
          resolution.candidates
            .map((candidate) => canonicalMerchantDomain(candidate.domain))
            .filter(Boolean),
        );
        const only = distinctDomains.size === 1
          ? resolution.candidates[0]
          : null;
        if (only) {
          const { data: normalizedName } = await supabase.rpc(
            "merchant_resolution_descriptor_key",
            {
              p_merchant: only.name,
              p_raw_text: null,
              p_raw_text_is_merchant_descriptor: false,
            },
          );
          if (normalizedName === group.structured_key) {
            const merchant = await persistCanonicalMerchant({
              supabase,
              canonicalName: only.name,
              normalizedName,
              canonicalDomain: only.domain,
              verificationStatus: "automatic",
              resolutionSource: "logo_dev_search",
              confidence: 0.99,
            });
            await supabase.rpc("apply_merchant_bootstrap_mapping", {
              p_run_id: runId,
              p_group_id: group.id,
              p_user_id: auth.userId,
              p_merchant_id: merchant.id,
              p_user_confirmed: false,
            });
            continue;
          }
        }
        await supabase
          .from("merchant_logo_bootstrap_groups")
          .update({
            status: resolution.candidates.length ? "ambiguous" : "unresolved",
            candidates: resolution.candidates,
          })
          .eq("id", group.id);
      } catch (error) {
        if (String(error).includes("QUOTA_EXCEEDED")) {
          quotaExhausted = true;
          break;
        }
        throw error;
      }
    }
  }
  const { data: allGroups } = await supabase
    .from("merchant_logo_bootstrap_groups")
    .select("id, structured_key, display_name, status, candidates, merchant_id")
    .eq("run_id", runId)
    .eq("user_id", auth.userId)
    .order("structured_key");
  const groups = allGroups ?? [];
  const counts = (status: string) =>
    groups.filter((group) => group.status === status).length;
  const remainingGroups = counts("pending");
  if (remainingGroups === 0) {
    await supabase
      .from("merchant_logo_bootstrap_runs")
      .update({ status: "completed" })
      .eq("id", runId)
      .eq("user_id", auth.userId);
  }
  return response({
    success: true,
    runId,
    totalGroups: run.total_groups,
    processedGroups: groups.length - remainingGroups,
    resolvedGroups: counts("resolved"),
    ambiguousGroups: counts("ambiguous"),
    skippedGroups: counts("skipped") + counts("unresolved"),
    remainingGroups,
    quotaExhausted,
    groups: groups.filter((group) => group.status === "ambiguous").slice(0, 10),
  });
});
