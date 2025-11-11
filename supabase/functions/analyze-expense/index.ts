// Supabase Edge Function: analyze-expense
// Analyzes text or image to extract transaction data (expense or income) WITHOUT saving to database
// Used for confirmation modal before user saves

import { corsHeaders } from "../shared/cors.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { validateCurrency } from "../shared/currency-validator.ts";
import { ALLOWED_CATEGORIES, resolveCategoryColor, normalizeCategory, getAllCategories, getIncomeCategories, getExpenseCategories } from "../shared/category-colors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { detectGptRequest, ensureGuestIdentity } from "../shared/gpt-guests.ts";
import { getCurrencySymbol } from "../shared/currency-symbols.ts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


function sanitizeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

interface RequestBody {
  userId?: string; // User ID (required for mobile app, optional for GPT)
  text?: string;
  image?: {
    data: string; // base64 encoded image
    contentType: string; // e.g., "image/jpeg"
  };
  date?: string; // ISO date (YYYY-MM-DD), defaults to today
  currency?: string; // ISO currency code, defaults to USD
  currencySymbol?: string; // Currency symbol based on user location, optional
  language?: string; // ISO language tag like en or zh-CN
}

interface ExpenseItem {
  type: 'expense' | 'income';
  amount: number;
  category: string;
  currency: string;
  currencySymbol: string;
  date: string;
  description?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();

    const detection = detectGptRequest(req);
    const conversationId = detection.conversationId ?? null;

    let userId = sanitizeUuid(body.userId ?? null);

