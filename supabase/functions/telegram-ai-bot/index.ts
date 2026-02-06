// Supabase Edge Function: telegram-ai-bot
// Handles Telegram messages, using Gemini AI and existing tools.

import {
  createClient,
  type SupabaseClient as SupabaseJsClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.17.0";
import { corsHeaders } from "../shared/cors.ts";
import { isFreeUser } from "../shared/is-free-user.ts";
import {
  formatInvokeError,
  CATEGORY_GUIDE,
  normalizeExpensesForTool,
  buildCategoryChart,
} from "../shared/formatting-helpers.ts";
import {
  fetchExpensesDirect,
  saveExpenseDirect,
} from "../shared/expenses-helpers.ts";
import { getBudgetStatusDirect } from "../shared/budgets-helpers.ts";
import { insertChatMessage } from "../shared/chat-helpers.ts";
import { updatePreferredCurrency } from "../shared/currency-helpers.ts";
import {
  runAnalyzeExpense,
  buildXlsxPreview,
  summarizePdfWithGemini,
} from "../shared/analyze-core.ts";
import {
  reserveIdempotency,
  updateIdempotency,
} from "../shared/bot/idempotency.ts";

const MODEL_NAME = "gemini-2.5-flash";
const SYSTEM_INSTRUCTION = `You are Moneko, a helpful and friendly financial assistant on Telegram.
Your goal is to help users track expenses, manage budgets, and view their financial health.
You can handle personal finances and shared spaces.

CRITICAL RULES:
1.  **Currency**: Always use the user's preferred currency or the currency detected in the text. If ambiguous, ask.
    - Use currency symbols (€, $, £, ₦, etc.) when replying instead of ISO codes.
2.  **Spaces**: If the user asks about “spaces” (e.g., family, roommates, portfolio), clarify which space if they have multiple, or use the household_id + is_portfolio provided in context.
3.  **Confirmation**: For ambiguous requests (e.g., "5 coffee"), ask for clarification (Personal or which space? Which category?).
    - Infer a category from the text and propose it (e.g., "latte" -> "food & drink"). Ask for quick confirmation before saving.
4.  **Charts**: If the user asks for a chart or graph, use the 'generate_chart_url' tool and provide the URL in your response. Explain that you are sending an image.
5.  **Recurring**: If the user says "monthly", "weekly", "every month", etc., set 'is_recurring' to true.
6.  **Tone**: Enthusiastic, encouraging, concise, and proactive (suitable for Telegram). Use light emojis, and close with a quick follow-up offer to help further.
7.  **Totals**: When listing or summarizing expenses, always include a total spent for the requested range and mention how many items are shown.
8.  **Safety**: Do not reveal sensitive IDs. Refer to each space by its name only.
9.  **Budgets/Pockets**: Budgets live in the budgets table. They can be split across pockets (envelopes) with percentage shares. When setting a budget, propose a total and how to split it across relevant pockets; create multiple pocket budgets if the user asks for splits.
10. **Pockets/Envelopes Actions**: You can create/update/delete envelopes via set_pocket/delete_pocket, set monthly allocations, link categories to envelopes, and show envelope status (alloc/spent/remaining) for a month.
11. **Reminders/Recurring**: Recurring transactions can include reminders; ask for frequency and whether to set a reminder if the user hints at it.
12. **Income vs Expense**: All transactions live in the "expenses" table with type = "expense" or "income". Default to expense if unclear. Always set the type when listing, adding, updating, or recurring.
13. **Tooling discipline**: For add/update/delete/recurring/budget/envelope requests, call the appropriate tool. For recurring requests without a frequency, default to monthly. For incomes, set type="income".
14. **Bulk imports**: When the user uploads a receipt, bank statement, or file with multiple transactions, use 'add_transactions_batch' to save them all at once.
15. **Privacy**: Never show raw IDs (household_id, expense_id, etc.) to the user. Refer to spaces by name only; if multiple, offer names, not IDs.
16. **Currency updates**: Preferred currency is stored in user_contacts.preferred_currency. When the user asks to change currency, call the currency tool to update that column and confirm.
17. **Options**: When offering choices (spaces, pockets, budgets, follow-up options), list them as numbered text and ask the user to reply with the number or name.
18. **Splits**: For space expenses, support who paid + how to split. If the user says "paid by X" and/or provides per-member splits, call 'add_transaction' with 'payer_name', 'split_type', and 'member_splits'. If split is not specified, default to an equal split among space members.
19. **Financial snapshot**: For asks like "current financial situation/health/status": provide one concise snapshot for the current month/pay-period: verdict, income vs spending, net, top categories, budget status, upcoming recurring, and 1–2 actions. Always include the text summary; the chart is optional/secondary.
20. **Language**: Respond in the user's preferred language: {{LANGUAGE}}.

CURRENT CONTEXT:
- Date: {{DATE}}
- User Currency: {{CURRENCY}}
- Spaces: {{HOUSEHOLDS}}
- Categories (with brand colors): {{CATEGORIES}}
`;

const PROCESSING_ACK_MESSAGES = [
  "Got it! I’m processing that now—this might take a moment. ⏳",
  "Thanks! I’m working on it now and will reply shortly. 🧾",
  "On it! I’m crunching the details—back soon. 🤖",
  "Working on it now. I’ll send the details in a bit. ✨",
];
const PROCESSING_ACK_DELAY_MS = 3000;
const IDEMPOTENCY_TTL_MINUTES = 60;
const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
};

