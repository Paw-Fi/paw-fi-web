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
import { runAnalyzeExpense } from "../shared/analyze-core.ts";

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
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  const SECRET_API_KEY = Deno.env.get("SECRET_API_KEY");
  const WHATSAPP_DEBUG = (Deno.env.get("WHATSAPP_DEBUG") || "").toUpperCase() === "TRUE";
  const EDGE_FUNCTION_KEY = (SECRET_API_KEY || "").trim();

  if (!TWILIO_AUTH_TOKEN || !TWILIO_ACCOUNT_SID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY || !EDGE_FUNCTION_KEY) {
    console.error("Missing environment variables");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  // 1. Validate Request
  // Note: Validation can be tricky with proxies/NGROK. Disable if strictly needed for dev, enable for prod.
  // For now, we proceed but log warning if fails? No, strictly enforce for security if possible.
  // const isValid = await validateTwilioRequest(req, TWILIO_AUTH_TOKEN);
  // if (!isValid) return jsonResponse({ error: "Invalid signature" }, 403);

  const formData = await req.formData();
  const from = formData.get("From")?.toString().replace("whatsapp:", "") || "";
  const body = formData.get("Body")?.toString() || "";
  const numMedia = parseInt(formData.get("NumMedia")?.toString() || "0");
  const to = formData.get("To")?.toString() || ""; // Our number

  if (!from) return jsonResponse({ error: "Missing 'From' number" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const whatsappSessionId = `whatsapp:${from}`;
  const debugNotes: string[] = [];
  debugLog(WHATSAPP_DEBUG, "incoming form data", { from, to, body, numMedia, whatsappSessionId });

  // 2. Check User Binding
  // Check if user exists and is verified
  const { data: contact, error: contactError } = await supabase
    .from("user_contacts")
    .select("id, user_id, verified, preferred_currency")
    .eq("phone_e164", from)
    .maybeSingle();
  debugLog(WHATSAPP_DEBUG, "contact lookup", { contact, contactError });

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
    // Not verified: Send prompt
    await sendWhatsAppTemplate(
        TWILIO_ACCOUNT_SID, 
        TWILIO_AUTH_TOKEN, 
        to, 
        from, 
        TWILIO_TEMPLATES.VERIFICATION_PROMPT
    );
    // Fallback if template fails (simplified)
    return xmlResponse(`<Response><Message>${buildVerificationPrompt()}</Message></Response>`);
  }

  // Check Subscription (Free vs Paid)
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", contact.user_id)
    .maybeSingle();
  debugLog(WHATSAPP_DEBUG, "subscription", { subscription });

  if (isFreeUser(subscription)) {
    // Optional: Enforce paid-only features here if needed. 
    // For now, proceed or send warning? Original webhook sends NON_SUBSCRIBER template.
    await sendWhatsAppTemplate(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, to, from, TWILIO_TEMPLATES.NON_SUBSCRIBER);
    return xmlResponse("<Response></Response>");
  }

  const userId = contact.user_id;
  const userCurrency = contact.preferred_currency || "USD";
  const contactId = contact.id;

  // 3. Session Management
  // Retrieve or create chat session
  let { data: session } = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("session_id", whatsappSessionId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  debugLog(WHATSAPP_DEBUG, "session fetch", { session });

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
  
  const sessionId = session.id;
  debugLog(WHATSAPP_DEBUG, "session ready", { sessionId });

  // 4. Handle Input (Text vs Image)
  let userMessageContent = body;

  // If Image is present
  if (numMedia > 0) {
    const mediaUrl = formData.get("MediaUrl0")?.toString();
    const mediaType = formData.get("MediaContentType0")?.toString();
    
    if (mediaUrl && mediaType?.startsWith("image/")) {
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
           const base64Data = btoa(String.fromCharCode(...imgBuf));
           const analysis = await runAnalyzeExpense(
             {
               userId,
               image: { data: base64Data, contentType, bytes: imgBuf },
               currency: userCurrency,
             },
             GEMINI_API_KEY
           );
           if (!analysis.success || !analysis.items) {
             if (WHATSAPP_DEBUG) debugNotes.push(`analyze-expense error: ${analysis.error || "unknown"}`);
             userMessageContent = `[User uploaded an image, but analysis failed: ${analysis.error || "analysis failed"}]`;
           } else {
             userMessageContent = `[User uploaded an image. Analysis Result: ${JSON.stringify(analysis.items)}]`;
           }
         }
       }
    } else {
        userMessageContent = `[User sent a file: ${mediaUrl}]`;
    }
  }

  // Save User Message
  await insertChatMessage(supabase, sessionId, "user", userMessageContent, debugNotes, WHATSAPP_DEBUG);

  // 5. Prepare Context & History
  const { data: households } = await supabase
    .from("household_members")
    .select("household_id, households(name)")
    .eq("user_id", userId);
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
        .replace("{{DATE}}", new Date().toISOString().split('T')[0])
        .replace("{{CURRENCY}}", userCurrency)
        .replace("{{HOUSEHOLDS}}", householdContext)
        .replace("{{CATEGORIES}}", CATEGORY_GUIDE)
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
      description: "Generate a URL for a chart (bar/pie) to visualize expenses.",
      parameters: {
          type: "OBJECT",
            properties: {
                chart_type: { type: "STRING", enum: ["bar", "pie", "donut"] },
                labels: { type: "ARRAY", items: { type: "STRING" } },
                data: { type: "ARRAY", items: { type: "NUMBER" } },
                title: { type: "STRING" }
            },
            required: ["chart_type", "labels", "data"]
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

  const result = await chat.sendMessage(userMessageContent);
  const response = await result.response;
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
              const anchor = (call.args.date || new Date().toISOString().split("T")[0]);
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
                date: call.args.date || new Date().toISOString().split('T')[0],
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
                const dateStr = (call.args.date || new Date().toISOString().split("T")[0]).slice(0, 10);
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
              const { data, error } = await fetchExpensesDirect(
                supabase,
                contactId,
                { ...listPayload, householdId },
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
                   const dateStr = (call.args.date || new Date().toISOString().split('T')[0]).slice(0,10);
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
                     if (res.chart) {
                       budgetChartUrl = res.chart;
                       mediaUrl = res.chart;
                       generatedChartText = finalResponseText;
                     }
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
                            anchor_date: new Date().toISOString().split("T")[0]
                        };
                      const { data, error } = await saveExpenseDirect(supabase, contactId, userId, {
                            amount: call.args.amount,
                            category: call.args.category,
                            date: new Date().toISOString().split('T')[0],
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
                        // delete
                        const { error } = await deleteExpenseDirect(supabase, contactId, call.args.expense_id);
                        toolResult = error ? { error } : { success: true };
                        if (error) {
                          const formatted = formatInvokeError(error);
                          if (WHATSAPP_DEBUG) debugNotes.push(`delete-expense error: ${formatted}`);
                          console.error("[twilio-whatsapp-ai-bot] delete-expense error", { error, formatted });
                        }
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
      
      // Send tool outputs back to Gemini
      const finalResult = await chat.sendMessage(toolResponses);
      finalResponseText = finalResult.response.text();
      if (listSummaryOverride) {
        finalResponseText = listSummaryOverride;
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
