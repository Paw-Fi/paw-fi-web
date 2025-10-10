// Supabase Edge Function: twilio-whatsapp-webhook
// Receives Twilio WhatsApp inbound webhooks, validates signature, runs finance-update, replies with TwiML

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { buildHelpMessage, buildVerificationPrompt, sendWhatsAppTemplate, WHATSAPP_COMMANDS, type WhatsAppReply } from "../shared/whatsapp-helpers.ts";
import { TWILIO_TEMPLATES } from "../shared/twilio-templates.ts";
import { uploadReceiptImage } from "./storage-helper.ts";

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

function b64encode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
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
    
    const { data: contact } = await supabaseCheck
      .from('user_contacts')
      .select('verified, user_id')
      .eq('phone_e164', from)
      .maybeSingle();

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

      // We'll upload to storage asynchronously after sending the response
      // to avoid blocking the user. Store the upload promise to execute later.
      const storageUploadTask = {
        imgBuf,
        contentType,
        phone: from!,
        executed: false,
      };

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
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

      const callerDate = new Date().toISOString().slice(0, 10);
      const callerCurrency = 'USD';

      // According to official Gemini docs: https://ai.google.dev/gemini-api/docs/image-understanding#javascript
      // For the older SDK, pass contents as a simple array of parts (inlineData + text)
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
            mimeType: mediaContentType0,
            data: b64encode(imgBuf)
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

      // Execute a single tool call if returned
      const executeToolCall = async (name: string, args: any): Promise<string> => {
        // Recreate minimal Supabase client here for function invokes
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
          global: { headers: { 'X-Client-Info': 'moneko-twilio-whatsapp-webhook' } },
        });
        if (name === 'set_budget') {
          const amount = Number(args?.amount);
          const date = String(args?.date || callerDate);
          const { data, error } = await supabase.functions.invoke('finance-update', {
            body: { phone: from!, text: `/setBudget ${amount}`, date },
          });
          if (error) {
            console.error('set_budget(receipt) error', error);
            return '❌ *Failed to set budget*\n\nPlease try again or contact support.';
          }
          
          // Format budget response
          const reply = data?.reply || 'Budget updated.';
          return `✅ *Budget Updated*\n\n💰 ${reply}`;
        }
        if (name === 'add_expenses') {
          const items = Array.isArray(args?.items) ? args.items : [];
          console.log('[add_expenses] Received items from Gemini:', JSON.stringify(items, null, 2));
          
          const composed = items
            .map((it: any) => `I spent ${it.amount}${it.currency ? ' ' + it.currency : ''}${it.category ? ' on ' + it.category : ''}${it.date ? ' at ' + it.date : ''}${it.note ? ' (' + it.note + ')' : ''}`)
            .join(', ');
          
          console.log('[add_expenses] Composed text for finance-update:', composed);

          const { data, error } = await supabase.functions.invoke('finance-update', {
            body: { phone: from!, text: composed, date: callerDate },
          });
          
          console.log('[add_expenses] finance-update response:', { data, error });
          
          if (error) {
            console.error('add_expenses(receipt) error', error);
            return '❌ *Failed to add expenses*\n\nPlease try again or contact support.';
          }
          
          // Build a detailed, formatted response message
          const firstItem = items[0];
          const amount = firstItem?.amount || 0;
          const currency = firstItem?.currency || callerCurrency;
          const category = firstItem?.category || 'expense';
          const note = firstItem?.note || '';
          
          // Format the response with proper structure
          let formattedMsg = `✅ *Receipt Logged*\n\n`;
          formattedMsg += `💰 *Amount:* ${currency} ${amount}\n`;
          formattedMsg += `📁 *Category:* ${category}\n`;
          if (note) {
            formattedMsg += `📝 *Items:* ${note}\n`;
          }
          formattedMsg += `\n━━━━━━━━━━━━━━━━\n\n`;
          
          // Add the totals from finance-update
          const totalsMsg = data?.reply || 'Expenses recorded.';
          formattedMsg += `📊 *${totalsMsg}*`;
          
          return formattedMsg;
        }
        return 'No action performed.';
      };

      const tool = result.response.functionCalls()?.[0];
      let message = '';
      if (tool) {
        console.log('[receipt-parse] Executing tool:', tool.name);
        message = await executeToolCall(tool.name, tool.args);
        console.log('[receipt-parse] Tool execution result message:', message);
      } else {
        const textOut = (result.response.text() || '').trim();
        if (!textOut) {
          const textEsc = '❌ *Could not read receipt*\n\nPlease try again with:\n• A clearer photo\n• Better lighting\n• All text visible\n\nOr type the items manually.'
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const tw = `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${textEsc}</Message></Response>`;
          return xmlResponse(tw);
        }
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
          global: { headers: { 'X-Client-Info': 'moneko-twilio-whatsapp-webhook' } },
        });
        console.log('[receipt-textOut] finance-update(receipt) textOut:', textOut);
        const { data, error } = await supabase.functions.invoke('finance-update', {
          body: { phone: from!, text: textOut },
        });
        if (error) {
          console.error('finance-update(receipt) error', error);
          message = '❌ *Failed to process receipt*\n\nPlease try again or contact support.';
        } else {
          const reply = data?.reply || 'Receipt processed.';
          message = `✅ *Receipt Processed*\n\n📊 ${reply}`;
        }
      }

      console.log('[receipt-parse] Final message to send:', message);
      const textEsc = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${textEsc}</Message></Response>`;
      console.log('[receipt-parse] Sending TwiML response:', twiml);

      // Upload image to storage asynchronously after response is sent
      // This won't block the response to the user
      Promise.resolve().then(async () => {
        try {
          console.log('[async-storage] Starting background upload...');
          const storageUrl = await uploadReceiptImage(
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY,
            storageUploadTask.imgBuf,
            storageUploadTask.contentType,
            storageUploadTask.phone
          );

          if (storageUrl) {
            console.log('[async-storage] Upload successful:', storageUrl);

            // Update the most recent expense with the receipt URL
            const supabaseUpdate = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
              auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
              global: { headers: { 'X-Client-Info': 'moneko-async-storage' } },
            });

            // Get contact ID
            const { data: contact } = await supabaseUpdate
              .from('user_contacts')
              .select('id')
              .eq('phone_e164', storageUploadTask.phone)
              .maybeSingle();

            if (contact?.id) {
              // Update most recent expense created in last 60 seconds for this contact
              const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
              const { error: updateError } = await supabaseUpdate
                .from('expenses')
                .update({ receipt_image_url: storageUrl })
                .eq('contact_id', contact.id)
                .gte('created_at', sixtySecondsAgo)
                .is('receipt_image_url', null)
                .order('created_at', { ascending: false })
                .limit(1);

              if (updateError) {
                console.error('[async-storage] Failed to update expense:', updateError);
              } else {
                console.log('[async-storage] Expense updated with receipt URL');
              }
            }
          }
        } catch (err) {
          console.error('[async-storage] Background upload failed:', err);
          // Don't throw - this is a background task
        }
      });

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

    // Receipt image via WhatsApp
    if (numMedia > 0 && mediaUrl0 && mediaContentType0.startsWith('image/')) {
      try {
        // Fetch image bytes
        const imgRes = await fetch(mediaUrl0);
        const imgBuf = new Uint8Array(await imgRes.arrayBuffer());
        const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');
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
        const prompt = `You are an assistant that extracts line-item expenses from a receipt image. 
