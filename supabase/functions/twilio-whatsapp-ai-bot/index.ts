// Supabase Edge Function: twilio-whatsapp-ai-bot
// Handles WhatsApp messages via Twilio, using Gemini AI and MCP-style tools.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { corsHeaders } from "../shared/cors.ts";
import {
  buildVerificationPrompt,
  sendWhatsAppTemplate,
  sendWhatsAppMessage,
} from "../shared/whatsapp-helpers.ts";
import {
  isFreeUser,
} from "../shared/is-free-user.ts";
import { TWILIO_TEMPLATES } from "../shared/twilio-templates.ts";
import { fetchExpensesDirect, saveExpenseDirect, deleteExpenseDirect } from "../shared/expenses-helpers.ts";
import { createOrUpdateBudget, upsertEnvelope, upsertEnvelopeAllocation, upsertEnvelopeCategoryLink, getBudgetStatusDirect } from "../shared/budgets-helpers.ts";
import { insertChatMessage } from "../shared/chat-helpers.ts";
import { updatePreferredCurrency } from "../shared/currency-helpers.ts";
import { debugLog, formatInvokeError, normalizeExpensesForTool, buildCategoryChart, formatExpensesSummary, CATEGORY_GUIDE, formatAmount } from "../shared/formatting-helpers.ts";
import { runAnalyzeExpense, buildXlsxPreview, summarizePdfWithGemini } from "../shared/analyze-core.ts";
import { sendWhatsAppInteractiveButtons } from "../shared/whatsapp-helpers.ts";

// --- Constants & Types ---

const MODEL_NAME = "gemini-2.5-flash"; // Fast and capable
const SYSTEM_INSTRUCTION = `You are Moneko, a helpful and friendly financial assistant on WhatsApp.
Your goal is to help users track expenses, manage budgets, and view their financial health.
You can handle personal and household finances.

CRITICAL RULES:
1.  **Currency**: Always use the user's preferred currency or the currency detected in the text. If ambiguous, ask.
    - Use currency symbols (€, $, £, ₦, etc.) when replying instead of ISO codes.
2.  **Households**: If the user asks about "household" or "group" expenses, ask which household if they have multiple, or use the household_id provided in context.
3.  **Confirmation**: For ambiguous requests (e.g., "5 coffee"), ask for clarification (Personal or Household? Which category?).
    - Infer a category from the text and propose it (e.g., "latte" -> "food & drink"). Ask for quick confirmation before saving.
4.  **Charts**: If the user asks for a chart or graph, use the 'generate_chart_url' tool and provide the URL in your response. Explain that you are sending an image.
5.  **Recurring**: If the user says "monthly", "weekly", "every month", etc., set 'is_recurring' to true.
6.  **Tone**: Enthusiastic, encouraging, concise, and proactive (suitable for WhatsApp). Use light emojis, and close with a quick follow-up offer to help further (e.g., suggest related actions like totals, budgets, or recurring setup).
7.  **Totals**: When listing or summarizing expenses, always include a total spent for the requested range and mention how many items are shown.
8.  **Safety**: Do not reveal sensitive IDs.
9.  **Budgets/Pockets**: Budgets live in the budgets table. They can be split across pockets (envelopes) with percentage shares. When setting a budget, propose a total and how to split it across relevant pockets; create multiple pocket budgets if the user asks for splits.
10. **Pockets/Envelopes Actions**: You can create/update envelopes, set monthly allocations, link categories to envelopes, and show envelope status (alloc/spent/remaining) for a month.
11. **Reminders/Recurring**: Recurring transactions can include reminders; ask for frequency and whether to set a reminder if the user hints at it.
12. **Income vs Expense**: All transactions live in the "expenses" table with type = "expense" or "income". Default to expense if unclear. Always set the type when listing, adding, updating, or recurring. For household queries, use household_id to include transactions from all members; for personal, use contact_id with household_id IS NULL.
12. **Tooling discipline**: For add/update/delete/recurring/budget/envelope requests, call the appropriate tool. For recurring requests without a frequency, default to monthly. For incomes, set type="income".
13. **Privacy**: Never show raw IDs (household_id, expense_id, etc.) to the user. Refer to households by name only; if multiple, offer names, not IDs.
14. **Currency updates**: Preferred currency is stored in user_contacts.preferred_currency. When the user asks to change currency, call the currency tool to update that column and confirm.
15. **Buttons**: When offering up to 3 choices (households, pockets, budgets, follow-up options), prefer the send_quick_replies tool to present tappable buttons instead of long text lists.
16. **Financial snapshot**: For asks like “current financial situation/health/status”: provide one concise snapshot for the current month/pay-period: verdict, income vs spending (or say income not tracked), net, top 3–5 categories with % of spend, budget status (remaining/over/under + days left), upcoming recurring (next ~7 days), and 1–2 actions. If you send a chart, prefer a radar or donut of spending by category (not gauges). Always include the text summary; the chart is optional/secondary.
17. **Language**: Respond in the user's preferred language: {{LANGUAGE}}.

COMMON USER INTENTS (answer directly, propose next steps):
- Spending clarity: where money goes, why cash runs out, breakdowns by category, spot leaks, compare to norms.
- Cut costs: subscriptions, coffee, shopping, bills; suggest easy wins and alerts on jumps.
- Budgets: simple weekly/monthly limits, paycheck-aligned resets, category caps, envelopes, unpredictable expense cushions.
- Debt/overspending: payoff order, overdraft awareness, guardrails against impulse buys, nudges before risky spends.
- Emotional spending: cool-off rules, goal reminders before purchases, takeaway caps.
- Savings: emergency fund pace, holiday savings, “what if I cut X”, realistic monthly save targets.

CURRENT CONTEXT:
- Date: {{DATE}}
- User Currency: {{CURRENCY}}
- Households: {{HOUSEHOLDS}}
- Categories (with brand colors): {{CATEGORIES}}
`;

// --- Helper Functions ---
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function xmlResponse(xml: string, status = 200) {
  return new Response(xml, {
    status,
    headers: { "Content-Type": "text/xml" },
  });
}

