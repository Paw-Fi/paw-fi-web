// Supabase Edge Function: twilio-whatsapp-webhook
// Receives Twilio WhatsApp inbound webhooks, validates signature, runs finance-update, replies with TwiML

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { buildHelpMessage, buildVerificationPrompt, sendWhatsAppTemplate, WHATSAPP_COMMANDS, type WhatsAppReply, getCurrencySymbol } from "../shared/whatsapp-helpers.ts";
import { TWILIO_TEMPLATES } from "../shared/twilio-templates.ts";
import { uploadReceiptImage } from "../shared/storage-helper.ts";
import { processFreeFormTextExpense, processReceiptImage, type ProcessResult } from "../shared/expense-processors.ts";
import { isFreeUser } from "../shared/is-free-user.ts";
import { getCurrencySymbol } from "../shared/currency-symbols.ts";

function xmlResponse(xml: string, status = 200) {
  return new Response(xml, { status, headers: { 'Content-Type': 'text/xml' } });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function hmacSha1Base64(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
  const bytes = new Uint8Array(signature);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function buildSignatureBaseStringDecoded(url: string, params: URLSearchParams): string {
  // Twilio classic form POST signing: URL + sorted params (decoded) concatenated as key+value
  const keys = Array.from(params.keys()).sort();
  let concatenated = '';
  for (const k of keys) concatenated += k + (params.get(k) ?? '');
  return url + concatenated;
}

function buildSignatureBaseStringRaw(url: string, rawBody: string): string {
  // Alternate calculation using RAW pairs (defensive; some environments differ)
  const pairs = (rawBody || '').split('&').map((kv) => {
    const eq = kv.indexOf('=');
    if (eq === -1) return { k: kv, v: '' };
    return { k: kv.substring(0, eq), v: kv.substring(eq + 1) };
  });
  pairs.sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0));
  let concatenated = '';
  for (const p of pairs) concatenated += p.k + p.v;
  return url + concatenated;
}

function normalizePhone(from: string | null): string | null {
  if (!from) return null;
  // Twilio WhatsApp numbers come as 'whatsapp:+1234567890'
  if (from.startsWith('whatsapp:')) return from.replace('whatsapp:', '');
  return from;
}

// Parse YYYY-MM-DD as local date to avoid timezone issues
function parseYMDLocal(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// Helper function to format date relative to today
function formatRelativeDate(dateStr: string): string {
  const today = new Date();
  const itemLocal = parseYMDLocal(dateStr) || new Date(dateStr);
  
  // Reset time to compare just dates
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const itemOnly = new Date(itemLocal.getFullYear(), itemLocal.getMonth(), itemLocal.getDate());
  
  const diffDays = Math.round((todayOnly.getTime() - itemOnly.getTime()) / 86400000);
  
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays > 1 && diffDays <= 7) return `${diffDays} days ago`;
  
  // For more than 7 days, show the actual date
  return itemOnly.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: itemOnly.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
  });
}

