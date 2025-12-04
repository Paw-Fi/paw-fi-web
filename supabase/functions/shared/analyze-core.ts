import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { validateCurrency } from "./currency-validator.ts";
import { normalizeCategory, getExpenseCategories, getIncomeCategories } from "./category-colors.ts";
import { getCurrencySymbol } from "./currency-symbols.ts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function b64encode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export interface AnalyzeRequestBody {
  userId?: string | null;
  text?: string;
  image?: {
    data: string;
    contentType: string;
    // Optional raw bytes to avoid double-encoding issues (preferred when available)
    bytes?: Uint8Array;
  };
  date?: string;
  currency?: string;
  currencySymbol?: string;
  language?: string;
}

export interface AnalyzeResult {
  success: boolean;
  items?: ExpenseItem[];
  language: string;
  error?: string;
  status?: number;
}

export interface ExpenseItem {
  type: "expense" | "income";
  amount: number;
  category: string;
  currency: string;
  currencySymbol: string;
  date: string;
  description?: string;
}

function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

function normalizeLanguage(input?: string | null): string {
  const raw = (input || "").trim();
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(raw) ? raw : "en";
}

function isTotalLike(s?: string) {
  return !!s && /(sub\s*total|subtotal|grand\s*total|total)/i.test(s);
}

