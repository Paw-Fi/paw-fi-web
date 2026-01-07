// Expense processing functions for WhatsApp and other integrations
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { uploadReceiptImage } from "./storage-helper.ts";
import { getCurrencySymbol } from "./currency-symbols.ts";
import { normalizeCurrencyCode } from "./currency-normalize.ts";

// Retry helper for critical operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 500,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`[retry] ${operationName} attempt ${attempt}/${maxRetries} failed:`, error);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError;
}

export interface ExpenseItem {
  amount: number;
  category?: string;
  currency?: string;
  currencySymbol?: string;  // Currency symbol (e.g., '$', '€')
  date?: string;
  note?: string;
}

export interface BudgetResult {
  type: 'budget';
  amount: number;
  currency?: string;
  currencySymbol?: string;  // Currency symbol (e.g., '$', '€')
  date?: string;
  reply?: string;
  error?: string;
}

export interface ExpenseResult {
  type: 'expense';
  items: ExpenseItem[];
  isReceipt?: boolean;  // Flag to differentiate receipt vs text expense
  expenses?: any[];  // Actual database records from finance-update
  reply?: string;
  error?: string;
}

export interface FallbackResult {
  type: 'fallback';
  reply?: string;
  error?: string;
}

export type ProcessResult = BudgetResult | ExpenseResult | FallbackResult;

/**
 * Processes free-form text to extract and log expenses using Gemini AI
 * Returns raw data without formatting - parent should handle presentation
 * 
 * CURRENCY PRIORITY:
 * 1. Currency explicitly mentioned in text (e.g., "50 EUR", "100 RM") - Gemini detects
 * 2. callerCurrency parameter (from caller - can be user selected or preferred_currency)
 * 3. 'USD' default (applied by caller before calling this function)
 */
