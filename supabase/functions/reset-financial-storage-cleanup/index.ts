import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { authenticateInternalSecret } from "../shared/auth.ts";
import { corsHeaders } from "../shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface CleanupTarget {
  bucket: string;
  prefix: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const internalAuth = await authenticateInternalSecret(req);
  if (!internalAuth.success) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const body = await req.json().catch(() => ({}));
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  if (!UUID_PATTERN.test(userId)) {
    return jsonResponse({ error: "Invalid userId" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data: claimed, error: claimError } = await supabase.rpc(
    "claim_financial_storage_cleanup_job",
    { p_user_id: userId },
  );
  if (claimError || claimed !== true) {
    return jsonResponse({ error: "Failed to claim cleanup job" }, 500);
  }

  const targets: CleanupTarget[] = [
    { bucket: "expense-receipts", prefix: `receipts/${userId}` },
    { bucket: "public", prefix: `${userId}/wallet-logos` },
    { bucket: "public", prefix: `${userId}/pocket-logos` },
  ];

  try {
    let removed = 0;
    for (const target of targets) {
      removed += await removePrefix(supabase, target.bucket, target.prefix);
    }

    const { error: completeError } = await supabase
      .from("financial_storage_cleanup_jobs")
      .update({
        status: "completed",
        removed_object_count: removed,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (completeError) throw completeError;

    return jsonResponse({ success: true, removed });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase
      .from("financial_storage_cleanup_jobs")
      .update({
        status: "failed",
        last_error: message.slice(0, 1000),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    return jsonResponse({ error: "Storage cleanup failed" }, 500);
  }
});

async function removePrefix(
  supabase: any,
  bucket: string,
  prefix: string,
): Promise<number> {
  let removed = 0;
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    if (!data?.length) break;

    const paths: string[] = [];
    for (const object of data) {
      const path = `${prefix}/${object.name}`;
      if (object.metadata) {
        paths.push(path);
      } else {
        removed += await removePrefix(supabase, bucket, path);
      }
    }

    if (paths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(bucket)
        .remove(paths);
      if (removeError) throw removeError;
      removed += paths.length;
    }
  }
  return removed;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
