import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";

interface ErrorAggregateRow {
  window_start: string;
  function_name: string;
  fingerprint: string;
  count: number;
  first_seen_at: string;
  last_seen_at: string;
  sample_message: string | null;
  sample_stack: string | null;
  sample_context: Record<string, unknown> | null;
}

function floorToFiveMinuteWindow(date: Date) {
  const ms = date.getTime();
  const fiveMinutes = 5 * 60 * 1000;
  return new Date(Math.floor(ms / fiveMinutes) * fiveMinutes);
}

function trimText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(1, maxLength - 3))}...`;
}

function scrubSensitiveText(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]")
    .replace(
      /(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi,
      "$1=[REDACTED]",
    )
    .replace(
      /[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
      "[REDACTED_JWT]",
    );
}

function escapeHtml(raw: string) {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatContext(context: Record<string, unknown> | null) {
  if (!context) return "";
  try {
    return scrubSensitiveText(trimText(JSON.stringify(context, null, 2), 6000));
  } catch {
    return "[unserializable context]";
  }
}

function buildDigestEmail(rows: ErrorAggregateRow[], windowStartIso: string) {
  const sortedRows = [...rows].sort(
    (a, b) => Number(b.count || 0) - Number(a.count || 0),
  );
  const cappedRows = sortedRows.slice(0, 100);
  const droppedRows = Math.max(0, sortedRows.length - cappedRows.length);
  const totalCount = rows.reduce((sum, row) => sum + Number(row.count || 0), 0);

  const groupedByFunction = new Map<string, ErrorAggregateRow[]>();
  for (const row of cappedRows) {
    const list = groupedByFunction.get(row.function_name) || [];
    list.push(row);
    groupedByFunction.set(row.function_name, list);
  }

  const groups = Array.from(groupedByFunction.entries()).sort((a, b) => {
    const countA = a[1].reduce((sum, row) => sum + Number(row.count || 0), 0);
    const countB = b[1].reduce((sum, row) => sum + Number(row.count || 0), 0);
    return countB - countA;
  });

  const htmlSections: string[] = [];
  const textSections: string[] = [];

  for (const [functionName, functionRows] of groups) {
    const functionTotal = functionRows.reduce(
      (sum, row) => sum + Number(row.count || 0),
      0,
    );

    const htmlEntries = functionRows
      .map((row) => {
        const context = escapeHtml(formatContext(row.sample_context));
        const message = escapeHtml(
          scrubSensitiveText(
            trimText(row.sample_message || "(no message)", 3000),
          ),
        );
        const stack = escapeHtml(
          scrubSensitiveText(trimText(row.sample_stack || "(no stack)", 6000)),
        );

        return `<li style="margin-bottom:16px;">
  <div><strong>fingerprint:</strong> ${escapeHtml(row.fingerprint)}</div>
  <div><strong>count:</strong> ${Number(row.count || 0)}</div>
  <div><strong>first_seen_at:</strong> ${escapeHtml(row.first_seen_at || "")}</div>
  <div><strong>last_seen_at:</strong> ${escapeHtml(row.last_seen_at || "")}</div>
  <div><strong>message:</strong> <pre style="white-space:pre-wrap;margin:4px 0;">${message}</pre></div>
  <div><strong>stack:</strong> <pre style="white-space:pre-wrap;margin:4px 0;">${stack}</pre></div>
  <div><strong>context:</strong> <pre style="white-space:pre-wrap;margin:4px 0;">${context}</pre></div>
</li>`;
      })
      .join("\n");

    htmlSections.push(`<section style="margin:20px 0;">
<h2 style="margin:0 0 8px 0;">${escapeHtml(functionName)} (${functionTotal})</h2>
<ul style="padding-left:20px;">${htmlEntries}</ul>
</section>`);

    const textEntries = functionRows
      .map((row) => {
        return [
          `- fingerprint: ${row.fingerprint}`,
          `  count: ${Number(row.count || 0)}`,
          `  first_seen_at: ${row.first_seen_at || ""}`,
          `  last_seen_at: ${row.last_seen_at || ""}`,
          `  message: ${scrubSensitiveText(trimText(row.sample_message || "(no message)", 3000))}`,
          `  stack: ${scrubSensitiveText(trimText(row.sample_stack || "(no stack)", 6000))}`,
          `  context: ${formatContext(row.sample_context)}`,
        ].join("\n");
      })
      .join("\n\n");

    textSections.push(
      [
        `Function: ${functionName}`,
        `Total: ${functionTotal}`,
        textEntries,
      ].join("\n"),
    );
  }

  const env = Deno.env.get("ENV") || "production";
  const subject = `[Moneko][${env}][Edge Errors] ${windowStartIso} - ${totalCount} errors`;

  const html = `<div style="font-family:Arial,sans-serif;line-height:1.5;">
