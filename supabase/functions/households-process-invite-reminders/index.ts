import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";
import {
  inviteReminderInviteeTemplate,
  inviteReminderInviterTemplate,
} from "../shared/email-templates.ts";
import { sendEmail } from "../shared/email-service.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const appUrl = Deno.env.get("APP_URL") || "https://moneko.io";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface ProcessInviteRemindersRequest {
  source?: string; // 'cron' or 'manual'
  max_batch_size?: number; // Maximum invites to process in one run
}

interface ProcessingResult {
  success: boolean;
  processed: number;
  skipped: number;
  errors: Array<{
    invite_id: string;
    error: string;
  }>;
  notifications_created: {
    inviter: number;
    invitee: number;
  };
  execution_time_ms: number;
}

interface EligibleInvite {
  id: string;
  token: string;
  household_id: string;
  household_name: string;
  inviter_id: string;
  inviter_name: string;
  invited_email: string | null;
  invited_user_id: string | null;
  invitee_name: string | null;
  expires_at: string | null;
  created_at: string;
  reminder_count: number;
  last_reminder_sent_at: string | null;
  personal_message: string | null;
}

/**
 * Determines the reminder tier for an invite based on its age and reminder count
 * Tier 1: 3 days old, no reminders yet
 * Tier 2: 7 days old, only 1 reminder sent
 * Tier 3: Expiring soon (2 days before expiration)
 */
function determineReminderTier(invite: EligibleInvite): number | null {
  const now = new Date();
  const createdAt = new Date(invite.created_at);
  const daysSinceCreated = (now.getTime() - createdAt.getTime()) /
    (1000 * 60 * 60 * 24);

  // Tier 3: Expiring soon (2 days before expiration)
  if (invite.expires_at) {
    const expiresAt = new Date(invite.expires_at);
    const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) /
      (1000 * 60 * 60 * 24);

    if (daysUntilExpiry > 0 && daysUntilExpiry <= 2) {
      return 3;
    }
  }

  // Tier 2: 7 days old, only 1 reminder sent
  if (daysSinceCreated >= 7 && invite.reminder_count === 1) {
    return 2;
  }

  // Tier 1: 3 days old, no reminders yet
  if (daysSinceCreated >= 3 && invite.reminder_count === 0) {
    return 1;
  }

  return null;
}

/**
 * Checks if enough time has passed since the last reminder (minimum 72 hours)
 */
function canSendReminder(lastReminderSentAt: string | null): boolean {
  if (!lastReminderSentAt) {
    return true; // No reminder sent yet
  }

  const now = new Date();
  const lastSent = new Date(lastReminderSentAt);
  const hoursSinceLastReminder = (now.getTime() - lastSent.getTime()) /
    (1000 * 60 * 60);

  return hoursSinceLastReminder >= 72;
}

/**
 * Queries the database for invites eligible for reminders
 */
async function getEligibleInvites(
  maxBatchSize: number,
): Promise<EligibleInvite[]> {
  const { data, error } = await supabase
    .from("invites")
    .select(
      `
      id,
      token,
      household_id,
      inviter_id,
      invited_email,
      invited_user_id,
      expires_at,
      created_at,
      reminder_count,
      last_reminder_sent_at,
      personal_message,
      households!inner(name),
      inviter:auth.users!invites_inviter_id_fkey(
        raw_user_meta_data
      ),
      invitee:auth.users!invites_invited_user_id_fkey(
        raw_user_meta_data
      )
    `,
    )
    .eq("status", "pending")
    .lt("reminder_count", 3)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .limit(maxBatchSize);

  if (error) {
    console.error("Error fetching eligible invites:", error);
    throw new Error(`Failed to fetch eligible invites: ${error.message}`);
  }

  // Transform the data to a cleaner structure
  const eligibleInvites: EligibleInvite[] = (data || []).map((invite: any) => ({
    id: invite.id,
    token: invite.token,
    household_id: invite.household_id,
    household_name: invite.households?.name || "Unknown Household",
    inviter_id: invite.inviter_id,
    inviter_name: invite.inviter?.raw_user_meta_data?.full_name || "Someone",
    invited_email: invite.invited_email,
    invited_user_id: invite.invited_user_id,
    invitee_name: invite.invitee?.raw_user_meta_data?.full_name || null,
    expires_at: invite.expires_at,
    created_at: invite.created_at,
    reminder_count: invite.reminder_count,
    last_reminder_sent_at: invite.last_reminder_sent_at,
    personal_message: invite.personal_message,
  }));

  return eligibleInvites;
}

/**
 * Checks if the invitee is already a member of the household
 */
