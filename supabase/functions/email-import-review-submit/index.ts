import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "../shared/cors.ts";
import {
  buildInternalInvokeHeaders,
  resolveInternalFunctionKey,
} from "../shared/auth.ts";
import {
  buildEmailImportReviewItem,
  buildEmailImportReviewSource,
  hashEmailImportReviewToken,
  isValidReviewToken,
  resolveStoredReviewDecision,
  validateStoredReviewDecisions,
} from "../shared/email-import-review.ts";
import { sanitizeTransactionSourceGrounding } from "../shared/analyze-core.ts";
import { saveTransactionsBatchInternal } from "../save-transactions-batch/index.ts";

const url = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_REVIEW_ITEMS = 25;

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
  ) {
    return invalid(headers, 405);
  }
  let claimedContext: {
    supabase: any;
    reviewId: string;
    tokenHash: string;
    attemptCount: number;
  } | null = null;
  try {
    const body = await readBoundedJson(request, MAX_REQUEST_BYTES);
    if (
      !body ||
      !isUuid(body?.reviewId) ||
      !isValidReviewToken(body?.token) ||
      !Number.isInteger(body?.version) ||
      !Array.isArray(body?.decisions) ||
      body.decisions.length > MAX_REVIEW_ITEMS
    ) {
      return invalid(headers);
    }
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
    if (!existing || new Date(existing.expires_at).getTime() <= Date.now()) {
      return invalid(headers);
    }
    if (["completed", "declined", "failed"].includes(existing.status)) {
      return inspectTerminal(supabase, existing.id, headers);
    }
    if (existing.version !== body.version) {
      return new Response(JSON.stringify({ status: "stale" }), {
        status: 409,
        headers,
      });
    }
    const { data: items, error: itemsError } = await supabase
      .from("email_import_review_items")
      .select(
        "id, source_index, candidate, evidence_text, issues, options, selected_option_ids, resolved_transaction, save_status, save_idempotency_key",
      )
      .eq("review_id", existing.id)
      .order("source_index");
    if (itemsError || !items || items.length > MAX_REVIEW_ITEMS) {
      throw itemsError ?? new Error("EMAIL_IMPORT_REVIEW_ITEMS_INVALID");
    }
    const validatedDecisions = validateStoredReviewDecisions(
      items as Array<any>,
      body.decisions,
    );
    if (!validatedDecisions) {
      return invalid(headers, 400);
    }

    const { data: claimed } = await supabase.rpc("claim_email_import_review", {
      p_review_id: existing.id,
      p_token_hash: tokenHash,
      p_version: body.version,
    });
    if (!claimed) {
      return new Response(JSON.stringify({ status: "processing" }), {
        status: 202,
        headers,
      });
    }
    const claimedRow = Array.isArray(claimed) ? claimed[0] : claimed;
    const claimedAttemptCount = Number(claimedRow?.processing_attempt_count);
    if (!Number.isInteger(claimedAttemptCount)) {
      throw new Error("EMAIL_IMPORT_REVIEW_CLAIM_INVALID");
    }
    claimedContext = {
      supabase,
      reviewId: existing.id,
      tokenHash,
      attemptCount: claimedAttemptCount,
    };

    const decisions = new Map(
      validatedDecisions.map((decision) => [decision.itemId, decision]),
    );
    const resolved = [] as Array<Record<string, unknown>>;
    for (const item of items as Array<any>) {
      const decision = decisions.get(item.id)!;
      if (
        ["saved", "duplicate", "declined", "failed"].includes(item.save_status)
      ) {
        continue;
      }
      if (decision?.decline === true) {
        await supabase
          .from("email_import_review_items")
          .update({
            save_status: "declined",
            selected_option_ids: [],
            evidence_expires_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id)
          .in("save_status", ["pending", "processing"]);
        continue;
      }
      const optionIds = item.save_status === "processing" &&
          Array.isArray(item.selected_option_ids)
        ? item.selected_option_ids
        : decision.optionIds;
      const transaction = item.save_status === "processing" &&
          item.resolved_transaction &&
          typeof item.resolved_transaction === "object"
        ? item.resolved_transaction
        : resolveStoredReviewDecision({
          candidate: item.candidate,
          issues: item.issues,
          optionIds,
        });
      const grounded = transaction &&
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
            evidence_expires_at: new Date().toISOString(),
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
          selected_option_ids: optionIds,
          resolved_transaction: grounded.item,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id)
        .in("save_status", ["pending", "processing"]);
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
      for (const resultItem of result.results) {
        const transaction = resolved[resultItem.index];
        if (!transaction) continue;
        await supabase
          .from("email_import_review_items")
          .update({
            save_status: resultItem.duplicate
              ? "duplicate"
              : resultItem.success
              ? "saved"
              : "failed",
            save_result: resultItem,
            evidence_expires_at: new Date(
              Date.now() + 60 * 60 * 1000,
            ).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("save_idempotency_key", transaction.idempotencyKey);
      }
    }
    const { data: pending } = await supabase
      .from("email_import_review_items")
      .select("id, save_status")
      .eq("review_id", existing.id);
    const itemStatuses = (pending ?? []).map((item: any) => item.save_status);
    const isDeclined = itemStatuses.length > 0 &&
      itemStatuses.every((status: string) => status === "declined");
    const hasFailed = itemStatuses.includes("failed");
    const isTerminal = itemStatuses.every((status: string) =>
      ["saved", "duplicate", "declined", "failed"].includes(status)
    );
    if (!isTerminal) {
      return new Response(JSON.stringify({ status: "processing" }), {
        status: 202,
        headers,
      });
    }
    const reviewStatus = isDeclined
      ? "declined"
      : hasFailed
      ? "failed"
      : "completed";
    const { data: finalizedReview, error: finalizeError } = await supabase
      .from("email_import_reviews")
      .update({
        status: reviewStatus,
        completed_at: new Date().toISOString(),
        declined_at: isDeclined ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("status", "processing")
      .eq("processing_attempt_count", claimedAttemptCount)
      .select("id");
    if (finalizeError) throw finalizeError;
    if (!finalizedReview?.length) {
      return new Response(JSON.stringify({ status: "processing" }), {
        status: 202,
        headers,
      });
    }
    const reviewSummary = {
      savedCount: itemStatuses.filter((status: string) => status === "saved")
        .length,
      duplicateCount: itemStatuses.filter(
        (status: string) => status === "duplicate",
      ).length,
      declinedCount: itemStatuses.filter(
        (status: string) => status === "declined",
      ).length,
      failedCount: itemStatuses.filter((status: string) => status === "failed")
        .length,
    };
    const { data: parentEvent } = await supabase
      .from("email_import_events")
      .select("result")
      .eq("id", existing.email_import_event_id)
      .maybeSingle();
    await supabase
      .from("email_import_events")
      .update({
        status: hasFailed ? "failed" : "processed",
        processed_at: new Date().toISOString(),
        result: {
          ...(parentEvent?.result && typeof parentEvent.result === "object"
            ? parentEvent.result
            : {}),
          reviewSummary,
        },
      })
      .eq("id", existing.email_import_event_id)
      .eq("status", "awaiting_review");
    return inspectTerminal(supabase, existing.id, headers);
  } catch (_) {
    if (claimedContext) {
      try {
        await claimedContext.supabase
          .from("email_import_reviews")
          .update({
            status: "pending",
            processing_started_at: null,
            last_error: "RETRYABLE_SUBMISSION_FAILURE",
            updated_at: new Date().toISOString(),
          })
          .eq("id", claimedContext.reviewId)
          .eq("token_hash", claimedContext.tokenHash)
          .eq("status", "processing")
          .eq("processing_attempt_count", claimedContext.attemptCount);
      } catch {
        // The processing lease still permits a safe retry after it becomes stale.
      }
    }
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
    .select("status, version, expires_at, email_import_event_id")
    .eq("id", reviewId)
    .single();
  const [{ data: items }, { data: event }] = await Promise.all([
    supabase
      .from("email_import_review_items")
      .select(
        "id, candidate, issues, options, selected_option_ids, save_status, save_result, resolved_transaction",
      )
      .eq("review_id", reviewId)
      .order("source_index"),
    supabase
      .from("email_import_events")
      .select("sender_email, created_at, result")
      .eq("id", review.email_import_event_id)
      .maybeSingle(),
  ]);
  return new Response(
    JSON.stringify({
      status: review.status,
      version: review.version,
      expiresAt: review.expires_at,
      source: buildEmailImportReviewSource(event),
      items: (items ?? []).map((item: Record<string, unknown>) =>
        buildEmailImportReviewItem(item)
      ),
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
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(
        value,
      )
  );
}

async function readBoundedJson(
  request: Request,
  maxBytes: number,
): Promise<Record<string, any> | null> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) return null;
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > maxBytes) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch (_) {
    return null;
  }
}
