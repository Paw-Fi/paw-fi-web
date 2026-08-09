import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "../shared/cors.ts";
import {
  hashEmailImportReviewToken,
  isValidReviewToken,
} from "../shared/email-import-review.ts";

const url = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const MAX_REQUEST_BYTES = 4 * 1024;

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
    return invalidResponse(headers, 405);
  }
  try {
    const body = await readBoundedJson(request, MAX_REQUEST_BYTES);
    if (!body || !isUuid(body?.reviewId) || !isValidReviewToken(body?.token)) {
      return invalidResponse(headers);
    }
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const tokenHash = await hashEmailImportReviewToken(body.token);
    const { error: cleanupError } = await supabase.rpc(
      "expire_email_import_review_evidence",
    );
    if (cleanupError) throw cleanupError;
    const { data: review, error: reviewError } = await supabase
      .from("email_import_reviews")
      .select(
        "id, status, version, expires_at, completed_at, declined_at, last_error",
      )
      .eq("id", body.reviewId)
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (reviewError || !review) return invalidResponse(headers);
    if (
      new Date(review.expires_at).getTime() <= Date.now() &&
      review.status === "pending"
    ) {
      await supabase
        .from("email_import_reviews")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", review.id)
        .eq("status", "pending");
      return new Response(
        JSON.stringify({ status: "expired", expiresAt: review.expires_at }),
        { headers },
      );
    }
    const { data: items, error: itemsError } = await supabase
      .from("email_import_review_items")
      .select(
        "id, candidate, issues, options, selected_option_ids, resolved_transaction, save_status, save_result",
      )
      .eq("review_id", review.id)
      .order("source_index");
    if (itemsError) throw itemsError;
    return new Response(
      JSON.stringify({
        status: review.status,
        version: review.version,
        expiresAt: review.expires_at,
        items: (items ?? []).map((item: any) => ({
          id: item.id,
          summary: summary(item.candidate),
          issues: item.issues,
          options: item.options,
          selectedOptionIds: item.selected_option_ids,
          resolvedTransaction: item.resolved_transaction,
          saveStatus: item.save_status,
          result: item.save_result,
        })),
      }),
      { headers },
    );
  } catch (_) {
    return invalidResponse(headers);
  }
});

function invalidResponse(headers: Record<string, string>, status = 404) {
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

function summary(candidate: Record<string, unknown>): string {
  return typeof candidate.description === "string"
    ? candidate.description.slice(0, 160)
    : "Transaction awaiting review";
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
