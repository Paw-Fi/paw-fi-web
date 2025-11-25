// Supabase Edge Function: analyze-expense
// Analyzes text or image to extract transaction data (expense or income) WITHOUT saving to database
// Used for confirmation modal before user saves

import { corsHeaders } from "../shared/cors.ts";
import { runAnalyzeExpense, AnalyzeRequestBody } from "../shared/analyze-core.ts";

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
    const body: AnalyzeRequestBody = await req.json();

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await runAnalyzeExpense(body, GEMINI_API_KEY);
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
