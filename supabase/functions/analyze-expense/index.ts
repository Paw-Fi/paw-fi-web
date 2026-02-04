// Supabase Edge Function: analyze-expense
// Analyzes text or image to extract transaction data (expense or income) WITHOUT saving to database
// Used by clients to extract structured transactions before logging
// Supports SSE streaming for real-time progress updates (opt-in via ?stream=true query param)

import { corsHeaders } from "../shared/cors.ts";
import {
  AnalyzeRequestBody,
  ProgressCallback,
  ProgressEvent,
  runAnalyzeExpense,
} from "../shared/analyze-core.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

/**
 * Formats an SSE event message
 */
function formatSSEEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function resolveProgressMessage(
  event: ProgressEvent,
  body: AnalyzeRequestBody,
): string {
  if (typeof event.message === "string" && event.message.trim().length > 0) {
    return event.message;
  }

  if (body.image) {
    switch (event.type) {
      case "started":
        return "Reading receipt image...";
      case "processing_vision":
        return "Analyzing receipt details...";
      default:
        return "Analyzing receipt...";
    }
  }

  switch (event.type) {
    case "started":
      return "Starting analysis...";
    case "extracting_text":
      return "Extracting text...";
    case "analyzing_chunk":
      return "Analyzing transactions...";
    case "processing_vision":
      return "Analyzing scanned document...";
    case "complete":
      return "Finalizing results...";
    default:
      return "Processing...";
  }
}

function mapProgressEvent(
  event: ProgressEvent,
  body: AnalyzeRequestBody,
): Record<string, unknown> {
  return {
    stage: event.type,
    message: resolveProgressMessage(event, body),
    currentItem: event.current,
    totalItems: event.total,
  };
}

/**
 * Creates a readable stream that sends SSE events during analysis
 */
function createSSEStream(
  body: AnalyzeRequestBody,
  geminiApiKey: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Create progress callback that sends SSE events
        const onProgress: ProgressCallback = (event: ProgressEvent) => {
          const payload = mapProgressEvent(event, body);
          const sseMessage = formatSSEEvent("progress", payload);
          controller.enqueue(encoder.encode(sseMessage));
        };

        // Run analysis with progress callback
        const analysisPromise = runAnalyzeExpense(
          body,
          geminiApiKey,
          onProgress,
        );

        // Timeout for the entire analysis (3 minutes)
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Analysis timed out after 180 seconds")),
            180000,
          ),
        );

        const result = await Promise.race([analysisPromise, timeoutPromise]);

        // Send final result as complete event
        if (result.success) {
          const completeData = {
            success: true,
            data: {
              items: result.items,
              isAnalyzed: true,
              language: result.language,
            },
          };
          controller.enqueue(
            encoder.encode(formatSSEEvent("complete", completeData)),
          );
        } else {
          controller.enqueue(
            encoder.encode(
              formatSSEEvent("error", {
                success: false,
                error: result.error,
              }),
            ),
          );
        }

        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        controller.enqueue(
          encoder.encode(
            formatSSEEvent("error", {
              success: false,
              error: message,
            }),
          ),
        );
        controller.close();
      }
    },
  });
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check for SSE streaming mode via query parameter
    const url = new URL(req.url);
    const isStreamMode = url.searchParams.get("stream") === "true";

    // Parse request body
    let body: AnalyzeRequestBody;
    try {
      body = await req.json();
    } catch (_error) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // If we have an auth header, verify the caller and enrich household context safely under RLS.
    const authHeader = req.headers.get("Authorization") || "";
    if (SUPABASE_URL && SUPABASE_ANON_KEY && authHeader) {
      try {
        const supabaseAuthed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
          global: { headers: { Authorization: authHeader } },
        });

        const { data: userData, error: userErr } =
          await supabaseAuthed.auth.getUser();
        const callerId = userData?.user?.id;
        if (userErr || !callerId) {
          return new Response(
            JSON.stringify({ success: false, error: "Unauthorized" }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        if (body.userId && body.userId !== callerId) {
          return new Response(
            JSON.stringify({ success: false, error: "userId mismatch" }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        body.userId = callerId;

        // In household mode, provide the household member list to the model so it can
        // reliably resolve payer/splits by userId (without exposing IDs to end users).
        if (
          body.householdId &&
          !body.isPortfolio &&
          !Array.isArray(body.householdMembers)
        ) {
          const { data: membership, error: membershipError } =
            await supabaseAuthed
              .from("household_members")
              .select("id")
              .eq("household_id", body.householdId)
              .eq("user_id", callerId)
              .maybeSingle();

          if (!membershipError && membership?.id) {
            // Prefer admin read for full member profile fields (RLS-safe because we
            // already verified the caller is a member via the authed client).
            const canAdminRead = !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
            const reader = canAdminRead
              ? createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
                  auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                    detectSessionInUrl: false,
                  },
                  global: {
                    headers: { "X-Client-Info": "moneko-analyze-expense" },
                  },
                })
              : supabaseAuthed;

            const { data: members, error: membersError } = await reader
              .from("household_members")
              .select("user_id, users(full_name, email)")
              .eq("household_id", body.householdId);

            if (!membersError && Array.isArray(members) && members.length > 0) {
              body.householdMembers = members.map((m: any) => ({
                userId: m.user_id,
                userName: m.users?.full_name ?? null,
                userEmail: m.users?.email ?? null,
              }));
            }
          }
        }
      } catch (e) {
        console.error("[analyze-expense] auth/context enrichment failed:", e);
      }
    }

    // SSE Streaming Mode - returns text/event-stream with progress events
    if (isStreamMode) {
      console.log("[analyze-expense] Starting SSE streaming mode");

      const stream = createSSEStream(body, GEMINI_API_KEY);

      return new Response(stream, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Standard JSON Mode (default, backward compatible)
    let result: any;
    try {
      const analysisPromise = runAnalyzeExpense(body, GEMINI_API_KEY);
      // Increased timeout from 30s to 180s (3 minutes) for large PDF/document processing
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Analysis timed out after 180 seconds")),
          180000,
        ),
      );
      result = await Promise.race([analysisPromise, timeoutPromise]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = message.includes("timed out") ? 504 : 500;
      return new Response(JSON.stringify({ success: false, error: message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!result.success) {
      const status = result.status || 400;
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          items: result.items,
          isAnalyzed: true,
          language: result.language,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[analyze-expense] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to analyze expense",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