async function attemptAnalysis(
  genAI: GoogleGenerativeAI,
  modelName: string,
  systemInstruction: string,
  body: AnalyzeRequestBody,
  base64Image: string,
  callerCurrency: string,
  callerCurrencySymbol: string,
  callerDate: string,
  language: string,
  expenseCategories: string[],
  incomeCategories: string[],
  tools: any,
  timeoutMs: number = 15000
): Promise<{ success: boolean; items?: ExpenseItem[]; error?: string }> {
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error(`Model ${modelName} timed out after ${timeoutMs}ms`)), timeoutMs)
  );

  try {
    const model = genAI.getGenerativeModel({ model: modelName, tools });
    
    const responsePromise = model.generateContent({
      systemInstruction,
      contents: [{
        role: "user",
        parts: [
          { text: `Caller Currency: ${callerCurrency}\nCaller Date: ${callerDate}\nExtract expense details from this receipt:` },
          {
            inline_data: {
              mime_type: body.image?.contentType || "image/jpeg",
              data: base64Image,
            },
          },
        ],
      }],
      generationConfig: { maxOutputTokens: 512 },
    });

    const response = await Promise.race([responsePromise, timeoutPromise]);
    
    const tool = response.response.functionCalls()?.[0];
    if (tool && tool.name === "add_transactions") {
      const rawItems: any[] = Array.isArray(tool.args?.items) ? tool.args.items : [];
      const tempItems = rawItems.map((it) => {
        const itemCurrency = it.currency || callerCurrency;
        const rawCategory = it.category || "other";
        const normalizedCategory = normalizeCategory(rawCategory);
        
        // Debug: Log category normalization
        console.log(`[analyze-expense] Category normalization: "${rawCategory}" -> "${normalizedCategory}"`);
        
        const txType = String(it.type || "").toLowerCase();
        return {
          type: (txType === "income" || txType === "expense") ? txType : undefined,
          amount: Number(it.amount),
          category: normalizedCategory,
          currency: itemCurrency,
          currencySymbol: callerCurrencySymbol,
          date: it.date || callerDate,
          description: it.description || "Receipt transaction",
        };
      }).filter((it) => it.type === "income" || it.type === "expense") as ExpenseItem[];
      
      let items = tempItems;
      if (items.length > 1) {
        const withoutTotals = items.filter((it) => !isTotalLike(it.description));
        if (withoutTotals.length > 0) items = withoutTotals;
        const sums = items.map((_, i) => items.filter((__, j) => i !== j).reduce((acc: number, b: any) => acc + (Number(b.amount) || 0), 0));
        items = items.filter((it, i) => Math.abs(it.amount - sums[i]) > 0.0001);
      }
      
      if (items.length > 0) {
        return { success: true, items };
      }
    }
    
    return { success: false, error: `${modelName} could not extract valid transactions` };
  } catch (error) {
    if (error instanceof Error && error.message.includes('timed out')) {
      throw error; // Re-throw timeout errors
    }
    return { success: false, error: `${modelName} failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function runAnalyzeExpense(
  body: AnalyzeRequestBody,
  geminiApiKey: string
): Promise<AnalyzeResult> {
  try {
    let userId = sanitizeUuid(body.userId ?? null);
    if (body.userId && !userId) {
      return { success: false, error: "Invalid userId format", status: 400, language: "en" };
    }
    if (!userId) {
      return { success: false, error: "userId is required", status: 400, language: "en" };
    }

    if (!body.text && !body.image) {
      return { success: false, error: "Must provide either text or image", status: 400, language: "en" };
    }

    if (body.text && body.image) {
      return { success: false, error: "Cannot process both text and image simultaneously", status: 400, language: "en" };
    }

    const callerCurrency = validateCurrency(body.currency);
    const callerCurrencySymbol = body.currencySymbol || getCurrencySymbol(callerCurrency);
    const callerDate = body.date || new Date().toISOString().slice(0, 10);
    const language = normalizeLanguage(body.language);

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const expenseCategories = getExpenseCategories();
    const incomeCategories = getIncomeCategories();
    
    // Debug: Log categories being passed to AI
    console.log(`[analyze-expense] Expense categories count: ${expenseCategories.length}`);
    console.log(`[analyze-expense] Income categories count: ${incomeCategories.length}`);
    console.log(`[analyze-expense] Expense categories include 'food': ${expenseCategories.includes('food')}`);
    console.log(`[analyze-expense] Expense categories include 'food & drinks': ${expenseCategories.includes('food & drinks')}`);
    
    let lastError = "";

    const tools = [{
      function_declarations: [
        {
          name: "add_transactions",
          description: "Extract structured transactions (income or expense) with clear classification and rationale. Always include a type for every item.",
          parameters: {
            type: "OBJECT",
            properties: {
              items: {
                type: "ARRAY",
                description: "One or more transactions parsed from the user input or receipt.",
                items: {
                  type: "OBJECT",
                  properties: {
                    type: { type: "STRING", enum: ["expense", "income"], description: "Transaction type" },
                    amount: { type: "NUMBER", description: "Positive amount in caller currency unless different currency explicitly mentioned." },
                    category: { 
                      type: "STRING", 
                      description: `Canonical category. If type=expense choose from: ${expenseCategories.join(", ")}. If type=income choose from: ${incomeCategories.join(", ")}. Prefer specific income categories over generic "income" when possible.`
                    },
                    currency: { type: "STRING", description: "ISO 4217 code. Use explicit currency on the input/receipt; otherwise use Caller Currency." },
                    date: { type: "STRING", description: "YYYY-MM-DD. Parse ANY date from text (absolute like \"Jan 15\" or relative like \"yesterday\", \"last week\", \"3 days ago\") and convert to YYYY-MM-DD using Caller Date as reference. Only use Caller Date if no date mentioned." },
                    description: { type: "STRING", description: "Natural, conversational note about the transaction - as if casually mentioning it to a friend. Use currency symbols (€, $, ¥, £) NOT currency names. For multi-item: \"Lunch €25, coffee €5\". Keep it brief and memorable." },
                  },
                  required: ["type", "amount", "category"],
                },
              },
            },
            required: ["items"],
          },
        },
      ],
    }];

    let items: ExpenseItem[] = [];

    if (body.text) {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", tools });
      const systemInstruction = [
        "You are a professional transaction extraction and classification system.",
        "Task: Parse the input (plain text) into one or more transactions and return them ONLY by calling add_transactions. Every item MUST include a type (expense|income).",
        "Classification policy:",
        "- income: money received (earned salary, bonus, tips, refunds, transfers into account, repayments, gifts).",
        "- expense: money spent (purchases, bills, fees, subscriptions, transfers out).",
        "Category policy:",
        `- choose a canonical category from these lists. Expense categories: ${expenseCategories.join(", ")}. Income categories: ${incomeCategories.join(", ")}.`,
        "- For money received from relatives or friends use gift (income). For salary/payroll use salary (income). For card/bank returns use refund (income). Do NOT use vague categories such as family for incomes.",
        "Currency & date policy:",
        "- Detect explicit currency symbol or code; else use Caller Currency.",
        "- Date parsing: Look for ANY date reference in the text - absolute (Jan 15, 2024-01-15) or relative (yesterday, last Monday, 3 days ago, last week).",
        "- Convert relative dates to YYYY-MM-DD format based on Caller Date as today.",
        "- Examples: \"yesterday\" → subtract 1 day from Caller Date; \"last Monday\" → find previous Monday; \"3 days ago\" → subtract 3 days.",
        "- Only use Caller Date if NO date is mentioned in the text.",
        "Description policy:",
        "- Write natural, conversational notes about what happened - as if casually mentioning it to a friend.",
        "- Include context: where (merchant/location), what (items), or why when relevant.",
        "- Use currency symbols (€, $, ¥, £) NOT currency names in words. Good: \"€50\", Bad: \"50 euros\" or \"50欧元\".",
        "- For multiple items, use symbols naturally: \"Lunch €25, coffee €5\" or \"买菜 €50, 买鞋 €30\".",
        "- Keep it brief and conversational - focus on what makes the transaction memorable.",
        "Output policy:",
        "- Round to 2 decimals. Use positive amount.",
        "- Do NOT output a separate line for subtotal/total/grand total; only return line items. If only a total is present and no itemized amounts are present, return a single item for the total.",
        `CRITICAL language requirement: return all free-text fields strictly in ${language}.`,
      ].join("\n");

      const response = await model.generateContent({
        systemInstruction,
        contents: [{ role: "user", parts: [{ text: `Caller Currency: ${callerCurrency}\nCaller Date: ${callerDate}\nUser: ${body.text}` }] }],
        generationConfig: { maxOutputTokens: 512 },
      });

      const tool = response.response.functionCalls()?.[0];
      if (tool && tool.name === "add_transactions") {
        const rawItems: any[] = Array.isArray(tool.args?.items) ? tool.args.items : [];
        items = rawItems.map((it) => {
          const itemCurrency = it.currency || callerCurrency;
          const rawCategory = it.category || "other";
          const normalizedCategory = normalizeCategory(rawCategory);
          
          // Debug: Log category normalization for text analysis
          console.log(`[analyze-expense] Text analysis category normalization: "${rawCategory}" -> "${normalizedCategory}"`);
          
          const txType = String(it.type || "").toLowerCase();
          return {
            type: (txType === "income" || txType === "expense") ? txType : undefined,
            amount: Number(it.amount),
            category: normalizedCategory,
            currency: itemCurrency,
            currencySymbol: callerCurrencySymbol,
            date: it.date || callerDate,
            description: it.description || body.text,
          };
        }).filter((it) => {
          return (it.type === "income" || it.type === "expense") && 
                 typeof it.amount === 'number' &&
                 typeof it.category === 'string' &&
                 typeof it.currency === 'string' &&
                 typeof it.currencySymbol === 'string' &&
                 typeof it.date === 'string';
        }) as ExpenseItem[];
        if (items.length > 1) {
          const withoutTotals = items.filter((it) => !isTotalLike(it.description));
          if (withoutTotals.length > 0) items = withoutTotals;
          const sums = items.map((_, i) => items.filter((__, j) => i !== j).reduce((acc: number, b: any) => acc + (Number(b.amount) || 0), 0));
          items = items.filter((it, i) => Math.abs(it.amount - sums[i]) > 0.0001);
        }
      }
    } else if (body.image) {
      if (!body.image.contentType || !body.image.contentType.startsWith("image/")) {
        return { success: false, error: "Invalid image content type", status: 400, language };
      }
      // Prefer raw bytes if provided; otherwise decode base64
      let bytes: Uint8Array;
      if (body.image.bytes instanceof Uint8Array) {
        bytes = body.image.bytes;
      } else {
        const base64Data = body.image.data.replace(/^data:image\/\w+;base64,/, "");
        const binaryString = atob(base64Data);
        bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
      }

      if (bytes.length > 10 * 1024 * 1024) {
        return { success: false, error: "Image too large. Maximum 10MB", status: 400, language };
      }
      const base64Image = b64encode(bytes);

      const systemInstruction = [
        "You are a professional receipt analyzer.",
        "Task: Extract one or more transactions from the image and return ONLY via add_transactions. Every item MUST include a type (expense|income).",
        "Classification hints (do not guess wildly):",
        "- income: deposit/credit slips, payroll notifications, refunds to card/bank, inbound transfers.",
        "- expense: purchase receipts, invoices, utility bills, debit/outbound transfers.",
        `Category policy: Expense categories: ${expenseCategories.join(", ")}. Income categories: ${incomeCategories.join(", ")}.`,
        "Totals (CRITICAL):",
        "- Use the FINAL TOTAL / AMOUNT DUE that already INCLUDES taxes, fees, tips, and service charges.",
        "- If multiple totals exist (subtotal, tax, total, balance), choose the amount that represents the amount to pay after tax/fees.",
        "- If a balance line is present, prefer the balance/amount due over subtotal.",
        "Currency: detect, else use Caller Currency. Date: detect, else use Caller Date.",
        "Description policy for receipts: list items conversationally with currency symbols, include store if visible.",
        "Do NOT output subtotal/total lines; only line items. If only a total exists, return a single item for that total.",
        `CRITICAL language requirement: return all free-text fields strictly in ${language}.`,
      ].join("\n");

      // Model progression: fast model first, then more capable one as fallback
      const modelAttempts = [
         { name: "gemini-2.5-flash", timeout: 5000 },
        { name: "gemini-3-pro-preview", timeout: 13000 },
      ];

      let lastError = "";
      let items: ExpenseItem[] = [];

      for (const { name, timeout } of modelAttempts) {
        console.log(`[analyze-expense] Attempting with model: ${name}`);
        
        try {
          const result = await attemptAnalysis(
            genAI,
            name,
            systemInstruction,
            body,
            base64Image,
            callerCurrency,
            callerCurrencySymbol,
            callerDate,
            language,
            expenseCategories,
            incomeCategories,
            tools,
            timeout
          );

          if (result.success && result.items && result.items.length > 0) {
            console.log(`[analyze-expense] Success with ${name}: extracted ${result.items.length} items`);
            items = result.items;
            break;
          } else {
            lastError = result.error || `${name} returned no items`;
            console.log(`[analyze-expense] ${name} failed: ${lastError}`);
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes('timed out')) {
            lastError = error.message;
            console.log(`[analyze-expense] ${name} timed out after ${timeout}ms`);
          } else {
            lastError = error instanceof Error ? error.message : String(error);
            console.log(`[analyze-expense] ${name} error: ${lastError}`);
          }
        }
      }
    }

    if (items.length === 0) {
      console.log("[analyze-expense] All models failed to extract items");
      return { 
        success: false, 
        error: lastError || "Could not extract expense information. Please try a clearer photo with better lighting.", 
        status: 400, 
        language 
      };
    }

    return {
      success: true,
      items,
      language,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      status: 500,
      language: "en",
    };
  }
}
