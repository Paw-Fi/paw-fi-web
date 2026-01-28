// Supabase Edge Function: analyze-expense
// Analyzes text or image to extract transaction data (expense or income) WITHOUT saving to database
// Used by clients to extract structured transactions before logging

import { corsHeaders } from "../shared/cors.ts";
import { runAnalyzeExpense, AnalyzeRequestBody } from "../shared/analyze-core.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: AnalyzeRequestBody;
    try {
      body = await req.json();
    } catch (_error) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

        const { data: userData, error: userErr } = await supabaseAuthed.auth.getUser();
        const callerId = userData?.user?.id;
        if (userErr || !callerId) {
          return new Response(
            JSON.stringify({ success: false, error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        if (body.userId && body.userId !== callerId) {
          return new Response(
            JSON.stringify({ success: false, error: "userId mismatch" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        body.userId = callerId;

        // In household mode, provide the household member list to the model so it can
        // reliably resolve payer/splits by userId (without exposing IDs to end users).
        if (body.householdId && !body.isPortfolio && !Array.isArray(body.householdMembers)) {
          const { data: membership, error: membershipError } = await supabaseAuthed
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
                  global: { headers: { "X-Client-Info": "moneko-analyze-expense" } },
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

    let result: any;
    try {
      const analysisPromise = runAnalyzeExpense(body, GEMINI_API_KEY);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Analysis timed out after 30 seconds")), 30000)
      );
      result = await Promise.race([analysisPromise, timeoutPromise]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = message.includes("timed out") ? 504 : 500;
      return new Response(
        JSON.stringify({ success: false, error: message }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!result.success) {
      const status = result.status || 400;
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[analyze-expense] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to analyze expense',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
