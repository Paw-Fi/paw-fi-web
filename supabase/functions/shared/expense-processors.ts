// Expense processing functions for WhatsApp and other integrations
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCurrencySymbol } from "./whatsapp-helpers.ts";
import { uploadReceiptImage } from "./storage-helper.ts";

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
 */
export async function processFreeFormTextExpense(params: {
  userId?: string;
  phone?: string;
  text: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  geminiApiKey: string;
  callerDate?: string;
  callerCurrency?: string;
}): Promise<ProcessResult> {
  const {
    userId,
    phone,
    text,
    supabaseUrl,
    supabaseServiceRoleKey,
    geminiApiKey,
    callerDate = new Date().toISOString().slice(0, 10),
    callerCurrency = 'USD',
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
    + 'Always infer and attach clear categories for each expense item (e.g., groceries, food, transport, housing, utilities, entertainment, healthcare, education, shopping, travel, income, other). '
    + 'Prefer the user\'s preferred currency; if none is specified, default to USD with the $ symbol in user-facing text. '
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
      const currency = tool.args?.currency || callerCurrency;

      const { data, error } = await supabase.functions.invoke('finance-update', {
        body: { userId, phone, text: `/setBudget ${amount}`, date },
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
        .map((it: any) => `I spent ${it.amount}${it.currency ? ' ' + it.currency : ''}${it.category ? ' on ' + it.category : ''}${it.date ? ' at ' + it.date : ''}${it.note ? ' (' + it.note + ')' : ''}`)
        .join(', ');

      const { data, error } = await supabase.functions.invoke('finance-update', {
        body: { userId, phone, text: composed, date: callerDate },
      });

      if (error) {
        console.error('add_expenses via finance-update error', error);
        return { type: 'expense', items, error: 'Failed to add expenses' };
      }

      return {
        type: 'expense',
        items: items.map(it => {
          const itemCurrency = it.currency || callerCurrency;
          return {
            amount: it.amount,
            category: it.category || 'expense',
            currency: itemCurrency,
            currencySymbol: getCurrencySymbol(itemCurrency),
            date: it.date || callerDate,
            note: it.note,
          };
        }),
        expenses: data?.expenses || [], // Return actual database records
        reply: data?.reply || 'Expenses recorded.'
      };
    }
  }

  // Fallback to finance-update
  const { data, error } = await supabase.functions.invoke('finance-update', {
    body: { userId, phone, text },
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
  callerCurrency?: string;
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
    callerCurrency = 'USD',
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

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', tools: toolsForVision });

  const prompt = `Caller Currency: ${callerCurrency}\nCaller Date: ${callerDate}\n\nYou are a budgeting assistant analyzing a receipt image.

CRITICAL INSTRUCTIONS:
1. Find the FINAL TOTAL amount at the bottom of the receipt (after all taxes, service charges, tips, etc.)
2. Create a SINGLE expense entry with this total amount
3. For the note field, list the main items purchased (e.g., "Burrata, Solomillo, Chocolate fondat, etc.")
4. Determine the appropriate category based on the items (food, drink, groceries, transport, shopping, entertainment, etc.)
5. If multiple categories apply (food + drinks), choose the primary one or use "dining"
6. Do NOT create separate expenses for each line item - only ONE expense with the total

Use the add_expenses tool with a single item containing:
- amount: the final total (e.g., 61.95)
- category: appropriate category (e.g., "dining", "food", "groceries")
- note: brief description of main items (e.g., "Burrata, Solomillo, Chocolate, drinks")
- currency: extract from receipt or use ${callerCurrency}
- date: ${callerDate} unless a different date is clearly visible`;

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
        body: { userId, phone, text: `/setBudget ${amount}`, date },
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
        .map((it: any) => `I spent ${it.amount}${it.currency ? ' ' + it.currency : ''}${it.category ? ' on ' + it.category : ''}${it.date ? ' at ' + it.date : ''}${it.note ? ' (' + it.note + ')' : ''}`)
        .join(', ');

      console.log('[add_expenses] Composed text for finance-update:', composed);

      const { data, error } = await supabase.functions.invoke('finance-update', {
        body: { 
          userId, 
          phone, 
          text: composed, 
          date: callerDate,
          receipt_image_url: receiptImageUrl // Pass the uploaded image URL
        },
      });

      console.log('[add_expenses] finance-update response:', { data, error });

      if (error) {
        console.error('add_expenses(receipt) error', error);
        return { type: 'expense', items, error: 'Failed to add expenses' };
      }

      return {
        type: 'expense',
        isReceipt: true,  // Mark as receipt for special formatting
        items: items.map(it => {
          const itemCurrency = it.currency || callerCurrency;
          return {
            amount: it.amount,
            category: it.category || 'expense',
            currency: itemCurrency,
            currencySymbol: getCurrencySymbol(itemCurrency),
            date: it.date || callerDate,
            note: it.note,
          };
        }),
        expenses: data?.expenses || [], // Return actual database records
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
      receipt_image_url: receiptImageUrl // Pass the uploaded image URL
    },
  });

  if (error) {
    console.error('finance-update(receipt) error', error);
    return { type: 'fallback', error: 'Failed to process receipt' };
  }

  return { type: 'fallback', reply: data?.reply || 'Receipt processed.' };
}