Return a concise human summary and structured items with amount, currency (if visible), and category (groceries, food, transport, etc.).`;
        const result = await model.generateContent({
          systemInstruction: 'You are the same budgeting assistant that handles free-form text. Use the same tools and behaviors to parse a receipt image and update expenses/budget accordingly.',
          contents: [
            { role: 'user', parts: [
              { text: `Caller Currency: USD\nCaller Date: ${new Date().toISOString().slice(0,10)}\nUser sent a receipt image. Extract items and call tools.` },
              { inlineData: { mimeType: mediaContentType0, data: b64encode(imgBuf) } }
            ] },
          ],
          generationConfig: { maxOutputTokens: 512 },
        });
        // If a tool call is requested, execute similarly to text flow
        const tool = result.response.functionCalls()?.[0];
        if (tool) {
          // Fallback: proceed with text pipeline below for this environment
        }
        // Fallback: send any extracted text through finance-update pipeline
        const textOut = result.response.text() || '';
        const { data, error } = await supabase.functions.invoke('finance-update', {
          body: { phone: from!, text: textOut },
        });
        if (error) {
          console.error('finance-update(receipt) error', error);
          return { text: 'Failed to process receipt.' };
        }
        return { text: data?.reply || 'Receipt processed.' };
      } catch (e) {
        console.error('receipt parse error', e);
        return { text: 'Sorry, I could not read that receipt. Please try again or type the items.' };
      }
    }


  async function isFirstMessageForContact(phone: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_contacts')
      .select('id')
      .eq('phone_e164', phone)
      .maybeSingle();
    if (error) {
      console.warn('check contact error', error);
      // If unsure, treat as not first to avoid spammy help
      return false;
    }
    return !data;
  }

  // Command routing: explicit slash commands take priority and are handled deterministically
  const lower = body.trim();
  const replyText = async (): Promise<WhatsAppReply> => {
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
        // Upsert budget for today via finance-update using preferred currency
        // Prefer stored currency: finance-update should read user_contacts.preferred_currency when missing
        const { data, error } = await supabase.functions.invoke('finance-update', {
          body: { phone: from!, text: `/setBudget ${amount}` },
        });
        if (error) {
          console.error('finance-update(setBudget) error', error);
          return { text: 'Failed to set budget.' };
        }
        return { text: data?.reply || 'Budget updated.' };
      }

      if (matched.name.toLowerCase() === '/expenses') {
        // Fetch today's expenses for this contact and show total
        const today = new Date().toISOString().slice(0, 10);
        const { data: contact, error: cErr } = await supabase
          .from('user_contacts')
          .select('id')
          .eq('phone_e164', from!)
          .maybeSingle();
        if (cErr || !contact?.id) {
          console.error('fetch contact for expenses error', cErr);
          return { text: "❌ *Could not find account*\n\nTry sending a message again." };
        }
        const { data: rows, error: eErr } = await supabase
          .from('expenses')
          .select('date, amount_cents, currency, category, raw_text, created_at')
          .eq('contact_id', contact.id)
          .eq('date', today)
          .order('created_at', { ascending: true });
        if (eErr) {
          console.error('fetch expenses error', eErr);
          return { text: '❌ *Failed to fetch expenses*\n\nPlease try again.' };
        }
        if (!rows?.length) {
          return { text: `📊 *No expenses today*\n\nYou haven't recorded any expenses yet.` };
        }
        
        const toMoney = (cents: number) => (cents / 100).toFixed(2);
        const sym = (code: string) => {
          const m: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', AUD: 'A$', CAD: 'C$', SGD: 'S$', HKD: 'HK$', INR: '₹' };
          const up = (code || 'USD').toUpperCase();
          return m[up] || '$';
        };
        
        // Build formatted table
        let response = `📊 *Today's Expenses*\n\n`;
        
        rows.forEach((r: any, index: number) => {
          const s = sym(r.currency || 'USD');
          const amount = toMoney(r.amount_cents);
          const cat = r.category || 'uncategorized';
          
          response += `${index + 1}. ${s}${amount} - ${cat}\n`;
        });
        
        // Add separator and total
        response += `\n━━━━━━━━━━━━━━━━\n\n`;
        const firstCur = (rows[0]?.currency || 'USD').toUpperCase();
        const totalCents = rows.reduce((s: number, r: any) => s + (r.amount_cents || 0), 0);
        response += `💰 *Total:* ${sym(firstCur)}${toMoney(totalCents)}`;
        
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
        const { data: contact, error: cErr } = await supabase
          .from('user_contacts')
          .select('id')
          .eq('phone_e164', from!)
          .maybeSingle();
        if (cErr) {
          console.error('fetch contact for addCategory error', cErr);
          return { text: 'Failed to add category.' };
        }
        let contactId = contact?.id;
        if (!contactId) {
          const { data: inserted, error: iErr } = await supabase
            .from('user_contacts')
            .insert({ phone_e164: from! })
            .select('id')
            .maybeSingle();
          if (iErr || !inserted?.id) {
            console.error('insert contact for addCategory error', iErr);
            return { text: 'Failed to add category.' };
          }
          contactId = inserted.id;
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
        const { data: contact, error: cErr } = await supabase
          .from('user_contacts').select('id').eq('phone_e164', from!).maybeSingle()
        if (cErr || !contact?.id) return { text: '❌ *Failed to find your account*' }
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
        const { data: contact, error: cErr } = await supabase
          .from('user_contacts').select('id').eq('phone_e164', from!).maybeSingle()
        if (cErr || !contact?.id) return { text: '❌ *Failed to find your account*' }
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
        const { data: contact, error: cErr } = await supabase
          .from('user_contacts').select('id').eq('phone_e164', from!).maybeSingle()
        if (cErr || !contact?.id) return { text: '❌ *Failed to find your account*' }
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
        const { data: contact, error: cErr } = await supabase
          .from('user_contacts').select('id').eq('phone_e164', from!).maybeSingle()
        if (cErr || !contact?.id) return { text: '❌ *Failed to find your account*' }
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
        const { data: contact, error: cErr } = await supabase
          .from('user_contacts')
          .select('id')
          .eq('phone_e164', from!)
          .maybeSingle();
        if (cErr) {
          console.error('fetch contact for setCurrency error', cErr);
          return { text: 'Failed to update currency.' };
        }
        if (!contact) {
          // Create contact if it does not exist
          const { data: inserted, error: iErr } = await supabase
            .from('user_contacts')
            .insert({ phone_e164: from!, preferred_currency: iso })
            .select('id')
            .maybeSingle();
          if (iErr || !inserted?.id) {
            console.error('insert contact for setCurrency error', iErr);
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

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // Define function(s) the model can call to update DB
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

    const callerDate = new Date().toISOString().slice(0, 10);
    const callerCurrency = 'USD';

    // Start a tool-enabled turn
    let response = await model.generateContent({
      systemInstruction,
      contents: [{ role: 'user', parts: [{ text: `Caller Currency: ${callerCurrency}\nCaller Date: ${callerDate}\nUser: ${body}` }] }],
      generationConfig: { maxOutputTokens: 512 },
    });

    // While model wants to call a function, execute and provide results
    const callTool = async (name: string, args: any): Promise<string> => {
      if (name === 'set_budget') {
        const amount = Number(args?.amount);
        const date = String(args?.date || callerDate);
        const { data, error } = await supabase.functions.invoke('finance-update', {
          body: { phone: from!, text: `/setBudget ${amount}`, date },
        });
        if (error) {
          console.error('set_budget via finance-update error', error);
          return { text: '❌ *Failed to set budget*\n\nPlease try again or contact support.' };
        }
        const reply = data?.reply || 'Budget updated.';
        return { text: `✅ *Budget Updated*\n\n💰 ${reply}` };
      }
      if (name === 'add_expenses') {
        const items = Array.isArray(args?.items) ? args.items : [];
        // Reuse finance-update free-form to insert expenses; pass the raw text synthesized from items
        const composed = items
          .map((it: any) => `I spent ${it.amount}${it.currency ? ' ' + it.currency : ''}${it.category ? ' on ' + it.category : ''}${it.date ? ' at ' + it.date : ''}${it.note ? ' (' + it.note + ')' : ''}`)
          .join(', ');
        const { data, error } = await supabase.functions.invoke('finance-update', {
          body: { phone: from!, text: composed, date: callerDate },
        });
        if (error) {
          console.error('add_expenses via finance-update error', error);
          return { text: '❌ *Failed to add expenses*\n\nPlease try again or contact support.' };
        }
        
        // Build a detailed, formatted response message (similar to receipt image)
        let formattedMsg = `✅ *Expenses Logged*\n\n`;
        
        // List each expense
        items.forEach((item: any, index: number) => {
          const amount = item.amount || 0;
          const currency = item.currency || callerCurrency;
          const category = item.category || 'expense';
          const note = item.note || '';
          
          formattedMsg += `${index + 1}. ${currency} ${amount}`;
          if (category) formattedMsg += ` (${category})`;
          if (note) formattedMsg += ` - ${note}`;
          formattedMsg += `\n`;
        });
        
        formattedMsg += `\n━━━━━━━━━━━━━━━━\n\n`;
        
        // Add the totals from finance-update
        const totalsMsg = data?.reply || 'Expenses recorded.';
        formattedMsg += `📊 *${totalsMsg}*`;
        
        return { text: formattedMsg };
      }
      return { text: 'No action performed.' };
    };

    // Tool execution loop (single-step for lite usage)
    const tool = response.response.functionCalls()?.[0];
    if (tool) {
      const result = await callTool(tool.name, tool.args);
      // Return human-friendly result
      return typeof result === 'string' ? { text: result } : result;
    }

    // If no tool call suggested, fallback to finance-update
    const { data, error } = await supabase.functions.invoke('finance-update', {
      body: { phone: from!, text: body },
    });
    if (error) {
      console.error('finance-update fallback2 error', error);
      return { text: 'Failed to process message.' };
    }
    return { text: data?.reply || 'Update recorded.' };
  };

  const reply = await replyText();

  // Respond with TwiML so Twilio replies to the user (optionally with media)
  const textEsc = reply.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const mediaPart = reply.mediaUrl ? `<Media>${reply.mediaUrl}</Media>` : '';
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${textEsc}${mediaPart}</Message></Response>`;
  return xmlResponse(twiml);
});