// Format ProcessResult into user-friendly message
function formatProcessResult(result: ProcessResult, callerCurrency = 'USD'): string {
  if (result.error) {
    if (result.type === 'fallback' && result.error === 'Could not read receipt') {
      return '❌ *Could not read receipt*\n\nPlease try again with:\n• A clearer photo\n• Better lighting\n• All text visible\n\nOr type the items manually.';
    }
    return `❌ *${result.error}*\n\nPlease try again or contact support.`;
  }

  if (result.type === 'budget') {
    const reply = result.reply || 'Budget updated.';
    // finance-update already provides complete message with amount, no need to duplicate
    return `✅ *Budget Updated*\n\n💰 ${reply}`;
  }

  if (result.type === 'expense') {
    // Use different format for receipts vs text expenses
    if (result.isReceipt && result.items.length === 1) {
      // Original receipt format - more detailed for single receipt entry
      const item = result.items[0];
      const symbol = item.currencySymbol || item.currency || '$';

      let formattedMsg = `✅ *Receipt Logged*\n\n`;
      formattedMsg += `💰 *Amount:* ${symbol}${item.amount}\n`;
      
      // Add date information if available
      if (item.date) {
        const relativeDate = formatRelativeDate(item.date);
        const label = relativeDate === 'today' ? 'Today' : relativeDate === 'yesterday' ? 'Yesterday' : relativeDate;
        formattedMsg += `📅 *Date:* ${label}\n`;
      }
      
      if (item.category) {
        formattedMsg += `📁 *Category:* ${item.category}\n`;
      }
      if (item.note) {
        formattedMsg += `📝 *Items:* ${item.note}\n`;
      }

      formattedMsg += `\n━━━━━━━━━━━━━━━━\n\n`;

      // Add the totals from finance-update
      const totalsMsg = result.reply || 'Receipt processed.';
      formattedMsg += `📊 *${totalsMsg}*`;

      return formattedMsg;
    }

    // Standard format for text expenses or multiple items
    let formattedMsg = `✅ *Expenses Logged*\n\n`;

    // List each expense (defaults already applied by expense-processors.ts)
    result.items.forEach((item, index) => {
      const symbol = item.currencySymbol || item.currency || '$';
      formattedMsg += `${index + 1}. ${symbol}${item.amount}`;
      if (item.category) formattedMsg += ` (${item.category})`;
      if (item.note) formattedMsg += ` - ${item.note}`;
      
      // Add date info if different from today
      if (item.date) {
        const relativeDate = formatRelativeDate(item.date);
        if (relativeDate !== 'today') {
          formattedMsg += ` [${relativeDate}]`;
        }
      }
      
      formattedMsg += `\n`;
    });

    formattedMsg += `\n━━━━━━━━━━━━━━━━\n\n`;

    // Add the totals from finance-update
    const totalsMsg = result.reply || 'Expenses recorded.';
    formattedMsg += `📊 *${totalsMsg}*`;

    return formattedMsg;
  }

  // Fallback type
  return result.reply || 'Update recorded.';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
  const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!TWILIO_AUTH_TOKEN || !TWILIO_ACCOUNT_SID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Server not configured' }, 500);
  }

  const rawBody = await req.text();
  const params = new URLSearchParams(rawBody);

  // Validate Twilio signature
  const signatureHeader = req.headers.get('X-Twilio-Signature') || req.headers.get('x-twilio-signature');
  if (!signatureHeader) {
    return jsonResponse({ error: 'Missing Twilio signature' }, 403);
  }

  // Allow explicit configured URL to avoid proxy/edge differences
  const urlUsedByTwilio = Deno.env.get('TWILIO_WEBHOOK_URL') || req.url;
  const baseDecoded = buildSignatureBaseStringDecoded(urlUsedByTwilio, params);
  const sigDecoded = await hmacSha1Base64(TWILIO_AUTH_TOKEN, baseDecoded);

  if (sigDecoded !== signatureHeader) {
    const baseRaw = buildSignatureBaseStringRaw(urlUsedByTwilio, rawBody);
    const sigRaw = await hmacSha1Base64(TWILIO_AUTH_TOKEN, baseRaw);
    if (sigRaw !== signatureHeader) {
      try {
        const headerPreview = signatureHeader.slice(0, 6) + '...';
        console.warn('[twilio-webhook] Signature mismatch', {
          urlUsedByTwilio,
          headerPreview,
          decodedMatch: sigDecoded === signatureHeader,
          rawMatch: sigRaw === signatureHeader,
          paramCount: Array.from(params.keys()).length,
          sortedKeys: Array.from(params.keys()).sort().join(','),
        });
      } catch {}
      return jsonResponse({ error: 'Invalid signature' }, 403);
    }
  }

  const from = normalizePhone(params.get('From'));
  const to = params.get('To') || ''; // The Twilio number that received the message
  const body = params.get('Body') || '';

  // Safety fallback (allow image-only messages where Body may be empty)
  const hasMedia = Number(params.get('NumMedia') || '0') > 0;
  if (!from || (!body && !hasMedia)) {
    return xmlResponse('<Response><Message>Invalid message</Message></Response>');
  }

  // Check if user is verified (unless they're sending Start Verification command)
  const isVerifyCommand = body.trim().toLowerCase() === 'start verification';
  if (!isVerifyCommand) {
    const supabaseCheck = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { 'X-Client-Info': 'moneko-twilio-whatsapp-webhook' } },
    });
    
    const contactResult = await supabaseCheck
      .from('user_contacts')
      .select('verified, user_id')
      .eq('phone_e164', from)
      .order('id', { ascending: false })
      .limit(1);
    const contact = contactResult.data?.[0] ?? null;

    // Check if contact exists and is verified
    if (!contact || contact.verified !== true || !contact.user_id) {
      // Send verification template message via Twilio API
      console.log('[twilio-webhook] User not verified, sending template message to:', from);
      console.log('[twilio-webhook] Using From number (our Twilio number):', to);
      
      const templateResult = await sendWhatsAppTemplate(
        TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN,
        to, // Use the 'To' param - this is our Twilio WhatsApp number
        from, // Send to the user who messaged us
        TWILIO_TEMPLATES.VERIFICATION_PROMPT
        // No contentVariables needed for this template
      );
      
      if (!templateResult.success) {
        console.error('[twilio-webhook] Failed to send template:', templateResult.error);
        // Fallback to TwiML if template fails
        const verifyMsg = buildVerificationPrompt();
        return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${verifyMsg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message></Response>`);
      }
      
      console.log('[twilio-webhook] Template sent successfully:', templateResult.messageSid);
      // Return empty TwiML response since we sent the message via API
      return xmlResponse('<?xml version="1.0" encoding="UTF-8"?>\n<Response></Response>');
    }

    // User is verified - check if they're on free plan
    if (contact && contact.user_id) {
      const { data: subscription } = await supabaseCheck
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', contact.user_id)
        .maybeSingle();

      if (isFreeUser(subscription)) {
        console.log('[twilio-webhook] User is on free plan, sending NON_SUBSCRIBER template');

        const freeUserResult = await sendWhatsAppTemplate(
          TWILIO_ACCOUNT_SID,
          TWILIO_AUTH_TOKEN,
          to, // Use the 'To' param - this is our Twilio WhatsApp number
          from, // Send to the user who messaged us
          TWILIO_TEMPLATES.NON_SUBSCRIBER
        );

        if (!freeUserResult.success) {
          console.error('[twilio-webhook] Failed to send NON_SUBSCRIBER template:', freeUserResult.error);
        } else {
          console.log('[twilio-webhook] NON_SUBSCRIBER template sent successfully:', freeUserResult.messageSid);
        }

        // Return empty TwiML response since we sent the message via API
        return xmlResponse('<?xml version="1.0" encoding="UTF-8"?>\n<Response></Response>');
      }
    }
  }
  // Media handling (WhatsApp receipts) - if an image is present, route to Gemini vision
  const numMedia = Number(params.get('NumMedia') || '0');
  const mediaUrl0 = params.get('MediaUrl0') || '';
  const mediaContentType0 = params.get('MediaContentType0') || '';

  // If inbound is image-only (or image+text), handle early and return TwiML directly
  if (numMedia > 0 && mediaUrl0 && mediaContentType0.startsWith('image/')) {
    try {
      const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
      if (!GEMINI_API_KEY) {
        return xmlResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Image processing is unavailable. Try sending text.</Message></Response>');
      }

      // Fetch user's preferred currency from database
      const supabaseCurrency = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        global: { headers: { 'X-Client-Info': 'moneko-currency-fetch' } },
      });

      const contactDataResult = await supabaseCurrency
        .from('user_contacts')
        .select('preferred_currency')
        .eq('phone_e164', from)
        .order('id', { ascending: false })
        .limit(1);
      const contactData = contactDataResult.data?.[0] ?? null;

      const userCurrency = contactData?.preferred_currency || 'USD';

      // Twilio Media URLs often require Basic Auth: AccountSid:AuthToken
      const accountSid = params.get('AccountSid') || Deno.env.get('TWILIO_ACCOUNT_SID') || '';
      const authHeader = 'Basic ' + btoa(`${accountSid}:${TWILIO_AUTH_TOKEN}`);
      const imgRes = await fetch(mediaUrl0, { headers: { Authorization: authHeader } });
      if (!imgRes.ok) {
        console.error('media fetch failed', mediaUrl0, imgRes.status);
        return xmlResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Could not download the image. Please retry.</Message></Response>');
      }
      const contentType = imgRes.headers.get('content-type') || mediaContentType0 || '';
      if (!/^image\/(jpeg|jpg|png|gif|bmp|webp)$/i.test(contentType)) {
        console.warn('unsupported image type', contentType);
        const textEsc = 'Unsupported image format. Please send a clear JPEG or PNG photo of the receipt.'
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${textEsc}</Message></Response>`);
      }
      const imgBuf = new Uint8Array(await imgRes.arrayBuffer());

      // Call the extracted receipt processing function
      const result = await processReceiptImage({
        phone: from!,
        imageBuffer: imgBuf,
        contentType,
        supabaseUrl: SUPABASE_URL,
        supabaseServiceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
        geminiApiKey: GEMINI_API_KEY,
        callerDate: new Date().toISOString().slice(0, 10),
        callerCurrency: userCurrency,
      });

      // Format the result into user-friendly message
      const message = formatProcessResult(result, userCurrency);

      console.log('[receipt-parse] Final message to send:', message);
      const textEsc = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${textEsc}</Message></Response>`;
      console.log('[receipt-parse] Sending TwiML response:', twiml);

      // Check if image was already uploaded by processReceiptImage
      const alreadyStored = result.type === 'expense' && 
        Array.isArray(result.expenses) && 
        result.expenses.some(e => e?.receipt_image_url);
      
      // Only upload in webhook when result.type === 'expense' with items
      // processReceiptImage already handles uploads for fallback and expense types
      const shouldUpload = result.type === 'expense' &&
        result.items.length > 0 &&
        !alreadyStored;

      if (shouldUpload) {
        // Upload image to storage asynchronously after response is sent
        // This won't block the response to the user
        Promise.resolve().then(async () => {
        try {
          console.log('[async-storage] Starting background upload...');
          const storageUrl = await uploadReceiptImage(
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY,
            imgBuf,
            contentType,
            from!
          );

          if (storageUrl) {
            console.log('[async-storage] Upload successful:', storageUrl);

            // Update the most recent expense with the receipt URL
            const supabaseUpdate = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
              auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
              global: { headers: { 'X-Client-Info': 'moneko-async-storage' } },
            });

            // Get contact ID
            const contactResult = await supabaseUpdate
              .from('user_contacts')
              .select('id')
              .eq('phone_e164', from!)
              .order('id', { ascending: false })
              .limit(1);
            const contact = contactResult.data?.[0] ?? null;

            if (contact?.id) {
              // First SELECT the most recent expense created in last 60 seconds for this contact
              const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
              const { data: recentExpense } = await supabaseUpdate
                .from('expenses')
                .select('id')
                .eq('contact_id', contact.id)
                .gte('created_at', sixtySecondsAgo)
                .is('receipt_image_url', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (recentExpense?.id) {
                // UPDATE by ID (PostgREST compatible)
                const { error: updateError } = await supabaseUpdate
                  .from('expenses')
                  .update({ receipt_image_url: storageUrl })
                  .eq('id', recentExpense.id);

                if (updateError) {
                  console.error('[async-storage] Failed to update expense:', updateError);
                } else {
                  console.log('[async-storage] Expense updated with receipt URL');
                }
              } else {
                console.log('[async-storage] No recent expense found to update');
              }
            }
          }
        } catch (err) {
          console.error('[async-storage] Background upload failed:', err);
          // Don't throw - this is a background task
        }
        });
      } else {
        console.log('[async-storage] Skipping upload - receipt could not be read');
      }

      return xmlResponse(twiml);
    } catch (e) {
      console.error('receipt parse error', e);
      const errorMsg = '❌ *Error processing receipt*\n\nPlease try again with:\n• A clearer photo\n• Better lighting\n• All text visible\n\nOr type the items manually.';
      return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${errorMsg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message></Response>`);
    }
  }

  // Prepare Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { 'X-Client-Info': 'moneko-twilio-whatsapp-webhook' } },
  });

  const HELP_IMAGE_URL = Deno.env.get('HELP_IMAGE_URL') || '';

  async function isFirstMessageForContact(phone: string): Promise<boolean> {
    const result = await supabase
      .from('user_contacts')
      .select('id')
      .eq('phone_e164', phone)
      .order('id', { ascending: false })
      .limit(1);
    if (result.error) {
      console.warn('check contact error', result.error);
      // If unsure, treat as not first to avoid spammy help
      return false;
    }
    return !result.data || result.data.length === 0;
  }

  // Command routing: explicit slash commands take priority and are handled deterministically
  const lower = body.trim();
  const replyText = async (): Promise<WhatsAppReply> => {
    // Fetch user's preferred currency from database (used for text processing)
    const contactDataResult = await supabase
      .from('user_contacts')
      .select('preferred_currency')
      .eq('phone_e164', from)
      .order('id', { ascending: false })
      .limit(1);
    const contactData = contactDataResult.data?.[0] ?? null;

    const userCurrency = contactData?.preferred_currency || 'USD';

    // 0) Check for "Start Verification" plain text FIRST (before slash commands)
    if (lower.toLowerCase() === 'start verification') {
      // Generate OTP and send verification link
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Delete any existing unverified codes for this phone to keep only one active
      await supabase
        .from('whatsapp_verifications')
        .delete()
        .eq('phone_e164', from!)
        .eq('verified', false);

      // Store new verification (without user_id since they're not logged in yet)
      const { error: insertError } = await supabase
        .from('whatsapp_verifications')
        .insert({
          phone_e164: from!,
          verification_code: code,
          user_id: null,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error('Failed to store verification:', insertError);
        return { text: '❌ *Failed to generate verification link*\n\nPlease try again later.' };
      }

      // Send verification code via template
      const templateResult = await sendWhatsAppTemplate(
        TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN,
        to, // Use the 'To' param - this is our Twilio WhatsApp number
        from!, // Send to the user who messaged us
        TWILIO_TEMPLATES.VERIFICATION_CODE,
        JSON.stringify({ CODE: code }) // Template variable
      );

      if (!templateResult.success) {
        console.error('[verification] Failed to send template:', templateResult.error);
        // Fallback to plain text if template fails
        const appUrl = Deno.env.get('ALLOWED_ORIGINS') || 'https://moneko.app';
        const verificationUrl = `${appUrl}/verify-whatsapp?otp=${code}`;
        return {
          text: `🔗 *Account Verification*\n\nClick this link to verify your account:\n${verificationUrl}\n\nOr enter code: *${code}*\n\nValid for 10 minutes.`
        };
      }

      console.log('[verification] Template sent successfully:', templateResult.messageSid);
      // Template already sent via API, no need to return additional text
      // Return empty to avoid duplicate messages
      return {
        text: ''
      };
    }

    // 1) Slash commands - check these FIRST before help message
    if (lower.startsWith('/')) {
      // match registered commands
      const token = lower.split(/\s+/)[0];
      const matched = WHATSAPP_COMMANDS.find(c => c.name.toLowerCase() === token.toLowerCase() || (c.alias || []).includes(token.toLowerCase()));
      if (!matched) {
        return { text: `Sorry, I didn’t understand that command. Send /help to see available commands.` };
      }
      if (matched.name.toLowerCase() === '/setbudget') {
        // Format: /setBudget 25
        const parts = lower.split(/\s+/);
        const amount = parseFloat(parts[1] || '');
        if (!isFinite(amount) || amount <= 0) {
          return { text: 'Usage: /setBudget <amount>' };
        }
        // Use set-budget endpoint for direct budget update (no AI needed)
        const { data, error } = await supabase.functions.invoke('set-budget', {
          body: { phone: from!, amount: amount },
        });
        if (error) {
          console.error('set-budget error', error);
          return { text: 'Failed to set budget.' };
        }
        return { text: data?.reply || 'Budget updated.' };
      }

      if (matched.name.toLowerCase() === '/expenses') {
        // Fetch today's expenses for this contact and show total
        const today = new Date().toISOString().slice(0, 10);
        const contactResult = await supabase
          .from('user_contacts')
          .select('id, preferred_currency')
          .eq('phone_e164', from!)
          .order('id', { ascending: false })
          .limit(1);
        const contact = contactResult.data?.[0] ?? null;
        if (contactResult.error || !contact?.id) {
          console.error('fetch contact for expenses error', contactResult.error);
          return { text: "❌ *Could not find account*\n\nTry sending a message again." };
        }
        
        // Use user's preferred currency for filtering and display
        const preferredCurrency = contact.preferred_currency || 'USD';
        
        const { data: rows, error: eErr } = await supabase
          .from('expenses')
          .select('date, amount_cents, currency, category, raw_text, created_at')
          .eq('contact_id', contact.id)
          .eq('date', today)
          .eq('currency', preferredCurrency)
          .order('created_at', { ascending: true });
        if (eErr) {
          console.error('fetch expenses error', eErr);
          return { text: '❌ *Failed to fetch expenses*\n\nPlease try again.' };
        }
        if (!rows?.length) {
          return { text: `📊 *No expenses today*\n\nYou haven't recorded any expenses yet.` };
        }
        
        const toMoney = (cents: number) => (cents / 100).toFixed(2);
        const currencySymbol = getCurrencySymbol(preferredCurrency);
        
        // Build formatted table
        let response = `📊 *Today's Expenses*\n\n`;
        
        rows.forEach((r: any, index: number) => {
          const amount = toMoney(r.amount_cents);
          const cat = r.category || 'uncategorized';
          
          response += `${index + 1}. ${currencySymbol}${amount} - ${cat}\n`;
        });
        
        // Add separator and currency-specific totals
        response += `\n━━━━━━━━━━━━━━━━\n\n`;
        const totalCents = rows.reduce((s: number, r: any) => s + (r.amount_cents || 0), 0);
        response += `💰 *Total:* ${currencySymbol}${toMoney(totalCents)}`;
        
        // Group by currency to avoid mixed-currency summation
        const currencyGroups = new Map<string, number>();
        rows.forEach((r: any) => {
          const currency = (r.currency || 'USD').toUpperCase();
          const current = currencyGroups.get(currency) || 0;
          currencyGroups.set(currency, current + (r.amount_cents || 0));
        });
        
        // Display totals by currency
        if (currencyGroups.size === 1) {
          // Single currency - show simple total
          const [currency, totalCents] = [...currencyGroups.entries()][0];
          response += `💰 *Total:* ${sym(currency)}${toMoney(totalCents)}`;
        } else {
          // Multiple currencies - show breakdown
          response += `💰 *Totals by Currency:*\n`;
          [...currencyGroups.entries()].forEach(([currency, totalCents]) => {
            response += `   ${sym(currency)}${toMoney(totalCents)}\n`;
          });
        }
        
        return { text: response };
      }

      if (matched.name.toLowerCase() === '/help') {
        return buildHelpMessage(HELP_IMAGE_URL);
      }


      if (matched.name.toLowerCase() === '/addcategory') {
        const parts = lower.split(/\s+/);
        const name = parts.slice(1).join(' ').trim();
        if (!name) {
          return { text: 'Usage: /addCategory <name>' };
        }
        const contactResult = await supabase
          .from('user_contacts')
          .select('id')
          .eq('phone_e164', from!)
          .order('id', { ascending: false })
          .limit(1);
        if (contactResult.error) {
          console.error('fetch contact for addCategory error', contactResult.error);
          return { text: 'Failed to add category.' };
        }
        let contactId = contactResult.data?.[0]?.id;
        if (!contactId) {
          // Use UPSERT to prevent duplicates on phone_e164
          const { data: upserted, error: upsertErr } = await supabase
            .from('user_contacts')
            .upsert(
              { phone_e164: from!, updated_at: new Date().toISOString() },
              { onConflict: 'phone_e164' }
            )
            .select('id')
            .single();
          if (upsertErr || !upserted?.id) {
            console.error('upsert contact for addCategory error', upsertErr);
            return { text: 'Failed to add category.' };
          }
          contactId = upserted.id;
        }
        const { error: uErr } = await supabase
          .from('expense_categories')
          .insert({ contact_id: contactId, name, is_default: false });
        if (uErr) {
          if (String(uErr.message || '').includes('duplicate')) {
            return { text: `Category "${name}" already exists.` };
          }
          console.error('insert expense_category error', uErr);
          return { text: 'Failed to add category.' };
        }
        return { text: `Added category "${name}".` };
      }

      // ===== Zero-Based Budgeting (Envelope) Commands =====
      if (matched.name.toLowerCase() === '/createenvelope') {
        // Usage: /createEnvelope <name> [monthlyTarget]
        const parts = lower.split(/\s+/).slice(1)
        if (!parts.length) return { text: 'Usage: /createEnvelope <name> [monthlyTarget]' }
        const maybeAmount = parseFloat(parts[parts.length - 1])
        const hasAmount = isFinite(maybeAmount)
        const name = (hasAmount ? parts.slice(0, -1) : parts).join(' ').trim()
        if (!name) return { text: 'Usage: /createEnvelope <name> [monthlyTarget]' }
        const contactResult = await supabase
          .from('user_contacts').select('id').eq('phone_e164', from!).order('id', { ascending: false }).limit(1)
        const contact = contactResult.data?.[0] ?? null;
        if (contactResult.error || !contact?.id) return { text: '❌ *Failed to find your account*' }
        const targetCents = hasAmount && maybeAmount > 0 ? Math.round(maybeAmount * 100) : 0
        const { data: envRow, error: envErr } = await supabase
          .from('budget_envelopes')
          .upsert({ contact_id: contact.id, name, monthly_target_cents: targetCents, updated_at: new Date().toISOString() }, { onConflict: 'contact_id,name' })
          .select('id, monthly_target_cents')
          .maybeSingle()
        if (envErr) return { text: '❌ *Failed to create/update envelope*' }
        const tgt = envRow?.monthly_target_cents ?? targetCents
        return { text: `✅ *Envelope ready*\n\n📁 ${name}\n🎯 Monthly Target: ${(tgt/100).toFixed(2)}` }
      }

      if (matched.name.toLowerCase() === '/setenvelopealloc') {
        // Usage: /setEnvelopeAlloc <name> <YYYY-MM> <amount>
        const parts = lower.split(/\s+/).slice(1)
        if (parts.length < 3) return { text: 'Usage: /setEnvelopeAlloc <name> <YYYY-MM> <amount>' }
        const amount = parseFloat(parts[parts.length - 1])
        const monthStr = parts[parts.length - 2]
        const name = parts.slice(0, -2).join(' ').trim()
        if (!name || !/^\d{4}-\d{2}$/.test(monthStr) || !isFinite(amount) || amount <= 0) return { text: 'Usage: /setEnvelopeAlloc <name> <YYYY-MM> <amount>' }
        const period_month = `${monthStr}-01`
        const contactResult = await supabase
          .from('user_contacts').select('id').eq('phone_e164', from!).order('id', { ascending: false }).limit(1)
        const contact = contactResult.data?.[0] ?? null;
        if (contactResult.error || !contact?.id) return { text: '❌ *Failed to find your account*' }
        const { data: env, error: envFindErr } = await supabase
          .from('budget_envelopes')
          .select('id')
          .eq('contact_id', contact.id)
          .eq('name', name)
          .maybeSingle()
        if (envFindErr || !env?.id) return { text: `❌ *Envelope not found:* ${name}` }
        const { error: upErr } = await supabase
          .from('envelope_allocations')
          .upsert({ envelope_id: env.id, period_month, amount_cents: Math.round(amount*100), updated_at: new Date().toISOString() }, { onConflict: 'envelope_id,period_month' })
        if (upErr) return { text: '❌ *Failed to set allocation*' }
        return { text: `✅ *Allocation saved*\n\n📁 ${name}\n🗓️ ${monthStr}\n💰 ${amount.toFixed(2)}` }
      }

      if (matched.name.toLowerCase() === '/linkcategoryenvelope') {
        // Usage: /linkCategoryEnvelope <name> <category>
        const parts = lower.split(/\s+/).slice(1)
        if (parts.length < 2) return { text: 'Usage: /linkCategoryEnvelope <name> <category>' }
        const category = parts[parts.length - 1]
        const name = parts.slice(0, -1).join(' ').trim()
        if (!name || !category) return { text: 'Usage: /linkCategoryEnvelope <name> <category>' }
        const contactResult = await supabase
          .from('user_contacts').select('id').eq('phone_e164', from!).order('id', { ascending: false }).limit(1)
        const contact = contactResult.data?.[0] ?? null;
        if (contactResult.error || !contact?.id) return { text: '❌ *Failed to find your account*' }
        const { data: env, error: envFindErr } = await supabase
          .from('budget_envelopes')
          .select('id')
          .eq('contact_id', contact.id)
          .eq('name', name)
          .maybeSingle()
        if (envFindErr || !env?.id) return { text: `❌ *Envelope not found:* ${name}` }
        const { error: linkErr } = await supabase
          .from('envelope_category_links')
          .upsert({ envelope_id: env.id, category: category.toLowerCase(), updated_at: new Date().toISOString() }, { onConflict: 'envelope_id,category' })
        if (linkErr) return { text: '❌ *Failed to link category*' }
        return { text: `✅ *Linked*\n\n📁 ${name}\n🏷️ ${category.toLowerCase()}` }
      }

      if (matched.name.toLowerCase() === '/envelopestatus') {
        // Usage: /envelopeStatus [YYYY-MM]
        const parts = lower.split(/\s+/)
        const monthStr = parts[1] && /^\d{4}-\d{2}$/.test(parts[1]) ? parts[1] : new Date().toISOString().slice(0,7)
        const period_month = `${monthStr}-01`
        const contactResult = await supabase
          .from('user_contacts').select('id').eq('phone_e164', from!).order('id', { ascending: false }).limit(1)
        const contact = contactResult.data?.[0] ?? null;
        if (contactResult.error || !contact?.id) return { text: '❌ *Failed to find your account*' }
        const { data: envs, error: envErr } = await supabase
          .from('budget_envelopes')
          .select('id,name,monthly_target_cents')
          .eq('contact_id', contact.id)
          .order('name', { ascending: true })
        if (envErr) return { text: '❌ *Failed to load envelopes*' }
        if (!envs?.length) return { text: '📁 *No envelopes defined yet.* Use /createEnvelope.' }
        const envIds = envs.map(e => e.id)
        const { data: allocs } = await supabase
          .from('envelope_allocations')
          .select('envelope_id, period_month, amount_cents')
          .in('envelope_id', envIds)
          .eq('period_month', period_month)
        const { data: spentRows } = await supabase
          .from('v_envelope_monthly_spend')
          .select('envelope_id, period_month, spent_cents')
          .in('envelope_id', envIds)
          .eq('period_month', period_month)
        const spentMap = new Map<string, number>()
        for (const r of spentRows || []) spentMap.set(r.envelope_id as string, Number(r.spent_cents)||0)
        const allocMap = new Map<string, number>()
        for (const a of allocs || []) allocMap.set(a.envelope_id as string, Number(a.amount_cents)||0)
        let totalAlloc = 0, totalSpent = 0
        let msg = `📦 *Envelope Status* — ${monthStr}\n\n`
        envs.forEach((e, idx) => {
          const alloc = allocMap.get(e.id) ?? (Number(e.monthly_target_cents)||0)
          const spent = spentMap.get(e.id) ?? 0
          totalAlloc += alloc
          totalSpent += spent
          const remaining = Math.max(alloc - spent, 0)
          msg += `${idx+1}. ${e.name}\n   Alloc: ${(alloc/100).toFixed(2)}  Spent: ${(spent/100).toFixed(2)}  Rem: ${(remaining/100).toFixed(2)}\n`
        })
        msg += `\n━━━━━━━━━━━━━━━━\n\n`+
               `💰 *Total Alloc:* ${(totalAlloc/100).toFixed(2)}\n`+
               `📉 *Total Spent:* ${(totalSpent/100).toFixed(2)}\n`+
               `✅ *Total Remaining:* ${((Math.max(totalAlloc-totalSpent,0))/100).toFixed(2)}`
        return { text: msg }
      }

      if (matched.name.toLowerCase() === '/setcurrency') {
        const parts = lower.split(/\s+/);
        const iso = (parts[1] || '').toUpperCase();
        if (!/^\w{3}$/.test(iso)) {
          return { text: 'Usage: /setCurrency <ISO>. Example: /setCurrency USD' };
        }
        const contactResult = await supabase
          .from('user_contacts')
          .select('id')
          .eq('phone_e164', from!)
          .order('id', { ascending: false })
          .limit(1);
        const contact = contactResult.data?.[0] ?? null;
        if (contactResult.error) {
          console.error('fetch contact for setCurrency error', contactResult.error);
          return { text: 'Failed to update currency.' };
        }
        if (!contact) {
          // Use UPSERT to prevent duplicates on phone_e164
          const { data: upserted, error: upsertErr } = await supabase
            .from('user_contacts')
            .upsert(
              { phone_e164: from!, preferred_currency: iso, updated_at: new Date().toISOString() },
              { onConflict: 'phone_e164' }
            )
            .select('id')
            .single();
          if (upsertErr || !upserted?.id) {
            console.error('upsert contact for setCurrency error', upsertErr);
            return { text: 'Failed to update currency.' };
          }
          return { text: `Preferred currency set to ${iso}.` };
        } else {
          const { error: uErr } = await supabase
            .from('user_contacts')
            .update({ preferred_currency: iso, updated_at: new Date().toISOString() })
            .eq('id', contact.id);
          if (uErr) {
            console.error('update contact currency error', uErr);
            return { text: 'Failed to update currency.' };
          }
          return { text: `Preferred currency set to ${iso}.` };
        }
      }
    }

    // 2) Free-form messages — let Gemini decide and execute via function calling
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      // fallback to finance-update attempt
      try {
        const { data, error } = await supabase.functions.invoke('finance-update', {
          body: { phone: from!, text: body },
        });
        if (!error && data?.reply) {
          // Format the reply from finance-update
          return { text: `✅ *Update Recorded*\n\n📊 ${data.reply}` };
        }
      } catch (e) {
        console.error('finance-update fallback error', e);
      }
      return { text: '❌ *Could not understand*\n\nSend */help* to see available commands.' };
    }

    // Call the extracted free-form text expense processor
    const result = await processFreeFormTextExpense({
      phone: from!,
      text: body,
      supabaseUrl: SUPABASE_URL,
      supabaseServiceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
      geminiApiKey: GEMINI_API_KEY,
      callerDate: new Date().toISOString().slice(0, 10),
      callerCurrency: userCurrency,
    });

    // Format the result into user-friendly message
    return { text: formatProcessResult(result, userCurrency) };
  };

  const reply = await replyText();

  // Don't send empty TwiML messages (e.g., after verification templates)
  if ((!reply.text || !reply.text.trim()) && !reply.mediaUrl) {
    return xmlResponse('<?xml version="1.0" encoding="UTF-8"?>\n<Response></Response>');
  }

  // Respond with TwiML so Twilio replies to the user (optionally with media)
  const textEsc = reply.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const mediaPart = reply.mediaUrl ? `<Media>${reply.mediaUrl}</Media>` : '';
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${textEsc}${mediaPart}</Message></Response>`;
  return xmlResponse(twiml);
});
