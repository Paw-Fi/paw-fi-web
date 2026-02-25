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

  const subject = `[Moneko][Edge Errors] ${windowStartIso} - ${totalCount} errors`;

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
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!resendApiKey) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY is not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (!alertsTo) {
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

  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    const requestToken = authHeader.replace("Bearer ", "").trim();
    const expectedToken = serviceRoleKey.trim();
    const isServiceRole = requestToken === expectedToken;

    if (!isServiceRole) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(requestToken);

      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  }

  const currentWindow = floorToFiveMinuteWindow(new Date());

  const { data: pendingWindows, error: pendingWindowsError } = await supabase
    .from("edge_error_aggregates")
    .select("window_start")
    .lt("window_start", currentWindow.toISOString())
    .order("window_start", { ascending: true })
    .limit(20);

  if (pendingWindowsError) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch pending windows" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const uniqueWindows = Array.from(
    new Set((pendingWindows || []).map((row) => row.window_start)),
  );

  if (!uniqueWindows.length) {
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

  for (const windowStart of uniqueWindows) {
    try {
      const { data: claimData, error: claimError } = await supabase.rpc(
        "claim_edge_error_digest_window",
        { p_window_start: windowStart },
      );

      if (claimError) {
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

      const digest = buildDigestEmail(rows as ErrorAggregateRow[], windowStart);

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

      if (!resendResponse.ok) {
        const resendError = trimText(await resendResponse.text(), 2000);
        const { error: markFailedError } = await supabase
          .from("edge_error_digest_windows")
          .upsert({
            window_start: windowStart,
            status: "failed",
            last_error: `resend_error:${resendResponse.status}:${resendError}`,
            updated_at: new Date().toISOString(),
          });
        if (markFailedError) throw markFailedError;

        results.push({
          window_start: windowStart,
          error: "resend_send_failed",
          status: resendResponse.status,
        });
        continue;
      }

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
      results.push({
        window_start: windowStart,
        sent: true,
        total_errors: digest.totalCount,
        unique_fingerprints: rows.length,
      });

      // Send at most one digest email per invocation.
      break;
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

  return new Response(
    JSON.stringify({
      ok: true,
      processed_windows: uniqueWindows.length,
      sent_windows: sentWindows,
      results,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
