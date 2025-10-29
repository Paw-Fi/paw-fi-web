// Supabase Edge Function: list-expenses
// Returns recent expenses for a user (optionally filtered by date range)

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { detectGptRequest, ensureGuestIdentity } from "../shared/gpt-guests.ts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const USE_MOCK_DATA = true;

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

interface RequestBody {
  userId?: string;
  limit?: number;
  startDate?: string;
  endDate?: string;
  currency?: string;
}

interface ExpenseRecord {
  id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  category: string;
  date: string;
  raw_text: string | null;
  receipt_image_url: string | null;
  created_at: string;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = (await req.json()) as RequestBody;

    console.log("[list-expenses] Incoming request body:", body);

    const detection = detectGptRequest(req);

    let userId = sanitizeUuid(body.userId ?? null);

    if (body.userId && !userId) {
      console.warn("[list-expenses] Ignoring invalid userId provided in payload", {
        provided: body.userId,
        conversationId: detection.conversationId,
      });
    }

    if (!userId && !detection.isGpt) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const limit = Math.max(1, Math.min(body.limit ?? DEFAULT_LIMIT, MAX_LIMIT));

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        global: { headers: { "X-Client-Info": "moneko-list-expenses" } },
      },
    );

    if (!userId && detection.isGpt) {
      if (!detection.conversationId) {
        return new Response(
          JSON.stringify({ error: "conversationId required for GPT requests" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      try {
        const guestIdentity = await ensureGuestIdentity({
          supabase,
          conversationId: detection.conversationId,
        });
        userId = guestIdentity.userId;
        console.log("[list-expenses] Resolved GPT guest identity", {
          conversationId: detection.conversationId,
          userId,
        });
      } catch (guestError) {
        console.error("[list-expenses] Failed to resolve GPT guest identity:", guestError);
        return new Response(
          JSON.stringify({ error: "Failed to prepare GPT guest user" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unable to resolve user" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const resolvedMeta: Record<string, unknown> = {};
    if (detection.conversationId) {
      resolvedMeta.conversationId = detection.conversationId;
    }
    if (detection.ephemeralUserId) {
      resolvedMeta.ephemeralUserId = detection.ephemeralUserId;
    }

    if (USE_MOCK_DATA) {
      console.log("[list-expenses] Returning mock data for testing");
      const mockItems = [
        {
          id: "mock-expense-1",
          date: new Date().toISOString().slice(0, 10),
          category: "food",
          description: "Mock lunch expense",
          amountMajor: 12.5,
          currency: "USD",
          receiptImageUrl: null,
          createdAt: new Date().toISOString(),
        },
        {
          id: "mock-expense-2",
          date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
          category: "transport",
          description: "Mock ride expense",
          amountMajor: 8,
          currency: "USD",
          receiptImageUrl: null,
          createdAt: new Date().toISOString(),
        },
      ];

      return new Response(
        JSON.stringify({
          success: true,
          data: mockItems,
          resolvedUserId: userId,
          meta: {
            count: mockItems.length,
            limit,
            filters: {
              startDate: body.startDate ?? null,
              endDate: body.endDate ?? null,
              currency: body.currency ?? null,
            },
            identity: resolvedMeta,
            mocked: true,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const now = new Date();
    const data = [
      {
        id: crypto.randomUUID(),
        date: now.toISOString().slice(0, 10),
        category: "food",
        description: "Lunch at Green Bowl",
        amountMajor: 14.25,
        currency: "USD",
        receiptImageUrl: null,
        createdAt: now.toISOString(),
      },
      {
        id: crypto.randomUUID(),
        date: new Date(now.getTime() - 86400000).toISOString().slice(0, 10),
        category: "transport",
        description: "Metro pass",
        amountMajor: 45,
        currency: "USD",
        receiptImageUrl: null,
        createdAt: now.toISOString(),
      },
      {
        id: crypto.randomUUID(),
        date: new Date(now.getTime() - 172800000).toISOString().slice(0, 10),
        category: "groceries",
        description: "WholeFoods grocery run",
        amountMajor: 62.87,
        currency: "USD",
        receiptImageUrl: null,
        createdAt: now.toISOString(),
      },
    ].slice(0, limit);

    return new Response(
      JSON.stringify({
        success: true,
        data,
        resolvedUserId: userId,
        meta: {
          count: data.length,
          limit,
          filters: {
            startDate: body.startDate ?? null,
            endDate: body.endDate ?? null,
            currency: body.currency ?? null,
          },
          identity: resolvedMeta,
          mocked: true,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[list-expenses] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to fetch expenses",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
