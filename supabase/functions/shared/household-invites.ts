import { loadRecipientEmailLanguageWithClient } from "./email-language.ts";
import { householdInviteTemplate } from "./email-templates.ts";

type SupabaseLike = {
  from: (table: string) => any;
};

export type CreateHouseholdInviteResult =
  | {
      success: true;
      invite_url: string;
      token: string;
      expires_at: string | null;
      is_reusable: boolean;
      invited_role: "admin" | "member";
      email_sent: boolean;
      email_error?: string;
      household_name?: string;
    }
  | {
      success: false;
      status: number;
      error: string;
    };

export async function createHouseholdInvite(params: {
  supabase: SupabaseLike;
  appUrl: string;
  resendApiKey?: string | null;
  resendFrom: string;
  householdId: string;
  actorUserId: string;
  invitedEmail?: string | null;
  personalMessage?: string;
  inviterName?: string;
  householdName?: string;
  expiresInDays?: number;
  isReusable?: boolean;
  invitedRole?: "admin" | "member";
  failOnEmailError?: boolean;
}): Promise<CreateHouseholdInviteResult> {
  const householdId = params.householdId?.trim();
  const actorUserId = params.actorUserId?.trim();
  if (!householdId) return failure(400, "household_id is required");
  if (!actorUserId) return failure(401, "Authenticated user is required");

  const isReusable =
    params.isReusable === undefined ? false : params.isReusable;
  const invitedRole =
    params.invitedRole === undefined ? "admin" : params.invitedRole;
  if (typeof isReusable !== "boolean") {
    return failure(400, "is_reusable must be a boolean");
  }
  if (invitedRole !== "admin" && invitedRole !== "member") {
    return failure(400, "invited_role must be admin or member");
  }
  if (params.invitedEmail != null && typeof params.invitedEmail !== "string") {
    return failure(400, "invited_email must be a string");
  }
  const invitedEmail = params.invitedEmail?.trim() || undefined;
  if (isReusable && invitedEmail) {
    return failure(400, "Reusable invitations cannot have a recipient email");
  }
  const expiresInDays =
    params.expiresInDays === undefined ? 7 : params.expiresInDays;
  const ttlError = validateInviteTtl(expiresInDays);
  if (ttlError) return ttlError;
  if (isReusable && ![0, 1, 3, 7, 14, 30].includes(expiresInDays)) {
    return failure(
      400,
      "Reusable invite expiry must be 0, 1, 3, 7, 14, or 30 days",
    );
  }

  const { data: household, error: householdError } = await params.supabase
    .from("households")
    .select("id, name, is_portfolio")
    .eq("id", householdId)
    .maybeSingle();
  if (householdError || !household) {
    return failure(404, "Space not found");
  }
  if ((household as any).is_portfolio === true) {
    return failure(400, "Private spaces cannot have invite links");
  }

  const { data: membership, error: membershipError } = await params.supabase
    .from("household_members")
    .select("role")
    .eq("household_id", householdId)
    .eq("user_id", actorUserId)
    .single();
  if (membershipError || !membership) {
    return failure(403, "You are not a member of this household");
  }

  const role = String((membership as any).role || "").toLowerCase();
  if (role !== "owner" && role !== "admin") {
    return failure(403, "Only owners and admins can create invites");
  }

  const token = crypto.randomUUID() + "-" + Date.now().toString(36);
  const expiresAt =
    expiresInDays === 0
      ? null
      : new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const personalMessage = params.personalMessage?.trim() || undefined;
  const { data: invite, error: inviteError } = await params.supabase
    .from("invites")
    .insert({
      token,
      household_id: householdId,
      inviter_id: actorUserId,
      invited_email: invitedEmail ?? null,
      is_reusable: isReusable,
      invited_role: invitedRole,
      personal_message: personalMessage,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      status: "pending",
    })
    .select()
    .single();

  if (inviteError) {
    console.error("Error creating invite:", inviteError);
    return failure(500, "Failed to create invite");
  }

  const inviteUrl = `${params.appUrl}/invites/${token}`;
  const resolvedHouseholdName =
    params.householdName?.trim() || (household as any).name || undefined;

  if (invitedEmail) {
    const emailResult = await sendInviteEmail({
      supabase: params.supabase,
      apiKey: params.resendApiKey,
      from: params.resendFrom,
      to: invitedEmail,
      inviteUrl,
      personalMessage,
      inviterName: params.inviterName?.trim() || "Someone",
      householdName: resolvedHouseholdName,
    });
    if (!emailResult.success && params.failOnEmailError !== false) {
      return emailResult;
    }
    if (!emailResult.success) {
      return {
        success: true,
        invite_url: inviteUrl,
        token,
        expires_at: invite.expires_at,
        is_reusable: isReusable,
        invited_role: invitedRole,
        email_sent: false,
        email_error: emailResult.error,
        household_name: resolvedHouseholdName,
      };
    }
  }

  return {
    success: true,
    invite_url: inviteUrl,
    token,
    expires_at: invite.expires_at,
    is_reusable: isReusable,
    invited_role: invitedRole,
    email_sent: !!invitedEmail,
    household_name: resolvedHouseholdName,
  };
}

function validateInviteTtl(
  expiresInDays: number,
): CreateHouseholdInviteResult | null {
  const maxTTLDays = 30;
  if (!Number.isInteger(expiresInDays)) {
    return failure(400, "Invite expiry must be an integer number of days");
  }
  if (expiresInDays === 0) return null;
  if (expiresInDays > maxTTLDays) {
    return failure(400, `Invite expiry cannot exceed ${maxTTLDays} days`);
  }
  if (expiresInDays < 1) {
    return failure(
      400,
      "Invite expiry must be at least 1 day or 0 for unlimited",
    );
  }
  return null;
}

async function sendInviteEmail(params: {
  supabase: SupabaseLike;
  apiKey?: string | null;
  from: string;
  to: string;
  inviteUrl: string;
  personalMessage?: string;
  inviterName?: string;
  householdName?: string;
}): Promise<CreateHouseholdInviteResult | { success: true }> {
  if (!params.apiKey) {
    return failure(502, "RESEND_API_KEY is not configured");
  }

  let language: string;
  try {
    language = await loadRecipientEmailLanguageWithClient(
      params.supabase,
      params.to,
    );
  } catch {
    return failure(502, "Failed to resolve invitation recipient language");
  }
  const template = householdInviteTemplate({
    inviteUrl: params.inviteUrl,
    personalMessage: params.personalMessage,
    inviterName: params.inviterName,
    householdName: params.householdName,
  });
  const { html, text, subject } = template.localize?.(language) ?? template;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Resend email failed: ${response.status} ${errorBody}`);
    return failure(502, "Failed to send invitation email");
  }

  return { success: true };
}

function failure(
  status: number,
  error: string,
): Extract<CreateHouseholdInviteResult, { success: false }> {
  return { success: false, status, error };
}
