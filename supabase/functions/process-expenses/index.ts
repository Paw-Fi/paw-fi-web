// Supabase Edge Function: process-expenses
// Universal expense processor - accepts text or image, returns structured data

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import {
  processFreeFormTextExpense,
  processReceiptImage,
  type ProcessResult,
} from "../shared/expense-processors.ts";
import { validateCurrency } from "../shared/currency-validator.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";

interface RequestBody {
  userId?: string; // User ID (from mobile app)
  phone?: string; // Phone number (from WhatsApp webhook)
  text?: string;
  image?: {
    data: string; // base64 encoded image
    contentType: string; // e.g., "image/jpeg"
  };
  date?: string; // ISO date (YYYY-MM-DD), defaults to today
  currency?: string; // ISO currency code, defaults to USD
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

    // Parse request body
    const body: RequestBody = await req.json();

    // Validate required fields - must have either userId or phone
    if (!body.userId && !body.phone) {
      return new Response(
        JSON.stringify({ error: "Must provide either userId or phone" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!body.text && !body.image) {
      return new Response(
        JSON.stringify({ error: "Must provide either text or image" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (body.text && body.image) {
      return new Response(
        JSON.stringify({
          error:
            "Cannot process both text and image simultaneously. Send one at a time.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Set defaults with validation
    const callerDate = body.date || new Date().toISOString().slice(0, 10);

    // CURRENCY HIERARCHY (Layers 2-4):
    // Layer 1: Gemini detects currency in photo/text (handled by processors)
    // Layer 2: body.currency (user manually selected currency in app)
    // Layer 3: preferred_currency from database (user's saved preference)
    // Layer 4: 'USD' (final fallback)

    let callerCurrency: string;

    if (body.currency) {
      // Layer 2: User selected currency in request
      callerCurrency = validateCurrency(body.currency);
      console.log(
        "[process-expenses] Using Layer 2 currency (request):",
        callerCurrency,
      );
    } else {
      // Layer 3: Fetch user's preferred currency from database
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: { "X-Client-Info": "moneko-process-expenses-currency" },
        },
      });

      let preferredCurrency: string | null = null;

      if (body.userId) {
        const { data: contact, error: contactError } = await supabase
          .from("user_contacts")
          .select("preferred_currency")
          .eq("user_id", body.userId)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (contactError) {
          await reportEdgeFunctionError({
            functionName: "process-expenses",
            error: contactError,
            context: {
              operation: "user_contacts.select_currency_by_user",
              userId: body.userId,
            },
          });
        }
        preferredCurrency = contact?.preferred_currency || null;
      } else if (body.phone) {
        const { data: contact, error: contactError } = await supabase
          .from("user_contacts")
          .select("preferred_currency")
          .eq("phone_e164", body.phone)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (contactError) {
          await reportEdgeFunctionError({
            functionName: "process-expenses",
            error: contactError,
            context: {
              operation: "user_contacts.select_currency_by_phone",
              phone: body.phone,
            },
          });
        }
        preferredCurrency = contact?.preferred_currency || null;
      }

      if (preferredCurrency) {
        callerCurrency = validateCurrency(preferredCurrency);
        console.log(
          "[process-expenses] Using Layer 3 currency (preferred_currency):",
          callerCurrency,
        );
      } else {
        // Layer 4: Final fallback
        callerCurrency = "USD";
        console.log("[process-expenses] Using Layer 4 currency (USD fallback)");
      }
    }

    let result: ProcessResult;

    // Process based on input type
    if (body.text) {
      // Process free-form text
      console.log(
        "[process-expenses] Processing text input:",
        body.text.substring(0, 50),
      );
      result = await processFreeFormTextExpense({
        userId: body.userId,
        phone: body.phone,
        text: body.text,
        supabaseUrl: SUPABASE_URL,
        supabaseServiceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
        geminiApiKey: GEMINI_API_KEY,
        callerDate,
        callerCurrency,
      });
    } else if (body.image) {
      // Process image
      console.log(
        "[process-expenses] Processing image input, contentType:",
        body.image.contentType,
      );

      // Validate image content type
      if (
        !body.image.contentType ||
        !body.image.contentType.startsWith("image/")
      ) {
        return new Response(
          JSON.stringify({
            error: "Invalid image content type. Must be an image/* MIME type.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Decode base64 image with enhanced error handling
      let imageBuffer: Uint8Array;
      try {
        // Validate image data is not empty
        if (!body.image.data || body.image.data.trim().length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: "Image data is empty" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
        const base64Data = body.image.data.replace(
          /^data:image\/\w+;base64,/,
          "",
        );

        // Validate base64 data
        if (base64Data.length === 0) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Image data is empty after removing prefix",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        imageBuffer = bytes;

        // Validate image size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (imageBuffer.length > maxSize) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Image too large. Maximum size is 10MB, received ${
                (imageBuffer.length / 1024 / 1024).toFixed(2)
              }MB`,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Validate minimum image size (1KB to prevent empty images)
        if (imageBuffer.length < 1024) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Image too small. Minimum size is 1KB",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        console.log(
          `[process-expenses] Image decoded successfully: ${
            (imageBuffer.length / 1024).toFixed(2)
          }KB`,
        );
      } catch (e) {
        console.error("[process-expenses] Failed to decode base64 image:", e);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid base64 image data",
            details: e instanceof Error ? e.message : String(e),
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      result = await processReceiptImage({
        userId: body.userId,
        phone: body.phone,
        imageBuffer,
        contentType: body.image.contentType,
        supabaseUrl: SUPABASE_URL,
        supabaseServiceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
        geminiApiKey: GEMINI_API_KEY,
        callerDate,
        callerCurrency,
      });
    } else {
      // Should never reach here due to validation above
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return structured result
    console.log("[process-expenses] Result:", JSON.stringify(result));
    return new Response(
      JSON.stringify({
        success: !result.error,
        data: result,
      }),
      {
        status: result.error ? 400 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[process-expenses] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