export async function processFreeFormTextExpense(params: {
  userId?: string;
  phone?: string;
  text: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  geminiApiKey: string;
  callerDate?: string;
  callerCurrency?: string;  // DEFAULT currency if not detected in text (should already be: inputCurrency || preferred_currency || 'USD')
}): Promise<ProcessResult> {
  const {
    userId,
    phone,
    text,
    supabaseUrl,
    supabaseServiceRoleKey,
    geminiApiKey,
    callerDate = new Date().toISOString().slice(0, 10),
    callerCurrency = 'USD',  // Final fallback if caller doesn't provide
  } = params;

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { 'X-Client-Info': 'moneko-expense-processor' } },
  });

  const genAI = new GoogleGenerativeAI(geminiApiKey);

  const tools = [{
    function_declarations: [
      {
        name: 'set_budget',
        description: 'Set or update the daily budget for this contact (today by default). Amount in major units.',
        parameters: {
          type: 'OBJECT',
          properties: {
            amount: { type: 'NUMBER', description: 'Budget amount in major units', nullable: false },
            currency: { type: 'STRING', description: 'ISO currency code', nullable: true },
            date: { type: 'STRING', description: 'ISO date, YYYY-MM-DD', nullable: true },
          },
          required: ['amount'],
        },
      },
      {
        name: 'add_expenses',
        description: 'Append one or more expenses for this contact (today by default). Amount in major units.',
        parameters: {
          type: 'OBJECT',
          properties: {
            items: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  amount: { type: 'NUMBER', nullable: false },
                  category: { type: 'STRING', nullable: true, description: 'Normalized category label' },
                  currency: { type: 'STRING', nullable: true },
                  date: { type: 'STRING', nullable: true },
                  note: { type: 'STRING', nullable: true, description: 'Optional user-provided note' },
                },
                required: ['amount'],
              },
            },
          },
          required: ['items'],
        },
      },
    ],
  }];

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite', tools });
  const systemInstruction =
    'You are a budgeting assistant. Decide whether the user is setting a budget or logging expenses. '
    + 'Always infer and attach clear categories for each expense item. '
    + '\n\nVALID CATEGORIES (use ONLY these exact category names):\n'
    + 'transfers, shopping, utilities, entertainment, entertainment_subscriptions, restaurants, food, groceries, '
    + 'transport, transportation, travel, flights, vacation, health, medical, text, education, tuition, '
    + 'subscriptions, services, housing, rent, mortgage, bills, insurance, savings, investment, investments, '
    + 'income, salary, bonus, pets, kids, family, gifts, charity, fees, loan, loans, debt, personal care, '
    + 'beauty, misc, uncategorized'
    + '\n\nCATEGORY SELECTION RULES:\n'
    + '- Choose the MOST SPECIFIC category that matches the expense\n'
    + '- Use "uncategorized" only if no other category fits\n'
    + '- Use lowercase and exact spelling as listed above\n'
    + '\n\nCURRENCY HANDLING (STRICT PRIORITY):\n'
    + '1. FIRST: Look for currency explicitly mentioned by user (e.g., "50 USD", "€100", "100 RM", "75 SAR")\n'
    + '   - If found, use THAT currency code (EUR for €, MYR for RM, SAR for ر.س, etc.)\n'
    + '2. FALLBACK: If NO currency is mentioned, use the Caller Currency provided below\n'
    + '3. ALWAYS output currency as a 3-letter ISO-4217 code in the JSON. Never output symbols or aliases (e.g., $, R, US$, RM).\n'
    + '   Map common symbols/aliases to ISO codes: $, US$, U$ => USD; R or RJ => ZAR; RM => MYR; A$ => AUD; C$ => CAD; S$ => SGD; HK$ => HKD; NZ$ => NZD; MX$ => MXN; R$ => BRL; KSH/KSHS => KES; د.إ => AED; ر.س => SAR; £ => GBP; € => EUR; J$ => JMD; MK => MWK.\n'
    + '   If ambiguous (e.g., ¥), omit the currency so the caller currency applies.\n'
    + '4. NEVER leave currency empty after all fallbacks.\n\n'
    + 'Use the provided functions to perform updates, including category fields. Keep replies short and human-friendly.';

  const response = await model.generateContent({
    systemInstruction,
    contents: [{ role: 'user', parts: [{ text: `Caller Currency: ${callerCurrency}\nCaller Date: ${callerDate}\nUser: ${text}` }] }],
    generationConfig: { maxOutputTokens: 512 },
  });

  const tool = response.response.functionCalls()?.[0];
  if (tool) {
    if (tool.name === 'set_budget') {
      const amount = Number(tool.args?.amount);
      const date = String(tool.args?.date || callerDate);
      const currency = normalizeCurrencyCode(tool.args?.currency) || callerCurrency;

      const { data, error } = await supabase.functions.invoke('finance-update', {
        body: { userId, phone, text: `/setBudget ${amount}`, date, currency },
      });

      if (error) {
        console.error('set_budget via finance-update error', error);
        return {
          type: 'budget',
          amount,
          currency,
          currencySymbol: getCurrencySymbol(currency),
          date,
          error: 'Failed to set budget'
        };
      }

      return {
        type: 'budget',
        amount,
        currency,
        currencySymbol: getCurrencySymbol(currency),
        date,
        reply: data?.reply || 'Budget updated.'
      };
    }

    if (tool.name === 'add_expenses') {
      const items: ExpenseItem[] = Array.isArray(tool.args?.items) ? tool.args.items : [];

      const composed = items
        .map((it: any) => {
          const normalized = normalizeCurrencyCode(it.currency) || callerCurrency;
          const currencySymbol = getCurrencySymbol(normalized);
          return `I spent ${currencySymbol}${it.amount}${it.category ? ' on ' + it.category : ''}${it.date ? ' at ' + it.date : ''}${it.note ? ' (' + it.note + ')' : ''}`;
        })
        .join(', ');

      // ROBUST: Retry finance-update call with exponential backoff
      let data: any, error: any;
      try {
        const result = await retryOperation(
          async () => {
            const response = await supabase.functions.invoke('finance-update', {
              body: { userId, phone, text: composed, date: callerDate, currency: callerCurrency },
            });
            if (response.error) throw response.error;
            return response;
          },
          2, // max 2 retries
          500, // 500ms initial delay
          'finance-update(add_expenses)'
        );
        data = result.data;
        error = result.error;
      } catch (e) {
        error = e;
        console.error('add_expenses via finance-update error (after retries):', error);
        return { 
          type: 'expense', 
          items, 
          error: 'Failed to add expenses. Please try again.',
          reply: `Added ${items.length} expense(s) locally, but sync failed. Please check your connection.`
        };
      }

      if (error) {
        console.error('add_expenses via finance-update error', error);
        return { 
          type: 'expense', 
          items, 
          error: 'Failed to add expenses',
          reply: `Expenses logged but totals couldn't be calculated. Check your app.`
        };
      }

      return {
        type: 'expense',
        items: items.map(it => {
          const itemCurrency = normalizeCurrencyCode(it.currency) || callerCurrency;
          return {
            amount: it.amount,
            category: it.category || 'expense',
            currency: itemCurrency,
            currencySymbol: getCurrencySymbol(itemCurrency),
            date: it.date || callerDate,
            note: it.note,
          };
        }),
        expenses: data?.results?.expenses || [], // FIX: Access expenses from results object
        reply: data?.reply || 'Expenses recorded.'
      };
    }
  }

  // Fallback to finance-update
  const { data, error } = await supabase.functions.invoke('finance-update', {
    body: { userId, phone, text, currency: callerCurrency },
  });

  if (error) {
    console.error('finance-update fallback error', error);
    return { type: 'fallback', error: 'Failed to process message' };
  }

  return { type: 'fallback', reply: data?.reply || 'Update recorded.' };
}