type TelegramMessage = {
  message_id?: number;
  text?: string;
  caption?: string;
  chat?: { id?: number; type?: string };
  from?: { id?: number };
  photo?: Array<{ file_id: string; file_size?: number }>;
  document?: {
    file_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
  voice?: { file_id: string; mime_type?: string; file_size?: number };
  audio?: { file_id: string; mime_type?: string; file_size?: number };
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function runBackgroundTask(task: Promise<unknown>) {
  const edgeRuntime = (globalThis as any)?.EdgeRuntime;
  if (edgeRuntime?.waitUntil) {
    edgeRuntime.waitUntil(task);
    return;
  }
  void task;
}

function pickProcessingMessage(seed?: string | null) {
  if (!PROCESSING_ACK_MESSAGES.length) {
    return "Processing your request now. ⏳";
  }
  if (!seed) {
    const idx = Math.floor(Math.random() * PROCESSING_ACK_MESSAGES.length);
    return PROCESSING_ACK_MESSAGES[idx];
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % PROCESSING_ACK_MESSAGES.length;
  return PROCESSING_ACK_MESSAGES[idx];
}

function decodeBase64(data: string): Uint8Array {
  const cleaned = data.replace(/^data:.*;base64,/, "");
  const bin = atob(cleaned);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function uint8ToBase64(buf: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < buf.length; i += chunkSize) {
    const subarray = buf.subarray(i, Math.min(i + chunkSize, buf.length));
    binary += String.fromCharCode.apply(null, Array.from(subarray));
  }
  return btoa(binary);
}

function formatDateInTimeZone(
  tz: string | null | undefined,
  date = new Date(),
) {
  const timezone = (tz || "UTC").trim();
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const map = new Map(parts.map((p) => [p.type, p.value]));
    return `${map.get("year")}-${map.get("month")}-${map.get("day")}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

async function runAnalyzeExpenseWithTimeout(
  payload: any,
  apiKey: string,
  timeoutMs: number,
  timeoutError: string,
): Promise<any> {
  try {
    const analysisPromise = runAnalyzeExpense(payload, apiKey);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), timeoutMs);
    });

    return await Promise.race([analysisPromise, timeoutPromise]);
  } catch (error) {
    console.error("[telegram-ai-bot] analyze-expense timeout/error:", error);
    return { success: false, error: timeoutError, language: "en" };
  }
}

async function getTelegramFile(
  token: string,
  fileId: string,
): Promise<{ file_path?: string; file_size?: number } | null> {
  const url = `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const payload = await res.json();
  if (!payload?.ok) return null;
  return payload.result || null;
}

async function downloadTelegramFile(
  token: string,
  filePath: string,
): Promise<Uint8Array | null> {
  const url = `https://api.telegram.org/file/bot${token}/${filePath}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return new Uint8Array(await res.arrayBuffer());
}

async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string,
) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  return res.ok;
}

function normalizeText(input?: string | null) {
  return (input || "").trim();
}

function isStartVerification(text: string) {
  return normalizeText(text).toLowerCase() === "start verification";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const TELEGRAM_WEBHOOK_SECRET_TOKEN = Deno.env.get(
    "TELEGRAM_WEBHOOK_SECRET_TOKEN",
  );
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

  if (
    !TELEGRAM_BOT_TOKEN ||
    !TELEGRAM_WEBHOOK_SECRET_TOKEN ||
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !GEMINI_API_KEY
  ) {
    console.error("Missing environment variables");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const secretHeader =
    req.headers.get("X-Telegram-Bot-Api-Secret-Token") ||
    req.headers.get("x-telegram-bot-api-secret-token");
  if (secretHeader !== TELEGRAM_WEBHOOK_SECRET_TOKEN) {
    return jsonResponse({ ok: true });
  }

  let update: TelegramUpdate | null = null;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return jsonResponse({ ok: true });
  }

  const message = update?.message;
  const chatId = message?.chat?.id;
  const messageId = message?.message_id ?? update?.update_id;
  if (!chatId || !messageId) {
    return jsonResponse({ ok: true });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const idempotencyKey = `telegram:${chatId}:${messageId}`;
  const processingAckMessage = pickProcessingMessage(String(chatId));

  const reserve = await reserveIdempotency(
    supabase,
    idempotencyKey,
    processingAckMessage,
    IDEMPOTENCY_TTL_MINUTES,
  );
  if (reserve.status === "duplicate") {
    const cached = reserve.result;
    if (cached?.response_text) {
      await sendTelegramMessage(
        TELEGRAM_BOT_TOKEN,
        chatId,
        cached.response_text,
      );
    }
    return jsonResponse({ ok: true });
  }

  runBackgroundTask(
    (async () => {
      const debugNotes: string[] = [];
      try {
        const { data: contextDataRaw, error: contextError } = await supabase
          .rpc("get_telegram_context", { p_telegram_chat_id: String(chatId) })
          .single();
        const contextData: any = contextDataRaw as any;

        const contact = contextData
          ? {
              id: contextData.contact_id,
              user_id: contextData.user_id,
              verified: contextData.verified,
              preferred_currency: contextData.preferred_currency,
              preferred_language: contextData.preferred_language,
              preferred_timezone: contextData.preferred_timezone,
            }
          : null;

        if (contextError) {
          debugNotes.push(`context error: ${formatInvokeError(contextError)}`);
        }

        const text = normalizeText(message?.text);
        if (text && isStartVerification(text)) {
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

          await supabase
            .from("whatsapp_verifications")
            .delete()
            .eq("channel", "telegram")
            .eq("subject", `telegram:${chatId}`)
            .eq("verified", false);

          await supabase.from("whatsapp_verifications").insert({
            channel: "telegram",
            subject: `telegram:${chatId}`,
            phone_e164: null,
            verification_code: code,
            expires_at: expiresAt.toISOString(),
          });

          const appUrl = Deno.env.get("ALLOWED_ORIGINS") || "https://moneko.io";
          const baseUrl = appUrl.split(",")[0]?.trim() || "https://moneko.io";
          const verificationUrl = `${baseUrl}/verify-whatsapp?otp=${code}`;
          const msg = `🔐 *Moneko Verification*\n\nYour code: *${code}*\n\nOr click here to verify:\n${verificationUrl}\n\nValid for 10 minutes.\n\nDon't share this code!`;
          await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, msg);
          await updateIdempotency(supabase, idempotencyKey, {
            status: "done",
            response_text: msg,
          });
          return;
        }

        if (!contact || !contact.verified || !contact.user_id) {
          const prompt =
            "🔐 Account Not Verified\n\nTo use Moneko, you need to verify this Telegram chat.\n\nReply with: Start Verification";
          await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, prompt);
          await updateIdempotency(supabase, idempotencyKey, {
            status: "done",
            response_text: prompt,
          });
          return;
        }

        const subscription = contextData
          ? {
              plan: contextData.subscription_plan,
              status: contextData.subscription_status,
            }
          : null;
        if (isFreeUser(subscription)) {
          // allow free users to proceed (same as WhatsApp: non-subscriber message is optional)
        }

        const userId = contact.user_id as string;
        const userCurrency = contact.preferred_currency || "USD";
        const userLang = contact.preferred_language || "en";
        const userTimezone = contact.preferred_timezone || "UTC";
        const chatHouseholds = contextData?.households || [];
        const spaceMap = new Map<string, { id: string; name: string }>();
        for (const h of chatHouseholds as any[]) {
          if (!h) continue;
          const id = String((h as any).household_id || "");
          const name = String((h as any).name || "");
          if (id) spaceMap.set(id, { id, name });
          if (name) spaceMap.set(name.toLowerCase(), { id, name });
        }

        const sessionIdValue = `telegram:${chatId}`;
        let session = contextData?.chat_session_id
          ? { id: contextData.chat_session_id }
          : null;

        if (!session) {
          const { data: newSession, error: sessionError } = await supabase
            .from("chat_sessions")
            .insert({
              user_id: userId,
              session_id: sessionIdValue,
              model: MODEL_NAME,
              channel: "telegram",
            })
            .select()
            .single();
          if (sessionError || !newSession) {
            console.error("Failed to create chat session:", sessionError);
            await sendTelegramMessage(
              TELEGRAM_BOT_TOKEN,
              chatId,
              "Failed to initialize chat session.",
            );
            await updateIdempotency(supabase, idempotencyKey, {
              status: "failed",
              response_text: "session_failed",
            });
            return;
          }
          session = newSession;
        }

        const sessionId = session?.id;
        if (!sessionId) {
          await updateIdempotency(supabase, idempotencyKey, {
            status: "failed",
            response_text: "session_missing",
          });
          return;
        }

        let userMessageContent = normalizeText(
          message?.text || message?.caption || "",
        );

        if (
          !message?.photo &&
          !message?.document &&
          !message?.voice &&
          !message?.audio &&
          userMessageContent
        ) {
          let analysis: any = null;
          try {
            analysis = await runAnalyzeExpenseWithTimeout(
              {
                userId,
                text: userMessageContent,
                currency: userCurrency,
              },
              GEMINI_API_KEY,
              30000,
              "The text is taking longer than expected to process. Please try again or shorten the message.",
            );
          } catch {
            analysis = { success: false };
          }
          if (analysis?.success && analysis?.items) {
            userMessageContent = `[User message: "${userMessageContent}". Successfully extracted from text: ${JSON.stringify(
              analysis.items,
            )}. Please confirm with the user and ask if they want to save these transactions.]`;
          }
        }

        const photo = message?.photo?.[message.photo.length - 1];
        const doc = message?.document;
        const voice = message?.voice || message?.audio;

        if (photo?.file_id) {
          const fileMeta = await getTelegramFile(
            TELEGRAM_BOT_TOKEN,
            photo.file_id,
          );
          if (fileMeta?.file_path) {
            const buf = await downloadTelegramFile(
              TELEGRAM_BOT_TOKEN,
              fileMeta.file_path,
            );
            if (buf && buf.byteLength <= MAX_MEDIA_BYTES) {
              const base64Data = uint8ToBase64(buf);
              const analysis = await runAnalyzeExpenseWithTimeout(
                {
                  userId,
                  image: {
                    data: base64Data,
                    contentType: "image/jpeg",
                    bytes: buf,
                  },
                  currency: userCurrency,
                },
                GEMINI_API_KEY,
                30000,
                "The image is taking longer than expected to process. Please try again with a clearer photo.",
              );
              if (analysis?.success && analysis?.items) {
                userMessageContent = `[User uploaded an image${message.caption ? ` with caption "${message.caption}"` : ""}. Successfully extracted from receipt: ${JSON.stringify(
                  analysis.items,
                )}. Please confirm with the user and ask if they want to save these transactions.]`;
              } else {
                userMessageContent = `[User uploaded an image${message.caption ? ` with caption "${message.caption}"` : ""}, but analysis failed: ${
                  analysis?.error ||
                  "Could not extract expense information. The image may be unclear or have poor lighting."
                }. Please help the user by suggesting they try again with better lighting, or type the expense manually.]`;
              }
            } else {
              userMessageContent = `[User uploaded an image${message.caption ? ` with caption "${message.caption}"` : ""}, but the file is too large to process. Please ask them to send a smaller photo.]`;
            }
          }
        } else if (voice?.file_id) {
          const fileMeta = await getTelegramFile(
            TELEGRAM_BOT_TOKEN,
            voice.file_id,
          );
          if (fileMeta?.file_path) {
            const buf = await downloadTelegramFile(
              TELEGRAM_BOT_TOKEN,
              fileMeta.file_path,
            );
            if (buf && buf.byteLength <= MAX_MEDIA_BYTES) {
              const base64Data = uint8ToBase64(buf);
              const analysis = await runAnalyzeExpenseWithTimeout(
                {
                  userId,
                  audio: {
                    data: base64Data,
                    contentType: voice.mime_type || "audio/ogg",
                    bytes: buf,
                  },
                  currency: userCurrency,
                },
                GEMINI_API_KEY,
                30000,
                "The audio is taking longer than expected to process. Please try again by speaking clearly.",
              );
              if (analysis?.success && analysis?.items) {
                userMessageContent = `[User sent a voice message. Successfully extracted from audio: ${JSON.stringify(
                  analysis.items,
                )}. Please confirm with the user and ask if they want to save these transactions.]`;
              } else {
                userMessageContent = `[User sent a voice message, but analysis failed: ${
                  analysis?.error ||
                  "Could not extract expense information from the audio. Please try again."
                }. Please help the user by suggesting they try again or type the expense manually.]`;
              }
            } else {
              userMessageContent = `[User sent a voice message, but the file is too large to process. Please ask them to send a shorter clip.]`;
            }
          }
        } else if (doc?.file_id) {
          const fileMeta = await getTelegramFile(
            TELEGRAM_BOT_TOKEN,
            doc.file_id,
          );
          if (fileMeta?.file_path) {
            const buf = await downloadTelegramFile(
              TELEGRAM_BOT_TOKEN,
              fileMeta.file_path,
            );
            if (buf && buf.byteLength <= MAX_MEDIA_BYTES) {
              const base64Data = uint8ToBase64(buf);
              const cleanContentType = (doc.mime_type || "")
                .split(";")[0]
                .trim();
              const isXlsx =
                /spreadsheetml|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/i.test(
                  cleanContentType,
                ) || /\.xlsx$/i.test(doc.file_name || "");
              const isPdf =
                /application\/pdf/i.test(cleanContentType) ||
                /\.pdf$/i.test(doc.file_name || "");
              let preview = "";
              let parsed = false;
              if (isXlsx) {
                const xlsxPreview = buildXlsxPreview(buf);
                if (xlsxPreview) {
                  preview = xlsxPreview;
                  parsed = true;
                }
              } else if (isPdf) {
                const pdfSummary = await summarizePdfWithGemini(
                  base64Data,
                  "application/pdf",
                  GEMINI_API_KEY,
                );
                if (pdfSummary) {
                  preview = `PDF summary:\n${pdfSummary}`;
                  parsed = true;
                }
              } else if (
                /^(text\/|application\/(json|csv|xml|javascript))/i.test(
                  cleanContentType,
                )
              ) {
                try {
                  preview = new TextDecoder("utf-8", { fatal: false }).decode(
                    buf.slice(0, 12000),
                  );
                  parsed = true;
                } catch {
                  parsed = false;
                }
              }
              const captionNote = message.caption
                ? ` with caption "${message.caption}"`
                : "";
              if (parsed) {
                userMessageContent = `[User sent a file (${cleanContentType || "unknown"}, ${buf.length} bytes)${captionNote}. Preview: ${preview}]`;
              } else {
                userMessageContent = `[User sent a file (${cleanContentType || "unknown"}, ${buf.length} bytes)${captionNote}. Content not parsed (binary).]`;
              }
            } else {
              userMessageContent = `[User sent a file, but it is too large to process. Please ask them to send a smaller file.]`;
            }
          }
        }

        await insertChatMessage(
          supabase,
          sessionId,
          "user",
          userMessageContent,
          debugNotes,
          false,
        );

        const { data: history } = await supabase
          .from("chat_messages")
          .select("role, content")
          .eq("chat_session_id", sessionId)
          .order("timestamp", { ascending: false })
          .limit(20);
        const rawHistory = (history || []).reverse().map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
        while (rawHistory.length > 0 && rawHistory[0].role === "model") {
          rawHistory.shift();
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: MODEL_NAME,
          systemInstruction: SYSTEM_INSTRUCTION.replace(
            "{{DATE}}",
            formatDateInTimeZone(userTimezone),
          )
            .replace("{{CURRENCY}}", userCurrency)
            .replace("{{HOUSEHOLDS}}", JSON.stringify(chatHouseholds))
            .replace("{{CATEGORIES}}", CATEGORY_GUIDE)
            .replace("{{LANGUAGE}}", userLang),
        });

        const tools = [
          {
            name: "add_transaction",
            description:
              "Add an expense or income transaction. Use this for both personal and shared spaces.",
            parameters: {
              type: "OBJECT",
              properties: {
                type: { type: "STRING", enum: ["expense", "income"] },
                amount: { type: "NUMBER" },
                category: { type: "STRING" },
                description: { type: "STRING" },
                date: { type: "STRING" },
                currency: { type: "STRING" },
                household_id: { type: "STRING" },
                household_name: { type: "STRING" },
                is_portfolio: { type: "BOOLEAN" },
                payer_name: { type: "STRING" },
                split_type: {
                  type: "STRING",
                  enum: ["equal", "amount", "percentage", "shares"],
                },
                member_splits: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      member_name: { type: "STRING" },
                      amount: { type: "NUMBER" },
                      percentage: { type: "NUMBER" },
                      shares: { type: "NUMBER" },
                    },
                    required: ["member_name"],
                  },
                },
                owner_type: {
                  type: "STRING",
                  enum: ["me", "partner", "household"],
                },
                privacy_scope: {
                  type: "STRING",
                  enum: ["private", "balances_only", "full"],
                },
                source: { type: "STRING" },
                is_recurring: { type: "BOOLEAN" },
                frequency: { type: "STRING" },
              },
              required: ["type", "amount", "category"],
            },
          },
          {
            name: "add_transactions_batch",
            description: "Add multiple transactions at once.",
            parameters: {
              type: "OBJECT",
              properties: {
                household_id: { type: "STRING" },
                household_name: { type: "STRING" },
                is_portfolio: { type: "BOOLEAN" },
                transactions: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      type: { type: "STRING", enum: ["expense", "income"] },
                      amount: { type: "NUMBER" },
                      category: { type: "STRING" },
                      description: { type: "STRING" },
                      date: { type: "STRING" },
                      currency: { type: "STRING" },
                      payer_name: { type: "STRING" },
                      split_type: {
                        type: "STRING",
                        enum: ["equal", "amount", "percentage", "shares"],
                      },
                      member_splits: {
                        type: "ARRAY",
                        items: {
                          type: "OBJECT",
                          properties: {
                            member_name: { type: "STRING" },
                            amount: { type: "NUMBER" },
                            percentage: { type: "NUMBER" },
                            shares: { type: "NUMBER" },
                          },
                          required: ["member_name"],
                        },
                      },
                      source: { type: "STRING" },
                      owner_type: {
                        type: "STRING",
                        enum: ["me", "partner", "household"],
                      },
                      privacy_scope: {
                        type: "STRING",
                        enum: ["private", "balances_only", "full"],
                      },
                    },
                    required: ["type", "amount", "category"],
                  },
                },
              },
              required: ["transactions"],
            },
          },
          {
            name: "list_expenses",
            description: "List recent transactions (expenses or income).",
            parameters: {
              type: "OBJECT",
              properties: {
                type: { type: "STRING", enum: ["expense", "income"] },
                currency: { type: "STRING" },
                limit: { type: "NUMBER" },
                start_date: { type: "STRING" },
                end_date: { type: "STRING" },
                household_id: { type: "STRING" },
                household_name: { type: "STRING" },
                is_portfolio: { type: "BOOLEAN" },
              },
            },
          },
          {
            name: "generate_chart_url",
            description: "Generate a URL for a chart.",
            parameters: {
              type: "OBJECT",
              properties: {
                chart_type: {
                  type: "STRING",
                  enum: ["bar", "pie", "donut", "radar"],
                },
                labels: { type: "ARRAY", items: { type: "STRING" } },
                data: { type: "ARRAY", items: { type: "NUMBER" } },
                title: { type: "STRING" },
              },
              required: ["chart_type", "labels", "data"],
            },
          },
          {
            name: "financial_insight",
            description: "Generate a financial health snapshot.",
            parameters: {
              type: "OBJECT",
              properties: { scope: { type: "STRING" } },
            },
          },
          {
            name: "get_budget",
            description: "Get current budget status.",
            parameters: {
              type: "OBJECT",
              properties: {
                date: { type: "STRING" },
                household_id: { type: "STRING" },
                household_name: { type: "STRING" },
                is_portfolio: { type: "BOOLEAN" },
              },
            },
          },
          {
            name: "set_currency",
            description: "Update preferred currency.",
            parameters: {
              type: "OBJECT",
              properties: { currency: { type: "STRING" } },
              required: ["currency"],
            },
          },
        ];

        const chat = model.startChat({
          history: rawHistory,
          tools: [{ function_declarations: tools }] as any,
        });
        const result = await chat.sendMessage(userMessageContent);
        const response = await result.response;
        let functionCalls = (response.functionCalls() as any[]) || [];
        let finalResponseText = response.text();

        if (functionCalls && functionCalls.length > 0) {
          const toolResponses: any[] = [];
          for (const call of functionCalls) {
            let toolResult: any = {};
            try {
              if (call.name === "list_expenses") {
                const { data, error } = await fetchExpensesDirect(
                  supabase,
                  contact.id,
                  {
                    limit: call.args.limit || 50,
                    startDate: call.args.start_date,
                    endDate: call.args.end_date,
                    householdId: call.args.household_id || null,
                    isPortfolio: call.args.is_portfolio === true,
                    currency: call.args.currency,
                    type: call.args.type,
                  },
                );
                if (error) {
                  toolResult = { error };
                } else {
                  const normalized = normalizeExpensesForTool(
                    data || [],
                    userCurrency,
                  );
                  const chartUrl = buildCategoryChart(normalized);
                  toolResult = { expenses: normalized, chart_url: chartUrl };
                }
              } else if (call.name === "add_transaction") {
                const amount = Number(call.args.amount || 0);
                const { data, error } = await saveExpenseDirect(
                  supabase,
                  contact.id,
                  userId,
                  {
                    amount: amount,
                    category: call.args.category,
                    description: call.args.description || "",
                    date: call.args.date || formatDateInTimeZone(userTimezone),
                    currency: call.args.currency || userCurrency,
                    type: call.args.type || "expense",
                    householdId: call.args.household_id || null,
                    isPortfolio: call.args.is_portfolio === true,
                    isRecurring: call.args.is_recurring === true,
                    recurrence_rule: call.args.recurrence_rule,
                  },
                );
                toolResult = { data, error };
              } else if (call.name === "add_transactions_batch") {
                const rows = Array.isArray(call.args.transactions)
                  ? call.args.transactions
                  : [];
                const results: any[] = [];
                for (const row of rows) {
                  const amount = Number(row.amount || 0);
                  const { data, error } = await saveExpenseDirect(
                    supabase,
                    contact.id,
                    userId,
                    {
                      amount: amount,
                      category: row.category,
                      description: row.description || "",
                      date: row.date || formatDateInTimeZone(userTimezone),
                      currency: row.currency || userCurrency,
                      type: row.type || "expense",
                      householdId: call.args.household_id || null,
                      isPortfolio: call.args.is_portfolio === true,
                    },
                  );
                  results.push({ data, error });
                }
                toolResult = { results };
              } else if (call.name === "generate_chart_url") {
                const chartConfig = {
                  type: call.args.chart_type || "bar",
                  data: {
                    labels: call.args.labels || [],
                    datasets: [
                      {
                        label: call.args.title || "Chart",
                        data: call.args.data || [],
                      },
                    ],
                  },
                };
                const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(
                  JSON.stringify(chartConfig),
                )}`;
                toolResult = { url: chartUrl };
              } else if (call.name === "financial_insight") {
                toolResult = { success: true };
              } else if (call.name === "get_budget") {
                const dateStr = (
                  call.args.date || formatDateInTimeZone(userTimezone)
                ).slice(0, 10);
                const period_month = dateStr.slice(0, 7) + "-01";
                let householdId = call.args.household_id || null;
                const householdName = (call.args.household_name || "")
                  .toString()
                  .toLowerCase();
                if (
                  !householdId &&
                  householdName &&
                  spaceMap.has(householdName)
                ) {
                  householdId = spaceMap.get(householdName)?.id ?? null;
                }
                const res = await getBudgetStatusDirect(
                  supabase,
                  userId,
                  householdId,
                  period_month,
                  userCurrency,
                  call.args.is_portfolio === true,
                );
                toolResult = res.error
                  ? { error: res.error }
                  : {
                      budget: res.budget,
                      envelopes: res.envelopes,
                      totals: res.totals,
                      chart: res.chart,
                    };
              } else if (call.name === "set_currency") {
                const currency = (call.args.currency || "")
                  .toString()
                  .toUpperCase();
                const { data, error } = await updatePreferredCurrency(
                  supabase,
                  contact.id,
                  currency,
                );
                toolResult = error
                  ? { error }
                  : {
                      success: true,
                      currency: data?.preferred_currency || currency,
                    };
              }
            } catch (e) {
              toolResult = { error: String(e) };
            }
            toolResponses.push({
              functionResponse: {
                name: call.name,
                response: toolResult,
              },
            });
          }

          try {
            const finalResult = await chat.sendMessage(toolResponses);
            finalResponseText = finalResult.response.text();
          } catch (e) {
            console.error(
              "[telegram-ai-bot] Failed to get final AI response:",
              e,
            );
            finalResponseText =
              "I processed your request but encountered an issue generating a response. Please try again.";
          }
        }

        if (!finalResponseText || !finalResponseText.trim()) {
          finalResponseText =
            "I couldn't generate a response right now. Please try again in a few seconds.";
        }

        await insertChatMessage(
          supabase,
          sessionId,
          "assistant",
          finalResponseText,
          debugNotes,
          false,
        );

        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN,
          chatId,
          finalResponseText,
        );
        await updateIdempotency(supabase, idempotencyKey, {
          status: "done",
          response_text: finalResponseText,
        });
      } catch (error) {
        console.error("[telegram-ai-bot] Handler error:", error);
        await updateIdempotency(supabase, idempotencyKey, {
          status: "failed",
          response_text: "processing_failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })(),
  );

  const ackText = processingAckMessage || "Processing your request now. ⏳";
  await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, ackText);
  return jsonResponse({ ok: true });
});
