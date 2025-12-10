import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import * as XLSX from "https://esm.sh/xlsx@0.18.5?no-dts";
import { validateCurrency } from "./currency-validator.ts";
import { normalizeCategory, getExpenseCategories, getIncomeCategories } from "./category-colors.ts";
import { getCurrencySymbol } from "./currency-symbols.ts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function b64encode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export interface AnalyzeAttachment {
  filename: string;
  contentType: string;
  data: string; // base64
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
  language?: string;
  attachments?: AnalyzeAttachment[];
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

async function analyzeFromText(
  genAI: GoogleGenerativeAI,
  callerCurrency: string,
  callerDate: string,
  language: string,
  bodyText: string,
  tools: any,
  expenseCategories: string[],
  incomeCategories: string[],
): Promise<ExpenseItem[]> {
  let items: ExpenseItem[] = [];

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", tools });
  const systemInstruction = [
    "You are a professional transaction extraction and classification system.",
    "Task: Parse the input (plain text) into one or more transactions and return them ONLY by calling add_transactions. Every item MUST include a type (expense|income).",

    "### 1. QUANTITY & AMOUNT STRATEGY",
    "- **Single Receipt/Bill**: If the text represents a single receipt with line items and a total, return **ONE** transaction for the Grand Total.",
    "- **Bank Feed / List**: If the text lists multiple distinct transactions, return them as **SEPARATE** items.",
    "- Do NOT output a separate transaction for subtotal/total/grand total lines.",

    "### 2. CLASSIFICATION (Type & Category)",
    "- **Type**: 'expense' (spending, debit, payment) vs 'income' (deposit, salary, refund).",
    "- **Bank/Notification Context**: 'Credited', 'Deposit', 'Received', 'Top up' -> INCOME. 'Debited', 'Paid', 'Purchase', 'Sent to', 'Withdrawal' -> EXPENSE.",
    `   - **Expense Categories**: ${expenseCategories.join(", ")}.`,
    `   - **Income Categories**: ${incomeCategories.join(", ")}.`,
    "- **Fallback**: If unrecognizable, choose the closest generic category from the provided lists (for example an 'other'/'misc' style expense category or a generic income category). Never invent category names that are not present in the provided lists.",
    "- For money received from relatives or friends, choose the closest gift/transfer-like income category from the provided list. For salary/payroll, choose the closest salary-like income category. For card/bank returns, choose the closest refund/return-like category from the list.",

    "### 3. CURRENCY & DATE",
    "- Detect explicit currency symbol/code; else use Caller Currency.",
    "- If text clearly indicates a different currency, use that currency (no conversion).",
    "- Date parsing: Look for ANY date reference (absolute or relative like 'yesterday').",
    "- Convert relative dates to YYYY-MM-DD based on Caller Date.",
    "- Only use Caller Date if NO date is mentioned.",
    "- **Amount policy**: Always return amounts as positive numbers (no minus signs). A negative or red value in the source indicates 'expense' vs 'income' type, not a negative amount.",

    "### 4. DESCRIPTION & LANGUAGE",
    "- Write natural, conversational notes generally matching the user's intent.",
    `   - **CRITICAL**: All free-text fields (especially description) must be strictly in ${language}, even if the input is in another language.`,

    "FINAL RULE: Under no circumstances output plain text or JSON. Always and only respond by calling add_transactions.",
  ].join("\n");

  const response = await model.generateContent({
    systemInstruction,
    contents: [{ role: "user", parts: [{ text: `Caller Currency: ${callerCurrency}\nCaller Date: ${callerDate}\nUser: ${bodyText}` }] }],
    generationConfig: { maxOutputTokens: 512 },
  });

  const tool = response.response.functionCalls()?.[0];
  if (tool && tool.name === "add_transactions") {
    const rawItems: any[] = Array.isArray(tool.args?.items) ? tool.args.items : [];
    items = rawItems
      .map((it) => {
        const itemCurrency = it.currency || callerCurrency;
        const rawCategory = it.category || "other";
        const normalizedCategory = normalizeCategory(rawCategory);

        // Debug: Log category normalization for text analysis
        console.log(
          `[analyze-expense] Text analysis category normalization: "${rawCategory}" -> "${normalizedCategory}"`,
        );

        const txType = String(it.type || "").toLowerCase();
        // Use correct symbol for the detected currency
        const itemCurrencySymbol = getCurrencySymbol(itemCurrency);

        return {
          type: txType === "income" || txType === "expense" ? txType : undefined,
          amount: Number(it.amount),
          category: normalizedCategory,
          currency: itemCurrency,
          currencySymbol: itemCurrencySymbol,
          date: it.date || callerDate,
          description: it.description || bodyText,
        } as ExpenseItem;
      })
      .filter((it) => {
        return (
          it.type &&
          (it.type === "income" || it.type === "expense") &&
          Number.isFinite(it.amount) &&
          it.amount > 0 &&
          typeof it.category === "string" &&
          typeof it.currency === "string" &&
          typeof it.currencySymbol === "string" &&
          typeof it.date === "string"
        );
      });

    if (items.length > 1) {
      const withoutTotals = items.filter((it) => !isTotalLike(it.description));
      if (withoutTotals.length > 0) items = withoutTotals;
      const sums = items.map((_, i) =>
        items
          .filter((__, j) => i !== j)
          .reduce((acc: number, b: any) => acc + (Number(b.amount) || 0), 0),
      );
      items = items.filter((it, i) => Math.abs(it.amount - sums[i]) > 0.0001);
    }
  }

  return items;
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
  callerDate: string,
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
          { text: `Caller Currency: ${callerCurrency}\nCaller Date: ${callerDate}\nExtract transaction details from this image (receipt, bank statement, or transaction notification):` },
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
        
        // Use correct symbol for the detected currency
        const itemCurrencySymbol = getCurrencySymbol(itemCurrency);

        return {
          type: (txType === "income" || txType === "expense") ? txType : undefined,
          amount: Number(it.amount),
          category: normalizedCategory,
          currency: itemCurrency,
          currencySymbol: itemCurrencySymbol,
          date: it.date || callerDate,
          description: it.description || "",
        };
      }).filter((it) => it.type && (it.type === "income" || it.type === "expense") && Number.isFinite(it.amount) && it.amount > 0) as ExpenseItem[];
      
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
    
    return { success: false, error: `Moneko AI could not extract valid transactions` };
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

    const hasText = typeof body.text === "string" && body.text.trim().length > 0;
    const hasImage = !!body.image;
    const hasAttachments = Array.isArray(body.attachments) && body.attachments.length > 0;

    const modes = [hasText, hasImage, hasAttachments].filter(Boolean).length;
    if (modes === 0) {
      return {
        success: false,
        error: "Must provide text, image, or attachments",
        status: 400,
        language: "en",
      };
    }

    if (modes > 1) {
      return {
        success: false,
        error: "Cannot process multiple input types simultaneously",
        status: 400,
        language: "en",
      };
    }

    const callerCurrency = validateCurrency(body.currency);
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
      functionDeclarations: [
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

    if (hasAttachments) {
      const att = body.attachments![0];
      const filename = att.filename || "";
      const contentType = att.contentType || "";
      const lowerName = filename.toLowerCase();

      const cleaned = att.data.replace(/^data:.*;base64,/, "");
      const binaryString = atob(cleaned);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const textLike =
        /^(text\/|application\/(json|csv|xml|javascript))/i.test(contentType) ||
        /\.(csv|txt|json|xml)$/i.test(lowerName);
      const isXlsx =
        /spreadsheetml|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/i.test(contentType) ||
        /\.xlsx$/i.test(lowerName);
      const isPdf = /application\/pdf/i.test(contentType) || /\.pdf$/i.test(lowerName);

      let syntheticText = "";

      if (textLike) {
        try {
          syntheticText = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 16000));
        } catch {
          syntheticText = "";
        }
      } else if (isXlsx) {
        syntheticText = buildXlsxPreview(bytes) || "";
      } else if (isPdf) {
        const base64Data = b64encode(bytes);
        const summary = await summarizePdfWithGemini(base64Data, "application/pdf", geminiApiKey);
        syntheticText = summary || "";
      }

      if (!syntheticText.trim()) {
        return {
          success: false,
          error: "Unsupported or unreadable attachment format",
          status: 400,
          language,
        };
      }

      items = await analyzeFromText(
        genAI,
        callerCurrency,
        callerDate,
        language,
        syntheticText,
        tools,
        expenseCategories,
        incomeCategories,
      );
    } else if (hasText) {
      items = await analyzeFromText(
        genAI,
        callerCurrency,
        callerDate,
        language,
        body.text!,
        tools,
        expenseCategories,
        incomeCategories,
      );
    } else if (hasImage) {
      const image = body.image!;
      if (!image.contentType || !image.contentType.startsWith("image/")) {
        return { success: false, error: "Invalid image content type", status: 400, language };
      }
      // Prefer raw bytes if provided; otherwise decode base64
      let bytes: Uint8Array;
      if (image.bytes instanceof Uint8Array) {
        bytes = image.bytes;
      } else {
        const base64Data = image.data.replace(/^data:image\/\w+;base64,/, "");
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
        "You are an expert Financial OCR Analyst for Moneko.",
        "OBJECTIVE: Analyze the image to extract transaction data. Minimize noise, maximize accuracy.",
        "OUTPUT: Call `add_transactions` with the extracted items. Under no circumstances output plain text or JSON.",

        "### 0. NOTIFICATION / SINGLE TRANSACTION SCREENS",
        "- If the image is a notification or single-transaction view (e.g. 'You spent $15 at Starbucks'), return exactly ONE transaction.",
        "- **Merchant**: App/Merchant name (e.g. 'Revolut • Starbucks' -> 'Starbucks').",
        "- **Type**: 'expense' if 'spent', 'debited', 'paid', 'purchase'; 'income' if 'credited', 'received', 'deposit', 'refund'.",
        "- **Amount**: Prominent numeric value.",
        "- **Description**: Short summary like 'Coffee at Starbucks'.",

        "### 1. QUANTITY & AMOUNT STRATEGY",
        "- **Single Receipt/Bill**: If the image is a receipt with a list of items and a final total, return **ONE** transaction.",
        "   - **Amount**: Must be the **Grand Total** (Balance Due) at the bottom, including tax/tip.",
        "   - **Description**: Summarize the items ('Walmart: Milk, Bread, Eggs').",
        "   - **Rule**: Never output one item per receipt line. For receipts, you must output exactly one transaction with the grand total.",
        "- **Bank Feed / List**: If the image shows multiple *distinct, unrelated* transactions (e.g. a bank statement list), extract them as **SEPARATE** items.",
        "- **Ambiguity**: If unsure, prefer returning a single Item with the largest 'Total' amount found.",
        "- **Amount policy**: Always return amounts as positive numbers (no minus signs). Negative or red values in the UI indicate 'expense' vs 'income' type, not a negative amount.",

        "### 2. CLASSIFICATION (Type & Category)",
        "- **Type**: 'expense' vs 'income'.",
        "   - Visual Cues: Red/- = Expense. Green/+ = Income.",
        "   - Text Cues: 'Credit', 'Deposit', 'Refund', 'Top up' -> Income. 'Debit', 'Purchase', 'Payment', 'Sent to' -> Expense.",
        `   - **Expense Categories**: ${expenseCategories.join(", ")}.`,
        `   - **Income Categories**: ${incomeCategories.join(", ")}.`,
        "- **Fallback**: If unrecognizable, choose the closest generic category from the provided lists (for example an 'other'/'misc' style expense category or a generic income category). Never invent category names that are not present in the provided lists.",
        "- For money received from relatives or friends, choose the closest gift/transfer-like income category from the provided list. For salary/payroll, choose the closest salary-like income category. For card/bank returns, choose the closest refund/return-like category from the list.",

        "### 3. DATA REFINEMENT",
        "- **Merchant**: Clean up raw text (e.g., 'Uber *Trip 4920' -> 'Uber').",
        "- **Date**: Parse absolute dates or relative ('Yesterday'). Default to Caller Date if not found.",
        "- **Currency**: Trust symbol in image ($/€/£) over Caller Currency. Defaults to Caller Currency.",
        "- **Noise**: Ignore loyalty points, barcodes, IDs, tax numbers unless needed for context.",
        
        "### 4. DESCRIPTION & LANGUAGE",
        "- Create a natural, short conclusion of the image.",
        "- Pattern: '[Merchant] [Short Summary of Items]'",
        `   - **CRITICAL**: All free-text fields (especially description) must be strictly in ${language}, even if the input is in another language.`,

        "FINAL RULE: Under no circumstances output plain text or JSON. Always and only respond by calling add_transactions.",
      ].join("\n");

      // Model progression: fast model first, then more capable one as fallback
      const modelAttempts = [
 { name: "gemini-2.5-flash-lite", timeout: 5000 },
{ name: "gemini-3-pro-preview", timeout: 10000 },
      ];

      // Removed shadowing variables
      // let lastError = "";
      // let items: ExpenseItem[] = [];

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
            callerDate,
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

      if (!items.length) {
        console.log("[analyze-expense] No items from standard image prompts, trying handwriting-focused fallback");
        const handwritingInstruction = [
          "You are an expert Financial OCR Analyst for Moneko.",
          "OBJECTIVE: The image is likely a handwritten list of expenses or income on paper.",
          "OUTPUT: Call `add_transactions` with the extracted items. Under no circumstances output plain text or JSON.",
          "",
          "### HANDWRITTEN LIST PATTERN",
          "- Treat each readable line that looks like \"<label> <amount>\" (e.g. \"gym $45\", \"grocery $120\") as a separate transaction.",
          "- Prioritize darker, thicker handwriting lines over faint background print or noise.",
          "- If you can reasonably infer a transaction from partial handwriting, include it with best-effort classification.",
        ].join("\n");

        try {
          const fallback = await attemptAnalysis(
            genAI,
            "gemini-2.5-flash-lite",
            handwritingInstruction,
            body,
            base64Image,
            callerCurrency,
            callerDate,
            tools,
            8000,
          );

          if (fallback.success && fallback.items && fallback.items.length > 0) {
            console.log(`[analyze-expense] Handwriting fallback succeeded: extracted ${fallback.items.length} items`);
            items = fallback.items;
          } else {
            lastError = fallback.error || lastError || "Handwriting fallback returned no items";
            console.log("[analyze-expense] Handwriting fallback failed:", lastError);
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          lastError = msg || lastError;
          console.log("[analyze-expense] Handwriting fallback error:", msg);
        }
      }
    }

    if (items.length === 0) {
      console.log("[analyze-expense] All models failed to extract items");
      return { 
        success: false, 
        error: lastError || "Could not extract transaction information. Please try clearer text, a screenshot, or a photo.", 
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

export function buildXlsxPreview(buf: Uint8Array): string | null {
  try {
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return null;
    const sheet = wb.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const limited = rows.slice(0, 20).map((r) => (Array.isArray(r) ? r.slice(0, 8) : r));
    const previewLines = limited.map((r: any) => JSON.stringify(r));
    return `Sheet "${sheetName}" preview (first ${limited.length} rows):\n${previewLines.join("\n")}`;
  } catch (e) {
    console.error("XLSX parse error", e);
    return null;
  }
}

export async function summarizePdfWithGemini(
  base64Data: string,
  mimeType: string,
  geminiKey: string,
): Promise<string | null> {
  try {
    const ai = new GoogleGenerativeAI(geminiKey);
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const resp = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: "Summarize this PDF. Extract key amounts, dates, and any tabular transaction data. Keep it concise for WhatsApp." }] },
        { role: "user", parts: [{ inlineData: { mimeType, data: base64Data } }] },
      ],
    });
    return resp.response.text() || null;
  } catch (e) {
    console.error("PDF summary via Gemini failed", e);
    return null;
  }
}