<h1 style="margin-bottom:8px;">Edge Error Digest</h1>
<p><strong>window_start:</strong> ${escapeHtml(windowStartIso)}</p>
<p><strong>total_errors:</strong> ${totalCount}</p>
<p><strong>unique_fingerprints:</strong> ${rows.length}</p>
<p><strong>included_fingerprints:</strong> ${cappedRows.length}</p>
${droppedRows > 0 ? `<p><strong>truncated:</strong> +${droppedRows} additional fingerprints not shown.</p>` : ""}
${htmlSections.join("\n")}
</div>`;

  const text = [
    "Edge Error Digest",
    `window_start: ${windowStartIso}`,
    `total_errors: ${totalCount}`,
    `unique_fingerprints: ${rows.length}`,
    `included_fingerprints: ${cappedRows.length}`,
    droppedRows > 0 ? `truncated_fingerprints: ${droppedRows}` : "",
    "",
    textSections.join("\n\n"),
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text, totalCount };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);
  
  try {

    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFrom = "no-reply@moneko.io";
    const alertsTo = Deno.env.get("EDGE_ERROR_ALERT_TO");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[edge-error-digest] Missing Supabase config");
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!resendApiKey) {
      console.error("[edge-error-digest] RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!alertsTo) {
      console.error("[edge-error-digest] EDGE_ERROR_ALERT_TO is not configured");
      return new Response(
        JSON.stringify({ error: "EDGE_ERROR_ALERT_TO is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

  const currentWindow = floorToFiveMinuteWindow(new Date());

  const { data: pendingWindows, error: pendingWindowsError } = await supabase
    .from("edge_error_aggregates")
    .select("window_start")
    .lt("window_start", currentWindow.toISOString())
    .order("window_start", { ascending: false })
    .limit(200);

  if (pendingWindowsError) {
    console.error("[edge-error-digest] Failed to fetch pending windows:", pendingWindowsError);
    return new Response(
      JSON.stringify({ error: "Failed to fetch pending windows" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const uniqueWindows = Array.from(
    new Set(
      (pendingWindows || []).map(
        (row: { window_start: string }) => row.window_start,
      ),
    ),
  );

  let candidateWindows = uniqueWindows;
  if (uniqueWindows.length > 0) {
    const { data: digestStatuses, error: digestStatusesError } = await supabase
      .from("edge_error_digest_windows")
      .select("window_start,status")
      .in("window_start", uniqueWindows);

    if (digestStatusesError) {
      console.error(
        "[edge-error-digest] Failed to load digest window statuses:",
        digestStatusesError,
      );
    } else {
      const sentWindowSet = new Set(
        (digestStatuses || [])
          .filter(
            (row: { window_start: string; status: string }) =>
              row?.status === "sent",
          )
          .map(
            (row: { window_start: string; status: string }) =>
              row.window_start,
          ),
      );
      candidateWindows = uniqueWindows.filter(
        (windowStart) => !sentWindowSet.has(windowStart),
      );
      console.log("[edge-error-digest] Window selection summary", {
        fetched: uniqueWindows.length,
        sentFilteredOut: sentWindowSet.size,
        candidates: candidateWindows.length,
      });
    }
  }

  if (!candidateWindows.length) {
    console.log("[edge-error-digest] No candidate windows after filtering");
    return new Response(
      JSON.stringify({ ok: true, processed_windows: 0, sent_windows: 0 }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  let sentWindows = 0;
  const results: Array<Record<string, unknown>> = [];
  const rowsForDigest: ErrorAggregateRow[] = [];
  const windowsForDigest: string[] = [];

  for (const windowStart of candidateWindows) {
    try {
      const { data: claimData, error: claimError } = await supabase.rpc(
        "claim_edge_error_digest_window",
        { p_window_start: windowStart },
      );

      if (claimError) {
        console.error(`[edge-error-digest] Claim failed for ${windowStart}:`, claimError);
        results.push({ window_start: windowStart, error: "claim_failed" });
        continue;
      }

      if (!claimData) {
        results.push({ window_start: windowStart, skipped: "not_claimed" });
        continue;
      }

      const { data: rows, error: rowsError } = await supabase
        .from("edge_error_aggregates")
        .select(
          "window_start, function_name, fingerprint, count, first_seen_at, last_seen_at, sample_message, sample_stack, sample_context",
        )
        .eq("window_start", windowStart)
        .order("count", { ascending: false });

      if (rowsError) {
        console.error(`[edge-error-digest] Failed to load rows for ${windowStart}:`, rowsError);
        const { error: markFailedError } = await supabase
          .from("edge_error_digest_windows")
          .upsert({
            window_start: windowStart,
            status: "failed",
            last_error: "failed_to_load_rows",
            updated_at: new Date().toISOString(),
          });
        if (markFailedError) throw markFailedError;

        results.push({
          window_start: windowStart,
          error: "failed_to_load_rows",
        });
        continue;
      }

      if (!rows || rows.length === 0) {
        const { error: markEmptyError } = await supabase
          .from("edge_error_digest_windows")
          .upsert({
            window_start: windowStart,
            status: "sent",
            sent_at: new Date().toISOString(),
            last_error: null,
            updated_at: new Date().toISOString(),
          });
        if (markEmptyError) throw markEmptyError;

        results.push({ window_start: windowStart, skipped: "empty" });
        continue;
      }

      rowsForDigest.push(...(rows as ErrorAggregateRow[]));
      windowsForDigest.push(windowStart);
      results.push({
        window_start: windowStart,
        queued_for_batch: true,
        unique_fingerprints: rows.length,
      });
    } catch (windowError) {
      const lastError = trimText(
        windowError instanceof Error
          ? windowError.message
          : String(windowError),
        1000,
      );
      const { error: markFailedError } = await supabase
        .from("edge_error_digest_windows")
        .upsert({
          window_start: windowStart,
          status: "failed",
          last_error: lastError,
          updated_at: new Date().toISOString(),
        });

      if (markFailedError) {
        results.push({
          window_start: windowStart,
          error: "window_failed_and_failed_to_mark",
        });
        continue;
      }

      results.push({
        window_start: windowStart,
        error: "window_processing_failed",
      });
    }
  }

  if (rowsForDigest.length > 0 && windowsForDigest.length > 0) {
    const firstWindow = windowsForDigest[0];
    const lastWindow = windowsForDigest[windowsForDigest.length - 1];
    const digestWindowLabel = firstWindow === lastWindow
      ? firstWindow
      : `${firstWindow} .. ${lastWindow}`;

    const digest = buildDigestEmail(rowsForDigest, digestWindowLabel);
    const resendAbortController = new AbortController();
    const resendTimeout = setTimeout(
      () => resendAbortController.abort(),
      20000,
    );

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [alertsTo],
        subject: digest.subject,
        html: digest.html,
        text: digest.text,
      }),
      signal: resendAbortController.signal,
    }).finally(() => clearTimeout(resendTimeout));

    console.log("[edge-error-digest] Batched resend response", {
      status: resendResponse.status,
      windowsInBatch: windowsForDigest.length,
      rowsInBatch: rowsForDigest.length,
    });

    if (!resendResponse.ok) {
      const resendError = trimText(await resendResponse.text(), 2000);
      console.error("[edge-error-digest] Resend API error for batched digest:", {
        status: resendResponse.status,
        error: resendError,
      });

      for (const windowStart of windowsForDigest) {
        const { error: markFailedError } = await supabase
          .from("edge_error_digest_windows")
          .upsert({
            window_start: windowStart,
            status: "failed",
            last_error: `resend_error:${resendResponse.status}:${resendError}`,
            updated_at: new Date().toISOString(),
          });
        if (markFailedError) {
          console.error("[edge-error-digest] Failed to mark window as failed:", {
            windowStart,
            markFailedError,
          });
        }
      }

      results.push({
        error: "batched_resend_send_failed",
        status: resendResponse.status,
        windows_in_batch: windowsForDigest.length,
      });
    } else {
      for (const windowStart of windowsForDigest) {
        const { error: markSentError } = await supabase
          .from("edge_error_digest_windows")
          .upsert({
            window_start: windowStart,
            status: "sent",
            sent_at: new Date().toISOString(),
            last_error: null,
            updated_at: new Date().toISOString(),
          });
        if (markSentError) throw markSentError;
        sentWindows++;
      }

      results.push({
        sent: true,
        windows_in_batch: windowsForDigest.length,
        total_errors: digest.totalCount,
        unique_fingerprints: rowsForDigest.length,
      });

      // Immediate cleanup after successful digest delivery.
      const { error: deleteAggregatesError } = await supabase
        .from("edge_error_aggregates")
        .delete()
        .in("window_start", windowsForDigest);

      if (deleteAggregatesError) {
        console.error(
          "[edge-error-digest] Failed to cleanup edge_error_aggregates:",
          deleteAggregatesError,
        );
      }

      const { error: deleteDigestWindowsError } = await supabase
        .from("edge_error_digest_windows")
        .delete()
        .in("window_start", windowsForDigest);

      if (deleteDigestWindowsError) {
        console.error(
          "[edge-error-digest] Failed to cleanup edge_error_digest_windows:",
          deleteDigestWindowsError,
        );
      }
    }
  } else {
    console.log("[edge-error-digest] No rows collected for digest send", {
      candidateWindows: candidateWindows.length,
      sentWindows,
    });
  }
  
  return new Response(
    JSON.stringify({
      ok: true,
      processed_windows: candidateWindows.length,
      sent_windows: sentWindows,
      results,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
  } catch (error) {
    console.error("[edge-error-digest] Unhandled error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
