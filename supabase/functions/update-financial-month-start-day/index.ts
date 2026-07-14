// Supabase Edge Function: update-financial-month-start-day
// Update user's financial month start day in user_contacts (or create contact if missing).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { authenticateUserOrInternalSecret } from "../shared/auth.ts";
import { corsHeaders } from "../shared/cors.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { handleUpdateFinancialMonthStartDayRequest } from "../shared/financial-month-start-day.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleUpdateFinancialMonthStartDayRequest(req, {
      supabase: null,
      authenticate: async () => ({ success: false }),
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": "moneko-update-financial-month-start-day" },
    },
  });

  return handleUpdateFinancialMonthStartDayRequest(req, {
    supabase,
    authenticate: authenticateUserOrInternalSecret,
    reportError: reportEdgeFunctionError,
  });
});