    if (body.userId && !userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid userId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerCurrency = validateCurrency(body.currency);
    const languageRaw = (body.language || '').trim();
    const language = /^[a-z]{2}(-[A-Z]{2})?$/.test(languageRaw) ? languageRaw : 'en';
    let resolvedIdentityMeta: Record<string, unknown> | undefined;

    if (!userId && detection.isGpt) {
      if (!conversationId) {
        return new Response(
          JSON.stringify({ error: 'conversationId is required for GPT requests' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(
          JSON.stringify({ error: 'Server configuration error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        global: { headers: { 'X-Client-Info': 'moneko-analyze-expense' } },
      });

      try {
        const guestIdentity = await ensureGuestIdentity({
          supabase,
          conversationId,
          currency: callerCurrency,
        });

        userId = guestIdentity.userId;
        resolvedIdentityMeta = {
          conversationId,
          guest: {
            contactId: guestIdentity.contactId,
            createdUser: guestIdentity.createdUser,
            createdContact: guestIdentity.createdContact,
          },
        };
        if (detection.ephemeralUserId) {
          resolvedIdentityMeta.ephemeralUserId = detection.ephemeralUserId;
        }

        console.log('[analyze-expense] Resolved GPT guest identity', {
          conversationId,
          userId,
          contactId: guestIdentity.contactId,
          createdUser: guestIdentity.createdUser,
          createdContact: guestIdentity.createdContact,
        });
      } catch (guestError) {
        console.error('[analyze-expense] Failed to resolve GPT guest identity:', guestError);
        return new Response(
          JSON.stringify({ error: 'Failed to prepare GPT guest user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.text && !body.image) {
      return new Response(
        JSON.stringify({ error: 'Must provide either text or image' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.text && body.image) {
      return new Response(
        JSON.stringify({ error: 'Cannot process both text and image simultaneously' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set defaults
    const callerDate = body.date || new Date().toISOString().slice(0, 10);
    const callerCurrencySymbol = body.currencySymbol || getCurrencySymbol(callerCurrency);

    console.log('[analyze-expense] Analysis request:', { 
      userId, 
      conversationId,
      hasText: !!body.text, 
      hasImage: !!body.image,
      callerCurrency,
      language,
      identity: resolvedIdentityMeta ?? null,
    });

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const expenseCategories = getExpenseCategories();
    const incomeCategories = getIncomeCategories();

    const tools = [{
      function_declarations: [
        {
          name: 'add_transactions',
          description: 'Extract structured transactions (income or expense) with clear classification and rationale. Always include a type for every item.',
          parameters: {
            type: 'OBJECT',
            properties: {
              items: {
                type: 'ARRAY',
                description: 'One or more transactions parsed from the user input or receipt.',
                items: {
                  type: 'OBJECT',
                  properties: {
                    type: { type: 'STRING', enum: ['expense', 'income'], description: 'Transaction type' },
                    amount: { type: 'NUMBER', description: 'Positive amount in caller currency unless different currency explicitly mentioned.' },
                    category: { 
                      type: 'STRING', 
                      description: `Canonical category. If type=expense choose from: ${expenseCategories.join(', ')}. If type=income choose from: ${incomeCategories.join(', ')}. Prefer specific income categories over generic "income" when possible.`
                    },
                    currency: { type: 'STRING', description: 'ISO 4217 code. Use explicit currency on the input/receipt; otherwise use Caller Currency.' },
                    date: { type: 'STRING', description: 'YYYY-MM-DD when date is known; fallback to Caller Date.' },
                    description: { type: 'STRING', description: 'Natural, conversational note about the transaction - as if casually mentioning it to a friend. Use currency symbols (€, $, ¥, £) NOT currency names. For multi-item: "Lunch €25, coffee €5". Keep it brief and memorable.' },
                    merchant: { type: 'STRING', description: 'Merchant or employer when available.' },
                    party: { type: 'STRING', description: 'Counterparty (e.g., from/to person or institution).'},
                    method: { type: 'STRING', enum: ['card','cash','bank_transfer','wallet','unknown'], description: 'Payment method if identifiable.' },
                    confidence: { type: 'NUMBER', minimum: 0, maximum: 1, description: 'Classifier confidence 0..1' },
                    rationale: { type: 'STRING', description: '1–2 sentences explaining why this is income vs expense and the category selected.' },
                  },
                  required: ['type', 'amount', 'category'],
                },
              },
            },
            required: ['items'],
          },
        },
      ],
    }];

    let items: ExpenseItem[] = [];

    // Process based on input type
    if (body.text) {
      // Process text input
      console.log('[analyze-expense] Processing text:', body.text.substring(0, 50));
      
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp', tools });
      const systemInstruction = [
        'You are a professional transaction extraction and classification system.',
        'Task: Parse the input (plain text) into one or more transactions and return them ONLY by calling add_transactions. Every item MUST include a type (expense|income).',
        'Classification policy:',
        '- income: money received (earned salary, bonus, tips, refunds, transfers into account, repayments, gifts).',
        '- expense: money spent (purchases, bills, fees, subscriptions, transfers out).',
        'Category policy:',
        `- choose a canonical category from these lists. Expense categories: ${expenseCategories.join(', ')}. Income categories: ${incomeCategories.join(', ')}.`,
        '- For money received from relatives or friends use gift (income). For salary/payroll use salary (income). For card/bank returns use refund (income). Do NOT use vague categories such as family for incomes.',
        'Currency & date policy:',
        '- Detect explicit currency symbol or code; else use Caller Currency.',
        '- Detect explicit date; else use Caller Date.',
        'Description policy:',
        '- Write natural, conversational notes about what happened - as if casually mentioning it to a friend.',
        '- Include context: where (merchant/location), what (items), or why when relevant.',
        '- Use currency symbols (€, $, ¥, £) NOT currency names in words. Good: "€50", Bad: "50 euros" or "50欧元".',
        '- For multiple items, use symbols naturally: "Lunch €25, coffee €5" or "买菜 €50, 买鞋 €30".',
        '- Keep it brief and conversational - focus on what makes the transaction memorable.',
        'Output policy:',
        '- Round to 2 decimals. Use positive amount.',
        '- Provide rationale/confidence when useful.',
        '- Do NOT output a separate line for subtotal/total/grand total; only return line items. If only a total is present and no itemized amounts are present, return a single item for the total.',
        'Transaction examples:',
        '1) "received 100 from my parents" → description: "Gift from parents"',
        '2) "got paid 2500 EUR salary" → description: "Monthly salary"',
        '3) "coffee 3.50" → description: "Morning coffee"',
        '4) "groceries 50, shoes 30" → description: "Groceries €50, shoes €30" (use symbols, not "50 euros")',
        '5) "lunch at olive garden with tip" → description: "Lunch at Olive Garden"',
        `CRITICAL language requirement:`,
        `- Return all free-text fields (description, rationale) strictly in ${language}.`,
        `- Use natural, conversational language that native speakers would actually use.`,
        `- Focus on real human expressions, NOT direct dictionary translations.`,
        `- Write as if you're casually telling a friend about the transaction.`,
        `- Do not mix languages. All text must be in ${language}.`,
      ].join('\n');

      const response = await model.generateContent({
        systemInstruction,
        contents: [{ role: 'user', parts: [{ text: `Caller Currency: ${callerCurrency}\nCaller Date: ${callerDate}\nUser: ${body.text}` }] }],
        generationConfig: { maxOutputTokens: 512 },
      });

      const tool = response.response.functionCalls()?.[0];
      if (tool && tool.name === 'add_transactions') {
        const rawItems: any[] = Array.isArray(tool.args?.items) ? tool.args.items : [];
        items = rawItems.map((it) => {
          const itemCurrency = it.currency || callerCurrency;
          const normalizedCategory = normalizeCategory(it.category || 'other');
          const txType = String(it.type || '').toLowerCase();
          return {
            type: (txType === 'income' || txType === 'expense') ? txType : undefined,
            amount: Number(it.amount),
            category: normalizedCategory,
            currency: itemCurrency,
            currencySymbol: callerCurrencySymbol, // Use the provided or generated symbol
            date: it.date || callerDate,
            description: it.description || body.text,
          };
        });
        // Filter out any items without a definitive type
        items = items.filter((it) => it.type === 'income' || it.type === 'expense');
        // Remove duplicated totals when line items exist
        if (items.length > 1) {
          const isTotalLike = (s?: string) => !!s && /(sub\s*total|subtotal|grand\s*total|total)/i.test(s);
          const withoutTotals = items.filter((it) => !isTotalLike(it.description));
          if (withoutTotals.length > 0) items = withoutTotals;
          // Additional check: if one item equals sum of others, remove that item
          const sums = items.map((_, i) => items.filter((__, j) => i !== j).reduce((acc: number, b: any) => acc + (Number(b.amount) || 0), 0));
          items = items.filter((it, i) => Math.abs(it.amount - sums[i]) > 0.0001);
        }
      }

    } else if (body.image) {
      // Process image input
      console.log('[analyze-expense] Processing image, contentType:', body.image.contentType);

      // Validate image content type
      if (!body.image.contentType || !body.image.contentType.startsWith('image/')) {
        return new Response(
          JSON.stringify({ error: 'Invalid image content type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Decode base64 image
      const base64Data = body.image.data.replace(/^data:image\/\w+;base64,/, '');
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Validate image size
      if (bytes.length > 10 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: 'Image too large. Maximum 10MB' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (bytes.length < 1024) {
        return new Response(
          JSON.stringify({ error: 'Image too small. Minimum 1KB' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Convert to base64 for Gemini
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64Image = btoa(binary);

      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp', tools });
      const systemInstruction = [
        'You are a professional receipt analyzer.',
        'Task: Extract one or more transactions from the image and return ONLY via add_transactions. Every item MUST include a type (expense|income).',
        'Classification hints (do not guess wildly):',
        '- income: deposit/credit slips, payroll notifications, refunds to card/bank, inbound transfers.',
        '- expense: purchase receipts, invoices, utility bills, debit/outbound transfers.',
        `Category policy is the same as for text. Expense categories: ${expenseCategories.join(', ')}. Income categories: ${incomeCategories.join(', ')}. Prefer gift/salary/refund for typical income sources. Do not choose family for incomes.`,
        'Currency: detect, else use Caller Currency. Date: detect, else use Caller Date.',
        'Description policy for receipts:',
        '- List out all items from the receipt with their amounts naturally - speak casually like telling a friend.',
        '- Use currency symbols (€, $, ¥, £) NOT currency names. Good: "€15", Bad: "15 euros" or "15欧元".',
        '- Format: "Item1 €amount, item2 €amount, item3 €amount" - list all visible items.',
        '- Examples: "Coffee €5, sandwich €8, water €2" or "买菜 €50, 买肉 €30, 买水果 €20".',
        '- Mention store/merchant at the beginning if visible: "Walmart: milk €3, bread €2, eggs €4".',
        '- Keep it conversational and natural - as if you\'re telling someone what you bought.',
        'Do NOT output a separate line for subtotal/total/grand total; only return line items. If only a total is present and no itemized amounts are present, return a single item for the total.',
        `CRITICAL language requirement:`,
        `- Return all free-text fields (description, rationale) strictly in ${language}.`,
        `- Use natural, conversational language that native speakers would actually use.`,
        `- Focus on real human expressions, NOT direct dictionary translations.`,
        `- Write as if you're casually telling a friend about what you bought.`,
        `- Do not mix languages. All text must be in ${language}.`,
      ].join('\n');

      const response = await model.generateContent({
        systemInstruction,
        contents: [{
          role: 'user',
          parts: [
            { text: `Caller Currency: ${callerCurrency}\nCaller Date: ${callerDate}\nExtract expense details from this receipt:` },
            {
              inline_data: {
                mime_type: body.image.contentType,
                data: base64Image,
              },
            },
          ],
        }],
        generationConfig: { maxOutputTokens: 512 },
      });

      const tool = response.response.functionCalls()?.[0];
      if (tool && tool.name === 'add_transactions') {
        const rawItems: any[] = Array.isArray(tool.args?.items) ? tool.args.items : [];
        const tempItems = rawItems.map((it) => {
          const itemCurrency = it.currency || callerCurrency;
          const normalizedCategory = normalizeCategory(it.category || 'other');
          const txType = String(it.type || '').toLowerCase();
          return {
            type: (txType === 'income' || txType === 'expense') ? txType : undefined,
            amount: Number(it.amount),
            category: normalizedCategory,
            currency: itemCurrency,
            currencySymbol: callerCurrencySymbol,
            date: it.date || callerDate,
            description: it.description || 'Receipt transaction',
          };
        });
        items = tempItems.filter((it): it is ExpenseItem => it.type === 'income' || it.type === 'expense');
        if (items.length > 1) {
          const isTotalLike = (s?: string) => !!s && /(sub\s*total|subtotal|grand\s*total|total)/i.test(s);
          const withoutTotals = items.filter((it) => !isTotalLike(it.description));
          if (withoutTotals.length > 0) items = withoutTotals;
          const sums = items.map((_, i) => items.filter((__, j) => i !== j).reduce((acc: number, b: any) => acc + (Number(b.amount) || 0), 0));
          items = items.filter((it, i) => Math.abs(it.amount - sums[i]) > 0.0001);
        }
      }
    }

    // Return parsed expense data (NOT saved)
    if (items.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not extract expense information. Please try a clearer input.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[analyze-expense] Analyzed items:', items);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          items, // Array of parsed expenses
          isAnalyzed: true, // Flag indicating this is NOT saved yet
          language,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[analyze-expense] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to analyze expense',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
