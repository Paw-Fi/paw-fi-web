import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import { sendEmail } from "../shared/email-service.ts";
import { htmlToText } from "../shared/email-html-to-text.ts";
import {
  baseTemplate,
  mobileDownloadCtasHtml,
  renderFooter,
} from "../shared/email-layout.ts";
import { escapeHtml, sanitizeSubject } from "../shared/email-utils.ts";
import {
  hasActiveHouseholdSubscriptionAccess,
  hasReachedHouseholdSubscriptionGrantLimit,
  HOUSEHOLD_SUBSCRIPTION_GRANT_LIMIT,
} from "../shared/household-subscription-sharing.ts";
import { fetchLatestUserContact } from "../shared/user-contacts.ts";
import { resolveUserDisplayName } from "../shared/user-display-name.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface AcceptInviteRequest {
  token: string;
}

interface AcceptInviteResponse {
  success: boolean;
  household_id?: string;
  member_id?: string;
  error?: string;
}

interface SubscriptionBindingEmailContext {
  plan: string;
  grantOwnerUserId: string;
  grantedUserCount: number;
  remainingGrantCount: number;
}

serve(async (req) => {
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

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get the user from the JWT token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse request body
    const body: AcceptInviteRequest = await req.json();
    const { token } = body;

    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the invite
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .select("*")
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: "Invalid invitation token" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate invite status and expiry
    if (invite.status === "accepted") {
      // Idempotent: if already accepted by this user, return success
      if (invite.invited_user_id === user.id) {
        const { data: existingMember } = await supabase
          .from("household_members")
          .select("id, household_id")
          .eq("household_id", invite.household_id)
          .eq("user_id", user.id)
          .single();

        if (existingMember) {
          return new Response(
            JSON.stringify({
              success: true,
              household_id: existingMember.household_id,
              member_id: existingMember.id,
            } as AcceptInviteResponse),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }

      return new Response(
        JSON.stringify({ error: "This invitation has already been accepted" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (invite.status === "revoked") {
      return new Response(
        JSON.stringify({ error: "This invitation has been revoked" }),
        {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (
      invite.status === "expired" ||
      (invite.expires_at && new Date(invite.expires_at) < new Date())
    ) {
      return new Response(
        JSON.stringify({ error: "This invitation has expired" }),
        {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const inviterUserId = invite.inviter_user_id ?? invite.inviter_id ?? null;

    const { data: inviteeContact, error: inviteeContactError } =
      await fetchLatestUserContact(supabase, user.id);

    if (inviteeContactError) {
      console.error(
        "[accept-invite] Error fetching invitee contact:",
        inviteeContactError,
      );
      await reportEdgeFunctionError({
        functionName: "households-accept-invite",
        error: inviteeContactError,
        context: {
          inviteId: invite?.id,
          step: "fetch-invitee-contact",
          userId: user.id,
        },
      });
      throw inviteeContactError;
    }

    const inviteeContactId = inviteeContact?.id;

    if (
      inviteeContactId &&
      inviteeContact?.preferred_currency == null &&
      inviterUserId
    ) {
      const { data: inviterContact, error: inviterContactError } =
        await fetchLatestUserContact<{ preferred_currency: string | null }>(
          supabase,
          inviterUserId,
          "preferred_currency",
        );

      if (inviterContactError) {
        console.error(
          "[accept-invite] Error fetching inviter contact:",
          inviterContactError,
        );
        await reportEdgeFunctionError({
          functionName: "households-accept-invite",
          error: inviterContactError,
          context: {
            inviterUserId,
            inviteId: invite?.id,
            step: "fetch-inviter-contact",
            userId: user.id,
          },
        });
        throw inviterContactError;
      }

      if (inviterContact?.preferred_currency) {
        const { error: updateContactError } = await supabase
          .from("user_contacts")
          .update({ preferred_currency: inviterContact.preferred_currency })
          .eq("id", inviteeContactId)
          .is("preferred_currency", null);

        if (updateContactError) {
          console.error(
            "[accept-invite] Error updating invitee preferred currency:",
            updateContactError,
          );
          await reportEdgeFunctionError({
            functionName: "households-accept-invite",
            error: updateContactError,
            context: {
              inviteId: invite?.id,
              inviterUserId,
              step: "update-invitee-preferred-currency",
              userId: user.id,
            },
          });
          throw updateContactError;
        }
      }
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("household_members")
      .select("id")
      .eq("household_id", invite.household_id)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      return new Response(
        JSON.stringify({ error: "You are already a member of this household" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Begin transaction-like operations
    // 1. Create household member
    const { data: newMember, error: memberError } = await supabase
      .from("household_members")
      .insert({
        household_id: invite.household_id,
        user_id: user.id,
        role: "admin",
      })
      .select()
      .single();

    if (memberError) {
      console.error("Error creating household member:", memberError);
      return new Response(
        JSON.stringify({ error: "Failed to join household" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2. Update invite status
    const { error: updateError } = await supabase
      .from("invites")
      .update({
        status: "accepted",
        invited_user_id: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    if (updateError) {
      console.error("Error updating invite status:", updateError);
      // Rollback: remove the member
      await supabase.from("household_members").delete().eq("id", newMember.id);

      return new Response(
        JSON.stringify({ error: "Failed to update invitation status" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let subscriptionBindingEmailContext: SubscriptionBindingEmailContext | null =
      null;

    // 3. Bind user to household owner's subscription if applicable
    console.log(
      `[accept-invite] Attempting to bind user ${user.id} to household ${invite.household_id} subscription`,
    );

    try {
      // Get household owner to check their subscription
      const { data: household, error: householdError } = await supabase
        .from("households")
        .select("owner_id")
        .eq("id", invite.household_id)
        .single();

      if (householdError || !household) {
        console.error(
          "[accept-invite] Error fetching household:",
          householdError,
        );
      } else {
        console.log(`[accept-invite] Household owner: ${household.owner_id}`);

        // Check owner's subscription
        const { data: ownerSub, error: ownerSubError } = await supabase
          .from("subscriptions")
          .select(
            "plan, status, user_id, bound_to_user_id, stripe_customer_id, billing_interval, current_period_end, trial_start, trial_end",
          )
          .eq("user_id", household.owner_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ownerSubError) {
          console.error(
            "[accept-invite] Error checking owner subscription:",
            ownerSubError,
          );
        } else if (!ownerSub) {
          console.log(
            "[accept-invite] Owner has no subscription - member will not get bound access",
          );
        } else {
          console.log(`[accept-invite] Owner subscription:`, {
            plan: ownerSub.plan,
            status: ownerSub.status,
            billing_interval: ownerSub.billing_interval,
            stripe_customer_id: ownerSub.stripe_customer_id,
            bound_to_user_id: ownerSub.bound_to_user_id,
            trial_start: ownerSub.trial_start,
            trial_end: ownerSub.trial_end,
            current_period_end: ownerSub.current_period_end,
          });

          // Check if owner has active subscription
          const ownerHasActiveSubscription =
            hasActiveHouseholdSubscriptionAccess(ownerSub);

          if (ownerHasActiveSubscription) {
            console.log(
              "[accept-invite] Owner has active subscription - binding new member",
            );

            const subscriptionGrantOwnerId =
              ownerSub.bound_to_user_id ?? household.owner_id;

            const { count: grantedUserCount, error: grantCountError } =
              await supabase
                .from("subscriptions")
                .select("id", { count: "exact", head: true })
                .eq("bound_to_user_id", subscriptionGrantOwnerId)
                .neq("user_id", user.id);

            const { data: existingGrantedSub, error: existingGrantError } =
              await supabase
                .from("subscriptions")
                .select("id")
                .eq("user_id", user.id)
                .eq("bound_to_user_id", subscriptionGrantOwnerId)
                .maybeSingle();

            if (grantCountError) {
              console.error(
                "[accept-invite] Error checking subscription grant count:",
                grantCountError,
              );
            }

            if (existingGrantError) {
              console.error(
                "[accept-invite] Error checking existing subscription grant:",
                existingGrantError,
              );
            }

            const shouldSkipBindingForGrantCheckError = Boolean(
              grantCountError || existingGrantError,
            );

            const hasReachedGrantLimit =
              !shouldSkipBindingForGrantCheckError &&
              hasReachedHouseholdSubscriptionGrantLimit(
                grantedUserCount ?? 0,
                Boolean(existingGrantedSub),
              );

            if (shouldSkipBindingForGrantCheckError) {
              console.warn(
                "[accept-invite] Skipping subscription binding because grant limit check failed",
              );
            } else if (hasReachedGrantLimit) {
              console.log(
                `[accept-invite] Subscription grant limit reached for owner ${subscriptionGrantOwnerId}; invitee will join without shared subscription access (limit: ${HOUSEHOLD_SUBSCRIPTION_GRANT_LIMIT})`,
              );
            } else {
              // Call RPC to bind
              const { data: bindResult, error: bindError } = await supabase.rpc(
                "bind_user_to_household_subscription",
                {
                  p_user_id: user.id,
                  p_household_id: invite.household_id,
                },
              );

              if (bindError) {
                console.error(
                  "[accept-invite] RPC Error binding user:",
                  bindError,
                );
                console.error("[accept-invite] Error details:", {
                  message: bindError.message,
                  code: bindError.code,
                  details: bindError.details,
                  hint: bindError.hint,
                });
              } else if (bindResult) {
                console.log(
                  `✅ [accept-invite] User ${user.id} successfully bound to household subscription`,
                );

                // Verify the binding by checking if subscription was created
                const { data: newSubCheck } = await supabase
                  .from("subscriptions")
                  .select(
                    "plan, status, bound_to_user_id, bound_to_household_id, stripe_customer_id, billing_interval, current_period_end, trial_start, trial_end",
                  )
                  .eq("user_id", user.id)
                  .maybeSingle();

                if (newSubCheck) {
                  const { count: updatedGrantedUserCount } = await supabase
                    .from("subscriptions")
                    .select("id", { count: "exact", head: true })
                    .eq("bound_to_user_id", subscriptionGrantOwnerId);
                  const safeGrantedUserCount = Math.min(
                    updatedGrantedUserCount ?? (grantedUserCount ?? 0) + 1,
                    HOUSEHOLD_SUBSCRIPTION_GRANT_LIMIT,
                  );

                  if (inviterUserId === subscriptionGrantOwnerId) {
                    subscriptionBindingEmailContext = {
                      plan: String(newSubCheck.plan ?? ownerSub.plan ?? "plus"),
                      grantOwnerUserId: subscriptionGrantOwnerId,
                      grantedUserCount: safeGrantedUserCount,
                      remainingGrantCount: Math.max(
                        HOUSEHOLD_SUBSCRIPTION_GRANT_LIMIT -
                          safeGrantedUserCount,
                        0,
                      ),
                    };
                  } else {
                    console.log(
                      "[accept-invite] Skipping subscription binding emails because grant owner is not inviter",
                    );
                  }

                  console.log(
                    "[accept-invite] ✅ Verification - Bound subscription created:",
                    {
                      plan: newSubCheck.plan,
                      status: newSubCheck.status,
                      bound_to_user_id: newSubCheck.bound_to_user_id,
                      bound_to_household_id: newSubCheck.bound_to_household_id,
                      stripe_customer_id: newSubCheck.stripe_customer_id,
                      billing_interval: newSubCheck.billing_interval,
                      trial_start: newSubCheck.trial_start,
                      trial_end: newSubCheck.trial_end,
                      current_period_end: newSubCheck.current_period_end,
                    },
                  );
                } else {
                  console.warn(
                    "[accept-invite] WARNING: RPC returned true but no subscription found!",
                  );
                }
              } else {
                console.log(
                  `ℹ️  [accept-invite] RPC returned false - no binding created`,
                );
              }
            }
          } else {
            console.log(
              "[accept-invite] Owner subscription not active - member will not get bound access",
            );
          }
        }
      }
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(
        "[accept-invite] Unexpected error during subscription binding:",
        error,
      );
      console.error("[accept-invite] Error stack:", errorStack);
      // Don't fail the invite acceptance, just log the error
    }

    // 4. Notify ALL household members about new member joining
    console.log("[accept-invite] Step 4: Preparing notifications");

    // Get household name
    const { data: household, error: householdNameError } = await supabase
      .from("households")
      .select("name, owner_id")
      .eq("id", invite.household_id)
      .single();

    if (householdNameError) {
      console.error(
        "[accept-invite] Error fetching household name:",
        householdNameError,
      );
    }

    // Get joining member's full name from users table
    const { data: joiningUser, error: userError } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("id", user.id)
      .single();

    if (userError) {
      console.error(
        "[accept-invite] Error fetching joining user data:",
        userError,
      );
    }

    // Determine member name (prefer full_name, fallback to email local part)
    let memberName = joiningUser?.full_name?.trim();
    if (!memberName || memberName === "") {
      const email = joiningUser?.email || user.email;
      memberName = email ? email.split("@")[0] : "Someone";
    }

    console.log("[accept-invite] Joining member name:", memberName);

    if (subscriptionBindingEmailContext) {
      await sendSubscriptionBindingEmails({
        inviterUserId,
        inviteeEmail: joiningUser?.email || user.email || null,
        inviteeName: memberName,
        householdName: household?.name || "your household",
        binding: subscriptionBindingEmailContext,
      });
    }

    // Get all household members for member_joined notification
    const { data: allMembers, error: membersError } = await supabase
      .from("household_members")
      .select("user_id")
      .eq("household_id", invite.household_id);

    if (membersError) {
      console.error(
        "[accept-invite] Error fetching household members:",
        membersError,
      );
    }

    const notifications: Array<{
      household_id: string;
      user_id: string;
      event_type: string;
      payload: Record<string, any>;
      is_sent: boolean;
    }> = [];

    // 4a. Create member_joined notifications for all existing members (exclude new member)
    if (allMembers && allMembers.length > 0) {
      const memberJoinedPayload = {
        member_id: newMember.id,
        member_email: user.email,
        member_name: memberName,
        household_id: invite.household_id,
        household_name: household?.name || "your household",
      };

      const memberJoinedEvents = allMembers
        .filter((m) => m.user_id !== user.id && m.user_id !== inviterUserId)
        .map((member) => ({
          household_id: invite.household_id,
          user_id: member.user_id,
          event_type: "member_joined",
          payload: memberJoinedPayload,
          is_sent: false,
        }));

      notifications.push(...memberJoinedEvents);
      console.log(
        `[accept-invite] Prepared ${memberJoinedEvents.length} member_joined notifications`,
      );
    }

    // 4b. Create invite_accepted notification for the inviter (if not the new member)
    if (inviterUserId && inviterUserId !== user.id) {
      const inviteAcceptedPayload = {
        invite_id: invite.id,
        member_id: newMember.id,
        member_email: user.email,
        member_name: memberName,
        household_id: invite.household_id,
        household_name: household?.name || "your household",
        inviter_user_id: inviterUserId,
      };

      notifications.push({
        household_id: invite.household_id,
        user_id: inviterUserId,
        event_type: "invite_accepted",
        payload: inviteAcceptedPayload,
        is_sent: false,
      });

      console.log(
        `[accept-invite] Prepared invite_accepted notification for inviter ${inviterUserId}`,
      );
    }

    // 4c. Insert all notifications with error handling
    if (notifications.length > 0) {
      console.log(
        `[accept-invite] Inserting ${notifications.length} total notifications into notification_events table`,
      );
      console.log(
        "[accept-invite] Notification events:",
        JSON.stringify(notifications, null, 2),
      );

      const { data: insertedEvents, error: notificationError } = await supabase
        .from("notification_events")
        .insert(notifications)
        .select();

      if (notificationError) {
        console.error(
          "[accept-invite] ❌ CRITICAL: Failed to insert notification events!",
        );
        console.error("[accept-invite] Error:", notificationError);
        console.error("[accept-invite] Error details:", {
          message: notificationError.message,
          code: notificationError.code,
          details: notificationError.details,
          hint: notificationError.hint,
        });
        // Don't fail the invite acceptance, but log the error for investigation
      } else {
        console.log(
          `[accept-invite] ✅ Successfully inserted ${
            insertedEvents?.length || 0
          } notification events`,
        );
        console.log(
          "[accept-invite] Inserted events:",
          JSON.stringify(insertedEvents, null, 2),
        );
      }
    } else {
      console.log(
        "[accept-invite] No notifications to send (possibly inviting self or no other members)",
      );
    }

    const response: AcceptInviteResponse = {
      success: true,
      household_id: invite.household_id,
      member_id: newMember.id,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

async function sendSubscriptionBindingEmails(params: {
  inviterUserId: string | null;
  inviteeEmail: string | null;
  inviteeName: string;
  householdName: string;
  binding: SubscriptionBindingEmailContext;
}) {
  const planName = formatPlanName(params.binding.plan);

  try {
    const [inviterProfileResult, grantOwnerProfileResult, inviterAuthResult] =
      await Promise.all([
        params.inviterUserId
          ? supabase
              .from("users")
              .select("email, full_name")
              .eq("id", params.inviterUserId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("users")
          .select("email, full_name")
          .eq("id", params.binding.grantOwnerUserId)
          .maybeSingle(),
        params.inviterUserId
          ? supabase.auth.admin.getUserById(params.inviterUserId)
          : Promise.resolve({ data: { user: null }, error: null }),
      ]);

    const inviterProfile = inviterProfileResult.data as {
      email?: string | null;
      full_name?: string | null;
    } | null;
    const grantOwnerProfile = grantOwnerProfileResult.data as {
      email?: string | null;
      full_name?: string | null;
    } | null;
    const inviterAuthUser = inviterAuthResult.data.user;
    const inviterEmail =
      inviterProfile?.email || inviterAuthUser?.email || null;
    const inviterName = resolveUserDisplayName(
      inviterProfile?.full_name,
      inviterEmail,
      "there",
    );
    const grantOwnerName = resolveUserDisplayName(
      grantOwnerProfile?.full_name,
      grantOwnerProfile?.email || null,
      "the subscription owner",
    );
    const isInviterGrantOwner =
      params.inviterUserId === params.binding.grantOwnerUserId;

    if (inviterEmail) {
      const inviterTemplate = buildInviterSubscriptionBindingEmail({
        inviterName,
        inviteeName: params.inviteeName,
        householdName: params.householdName,
        planName,
        grantedUserCount: params.binding.grantedUserCount,
        remainingGrantCount: params.binding.remainingGrantCount,
        grantOwnerName,
        isInviterGrantOwner,
      });
      const inviterSend = await sendEmail({
        to: inviterEmail,
        subject: inviterTemplate.subject,
        html: inviterTemplate.html,
        text: inviterTemplate.text,
      });
      if (!inviterSend.success) {
        console.error(
          "[accept-invite] Failed to send inviter subscription binding email:",
          inviterSend.error,
        );
      }
    }

    if (params.inviteeEmail) {
      const inviteeTemplate = buildInviteeSubscriptionBindingEmail({
        inviteeName: params.inviteeName,
        householdName: params.householdName,
        planName,
        grantOwnerName,
      });
      const inviteeSend = await sendEmail({
        to: params.inviteeEmail,
        subject: inviteeTemplate.subject,
        html: inviteeTemplate.html,
        text: inviteeTemplate.text,
      });
      if (!inviteeSend.success) {
        console.error(
          "[accept-invite] Failed to send invitee subscription binding email:",
          inviteeSend.error,
        );
      }
    }
  } catch (error) {
    console.error(
      "[accept-invite] Unexpected error sending subscription binding emails:",
      error,
    );
  }
}

function buildInviterSubscriptionBindingEmail(data: {
  inviterName: string;
  inviteeName: string;
  householdName: string;
  planName: string;
  grantedUserCount: number;
  remainingGrantCount: number;
  grantOwnerName: string;
  isInviterGrantOwner: boolean;
}) {
  const ownershipText = data.isInviterGrantOwner
    ? "your subscription"
    : `${escapeHtml(data.grantOwnerName)}'s subscription`;
  const remainingText =
    data.remainingGrantCount === 1
      ? "1 more person"
      : `${data.remainingGrantCount} more people`;
  const content = `
    <h1 class="title">${escapeHtml(data.inviteeName)} joined ${escapeHtml(
      data.householdName,
    )}</h1>
    <p class="subtitle">${escapeHtml(data.inviteeName)} now has ${escapeHtml(
      data.planName,
    )} access through ${ownershipText}.</p>
    <p>Your household is using <strong>${data.grantedUserCount}/${HOUSEHOLD_SUBSCRIPTION_GRANT_LIMIT}</strong> shared subscription seats.</p>
    <p>You can still share subscription access with <strong>${escapeHtml(
      remainingText,
    )}</strong> on the current plan.</p>
    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 28px 0;" />
    <p><strong>FAQ: What if I invite more than ${HOUSEHOLD_SUBSCRIPTION_GRANT_LIMIT} users?</strong></p>
    <p>You can invite unlimited people to your household, but only ${HOUSEHOLD_SUBSCRIPTION_GRANT_LIMIT} users can share subscription access with your current plan. Additional members can still join the household; they just keep their own subscription status.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because a household member joined and received shared subscription access.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(
      `${data.inviteeName} joined ${data.householdName} on Moneko`,
    ),
  };
}

function buildInviteeSubscriptionBindingEmail(data: {
  inviteeName: string;
  householdName: string;
  planName: string;
  grantOwnerName: string;
}) {
  const content = `
    <h1 class="title">Your ${escapeHtml(data.planName)} access is ready</h1>
    <p class="subtitle">Hi ${escapeHtml(
      data.inviteeName,
    )}, your subscription access is now bound to ${escapeHtml(
      data.grantOwnerName,
    )}'s ${escapeHtml(data.planName)} plan through ${escapeHtml(
      data.householdName,
    )}.</p>
    <p>Enjoy your Plus benefits in the Moneko app, including WhatsApp and Telegram integrations, email receipt capture, Apple Pay and Android notification capture, and bank sync for US and Canada banks.</p>
    ${mobileDownloadCtasHtml()}
    <p>If you have any questions, just reply to this email and our support team will help.</p>
    <p>The Moneko Team</p>
  `;

  return {
    html: baseTemplate(
      content,
      renderFooter({
        customReason:
          "You're receiving this email because you joined a household with shared subscription access.",
      }),
    ),
    text: htmlToText(content),
    subject: sanitizeSubject(`Your ${data.planName} access is ready`),
  };
}

function formatPlanName(plan: string): string {
  const normalized = plan.trim().toLowerCase();
  if (normalized === "lifetime") return "Moneko Lifetime";
  if (normalized === "plus") return "Moneko Plus";
  if (normalized === "premium") return "Moneko Premium";
  return `Moneko ${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}
