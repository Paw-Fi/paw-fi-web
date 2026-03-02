import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

import { getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";

interface AttachmentPayload {
  base64: string;
  fileName?: string;
  contentType?: string;
}

interface SupportTicketRequest {
  type?: "bug" | "feedback" | "feature_request" | "other";
  message?: string;
  diagnostics?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  attachments?: AttachmentPayload[];
  appVersion?: string;
  platform?: string;
  source?: string;
}

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB
const BUCKET_ID = "support-attachments";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin") ?? undefined);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  try {
    const body = (await req.json()) as SupportTicketRequest;
    const validationError = validateRequest(body);
    if (validationError) {
      return jsonResponse({ error: validationError }, 400, corsHeaders);
    }

    const authResult = await authenticateUser(req, supabase);
    if (!authResult.success || !authResult.userId) {
      return jsonResponse(
        { error: authResult.error ?? "Authentication failed" },
        authResult.statusCode ?? 401,
        corsHeaders,
      );
    }

    const { data: ticket, error: insertError } = await supabase
      .from("support_tickets")
      .insert({
        user_id: authResult.userId,
        type: body.type ?? "bug",
        message: body.message!.trim(),
        diagnostics: body.diagnostics ?? null,
        metadata: body.metadata ?? {},
        app_version: body.appVersion ?? null,
        platform: body.platform ?? null,
        source: body.source ?? "mobile",
      })
      .select("*")
      .single();

    if (insertError || !ticket) {
      console.error("Failed to create support ticket", insertError);
      throw new Error("Unable to create ticket");
    }

    const attachments = body.attachments ?? [];
    if (attachments.length > 0) {
      const uploadResults = await uploadAttachments(
        attachments,
        ticket.id,
        authResult.userId,
      );

      if (uploadResults.length > 0) {
        const { error: attachmentError } = await supabase
          .from("support_ticket_attachments")
          .insert(uploadResults);

        if (attachmentError) {
          console.error("Failed to record ticket attachments", attachmentError);
          throw new Error("Unable to save attachments");
        }
      }
    }

    return jsonResponse(
      { success: true, ticketId: ticket.id, status: ticket.status },
      200,
      corsHeaders,
    );
  } catch (error) {
    console.error("[support-ticket-create] Unexpected error", error);
    await reportEdgeFunctionError({
      functionName: "support-ticket-create",
      error,
    });
    return jsonResponse({ error: "Failed to submit ticket" }, 500, corsHeaders);
  }
});

function validateRequest(payload: SupportTicketRequest): string | null {
  if (!payload.message || typeof payload.message !== "string") {
    return "Message is required";
  }

  if (payload.message.trim().length < 10) {
    return "Message must be at least 10 characters";
  }

  if (payload.attachments && payload.attachments.length > MAX_ATTACHMENTS) {
    return `You can attach up to ${MAX_ATTACHMENTS} images per ticket`;
  }

  return null;
}

async function uploadAttachments(
  attachments: AttachmentPayload[],
  ticketId: string,
  userId: string,
) {
  const results: {
    ticket_id: string;
    file_path: string;
    content_type: string | null;
    file_size_bytes: number;
  }[] = [];

  for (let index = 0; index < attachments.length; index++) {
    const attachment = attachments[index];
    if (!attachment.base64 || typeof attachment.base64 !== "string") continue;

    const bytes = decodeBase64(attachment.base64);
    if (bytes.byteLength > MAX_ATTACHMENT_BYTES) {
      throw new Error("Each attachment must be smaller than 5 MB");
    }

    const contentType =
      attachment.contentType ?? inferContentType(attachment.fileName);
    const extension = inferExtension(contentType);
    const safeName = sanitizeFileName(
      attachment.fileName ?? `attachment-${index + 1}.${extension}`,
    );

    // Ensure it's saved in a 'tickets/' prefix structure
    const filePath = `tickets/${userId}/${ticketId}/${Date.now()}-${index}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_ID)
      .upload(filePath, bytes, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Failed to upload ticket attachment", uploadError);
      throw new Error("Unable to upload attachment");
    }

    results.push({
      ticket_id: ticketId,
      file_path: filePath,
      content_type: contentType,
      file_size_bytes: bytes.byteLength,
    });
  }

  return results;
}

function decodeBase64(data: string): Uint8Array {
  try {
    const cleaned = data.replace(/^data:[^;]+;base64,/, "");
    return Uint8Array.from(atob(cleaned), (char) => char.charCodeAt(0));
  } catch (_error) {
    throw new Error("Invalid attachment encoding");
  }
}

function inferContentType(fileName?: string): string {
  if (!fileName) return "image/jpeg";
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
}

function inferExtension(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    default:
      return "jpg";
  }
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
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
