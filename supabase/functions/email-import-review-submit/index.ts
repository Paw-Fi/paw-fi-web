import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "../shared/cors.ts";
import {
  buildInternalInvokeHeaders,
  resolveInternalFunctionKey,
} from "../shared/auth.ts";
import {
  resolveStoredReviewDecision,
  hashEmailImportReviewToken,
  isValidReviewToken,
} from "../shared/email-import-review.ts";
import { sanitizeTransactionSourceGrounding } from "../shared/analyze-core.ts";
import { saveTransactionsBatchInternal } from "../save-transactions-batch/index.ts";

const url = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (request) => {
  const headers = {
    ...getCorsHeaders(request.headers.get("origin") || ""),
    "Content-Type": "application/json",
    "Referrer-Policy": "no-referrer",
  };
  if (request.method === "OPTIONS") return new Response("", { headers });
  if (
    request.method !== "POST" ||
    !request.headers.get("content-type")?.includes("application/json")
  )
    return invalid(headers, 405);
  try {
    const body = await request.json();
    if (
      !isUuid(body?.reviewId) ||
      !isValidReviewToken(body?.token) ||
      !Number.isInteger(body?.version) ||
      !Array.isArray(body?.decisions)
    )
      return invalid(headers);
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const tokenHash = await hashEmailImportReviewToken(body.token);
    const { data: existing } = await supabase
      .from("email_import_reviews")
      .select("id, email_import_event_id, user_id, status, version, expires_at")
      .eq("id", body.reviewId)
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (!existing || new Date(existing.expires_at).getTime() <= Date.now())
      return invalid(headers);
    if (existing.status === "completed" || existing.status === "declined")
      return inspectTerminal(supabase, existing.id, headers);
    if (existing.version !== body.version)
      return new Response(JSON.stringify({ status: "stale" }), {
        status: 409,
        headers,
      });
    const { data: claimed } = await supabase.rpc("claim_email_import_review", {
      p_review_id: existing.id,
      p_token_hash: tokenHash,
      p_version: body.version,
    });
    if (!claimed)
      return new Response(JSON.stringify({ status: "processing" }), {
        status: 202,
        headers,
      });

    const { data: items } = await supabase
      .from("email_import_review_items")
      .select(
        "id, source_index, candidate, evidence_text, issues, options, save_status, save_idempotency_key",
      )
      .eq("review_id", existing.id)
      .order("source_index");
    const decisions = new Map(
      (body.decisions as Array<any>).map((decision) => [
        decision.itemId,
        decision,
      ]),
    );
    if (
      !items ||
      decisions.size !== items.length ||
      items.some((item: any) => !decisions.has(item.id))
    )
      return invalid(headers, 400);
    const resolved = [] as Array<Record<string, unknown>>;
    for (const item of items as Array<any>) {
      const decision = decisions.get(item.id);
      if (decision?.decline === true) {
        await supabase
          .from("email_import_review_items")
          .update({
            save_status: "declined",
            selected_option_ids: [],
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id)
          .eq("save_status", "pending");
        continue;
      }
      if (
        !Array.isArray(decision?.optionIds) ||
        decision.optionIds.some((value: unknown) => typeof value !== "string")
      )
        return invalid(headers, 400);
      const transaction = resolveStoredReviewDecision({
        candidate: item.candidate,
        issues: item.issues,
        optionIds: decision.optionIds,
      });
      const grounded =
        transaction &&
        sanitizeTransactionSourceGrounding({
          sourceText: item.evidence_text,
          item: transaction,
        });
      if (!grounded?.grounded) {
        await supabase
          .from("email_import_review_items")
          .update({
            save_status: "failed",
            save_result: { code: "GROUNDING_FAILED" },
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        continue;
      }
      resolved.push({
        ...grounded.item,
        idempotencyKey: item.save_idempotency_key,
      });
      await supabase
        .from("email_import_review_items")
        .update({
          save_status: "processing",
          selected_option_ids: decision.optionIds,
          resolved_transaction: grounded.item,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id)
        .eq("save_status", "pending");
    }
    if (resolved.length > 0) {
      const result = await saveTransactionsBatchInternal(
        new Request(url, {
          headers: buildInternalInvokeHeaders(resolveInternalFunctionKey()),
        }),
        {
          userId: existing.user_id,
          manualImportMode: true,
          skipSemanticDuplicates: true,
          debugTraceId: `email-review:${existing.id}`,
          transactions: resolved as any,
        },
      );
      for (const [index, resultItem] of result.results.entries()) {
        const transaction = resolved[index];
        await supabase
          .from("email_import_review_items")
          .update({
            save_status: resultItem.duplicate
              ? "duplicate"
              : resultItem.success
                ? "saved"
                : "failed",
            save_result: resultItem,
            evidence_expires_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("save_idempotency_key", transaction.idempotencyKey);
      }
    }
    const { data: pending } = await supabase
      .from("email_import_review_items")
      .select("id, save_status")
      .eq("review_id", existing.id);
    const isDeclined = (pending ?? []).every(
      (item: any) => item.save_status === "declined",
    );
    await supabase
      .from("email_import_reviews")
      .update({
        status: isDeclined ? "declined" : "completed",
        completed_at: new Date().toISOString(),
        declined_at: isDeclined ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("status", "processing");
    await supabase
      .from("email_import_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("id", existing.email_import_event_id)
      .eq("status", "awaiting_review");
    return inspectTerminal(supabase, existing.id, headers);
  } catch (_) {
    return new Response(JSON.stringify({ status: "retryable_failure" }), {
      status: 503,
      headers,
    });
  }
});

async function inspectTerminal(
  supabase: any,
  reviewId: string,
  headers: Record<string, string>,
) {
  const { data: review } = await supabase
    .from("email_import_reviews")
    .select("status, version, expires_at")
    .eq("id", reviewId)
    .single();
  const { data: items } = await supabase
    .from("email_import_review_items")
    .select("id, save_status, save_result, resolved_transaction")
    .eq("review_id", reviewId)
    .order("source_index");
  return new Response(
    JSON.stringify({
      status: review.status,
      version: review.version,
      expiresAt: review.expires_at,
      items: items ?? [],
    }),
    { headers },
  );
}

function invalid(headers: Record<string, string>, status = 404) {
  return new Response(JSON.stringify({ status: "invalid" }), {
    status,
    headers,
  });
}
function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