async function isUserAlreadyMember(
  householdId: string,
  userId: string | null,
): Promise<boolean> {
  if (!userId) {
    return false; // No user ID, can't be a member yet
  }

  const { data, error } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .single();

  return !error && data !== null;
}

/**
 * Creates notification events for an invite reminder
 */
async function createReminderNotifications(
  invite: EligibleInvite,
  reminderTier: number,
): Promise<{ inviterNotified: boolean; inviteeNotified: boolean }> {
  const notifications: any[] = [];

  // Determine who to notify based on tier
  const notifyInviter = reminderTier === 1 || reminderTier === 3; // Tier 1 and 3
  const notifyInvitee = true; // All tiers

  const deepLinkAppScheme = "moneko://";
  const inviteWebUrl = `${appUrl}/invites/${invite.token}`;

  // Create notification for inviter (push)
  if (notifyInviter) {
    notifications.push({
      household_id: invite.household_id,
      user_id: invite.inviter_id,
      event_type: "invite_reminder_inviter",
      payload: {
        invite_id: invite.id,
        household_id: invite.household_id,
        household_name: invite.household_name,
        inviter_id: invite.inviter_id,
        inviter_name: invite.inviter_name,
        invited_email: invite.invited_email,
        invited_user_id: invite.invited_user_id,
        invitee_name: invite.invitee_name,
        expires_at: invite.expires_at,
        reminder_tier: reminderTier,
        deep_link:
          `${deepLinkAppScheme}household/${invite.household_id}/settings?tab=2`,
      },
      created_at: new Date().toISOString(),
    });
  }

  // Create notification for invitee (push only when a user_id exists)
  if (notifyInvitee && invite.invited_user_id) {
    notifications.push({
      household_id: invite.household_id,
      user_id: invite.invited_user_id,
      event_type: "invite_reminder_invitee",
      payload: {
        invite_id: invite.id,
        invite_token: invite.token,
        household_id: invite.household_id,
        household_name: invite.household_name,
        inviter_id: invite.inviter_id,
        inviter_name: invite.inviter_name,
        invited_email: invite.invited_email,
        invited_user_id: invite.invited_user_id,
        invitee_name: invite.invitee_name,
        expires_at: invite.expires_at,
        reminder_tier: reminderTier,
        personal_message: invite.personal_message,
        deep_link: `${deepLinkAppScheme}households/join?token=${
          encodeURIComponent(invite.token)
        }`,
      },
      created_at: new Date().toISOString(),
    });
  }

  // Email-only invites: send reminder emails instead of creating notification_events rows.
  // This avoids push delivery failures due to NULL user_id.
  if (notifyInvitee && !invite.invited_user_id && invite.invited_email) {
    const daysSinceInvite = Math.max(
      1,
      Math.floor(
        (Date.now() - new Date(invite.created_at).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    const daysUntilExpiry = invite.expires_at
      ? Math.max(
        0,
        Math.ceil(
          (new Date(invite.expires_at).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
      : undefined;

    // Invitee reminder
    const inviteeEmail = invite.invited_email;
    const inviteeName = invite.invitee_name || undefined;
    const { html, text, subject } = inviteReminderInviteeTemplate({
      inviteeName,
      inviterName: invite.inviter_name,
      householdName: invite.household_name,
      inviteUrl: inviteWebUrl,
      personalMessage: invite.personal_message || undefined,
      daysSinceInvite,
      daysUntilExpiry,
      reminderTier: reminderTier as 1 | 2 | 3,
    });

    const inviteeSend = await sendEmail({
      to: inviteeEmail,
      subject,
      html,
      text,
    });

    if (!inviteeSend.success) {
      throw new Error(
        `Failed to send invitee reminder email: ${inviteeSend.error}`,
      );
    }

    // Optional: also email the inviter (tier 1 and 3) if we have an address.
    if (notifyInviter) {
      const { data: inviterUser } = await supabase.auth.admin.getUserById(
        invite.inviter_id,
      );
      const inviterEmail = inviterUser.user?.email;

      if (inviterEmail) {
        const {
          html: iHtml,
          text: iText,
          subject: iSubject,
        } = inviteReminderInviterTemplate({
          inviterName: invite.inviter_name,
          inviteeName: invite.invited_email,
          householdName: invite.household_name,
          inviteUrl: inviteWebUrl,
          daysSinceInvite,
          reminderTier: reminderTier as 1 | 2 | 3,
        });

        const inviterSend = await sendEmail({
          to: inviterEmail,
          subject: iSubject,
          html: iHtml,
          text: iText,
        });

        if (!inviterSend.success) {
          throw new Error(
            `Failed to send inviter reminder email: ${inviterSend.error}`,
          );
        }
      }
    }
  }

  // Insert notifications in a single batch
  if (notifications.length > 0) {
    const { error } = await supabase
      .from("notification_events")
      .insert(notifications);

    if (error) {
      console.error("Error creating notification events:", error);
      throw new Error(`Failed to create notifications: ${error.message}`);
    }
  }

  return {
    inviterNotified: notifyInviter,
    inviteeNotified: notifyInvitee && invite.invited_user_id !== null,
  };
}

/**
 * Updates the invite's reminder tracking columns
 */
async function updateInviteReminderTracking(inviteId: string): Promise<void> {
  const { data, error } = await supabase.rpc(
    "increment_invite_reminder_tracking",
    {
      p_invite_id: inviteId,
    },
  );

  if (error) {
    console.error("Error updating invite reminder tracking:", error);
    throw new Error(`Failed to update invite: ${error.message}`);
  }

  // If RPC returns false, it means invite was not updated (e.g., invite missing)
  if (data !== true) {
    throw new Error("Failed to update invite reminder tracking");
  }
}

/**
 * Processes a single invite and creates reminder notifications
 */
async function processInvite(invite: EligibleInvite): Promise<{
  success: boolean;
  error?: string;
  inviterNotified: boolean;
  inviteeNotified: boolean;
}> {
  try {
    // Check if user is already a member
    if (invite.invited_user_id) {
      const alreadyMember = await isUserAlreadyMember(
        invite.household_id,
        invite.invited_user_id,
      );
      if (alreadyMember) {
        return {
          success: false,
          error: "User is already a household member",
          inviterNotified: false,
          inviteeNotified: false,
        };
      }
    }

    // Check if enough time has passed since last reminder
    if (!canSendReminder(invite.last_reminder_sent_at)) {
      return {
        success: false,
        error: "Too soon since last reminder (minimum 72 hours)",
        inviterNotified: false,
        inviteeNotified: false,
      };
    }

    // Determine reminder tier
    const reminderTier = determineReminderTier(invite);
    if (reminderTier === null) {
      return {
        success: false,
        error: "Not yet eligible for any reminder tier",
        inviterNotified: false,
        inviteeNotified: false,
      };
    }

    // Create notification events
    const { inviterNotified, inviteeNotified } =
      await createReminderNotifications(invite, reminderTier);

    // Update invite tracking
    await updateInviteReminderTracking(invite.id);

    console.log(
      `Successfully processed invite ${invite.id} (Tier ${reminderTier})`,
    );

    return {
      success: true,
      inviterNotified,
      inviteeNotified,
    };
  } catch (error) {
    console.error(`Error processing invite ${invite.id}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      inviterNotified: false,
      inviteeNotified: false,
    };
  }
}

/**
 * Main handler function
 */
serve(async (req: Request) => {
  const startTime = Date.now();
  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify authorization
    // This function is intended to be called by pg_cron using the service role key.
    // Treat any other caller as unauthorized.
    const authHeader = req.headers.get("Authorization") || "";
    const expected = `Bearer ${supabaseServiceRoleKey}`;

    if (authHeader !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body: ProcessInviteRemindersRequest = await req.json();
    const maxBatchSize = body.max_batch_size || 100;
    const source = body.source || "manual";

    console.log(
      `Starting invitation reminder processing (source: ${source}, max batch: ${maxBatchSize})`,
    );

    // Fetch eligible invites
    const eligibleInvites = await getEligibleInvites(maxBatchSize);
    console.log(`Found ${eligibleInvites.length} potentially eligible invites`);

    // Process each invite
    const result: ProcessingResult = {
      success: true,
      processed: 0,
      skipped: 0,
      errors: [],
      notifications_created: {
        inviter: 0,
        invitee: 0,
      },
      execution_time_ms: 0,
    };

    for (const invite of eligibleInvites) {
      const processResult = await processInvite(invite);

      if (processResult.success) {
        result.processed++;
        if (processResult.inviterNotified) {
          result.notifications_created.inviter++;
        }
        if (processResult.inviteeNotified) {
          result.notifications_created.invitee++;
        }
      } else {
        result.skipped++;
        if (processResult.error) {
          result.errors.push({
            invite_id: invite.id,
            error: processResult.error,
          });
        }
      }
    }

    result.execution_time_ms = Date.now() - startTime;

    console.log(
      `Processing complete: ${result.processed} processed, ${result.skipped} skipped, ${result.errors.length} errors`,
    );
    console.log(
      `Notifications created: ${result.notifications_created.inviter} inviter, ${result.notifications_created.invitee} invitee`,
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fatal error in invitation reminder processing:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        execution_time_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
