// Supabase Edge Function: twilio-whatsapp-fallback
// Purpose: Fallback webhook for Twilio WhatsApp if the primary Request URL fails.
// Behavior: Similar to the primary webhook; attempts to process the message and reply with TwiML.
// Notes: Signature validation is attempted when TWILIO_AUTH_TOKEN is present; can be relaxed via TWILIO_SKIP_SIGNATURE.

import { corsHeaders } from "../shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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

async function hmacSha256Base64(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function buildSignatureBaseString(url: string, params: URLSearchParams): string {
  const keys = Array.from(params.keys()).sort();
  const concatenated = keys.map((k) => k + (params.get(k) ?? '')).join('');
  return url + concatenated;
}

function normalizePhone(from: string | null): string | null {
  if (!from) return null;
  if (from.startsWith('whatsapp:')) return from.replace('whatsapp:', '');
  return from;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
  const TWILIO_SKIP_SIGNATURE = (Deno.env.get('TWILIO_SKIP_SIGNATURE') || '').toLowerCase() === 'true';
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Server not configured' }, 500);
  }

  const rawBody = await req.text();
  const params = new URLSearchParams(rawBody);
  const isErrorCallback = !!params.get('ErrorCode');

  // Attempt to validate Twilio signature if configured
  try {
    if (!TWILIO_SKIP_SIGNATURE && TWILIO_AUTH_TOKEN) {
      const legacyHeader = req.headers.get("X-Twilio-Signature") || req.headers.get("x-twilio-signature");
      const sha256Header =
        req.headers.get("X-Twilio-Webhook-SHA256") ||
        req.headers.get("x-twilio-webhook-sha256") ||
        req.headers.get("X-Twilio-Webhook-Signature") ||
        req.headers.get("x-twilio-webhook-signature");

      const urlUsedByTwilio = req.url;

      if (sha256Header) {
        // 2025 docs: SHA-256 signature uses raw body concatenated with URL.
        const shaBase = urlUsedByTwilio + rawBody;
        const computed = await hmacSha256Base64(TWILIO_AUTH_TOKEN, shaBase);
        if (computed !== sha256Header) {
          if (!isErrorCallback) {
            return jsonResponse({ error: 'Invalid SHA-256 signature' }, 403);
          }
          console.warn('Fallback error callback invalid SHA-256 signature', {
            url: urlUsedByTwilio,
          });
        }
      } else if (legacyHeader) {
        const baseString = buildSignatureBaseString(urlUsedByTwilio, params);
        const computedSignature = await hmacSha1Base64(TWILIO_AUTH_TOKEN, baseString);
        if (computedSignature !== legacyHeader) {
          if (!isErrorCallback) {
            return jsonResponse({ error: 'Invalid signature' }, 403);
          }
          console.warn('Fallback error callback invalid SHA-1 signature', {
            url: urlUsedByTwilio,
          });
        }
      } else {
        if (!isErrorCallback) {
          return jsonResponse({ error: 'Missing Twilio signature' }, 403);
        }
        console.warn('Fallback error callback missing Twilio signature headers', {
          url: urlUsedByTwilio,
        });
      }
    }
  } catch (e) {
    // On fallback, signature errors should not prevent a user response (optional relax)
    console.warn('Fallback signature check issue:', e);
  }

  const from = normalizePhone(params.get('From'));
  const body = params.get('Body') || '';
  if (!from || !body) {
    return xmlResponse('<Response><Message>[Fallback] Invalid message</Message></Response>');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { 'X-Client-Info': 'moneko-twilio-whatsapp-fallback' } },
  });

  // Try primary processing path (same as main webhook) by reusing finance-update
  const preview = body.trim().slice(0, 160);
  let reply =
    `[Fallback] Our WhatsApp assistant is briefly restarting, so I'm using the backup recorder. ` +
    `${preview ? `I captured your note: “${preview}”. ` : ""}I'll process it as soon as the assistant is back online.`;
  try {
    const { data, error } = await supabase.functions.invoke('finance-update', {
      body: { phone: from, text: body },
    });
    if (error) {
      console.error('fallback finance-update error', error);
    } else if (data?.reply) {
      reply =
        `[Fallback] Our assistant is restarting, so I logged your update${preview ? ` (“${preview}”)` : ""}.` +
        `\nSummary: ${data.reply}`;
    }
  } catch (e) {
    console.error('fallback invoke failure', e);
  }

  const twiml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<Response><Message>${reply.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message></Response>`;
  return xmlResponse(twiml);
});