function decodeBase64(data: string): Uint8Array {
  const cleaned = data.replace(/^data:.*;base64,/, "");
  const bin = atob(cleaned);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// Safe Uint8Array -> base64 encoder that avoids spreading large buffers into String.fromCharCode
function uint8ToBase64(buf: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000; // 32k chunk to avoid large argument lists
  for (let i = 0; i < buf.length; i += chunkSize) {
    const subarray = buf.subarray(i, Math.min(i + chunkSize, buf.length));
    binary += String.fromCharCode.apply(null, Array.from(subarray));
  }
  return btoa(binary);
}

function getDatePartsInTimeZone(tz: string | null | undefined, date = new Date()) {
  const timezone = (tz || "UTC").trim();
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const map = new Map(parts.map((p) => [p.type, p.value]));
    return {
      year: Number(map.get("year")),
      month: Number(map.get("month")),
      day: Number(map.get("day")),
    };
  } catch {
    const match = timezone.toUpperCase().match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/);
    if (match) {
      const sign = match[1] === "-" ? -1 : 1;
      const hours = Number(match[2]);
      const minutes = Number(match[3] || "0");
      const offsetMinutes = sign * (hours * 60 + minutes);
      const shifted = new Date(date.getTime() + offsetMinutes * 60 * 1000);
      return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth() + 1,
        day: shifted.getUTCDate(),
      };
    }
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
  }
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function formatDateInTimeZone(tz: string | null | undefined, date = new Date()) {
  const { year, month, day } = getDatePartsInTimeZone(tz, date);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function formatMonthStartInTimeZone(tz: string | null | undefined, date = new Date()) {
  const { year, month } = getDatePartsInTimeZone(tz, date);
  return `${year}-${pad2(month)}-01`;
}

function nextMonthStart(dateStr: string) {
  const [yearStr, monthStr] = dateStr.split("-").slice(0, 2);
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // JS months 0-based
  const dt = new Date(Date.UTC(year, month, 1));
  dt.setUTCMonth(dt.getUTCMonth() + 1);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-01`;
}

type FinancialSnapshot = {
  totalExpense: number;
  totalIncome: number;
  net: number;
  startDate: string;
  endDate: string;
  categories: { category: string; amount_cents: number }[];
  budget_cents: number | null;
  chart_url?: string;
};

// Twilio Signature Validation
async function validateTwilioRequest(req: Request, authToken: string): Promise<boolean> {
  const signatureHeader = req.headers.get("X-Twilio-Signature") || req.headers.get("x-twilio-signature");
  if (!signatureHeader) return false;

  const url = Deno.env.get("TWILIO_WEBHOOK_URL") || req.url;
  const rawBody = await req.clone().text();
  const params = new URLSearchParams(rawBody);
  
  const keys = Array.from(params.keys()).sort();
  let concatenated = url;
  for (const k of keys) concatenated += k + (params.get(k) ?? "");

  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(concatenated));
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const expected = btoa(binary);

  return expected === signatureHeader;
}

// --- Main Handler ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  const SECRET_API_KEY = Deno.env.get("SECRET_API_KEY");
  const WHATSAPP_DEBUG = (Deno.env.get("WHATSAPP_DEBUG") || "").toUpperCase() === "TRUE";
  const EDGE_FUNCTION_KEY = (SECRET_API_KEY || "").trim();
  const TWILIO_SKIP_SIGNATURE = (Deno.env.get("TWILIO_SKIP_SIGNATURE") || "").toLowerCase() === "true";

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY || !EDGE_FUNCTION_KEY) {
    console.error("Missing environment variables");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  // 1. Determine channel and optionally validate Twilio signature
  const contentType = req.headers.get("content-type") || "";
  const authHeader = req.headers.get("Authorization") || "";
  const isJsonApp = contentType.includes("application/json") && !!authHeader;

  // --- Supabase clients (used by both channels) ---
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const supabaseAuthed = SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      })
    : null;

  if (isJsonApp) {
    // App mode: expects JSON { session_id?, message?, attachments?: [{filename, contentType, data(base64)}] }
    let payload: any;
    try {
      payload = await req.json();
    } catch (e) {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    if (!supabaseAuthed) {
      return jsonResponse({ error: "Auth client not configured" }, 500);
    }
    const { data: userData, error: userErr } = await supabaseAuthed.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    // Resolve contact_id for this user (fallback to userId)
    const { data: contactRow } = await supabase
      .from("user_contacts")
    .select("id, preferred_currency, preferred_language, preferred_timezone")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const contactId = contactRow?.id || userId;
    const userCurrency = contactRow?.preferred_currency || "USD";
    const userLang = contactRow?.preferred_language || "en";
    const userTimezone = contactRow?.preferred_timezone || "UTC";

    const sessionId = payload.session_id || `app:${userId}`;
    const messageText = payload.message?.toString() || "";
    const attachments: any[] = Array.isArray(payload.attachments) ? payload.attachments : [];
    const debugNotes: string[] = [];

    // Ensure chat session
    let { data: session } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!session) {
      const { data: newSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert({ user_id: userId, session_id: sessionId, model: MODEL_NAME })
        .select()
        .single();
      if (sessionError || !newSession) {
        return jsonResponse({ error: "Failed to initialize chat session" }, 500);
      }
      session = newSession;
    }

    // Handle attachments: store to storage bucket "chat-attachments" (best-effort)
    const attachmentNotes: string[] = [];
    if (attachments.length) {
      const bucket = "chat-attachments";
      for (const att of attachments.slice(0, 5)) {
        if (!att?.data || !att?.filename) continue;
        try {
          const dataBytes = decodeBase64(att.data.toString());
          const path = `${userId}/${Date.now()}_${att.filename}`;
          const { data: upRes, error: upErr } = await supabase.storage
            .from(bucket)
            .upload(path, dataBytes, { contentType: att.contentType || "application/octet-stream", upsert: false });
          if (upErr) {
            attachmentNotes.push(`Upload failed for ${att.filename}`);
            continue;
          }
          const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(path);
          attachmentNotes.push(`Stored ${att.filename}: ${publicUrl.publicUrl}`);
        } catch (e) {
          attachmentNotes.push(`Upload exception for ${att.filename}`);
        }
      }
    }

    // Build user content text
    const userMessageContent = [messageText, attachmentNotes.join("\n")].filter(Boolean).join("\n");

    await insertChatMessage(supabase, session.id, "user", userMessageContent, debugNotes, WHATSAPP_DEBUG);

    // History
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("chat_session_id", session.id)
      .order("timestamp", { ascending: false })
      .limit(20);
    const rawHistory = (history || []).reverse().map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    while (rawHistory.length > 0 && rawHistory[0].role === "model") rawHistory.shift();

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTION
        .replace("{{DATE}}", formatDateInTimeZone(userTimezone))
        .replace("{{CURRENCY}}", userCurrency)
        .replace("{{HOUSEHOLDS}}", "None")
        .replace("{{CATEGORIES}}", CATEGORY_GUIDE)
        .replace("{{LANGUAGE}}", userLang),
    });

    const toolsApp = [
      {
        name: "add_transaction",
        description: "Add an expense or income transaction. Use this for both personal and household transactions.",
        parameters: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING", enum: ["expense", "income"] },
            amount: { type: "NUMBER", description: "Amount in major units (e.g. 10.50)" },
            category: { type: "STRING", description: "Category name" },
            description: { type: "STRING", description: "Description/Note" },
            date: { type: "STRING", description: "YYYY-MM-DD" },
            currency: { type: "STRING", description: "ISO Currency Code" },
            household_id: { type: "STRING", description: "Optional: Household ID if it is a group expense" },
            household_name: { type: "STRING", description: "Optional: Household name if user provided it" },
            is_recurring: { type: "BOOLEAN", description: "True if this is a recurring transaction" },
            frequency: { type: "STRING", description: "Frequency for recurring (monthly, weekly, etc.)" }
          },
          required: ["type", "amount", "category"]
        }
      },
      {
        name: "list_expenses",
        description: "List recent transactions (expenses or income).",
        parameters: {
          type: "OBJECT",
          properties: {
              type: { type: "STRING", enum: ["expense", "income"] },
              currency: { type: "STRING", description: "Optional: filter by currency" },
              limit: { type: "NUMBER" },
              start_date: { type: "STRING" },
              end_date: { type: "STRING" },
              household_id: { type: "STRING", description: "Optional: Filter by household" },
              household_name: { type: "STRING", description: "Optional: Household name filter" }
          }
        }
      },
      {
        name: "generate_chart_url",
        description: "Generate a URL for a chart (bar/pie/donut/radar) to visualize expenses.",
        parameters: {
            type: "OBJECT",
            properties: {
                chart_type: { type: "STRING", enum: ["bar", "pie", "donut", "radar"] },
                labels: { type: "ARRAY", items: { type: "STRING" } },
                data: { type: "ARRAY", items: { type: "NUMBER" } },
                title: { type: "STRING" }
            },
            required: ["chart_type", "labels", "data"]
        }
      },
      {
        name: "financial_insight",
        description: "Generate a financial health snapshot with verdict, income vs spending, net, top categories, budget status, upcoming recurring, and 1–2 actions. Use when the user asks about financial situation/health/status.",
        parameters: {
          type: "OBJECT",
          properties: {
            scope: { type: "STRING", description: "Optional scope (e.g., month)" }
          }
        }
      }
    ];

    const chat = model.startChat({ history: rawHistory, tools: [{ function_declarations: toolsApp }] });
    const result = await chat.sendMessage(userMessageContent);
    const response = await result.response;
    let functionCalls = response.functionCalls();
    let finalResponseText = response.text();
    let mediaUrl: string | undefined;
    let listSummaryOverride: string | undefined;

    if (functionCalls && functionCalls.length > 0) {
      const toolResponses = [];
      for (const call of functionCalls) {
        let toolResult = {};
        try {
          if (call.name === "list_expenses") {
            const { data, error } = await fetchExpensesDirect(supabase, contactId, {
              limit: call.args.limit || 50,
              startDate: call.args.start_date,
              endDate: call.args.end_date,
              householdId: call.args.household_id || null,
              currency: call.args.currency || undefined,
              type: call.args.type || undefined,
            });
            if (error) {
              toolResult = { error };
            } else {
              const normalized = normalizeExpensesForTool(data || [], userCurrency);
              const chartUrl = buildCategoryChart(normalized);
              if (chartUrl) mediaUrl = chartUrl;
              listSummaryOverride = formatExpensesSummary(normalized, !!chartUrl, {
                limit: call.args.limit,
                startDate: call.args.start_date,
                endDate: call.args.end_date,
              });
              toolResult = { expenses: normalized, chart_url: chartUrl };
            }
          } else if (call.name === "add_transaction") {
            const { data, error } = await saveExpenseDirect(supabase, contactId, userId, {
              type: call.args.type || "expense",
              amount: call.args.amount,
              category: call.args.category,
              date: call.args.date || formatDateInTimeZone(userTimezone),
              currency: call.args.currency || userCurrency,
              description: call.args.description,
              householdId: call.args.household_id || null,
              isRecurring: call.args.is_recurring,
              recurrence_rule: call.args.is_recurring
                ? { frequency: (call.args.frequency || "MONTHLY").toUpperCase(), interval: 1, anchor_date: call.args.date || formatDateInTimeZone(userTimezone) }
                : undefined,
            });
            toolResult = error ? { error } : { success: true, data };
          } else {
            toolResult = { error: "Tool not supported in app mode" };
          }
        } catch (e) {
          toolResult = { error: String(e) };
        }
        toolResponses.push({ functionResponse: { name: call.name, response: toolResult } });
      }
      const finalResult = await chat.sendMessage(toolResponses);
      finalResponseText = finalResult.response.text();
      if (listSummaryOverride) finalResponseText = listSummaryOverride;
    }

    await insertChatMessage(supabase, session.id, "assistant", finalResponseText, debugNotes, WHATSAPP_DEBUG);

    return jsonResponse({ text: finalResponseText, mediaUrl });
  }

  // Twilio form-encoded webhooks (WhatsApp) should be validated when signature is present
  const isFormUrlEncoded = contentType.includes("application/x-www-form-urlencoded");
  const hasTwilioSignature = !!(req.headers.get("X-Twilio-Signature") || req.headers.get("x-twilio-signature"));

  if (!TWILIO_SKIP_SIGNATURE && TWILIO_AUTH_TOKEN && isFormUrlEncoded && hasTwilioSignature) {
    const isValid = await validateTwilioRequest(req, TWILIO_AUTH_TOKEN);
    if (!isValid) {
      console.error("[twilio-whatsapp-ai-bot] Invalid Twilio signature. Check TWILIO_WEBHOOK_URL configuration.", {
        requestUrl: req.url,
        configuredWebhookUrl: Deno.env.get("TWILIO_WEBHOOK_URL") || "unset",
      });
      return jsonResponse({ error: "Invalid signature" }, 403);
    }
  }

  // Safe to consume body after optional validation
  const formData = await req.formData();
  const from = formData.get("From")?.toString().replace("whatsapp:", "") || "";
  const body = formData.get("Body")?.toString() || "";
  const numMedia = parseInt(formData.get("NumMedia")?.toString() || "0");
  const to = formData.get("To")?.toString() || ""; // Our number

  // Basic visibility log so we can confirm WhatsApp webhooks are hitting this function
  console.log("[twilio-whatsapp-ai-bot] Incoming WhatsApp webhook", {
    from,
    to,
    hasBody: !!body,
    numMedia,
  });

  if (!from) return jsonResponse({ error: "Missing 'From' number" }, 400);

  const whatsappSessionId = `whatsapp:${from}`;
  const debugNotes: string[] = [];
  debugLog(WHATSAPP_DEBUG, "incoming form data", { from, to, body, numMedia, whatsappSessionId });

  // 2. Fetch all user context in a single optimized call
  const { data: contextData, error: contextError } = await supabase
    .rpc('get_whatsapp_context', { p_phone_e164: from })
    .single();
  
  debugLog(WHATSAPP_DEBUG, "context lookup", { contextData, contextError });
  
  // Map the context data to maintain backward compatibility
  const contact = contextData ? {
    id: contextData.contact_id,
    user_id: contextData.user_id,
    verified: contextData.verified,
    preferred_currency: contextData.preferred_currency,
    preferred_language: contextData.preferred_language,
    preferred_timezone: contextData.preferred_timezone,
  } : null;
  const contactError = contextError;

  // Handle "Start Verification" command (Unauthenticated flow)
  if (body.trim().toLowerCase() === "start verification") {
    // Generate OTP logic (Copied from original webhook)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await supabase.from("whatsapp_verifications").delete().eq("phone_e164", from).eq("verified", false);
    await supabase.from("whatsapp_verifications").insert({
      phone_e164: from,
      verification_code: code,
      expires_at: expiresAt.toISOString(),
    });

    await sendWhatsAppTemplate(
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      to,
      from,
      TWILIO_TEMPLATES.VERIFICATION_CODE,
      JSON.stringify({ CODE: code })
    );
    return xmlResponse("<Response></Response>");
  }

  if (!contact || !contact.verified || !contact.user_id) {
    // Not verified: Send prompt template, fallback only if it fails
    const templateResult = await sendWhatsAppTemplate(
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      to,
      from,
      TWILIO_TEMPLATES.VERIFICATION_PROMPT,
    );
    if (!templateResult.success) {
      console.error("[twilio-whatsapp-ai-bot] verification template failed", templateResult.error);
      return xmlResponse(`<Response><Message>${buildVerificationPrompt()}</Message></Response>`);
    }
    return xmlResponse("<Response></Response>");
  }

  // Use subscription data from context
  const subscription = contextData ? {
    plan: contextData.subscription_plan,
    status: contextData.subscription_status
  } : null;
  debugLog(WHATSAPP_DEBUG, "subscription", { subscription });

  if (isFreeUser(subscription)) {
    // Optional: Enforce paid-only features here if needed. 
    // For now, proceed or send warning? Original webhook sends NON_SUBSCRIBER template.
    await sendWhatsAppTemplate(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, to, from, TWILIO_TEMPLATES.NON_SUBSCRIBER);
    return xmlResponse("<Response></Response>");
  }

  const userId = contact.user_id;
  const userCurrency = contact.preferred_currency || "USD";
  const userLang = contact.preferred_language || "en";
  const userTimezone = contact.preferred_timezone || "UTC";
  const contactId = contact.id;

  // 3. Session Management - use session from context or create new
  let session = contextData?.chat_session_id ? { id: contextData.chat_session_id } : null;
  debugLog(WHATSAPP_DEBUG, "session from context", { session });

  if (!session) {
    const { data: newSession, error: sessionError } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: userId,
        session_id: whatsappSessionId,
        model: MODEL_NAME,
      })
      .select()
      .single();

    if (sessionError || !newSession) {
      console.error("Failed to create chat session:", sessionError);
      return jsonResponse({ error: "Failed to initialize chat session" }, 500);
    }
    session = newSession;
  }
  
  const sessionId = session?.id;
  if (!sessionId) {
    console.error("Session ID is missing");
    return jsonResponse({ error: "Failed to get session ID" }, 500);
  }
  debugLog(WHATSAPP_DEBUG, "session ready", { sessionId });

  // 4. Handle Input (Text vs Image)
  let userMessageContent = body;
  const caption = (body || "").trim();

  // If we only have text (no media), attempt direct transaction extraction via analyze-core
  if (numMedia === 0 && caption) {
    console.log("[twilio-whatsapp-ai-bot] Text-only message, attempting analyze-core extraction", {
      from,
      preview: caption.slice(0, 120),
    });
    let analysis: any = null;
    try {
      const analysisPromise = runAnalyzeExpense(
        {
          userId,
          text: caption,
          currency: userCurrency,
        },
        GEMINI_API_KEY
      );

      const timeoutPromise: any = new (globalThis as any).Promise(
        (_: unknown, reject: (reason?: unknown) => void) => {
          setTimeout(
            () => reject(new Error("Text analysis timed out after 30 seconds")),
            30000,
          );
        },
      );

      analysis = await (globalThis as any).Promise.race([analysisPromise, timeoutPromise]);
    } catch (timeoutError) {
      console.error("[twilio-whatsapp-ai-bot] Text analysis timeout:", timeoutError);
      analysis = {
        success: false,
        error: "The text is taking longer than expected to process. Please try again or shorten the message.",
        language: "en",
      };
    }

    if (!analysis || !analysis.success || !analysis.items) {
      if (WHATSAPP_DEBUG) debugNotes.push(`text analyze-expense error: ${analysis?.error || "unknown"}`);
      userMessageContent = `[User message: "${caption}". Transaction analysis failed: ${
        analysis?.error ||
        "Could not extract transaction information. Please try again with a clearer description, for example: \"Spent 45 on groceries yesterday\"."
      } ]`;
    } else {
      userMessageContent = `[User message: "${caption}". Successfully extracted from text: ${JSON.stringify(
        analysis.items!
      )}. Please confirm with the user and ask if they want to save these transactions.]`;
    }
  }

  // If Image is present
  if (numMedia > 0) {
    console.log("[twilio-whatsapp-ai-bot] Media message detected", { from, numMedia });
    const mediaUrl = formData.get("MediaUrl0")?.toString();
    const mediaType = formData.get("MediaContentType0")?.toString();

    if (mediaUrl && /^image\//i.test(mediaType || "")) {
      // Download image with Twilio Basic auth (matches legacy webhook), then run local analyze-core
      const accountSid = formData.get("AccountSid")?.toString() || TWILIO_ACCOUNT_SID || "";
      const authHeader = "Basic " + btoa(`${accountSid}:${TWILIO_AUTH_TOKEN}`);
      const imgRes = await fetch(mediaUrl, { headers: { Authorization: authHeader } });

      if (!imgRes.ok) {
        if (WHATSAPP_DEBUG) debugNotes.push(`media fetch failed status=${imgRes.status}`);
        userMessageContent = `[User uploaded an image, but download failed status=${imgRes.status}]`;
      } else {
        const contentType = imgRes.headers.get("content-type") || mediaType || "";

        if (!/^image\/(jpeg|jpg|png|gif|bmp|webp)$/i.test(contentType)) {
          if (WHATSAPP_DEBUG) debugNotes.push(`unsupported image type ${contentType}`);
          userMessageContent = `[User sent unsupported image type: ${contentType}]`;
        } else {
          const imgBuf = new Uint8Array(await imgRes.arrayBuffer());
          const base64Data = uint8ToBase64(imgBuf);

          // Don't send immediate acknowledgment - let the AI handle all responses
          // to avoid duplicate messages

          // Attempt analysis with timeout and retry
          let analysis: any = null;
          try {
            // Set a maximum timeout for the entire analysis process
            const analysisPromise = runAnalyzeExpense(
              {
                userId,
                image: { data: base64Data, contentType, bytes: imgBuf },
                currency: userCurrency,
              },
              GEMINI_API_KEY,
            );

            // Add a hard timeout of 30 seconds for the entire process
            const timeoutPromise = new (globalThis as any).Promise(
              (_: unknown, reject: (reason?: unknown) => void) => {
                setTimeout(
                  () => reject(new Error("Receipt analysis timed out after 30 seconds")),
                  30000,
                );
              },
            );

            analysis = await (globalThis as any).Promise.race([analysisPromise, timeoutPromise]);
          } catch (timeoutError) {
            console.error("[twilio-whatsapp-ai-bot] Analysis timeout:", timeoutError);
            analysis = {
              success: false,
              error: "The image is taking longer than expected to process. Please try again with a clearer photo.",
              language: "en",
            };
          }

          if (!analysis || !analysis.success || !analysis.items) {
            if (WHATSAPP_DEBUG) debugNotes.push(`analyze-expense error: ${analysis?.error || "unknown"}`);

            // Don't send error directly - let AI handle the response to maintain context
            // Include the error details in the message content for the AI
            userMessageContent = `[User uploaded an image${caption ? ` with caption "${caption}"` : ""}, but analysis failed: ${
              analysis?.error ||
              "Could not extract expense information. The image may be unclear or have poor lighting."
            }. Please help the user by suggesting they try again with better lighting, holding camera steady, ensuring text is in focus, avoiding shadows/glare, or typing the expense manually like "Spent 45 on groceries"]`;
          } else {
            // Success - let AI handle the response with the extracted data
            userMessageContent = `[User uploaded an image${caption ? ` with caption "${caption}"` : ""}. Successfully extracted from receipt: ${JSON.stringify(
              analysis.items!,
            )}. Please confirm with the user and ask if they want to save these transactions.]`;
          }
        }
      }
    } else if (mediaUrl) {
      // Non-image file: fetch and include a small preview so AI keeps context
      console.log("[twilio-whatsapp-ai-bot] Non-image media detected, building preview", {
        from,
        mediaUrl,
        mediaType,
      });

      const accountSid = formData.get("AccountSid")?.toString() || TWILIO_ACCOUNT_SID || "";
      const authHeader = "Basic " + btoa(`${accountSid}:${TWILIO_AUTH_TOKEN}`);
      const fileRes = await fetch(mediaUrl, { headers: { Authorization: authHeader } });

      if (!fileRes.ok) {
        if (WHATSAPP_DEBUG) debugNotes.push(`file fetch failed status=${fileRes.status}`);
        userMessageContent = `[User sent a file but download failed status=${fileRes.status}${caption ? ` | caption: "${caption}"` : ""}]`;
      } else {
        const contentType = fileRes.headers.get("content-type") || mediaType || "";
        const buf = new Uint8Array(await fileRes.arrayBuffer());
        let preview = "";
        let parsed = false;

        const textLike =
          /^(text\/|application\/(json|csv|xml|javascript))/i.test(contentType) ||
          /\.(csv|txt|json|xml)$/i.test(mediaUrl || "");
        const isXlsx =
          /spreadsheetml|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/i.test(contentType) ||
          /\.xlsx$/i.test(mediaUrl || "");
        const isPdf = /application\/pdf/i.test(contentType) || /\.pdf$/i.test(mediaUrl || "");

        if (textLike) {
          try {
            preview = new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, 12000));
            parsed = true;
          } catch {
            parsed = false;
          }
        } else if (isXlsx) {
          const xlsxPreview = buildXlsxPreview(buf);
          if (xlsxPreview) {
            preview = xlsxPreview;
            parsed = true;
          }
        } else if (isPdf) {
          const base64Data = uint8ToBase64(buf);
          const pdfSummary = await summarizePdfWithGemini(base64Data, "application/pdf", GEMINI_API_KEY);
          if (pdfSummary) {
            preview = `PDF summary:\n${pdfSummary}`;
            parsed = true;
          }
        }

        if (parsed) {
          userMessageContent = `[User sent a file (${contentType || "unknown"}, ${buf.length} bytes)${caption ? ` with caption "${caption}"` : ""}. Preview: ${preview}]`;
        } else {
          userMessageContent = `[User sent a file (${contentType || "unknown"}, ${buf.length} bytes)${caption ? ` with caption "${caption}"` : ""}. Content not parsed (binary).]`;
        }
      }
    }
  }

async function buildFinancialSnapshot(
  supabase: ReturnType<typeof createClient>,
  contactId: string,
  userId: string,
  currency: string,
  timezone?: string | null
): Promise<FinancialSnapshot | { error: unknown }> {
  const startDate = formatMonthStartInTimeZone(timezone);
  const endDate = formatDateInTimeZone(timezone);

  // Expenses and incomes
  const { data: rows, error } = await supabase
    .from("expenses")
    .select("amount_cents, type, category, date, currency")
    .gte("date", startDate)
    .lte("date", endDate)
    .eq("currency", currency)
    .eq("contact_id", contactId);
  if (error) return { error };

  let totalExpense = 0;
  let totalIncome = 0;
  const catMap = new Map<string, number>();
  for (const r of rows || []) {
    const amt = Number(r.amount_cents) || 0;
    if ((r.type || "expense") === "income") {
      totalIncome += amt;
    } else {
      totalExpense += amt;
      const cat = (r.category || "other").toString().toLowerCase();
      catMap.set(cat, (catMap.get(cat) || 0) + amt);
    }
  }
  const catEntries = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const catLabels = catEntries.map(([c]) => c);
  const catData = catEntries.map(([, v]) => Math.round(v / 100));

  const { data: budgetRows } = await supabase
    .from("budgets")
    .select("total_budget_cents")
    .eq("user_id", userId)
    .eq("currency", currency)
    .gte("period_month", startDate.slice(0, 7) + "-01")
    .lt(nextMonthStart(startDate))
    .limit(1);
  const budgetCents = budgetRows?.[0]?.total_budget_cents || null;

  const chartConfig = {
    type: "radar",
    data: { labels: catLabels, datasets: [{ label: "Spend", data: catData, backgroundColor: "rgba(75,192,192,0.3)", borderColor: "#4BC0C0" }] },
    options: { plugins: { legend: { display: false }, title: { display: true, text: "Top spending categories" } } },
  };
  const chartUrl = catData.length ? `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}` : undefined;

  return {
    totalExpense,
    totalIncome,
    net: totalIncome - totalExpense,
    startDate,
    endDate,
    categories: catEntries.map(([cat, v]) => ({ category: cat, amount_cents: v })),
    budget_cents: budgetCents,
    chart_url: chartUrl,
  };
}

  // Save User Message
  await insertChatMessage(supabase, sessionId, "user", userMessageContent, debugNotes, WHATSAPP_DEBUG);

  // 5. Prepare Context & History - use households from context
  const households = contextData?.households ? 
    contextData.households.map((h: any) => ({
      household_id: h.household_id,
      households: { name: h.name }
    })) : [];
  debugLog(WHATSAPP_DEBUG, "households", { households });

  const householdContext = households?.map((h: any) => `${h.households?.name || "Household"}`).join("; ") || "None";
  const householdMap = new Map<string, string>();
  households?.forEach((h: any) => {
    if (h.household_id) householdMap.set(h.household_id, h.households?.name || h.household_id);
    if (h.households?.name) householdMap.set(h.households.name.toLowerCase(), h.household_id);
  });

  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("chat_session_id", sessionId)
    .order("timestamp", { ascending: false }) // Get latest first
    .limit(20); // Last 20 messages for better context

  const rawHistory = (history || []).reverse().map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
  }));
  // Ensure history starts with user per Gemini requirement
  const historyParts = [...rawHistory];
  while (historyParts.length > 0 && historyParts[0].role === "model") {
    historyParts.shift();
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTION
        .replace("{{DATE}}", formatDateInTimeZone(userTimezone))
        .replace("{{CURRENCY}}", userCurrency)
        .replace("{{HOUSEHOLDS}}", householdContext)
        .replace("{{CATEGORIES}}", CATEGORY_GUIDE)
        .replace("{{LANGUAGE}}", userLang)
  });

  // Define Tools
const tools = [
    {
      name: "add_transaction",
      description: "Add an expense or income transaction. Use this for both personal and household transactions.",
      parameters: {
        type: "OBJECT",
        properties: {
          type: { type: "STRING", enum: ["expense", "income"] },
          amount: { type: "NUMBER", description: "Amount in major units (e.g. 10.50)" },
          category: { type: "STRING", description: "Category name" },
          description: { type: "STRING", description: "Description/Note" },
          date: { type: "STRING", description: "YYYY-MM-DD" },
          currency: { type: "STRING", description: "ISO Currency Code" },
          household_id: { type: "STRING", description: "Optional: Household ID if it is a group expense" },
          household_name: { type: "STRING", description: "Optional: Household name if user provided it" },
          is_recurring: { type: "BOOLEAN", description: "True if this is a recurring transaction" },
          frequency: { type: "STRING", description: "Frequency for recurring (monthly, weekly, etc.)" }
        },
        required: ["type", "amount", "category"]
      }
    },
    {
      name: "update_transaction",
      description: "Update an existing expense transaction.",
      parameters: {
        type: "OBJECT",
        properties: {
          expense_id: { type: "STRING", description: "ID of the expense to update" },
          amount: { type: "NUMBER" },
          category: { type: "STRING" },
          description: { type: "STRING" },
          date: { type: "STRING", description: "YYYY-MM-DD" },
          currency: { type: "STRING" },
          household_id: { type: "STRING" },
          household_name: { type: "STRING" }
        },
        required: ["expense_id"]
      }
    },
    {
      name: "delete_transaction",
      description: "Delete an existing expense transaction.",
      parameters: {
        type: "OBJECT",
        properties: {
          expense_id: { type: "STRING", description: "ID of the expense to delete" }
        },
        required: ["expense_id"]
      }
    },
    {
      name: "list_expenses",
      description: "List recent transactions (expenses or income).",
      parameters: {
        type: "OBJECT",
        properties: {
            type: { type: "STRING", enum: ["expense", "income"] },
            currency: { type: "STRING", description: "Optional: filter by currency" },
            limit: { type: "NUMBER" },
            start_date: { type: "STRING" },
            end_date: { type: "STRING" },
            household_id: { type: "STRING", description: "Optional: Filter by household" },
            household_name: { type: "STRING", description: "Optional: Household name filter" }
        }
      }
    },
    {
      name: "get_budget",
      description: "Get budget status for the current month (includes envelopes/pockets).",
      parameters: {
          type: "OBJECT",
          properties: {
              date: { type: "STRING", description: "YYYY-MM-DD" },
              household_id: { type: "STRING", description: "Optional: Check household budget" },
              household_name: { type: "STRING", description: "Optional: Household name" }
          }
      }
    },
    {
      name: "set_budget",
      description: "Set the budget amount for the month (supports pockets/envelopes split).",
      parameters: {
          type: "OBJECT",
          properties: {
              amount: { type: "NUMBER" },
              date: { type: "STRING", description: "YYYY-MM-DD" },
              household_id: { type: "STRING", description: "Optional: household scope" },
              household_name: { type: "STRING", description: "Optional: household name" },
              pockets: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    percentage: { type: "NUMBER" },
                    categories: { type: "ARRAY", items: { type: "STRING" } },
                  },
                  required: ["name", "percentage"]
                },
                description: "Optional: envelope splits with percentages and categories"
              }
          },
          required: ["amount"]
      }
    },
    {
      name: "set_currency",
      description: "Update the user's preferred currency (user_contacts.preferred_currency).",
      parameters: {
        type: "OBJECT",
        properties: {
          currency: { type: "STRING", description: "ISO currency code, e.g. USD, EUR, GBP" }
        },
        required: ["currency"]
      }
    },
    {
      name: "generate_chart_url",
      description: "Generate a URL for a chart (bar/pie/donut/radar) to visualize expenses.",
      parameters: {
          type: "OBJECT",
            properties: {
                chart_type: { type: "STRING", enum: ["bar", "pie", "donut", "radar"] },
                labels: { type: "ARRAY", items: { type: "STRING" } },
                data: { type: "ARRAY", items: { type: "NUMBER" } },
                title: { type: "STRING" }
            },
            required: ["chart_type", "labels", "data"]
        }
    },
    {
      name: "financial_insight",
      description: "Generate a financial health snapshot with verdict, income vs spending, net, top categories, budget status, upcoming recurring, and 1–2 actions. Use when the user asks about financial situation/health/status.",
      parameters: {
        type: "OBJECT",
        properties: {
          scope: { type: "STRING", description: "Optional scope (e.g., month)" }
        }
      }
    },
    {
      name: "send_quick_replies",
      description: "Offer up to 3 quick-reply buttons to the user for fast selection (household, pocket, budgets, follow-ups).",
      parameters: {
        type: "OBJECT",
        properties: {
          body: { type: "STRING", description: "Prompt text to show above the buttons" },
          options: { type: "ARRAY", items: { type: "STRING" }, description: "Up to 3 button labels" }
        },
        required: ["body", "options"]
      }
    },
    {
        name: "manage_recurring",
        description: "Add or modify a recurring transaction.",
        parameters: {
            type: "OBJECT",
            properties: {
                action: { type: "STRING", enum: ["add", "delete"] },
                expense_id: { type: "STRING", description: "Required for delete" },
                amount: { type: "NUMBER" },
                category: { type: "STRING" },
                frequency: { type: "STRING", enum: ["weekly", "monthly", "yearly"] },
                type: { type: "STRING", enum: ["expense", "income"], description: "Recurring transaction type" }
            },
            required: ["action"]
        }
    }
  ];

  // 6. Chat Loop (Model Turn)
  const chat = model.startChat({
      history: historyParts,
      tools: [{ function_declarations: tools }]
  });

  // Send message with timeout and error handling
  let response;
  try {
    const messagePromise = chat.sendMessage(userMessageContent);
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("AI response timed out after 25 seconds")), 25000)
    );
    
    const result = await Promise.race([messagePromise, timeoutPromise]);
    response = await result.response;
  } catch (e) {
    console.error("[twilio-whatsapp-ai-bot] Initial AI call failed:", e);
    const errorMessage = "I'm having trouble processing your request right now. Please try again in a moment.";
    
    // Send error message directly to user
    try {
      await sendWhatsAppMessage(
        TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN,
        to,
        from,
        errorMessage
      );
    } catch (sendErr) {
      console.error("[twilio-whatsapp-ai-bot] Failed to send error message:", sendErr);
    }
    
    // Return TwiML with error message as fallback
    const textEsc = errorMessage.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${textEsc}</Message></Response>`;
    return xmlResponse(twiml);
  }
  