/**
 * Helper function to encode bytes to base64
 */
function b64encode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Processes receipt image to extract and log expenses using Gemini Vision AI
 * Returns raw data without formatting - parent should handle presentation
 * 
 * CURRENCY PRIORITY:
 * 1. Currency detected on receipt (€, $, RM, etc.) - Gemini Vision detects
 * 2. callerCurrency parameter (from caller - can be user selected or preferred_currency)
 * 3. 'USD' default (applied by caller before calling this function)
 */
export async function processReceiptImage(params: {
  userId?: string;
  phone?: string;
  imageBuffer: Uint8Array;
  contentType: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  geminiApiKey: string;
  callerDate?: string;
  callerCurrency?: string;  // DEFAULT currency if not detected on receipt (should already be: inputCurrency || preferred_currency || 'USD')
  skipFinanceUpdate?: boolean;
}): Promise<ProcessResult> {
  const {
    userId,
    phone,
    imageBuffer,
    contentType,
    supabaseUrl,
    supabaseServiceRoleKey,
    geminiApiKey,
    callerDate = new Date().toISOString().slice(0, 10),
    callerCurrency = 'USD',  // Final fallback if caller doesn't provide
    skipFinanceUpdate = false,
  } = params;

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { 'X-Client-Info': 'moneko-expense-processor' } },
  });

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const toolsForVision = [{
    function_declarations: [
      {
        name: 'set_budget',
        description: 'Set or update the daily budget for this contact (today by default). Amount in major units.',
        parameters: {
          type: 'OBJECT',
          properties: {
            amount: { type: 'NUMBER', description: 'Budget amount in major units', nullable: false },
            currency: { type: 'STRING', description: 'ISO currency code', nullable: true },
            date: { type: 'STRING', description: 'ISO date, YYYY-MM-DD', nullable: true },
          },
          required: ['amount'],
        },
      },
      {
        name: 'add_expenses',
        description: 'Append one or more expenses for this contact (today by default). Amount in major units.',
        parameters: {
          type: 'OBJECT',
          properties: {
            items: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  amount: { type: 'NUMBER', nullable: false },
                  category: { type: 'STRING', nullable: true, description: 'Normalized category label' },
                  currency: { type: 'STRING', nullable: true },
                  date: { type: 'STRING', nullable: true },
                  note: { type: 'STRING', nullable: true, description: 'Optional user-provided note' },
                },
                required: ['amount'],
              },
            },
          },
          required: ['items'],
        },
      },
    ],
  }];

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite', tools: toolsForVision });

  const prompt = `Caller Currency: ${callerCurrency}\nCaller Date: ${callerDate}\n\nYou are a budgeting assistant analyzing a receipt image.

CRITICAL INSTRUCTIONS:
1. Find the FINAL TOTAL amount at the bottom of the receipt (after all taxes, service charges, tips, etc.)
2. Create a SINGLE expense entry with this total amount
3. For the note field, list the main items purchased (e.g., "Burrata, Solomillo, Chocolate fondat, etc.")
4. Determine the appropriate category based on the items using ONLY the valid categories listed below
5. If multiple categories apply (food + drinks), choose the primary one
6. Do NOT create separate expenses for each line item - only ONE expense with the total
7. CAREFULLY look for any date information on the receipt (transaction date, order date, etc.)

VALID CATEGORIES (use ONLY these exact category names):
transfers, shopping, utilities, entertainment, entertainment_subscriptions, restaurants, food, groceries, 
transport, transportation, travel, flights, vacation, health, medical, text, education, tuition, 
subscriptions, services, housing, rent, mortgage, bills, insurance, savings, investment, investments, 
income, salary, bonus, pets, kids, family, gifts, charity, fees, loan, loans, debt, personal care, 
beauty, misc, uncategorized

CATEGORY SELECTION RULES:
- Choose the MOST SPECIFIC category that matches the receipt items
- For restaurant/dining receipts, use "restaurants"
- For grocery store receipts, use "groceries"
- Use "uncategorized" only if no other category fits
- Use lowercase and exact spelling as listed above

CURRENCY HANDLING (STRICT PRIORITY):
Priority 1: DETECT currency on receipt
- Look carefully for currency symbols or codes on the receipt (€, $, £, RM, SAR, د.إ, ₹, ¥, etc.)
- Common mappings: € = EUR, $ = USD, RM = MYR, SAR = SAR, د.إ = AED, £ = GBP, ₹ = INR, ¥ = JPY/CNY
- If you find ANY currency indicator on the receipt, use that currency code

Priority 2: FALLBACK to Caller Currency
- If NO currency is visible, unclear, or unreadable on receipt, use: ${callerCurrency}

Priority 3: NEVER leave empty
- You MUST always provide a currency code - either detected OR ${callerCurrency}

STRICT OUTPUT FORMAT FOR CURRENCY:
- In all JSON tool outputs, ALWAYS provide currency as a 3-letter ISO-4217 code (e.g., ZAR, USD, MYR).
- NEVER output symbols or aliases (e.g., $, R, RJ, RM) in the currency field.
- Map symbols/aliases to ISO codes: $, US$, U$ => USD; R or RJ => ZAR; RM => MYR; A$ => AUD; C$ => CAD; S$ => SGD; HK$ => HKD; NZ$ => NZD; MX$ => MXN; R$ => BRL; KSH/KSHS => KES; د.إ => AED; ر.س => SAR; £ => GBP; € => EUR.
- If ambiguous (e.g., '¥'), omit the currency so the caller currency applies.

Use the add_expenses tool with a single item containing:
- amount: the final total (e.g., 61.95)
- category: appropriate category (e.g., "dining", "food", "groceries")
- note: brief description of main items (e.g., "Burrata, Solomillo, Chocolate, drinks")
- currency: DETECTED currency OR ${callerCurrency} (NEVER empty)
- date: IMPORTANT - Look carefully for the transaction date on the receipt. Extract it in YYYY-MM-DD format if found, otherwise use ${callerDate}`;

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: contentType,
        data: b64encode(imageBuffer)
      }
    },
    prompt
  ]);

  console.log('[receipt-parse] Gemini response received', {
    hasFunctionCalls: !!result.response.functionCalls,
    functionCallsCount: result.response.functionCalls()?.length || 0,
    hasText: !!result.response.text(),
    textPreview: result.response.text()?.slice(0, 100)
  });

  const tool = result.response.functionCalls()?.[0];
  if (tool) {
    if (tool.name === 'set_budget') {
      const amount = Number(tool.args?.amount);
      const date = String(tool.args?.date || callerDate);
      const currency = tool.args?.currency || callerCurrency;

      const { data, error } = await supabase.functions.invoke('finance-update', {
        body: { userId, phone, text: `/setBudget ${amount}`, date, currency },
      });

      if (error) {
        console.error('set_budget(receipt) error', error);
        return {
          type: 'budget',
          amount,
          currency,
          currencySymbol: getCurrencySymbol(currency),
          date,
          error: 'Failed to set budget'
        };
      }

      return {
        type: 'budget',
        amount,
        currency,
        currencySymbol: getCurrencySymbol(currency),
        date,
        reply: data?.reply || 'Budget updated.'
      };
    }

    if (tool.name === 'add_expenses') {
      const items: ExpenseItem[] = Array.isArray(tool.args?.items) ? tool.args.items : [];
      console.log('[add_expenses] Received items from Gemini:', JSON.stringify(items, null, 2));

      // Upload receipt image to Supabase Storage using shared helper
      const identifier = userId || phone || 'unknown';
      const receiptImageUrl = await uploadReceiptImage(
        supabaseUrl,
        supabaseServiceRoleKey,
        imageBuffer,
        contentType,
        identifier
      );

      const composed = items
        .map((it: any) => {
          const normalized = normalizeCurrencyCode(it.currency) || callerCurrency;
          const currencySymbol = getCurrencySymbol(normalized);
          return `I spent ${currencySymbol}${it.amount}${it.category ? ' on ' + it.category : ''}${it.date ? ' at ' + it.date : ''}${it.note ? ' (' + it.note + ')' : ''}`;
        })
        .join(', ');

      console.log('[add_expenses] Composed text for finance-update:', composed);

      if (skipFinanceUpdate) {
        return {
          type: 'expense',
          isReceipt: true,
          items: items.map((it) => {
            const itemCurrency = normalizeCurrencyCode(it.currency) || callerCurrency;
            return {
              amount: it.amount,
              category: it.category || 'expense',
              currency: itemCurrency,
              currencySymbol: getCurrencySymbol(itemCurrency),
              date: it.date || callerDate,
              note: it.note,
              receipt_image_url: receiptImageUrl,
            };
          }),
          reply: 'Receipt parsed (finance-update skipped for testing)',
        };
      }

      // ROBUST: Retry receipt processing with exponential backoff
      let data: any, error: any;
      try {
        const result = await retryOperation(
          async () => {
            const response = await supabase.functions.invoke('finance-update', {
              body: { 
                userId, 
                phone, 
                text: composed, 
                date: callerDate,
                currency: callerCurrency,
                receipt_image_url: receiptImageUrl
              },
            });
            if (response.error) throw response.error;
            return response;
          },
          2,
          500,
          'finance-update(receipt)'
        );
        data = result.data;
        error = result.error;
      } catch (e) {
        error = e;
        console.error('add_expenses(receipt) error (after retries):', error);
        return { 
          type: 'expense', 
          items, 
          isReceipt: true,
          error: 'Receipt uploaded but processing failed',
          reply: `Receipt saved but couldn't calculate totals. Check your app for details.`
        };
      }

      console.log('[add_expenses] finance-update response:', { data, error });

      if (error) {
        console.error('add_expenses(receipt) error', error);
        return { 
          type: 'expense', 
          items, 
          isReceipt: true,
          error: 'Failed to process receipt',
          reply: `Receipt logged but totals couldn't be calculated.`
        };
      }

      return {
        type: 'expense',
        isReceipt: true,  // Mark as receipt for special formatting
        items: items.map(it => {
          const itemCurrency = normalizeCurrencyCode(it.currency) || callerCurrency;
          return {
            amount: it.amount,
            category: it.category || 'expense',
            currency: itemCurrency,
            currencySymbol: getCurrencySymbol(itemCurrency),
            date: it.date || callerDate,
            note: it.note,
          };
        }),
        expenses: data?.results?.expenses || [], // FIX: Access expenses from results object
        reply: data?.reply || 'Expenses recorded.'
      };
    }
  }

  // Fallback: no tool call - upload image anyway using shared helper
  const identifier = userId || phone || 'unknown';
  const receiptImageUrl = await uploadReceiptImage(
    supabaseUrl,
    supabaseServiceRoleKey,
    imageBuffer,
    contentType,
    identifier
  );

  const textOut = (result.response.text() || '').trim();
  if (!textOut) {
    return { type: 'fallback', error: 'Could not read receipt' };
  }

  console.log('[receipt-textOut] finance-update(receipt) textOut:', textOut);
  const { data, error } = await supabase.functions.invoke('finance-update', {
    body: { 
      userId, 
      phone, 
      text: textOut,
      currency: callerCurrency,
      receipt_image_url: receiptImageUrl // Pass the uploaded image URL
    },
  });

  if (error) {
    console.error('finance-update(receipt) error', error);
    return { type: 'fallback', error: 'Failed to process receipt' };
  }

  return { type: 'fallback', reply: data?.reply || 'Receipt processed.' };
}
