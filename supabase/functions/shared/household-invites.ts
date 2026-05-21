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
  invitedEmail?: string;
  personalMessage?: string;
  inviterName?: string;
  householdName?: string;
  expiresInDays?: number;
  failOnEmailError?: boolean;
}): Promise<CreateHouseholdInviteResult> {
  const householdId = params.householdId?.trim();
  const actorUserId = params.actorUserId?.trim();
  if (!householdId) return failure(400, "household_id is required");
  if (!actorUserId) return failure(401, "Authenticated user is required");

  const expiresInDays =
    typeof params.expiresInDays === "number" ? params.expiresInDays : 7;
  const ttlError = validateInviteTtl(expiresInDays);
  if (ttlError) return ttlError;

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

  const invitedEmail = params.invitedEmail?.trim() || undefined;
  const personalMessage = params.personalMessage?.trim() || undefined;
  const { data: invite, error: inviteError } = await params.supabase
    .from("invites")
    .insert({
      token,
      household_id: householdId,
      inviter_id: actorUserId,
      invited_email: invitedEmail,
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
    email_sent: !!invitedEmail,
    household_name: resolvedHouseholdName,
  };
}

function validateInviteTtl(expiresInDays: number): CreateHouseholdInviteResult | null {
  const maxTTLDays = 30;
  if (expiresInDays === 0) return null;
  if (expiresInDays > maxTTLDays) {
    return failure(400, `Invite expiry cannot exceed ${maxTTLDays} days`);
  }
  if (expiresInDays < 1) {
    return failure(400, "Invite expiry must be at least 1 day or 0 for unlimited");
  }
  return null;
}

async function sendInviteEmail(params: {
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

  const { html, text, subject } = householdInviteTemplate({
    inviteUrl: params.inviteUrl,
    personalMessage: params.personalMessage,
    inviterName: params.inviterName,
    householdName: params.householdName,
  });

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