let functionCalls = response.functionCalls();
let finalResponseText = response.text();
let mediaUrl: string | undefined;
let generatedChartText: string | undefined;
let listSummaryOverride: string | undefined;
let persistedContent: string | undefined;
let postAddBudgetNote: string | undefined;
let budgetChartUrl: string | undefined;

  // Loop for tool calls (handle sequential calls)
  // For simplicity, we handle one batch of calls then get final text.
  if (functionCalls && functionCalls.length > 0) {
      const toolResponses = [];
      for (const call of functionCalls) {
          let toolResult = {};
          debugLog(WHATSAPP_DEBUG, "tool call", { name: call.name, args: call.args });
          try {
              if (call.name === "add_transaction") {
              let householdId = call.args.household_id;
              const householdName = (call.args.household_name || call.args.householdName || "").toString().toLowerCase();
              if (!householdId && householdName && householdMap.has(householdName)) {
                householdId = householdMap.get(householdName);
              }
              if (!householdId && !householdName && householdMap.size === 1) {
                householdId = Array.from(householdMap.values())[0];
              }

              let recurrenceRule = undefined;
              if (call.args.is_recurring) {
              const anchor = (call.args.date || formatDateInTimeZone(userTimezone));
                recurrenceRule = {
                    frequency: (call.args.frequency || "MONTHLY").toUpperCase(),
                    interval: 1,
                    anchor_date: anchor
                };
              }

              const { data, error } = await saveExpenseDirect(supabase, contactId, userId, {
                type: call.args.type || "expense",
                amount: call.args.amount,
                category: call.args.category,
                date: call.args.date || formatDateInTimeZone(userTimezone),
                currency: call.args.currency || userCurrency,
                description: call.args.description,
                householdId,
                isRecurring: call.args.is_recurring,
                recurrence_rule: recurrenceRule
              });
              toolResult = error ? { error } : { success: true, data };
              if (error) {
                const formatted = formatInvokeError(error);
                if (WHATSAPP_DEBUG) debugNotes.push(`save-expense error: ${formatted}`);
                console.error("[twilio-whatsapp-ai-bot] save-expense error", { error, formatted });
              } else {
                // Fetch budget status to inform user about remaining budget/pockets
                const dateStr = (call.args.date || formatDateInTimeZone(userTimezone)).slice(0, 10);
                const period_month = dateStr.slice(0, 7) + "-01";
                const budgetStatus = await getBudgetStatusDirect(
                  supabase,
                  userId,
                  householdId || null,
                  period_month,
                  call.args.currency || userCurrency
                );
                if (budgetStatus && !budgetStatus.error && budgetStatus.totals) {
                  const remainingMajor = (budgetStatus.totals.remaining_cents || 0) / 100;
                  const allocMajor = (budgetStatus.totals.budget_cents || 0) / 100;
                  const remainingText = formatAmount(remainingMajor, call.args.currency || userCurrency);
                  const totalText = formatAmount(allocMajor, call.args.currency || userCurrency);
                  const pocketNotes: string[] = [];
                  if (Array.isArray(budgetStatus.envelopes) && budgetStatus.envelopes.length) {
                    budgetStatus.envelopes.slice(0, 3).forEach((env: any) => {
                      const rem = ((env.remaining_cents ?? 0) as number) / 100;
                      pocketNotes.push(`${env.name}: ${formatAmount(rem, call.args.currency || userCurrency)} left`);
                    });
                  }
                  const pocketsText = pocketNotes.length ? ` Pockets — ${pocketNotes.join("; ")}.` : "";
                  postAddBudgetNote = `💡 Budget check: ${remainingText} left this month out of ${totalText}.${pocketsText} Want tips to stay on track? 😊`;
                }
              }
            } else if (call.name === "update_transaction") {
              let householdId = call.args.household_id;
              const householdName = (call.args.household_name || call.args.householdName || "").toString().toLowerCase();
              if (!householdId && householdName && householdMap.has(householdName)) {
                householdId = householdMap.get(householdName);
              }
              const { data, error } = await saveExpenseDirect(supabase, contactId, userId, {
                expenseId: call.args.expense_id,
                amount: call.args.amount,
                category: call.args.category,
                date: call.args.date,
                currency: call.args.currency || userCurrency,
                description: call.args.description,
                householdId,
                type: call.args.type || "expense",
              });
              toolResult = error ? { error } : { success: true, data };
              if (error) {
                const formatted = formatInvokeError(error);
                if (WHATSAPP_DEBUG) debugNotes.push(`update-expense error: ${formatted}`);
                console.error("[twilio-whatsapp-ai-bot] update-expense error", { error, formatted });
              }
            } else if (call.name === "delete_transaction") {
              const { error } = await deleteExpenseDirect(supabase, contactId, call.args.expense_id);
              toolResult = error ? { error } : { success: true };
              if (error) {
                const formatted = formatInvokeError(error);
                if (WHATSAPP_DEBUG) debugNotes.push(`delete-expense error: ${formatted}`);
                console.error("[twilio-whatsapp-ai-bot] delete-expense error", { error, formatted });
              }
            } else if (call.name === "list_expenses") {
              let householdId = call.args.household_id;
              const householdName = (call.args.household_name || "").toString().toLowerCase();
              if (!householdId && householdName && householdMap.has(householdName)) {
                householdId = householdMap.get(householdName);
              }
              const type = call.args.type || "expense";
              const listPayload = {
                limit: call.args.limit || 50,
                startDate: call.args.start_date,
                endDate: call.args.end_date,
                householdId,
                currency: call.args.currency || undefined,
                type,
              };
              debugLog(WHATSAPP_DEBUG, "list-expenses payload", listPayload);
              // fetchExpensesDirect returns snake_case fields from DB (amount_cents, raw_text, etc.)
              // normalizeExpensesForTool handles both snake_case and camelCase field names
              const { data, error } = await fetchExpensesDirect(
                supabase,
                contactId,
                listPayload,
              );
              if (error) {
                const formatted = formatInvokeError(error);
                if (WHATSAPP_DEBUG) debugNotes.push(`list-expenses direct error: ${formatted}`);
                console.error("[twilio-whatsapp-ai-bot] list-expenses direct query error", { error, formatted });
                toolResult = { error };
              } else {
                const normalized = normalizeExpensesForTool(data || [], userCurrency);
                const chartUrl = buildCategoryChart(normalized);
                if (chartUrl) {
                  mediaUrl = chartUrl;
                  generatedChartText = finalResponseText; // preserve AI text to send with chart later
                }
                  listSummaryOverride = formatExpensesSummary(normalized, !!chartUrl, {
                    limit: listPayload.limit,
                    startDate: listPayload.startDate,
                    endDate: listPayload.endDate,
                  });
                toolResult = { expenses: normalized, chart_url: chartUrl };
              }
            } else if (call.name === "get_budget") {
                   const dateStr = (call.args.date || formatDateInTimeZone(userTimezone)).slice(0,10);
                   const period_month = dateStr.slice(0,7) + "-01";
                   let householdId = call.args.household_id || null;
                   const householdName = (call.args.household_name || "").toString().toLowerCase();
                   if (!householdId && householdName && householdMap.has(householdName)) {
                     householdId = householdMap.get(householdName) || null;
                   }
                   const res = await getBudgetStatusDirect(
                     supabase,
                     userId,
                     householdId,
                     period_month,
                     userCurrency
                   );
                   if (res.error) {
                     const formatted = formatInvokeError(res.error);
                     if (WHATSAPP_DEBUG) debugNotes.push(`get-budget direct error: ${formatted}`);
                     console.error("[twilio-whatsapp-ai-bot] get-budget direct error", { error: res.error, formatted });
                     toolResult = { error: res.error };
                   } else {
                     toolResult = { budget: res.budget, envelopes: res.envelopes, totals: res.totals, chart: res.chart };
                  }
            } else if (call.name === "set_currency") {
                  const currency = (call.args.currency || "").toString().toUpperCase();
                  const { data, error } = await updatePreferredCurrency(supabase, contactId, currency);
                  toolResult = error ? { error } : { success: true, currency: data?.preferred_currency || currency };
                  if (error) {
                    const formatted = formatInvokeError(error);
                    if (WHATSAPP_DEBUG) debugNotes.push(`set-currency error: ${formatted}`);
                    console.error("[twilio-whatsapp-ai-bot] set-currency error", { error, formatted });
                  }
                  } else if (call.name === "set_budget") {
                   // Create or update budget + envelopes/pockets
                   const period_month = (call.args.date || new Date().toISOString().slice(0, 7) + "-01").slice(0,10);
                   const total_cents = Math.round((call.args.amount || 0) * 100);
                   let householdId = call.args.household_id || null;
                   const householdName = (call.args.household_name || "").toString().toLowerCase();
                   if (!householdId && householdName && householdMap.has(householdName)) {
                     householdId = householdMap.get(householdName) || null;
                   }

                   const { data: budgetRow, error: budgetErr } = await createOrUpdateBudget(
                     supabase,
                     userId,
                     householdId,
                     period_month,
                     userCurrency,
                     total_cents
                   );
                   if (budgetErr || !budgetRow) {
                     const formatted = formatInvokeError(budgetErr);
                     toolResult = { error: budgetErr };
                     if (WHATSAPP_DEBUG) debugNotes.push(`set-budget error: ${formatted}`);
                     console.error("[twilio-whatsapp-ai-bot] set-budget error", { budgetErr, formatted });
                   } else {
                     // Handle pockets/envelopes splits
                     const pockets = Array.isArray(call.args.pockets) ? call.args.pockets : [];
                     const created: any[] = [];
                     for (const p of pockets) {
                       if (!p?.name || typeof p.percentage !== "number") continue;
                       const { data: env, error: envErr } = await upsertEnvelope(
                         supabase,
                         budgetRow.id,
                         userId,
                         householdId,
                         p.name,
                         p.percentage,
                         userCurrency
                       );
                       if (env && env.id) {
                         created.push({ name: p.name, percentage: p.percentage });
                         // Optional categories
                         if (Array.isArray(p.categories)) {
                           for (const cat of p.categories) {
                             await upsertEnvelopeCategoryLink(supabase, env.id, cat);
                           }
                         }
                         // Optional allocation (percentage of total)
                         const alloc_cents = Math.round((p.percentage / 100) * total_cents);
                         await upsertEnvelopeAllocation(supabase, env.id, period_month, alloc_cents);
                       } else if (envErr) {
                         const formatted = formatInvokeError(envErr);
                         if (WHATSAPP_DEBUG) debugNotes.push(`envelope upsert error: ${formatted}`);
                       }
                     }
                     toolResult = { success: true, budget: budgetRow, envelopes: created };
                   }
            } else if (call.name === "generate_chart_url") {
                   // Generate QuickChart URL
                   const chartConfig = {
                       type: call.args.chart_type,
                       data: {
                           labels: call.args.labels,
                           datasets: [{
                               label: call.args.title || "Data",
                               data: call.args.data,
                               backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"]
                           }]
                       },
                       options: { title: { display: true, text: call.args.title } }
                   };
                   const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
                   mediaUrl = url; // Set global mediaUrl for TwiML
                   toolResult = { url };
            } else if (call.name === "manage_recurring") {
              // Use update-expense or save-expense
              if (call.args.action === "add") {
                const recurrenceRule = {
                  frequency: (call.args.frequency || "MONTHLY").toUpperCase(),
                  interval: 1,
                  anchor_date: formatDateInTimeZone(userTimezone),
                };
                const { data, error } = await saveExpenseDirect(supabase, contactId, userId, {
                  amount: call.args.amount,
                  category: call.args.category,
                  date: formatDateInTimeZone(userTimezone),
                  currency: userCurrency,
                  isRecurring: true,
                  recurrence_rule: recurrenceRule,
                  type: call.args.type || "expense",
                });
                toolResult = error ? { error } : { success: true, data };
                if (error) {
                  const formatted = formatInvokeError(error);
                  if (WHATSAPP_DEBUG) debugNotes.push(`save-expense (recurring add) error: ${formatted}`);
                  console.error("[twilio-whatsapp-ai-bot] save-expense recurring add error", { error, formatted });
                }
              } else {
                const { error } = await deleteExpenseDirect(supabase, contactId, call.args.expense_id);
                toolResult = error ? { error } : { success: true };
                if (error) {
                  const formatted = formatInvokeError(error);
                  if (WHATSAPP_DEBUG) debugNotes.push(`delete-expense error: ${formatted}`);
                  console.error("[twilio-whatsapp-ai-bot] delete-expense error", { error, formatted });
                }
              }
            } else if (call.name === "financial_insight") {
              const snap = await buildFinancialSnapshot(supabase, contactId, userId, userCurrency, userTimezone);
              if ("error" in snap) {
                toolResult = { error: snap.error };
              } else {
                let summary = `Snapshot ${snap.startDate} to ${snap.endDate}\n`;
                const income = snap.totalIncome / 100;
                const expense = snap.totalExpense / 100;
                const net = snap.net / 100;
                summary += `Income: ${formatAmount(income, userCurrency)}\n`;
                summary += `Spending: ${formatAmount(expense, userCurrency)}\n`;
                summary += `Net: ${formatAmount(net, userCurrency)}\n\nTop categories:\n`;
                snap.categories.forEach((c, idx) => {
                  summary += `${idx + 1}. ${c.category}: ${formatAmount(c.amount_cents / 100, userCurrency)}\n`;
                });
                if (snap.budget_cents) {
                  const remain = (snap.budget_cents - snap.totalExpense) / 100;
                  summary += `\nBudget: ${formatAmount(snap.budget_cents / 100, userCurrency)} | Remaining: ${formatAmount(remain, userCurrency)}`;
                }
                if (snap.chart_url) {
                  mediaUrl = snap.chart_url;
                  generatedChartText = summary;
                }
                toolResult = { snapshot: snap, chart_url: snap.chart_url, summary };
              }
            } else if (call.name === "send_quick_replies") {
                   const opts: string[] = Array.isArray(call.args.options) ? call.args.options.filter((o: any) => !!o).map((o: any) => String(o)) : [];
                   const trimmed = opts.slice(0, 3);
                   if (trimmed.length === 0) {
                     toolResult = { error: "No options provided" };
                   } else {
                     const body = String(call.args.body || "Choose an option:");
                     const sendRes = await sendWhatsAppInteractiveButtons(
                       TWILIO_ACCOUNT_SID,
                       TWILIO_AUTH_TOKEN,
                       to,
                       from,
                       body,
                       trimmed
                     );
                     toolResult = sendRes.success ? { success: true } : { error: sendRes.error || "Failed to send quick replies" };
                   }
             }
          } catch (e) {
              toolResult = { error: String(e) };
              if (WHATSAPP_DEBUG) debugNotes.push(`tool exception (${call.name}): ${String(e)}`);
          }
          toolResponses.push({
              functionResponse: {
                  name: call.name,
                  response: toolResult
              }
          });
      }
      
      // Send tool outputs back to Gemini with error handling
      try {
        const finalResult = await chat.sendMessage(toolResponses);
        finalResponseText = finalResult.response.text();
        if (listSummaryOverride) {
          finalResponseText = listSummaryOverride;
        }
      } catch (e) {
        console.error("[twilio-whatsapp-ai-bot] Failed to get final AI response:", e);
        finalResponseText = "I processed your request but encountered an issue generating a response. Please try again.";
        if (WHATSAPP_DEBUG) debugNotes.push(`AI response error: ${String(e)}`);
      }
  }

  // 7. Finalize Response
  // If we have a mediaUrl, strip any URLs/placeholders to keep the text clean; keep markdown.
  if (mediaUrl) {
    finalResponseText = finalResponseText
      .replace(mediaUrl, "")
      .replace(/https?:\/\/\S*quickchart\.io\S*/gi, "")
      .replace(/\[media\].*/gi, "")
      .replace(/Chart attached\. 🔍/gi, "")
      .replace(/\n{2,}/g, "\n")
      .trim();
    // Ensure async media send uses the cleaned text
    generatedChartText = finalResponseText;
  }
  if (postAddBudgetNote) {
    finalResponseText += `\n\n${postAddBudgetNote}`;
  }
  if (!finalResponseText || !finalResponseText.trim()) {
    finalResponseText = "I couldn't generate a response right now. Please try again in a few seconds.";
    if (WHATSAPP_DEBUG) debugNotes.push("finalResponseText was empty; sent fallback message");
  }
  if (WHATSAPP_DEBUG && debugNotes.length > 0) {
    finalResponseText += `\n\n[debug]\n${debugNotes.join("\n")}`;
  }
  persistedContent = listSummaryOverride || finalResponseText;
  if (mediaUrl) {
    persistedContent = `${persistedContent}${mediaUrl ? `\n[media]: ${mediaUrl}` : ""}`;
  }

  // If we're sending a chart, respond quickly then send media via Twilio API asynchronously
  const immediateText = mediaUrl
    ? "Working on your chart now—I’ll send it shortly. ⏳"
    : finalResponseText;
  debugLog(WHATSAPP_DEBUG, "final response", { immediateText, persistedContent, mediaUrl });

  // Save assistant message with final content (for context)
  await insertChatMessage(supabase, sessionId, "assistant", persistedContent, debugNotes, WHATSAPP_DEBUG);

  if (mediaUrl) {
    // Fire-and-forget to avoid holding the webhook open
    (async () => {
      try {
        const bodyToSend = listSummaryOverride || generatedChartText || finalResponseText;
        const sendResult = await sendWhatsAppMessage(
          TWILIO_ACCOUNT_SID,
          TWILIO_AUTH_TOKEN,
          to,
          from,
          bodyToSend,
          mediaUrl
        );
        if (!sendResult.success) {
          console.error("[twilio-whatsapp-ai-bot] Failed to send chart via Twilio:", sendResult.error);
        }
      } catch (e) {
        console.error("[twilio-whatsapp-ai-bot] Error sending async chart message:", e);
      }
    })();
  }

  // Return TwiML with immediate response (no media)
  const textEsc = immediateText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${textEsc}</Message></Response>`;

  return xmlResponse(twiml);
});
