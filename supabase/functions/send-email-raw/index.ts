import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

import { getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { type EmailOptions, sendEmail } from "../shared/email-service.ts";
import { buildTicketClosedEmail } from "../shared/ticket-closed-email.ts";

interface SendEmailRawRequest {
  template?: "ticket_closed";
  ticketId?: string;
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: any[];
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") ?? undefined);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Method not allowed. Use POST." },
      405,
      corsHeaders,
    );
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse(
      { success: false, error: "Server not configured" },
      500,
      corsHeaders,
    );
  }

  const auth = await authenticateUser(req, supabase);
  if (!auth.success || !auth.userId) {
    return jsonResponse(
      { success: false, error: auth.error ?? "Unauthorized" },
      auth.statusCode ?? 401,
      corsHeaders,
    );
  }

  const { data: actor, error: actorError } = await supabase
    .from("users")
    .select("is_creator")
    .eq("id", auth.userId)
    .maybeSingle();

  if (actorError) {
    return jsonResponse(
      { success: false, error: "Unable to verify sender access" },
      500,
      corsHeaders,
    );
  }

  if (!actor?.is_creator) {
    return jsonResponse(
      { success: false, error: "Forbidden" },
      403,
      corsHeaders,
    );
  }

  let body: SendEmailRawRequest;
  try {
    body = (await req.json()) as SendEmailRawRequest;
  } catch {
    return jsonResponse(
      { success: false, error: "Invalid JSON in request body" },
      400,
      corsHeaders,
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonResponse(
      { success: false, error: "Invalid request body" },
      400,
      corsHeaders,
    );
  }

  if (body.template !== undefined) {
    if (body.template !== "ticket_closed") {
      return jsonResponse(
        { success: false, error: "Unknown email template" },
        400,
        corsHeaders,
      );
    }
    if (
      typeof body.ticketId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        body.ticketId,
      )
    ) {
      return jsonResponse(
        { success: false, error: "A valid ticketId is required" },
        400,
        corsHeaders,
      );
    }
    return sendTicketClosedEmail(body.ticketId, corsHeaders);
  }

  const validationError = validateRequest(body);
  if (validationError) {
    return jsonResponse(
      { success: false, error: validationError },
      400,
      corsHeaders,
    );
  }

  const html = body.html?.trim();
  const resolvedHtml = html ? html : buildHtmlFromText(body.text ?? "");

  const result = await sendEmail(
    {
      to: body.to!,
      subject: body.subject!,
      html: resolvedHtml,
      text: body.text,
      from: body.from,
      replyTo: body.replyTo,
      cc: body.cc,
      bcc: body.bcc,
      attachments: body.attachments,
    } satisfies EmailOptions,
  );

  return jsonResponse(
    {
      success: result.success,
      id: result.id,
      error: result.error,
      test: result.test,
    },
    result.success ? 200 : 500,
    corsHeaders,
  );
});

async function sendTicketClosedEmail(
  ticketId: string,
  corsHeaders: Record<string, string>,
) {
  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .select("user_id, status, message")
    .eq("id", ticketId)
    .maybeSingle();
  if (ticketError) {
    return jsonResponse(
      { success: false, error: "Unable to load ticket" },
      500,
      corsHeaders,
    );
  }
  if (!ticket) {
    return jsonResponse(
      { success: false, error: "Ticket not found" },
      404,
      corsHeaders,
    );
  }
  if (ticket.status !== "closed") {
    return jsonResponse(
      {
        success: false,
        error: "Ticket must be closed before sending an update",
      },
      409,
      corsHeaders,
    );
  }

  const { data: recipient, error: recipientError } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", ticket.user_id)
    .maybeSingle();
  if (recipientError) {
    return jsonResponse(
      { success: false, error: "Unable to load ticket owner" },
      500,
      corsHeaders,
    );
  }
  const email = recipient?.email?.trim();
  if (!recipient || !email) {
    return jsonResponse(
      { success: false, error: "Ticket owner has no email address" },
      400,
      corsHeaders,
    );
  }

  const template = buildTicketClosedEmail({
    fullName: recipient.full_name,
    message: ticket.message,
  });
  const result = await sendEmail({
    to: email,
    from: "Moneko Team <hello@moneko.io>",
    replyTo: "hello@moneko.io",
    ...template,
    recipientUserId: ticket.user_id,
  });
  return jsonResponse(result, result.success ? 200 : 500, corsHeaders);
}

function validateRequest(payload: SendEmailRawRequest): string | null {
  if (!payload.to?.trim()) {
    return "Missing required field: to";
  }

  if (!payload.subject?.trim()) {
    return "Missing required field: subject";
  }

  if (!payload.html?.trim() && !payload.text?.trim()) {
    return "Either html or text is required";
  }

  return null;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function buildHtmlFromText(text: string) {
  return `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${
    escapeHtml(text)
  }</pre>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
