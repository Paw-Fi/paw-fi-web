import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { reportEdgeFunctionError } from "./edge-error-alert.ts";

export interface GptDetectionResult {
  isGpt: boolean;
  conversationId?: string;
  ephemeralUserId?: string;
}

export interface EnsureGuestIdentityOptions {
  supabase: SupabaseClient;
  conversationId: string;
  currency?: string | null;
}

export interface EnsureGuestIdentityResult {
  userId: string;
  contactId: string;
  createdUser: boolean;
  createdContact: boolean;
}

const GPT_PHONE_PREFIX = "gpt:";
const GPT_EMAIL_DOMAIN = "guest.moneko";

function normalizeId(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function detectGptRequest(req: Request): GptDetectionResult {
  const headers = req.headers;

  const headerConversation = headers.get("openai-conversation-id") ??
    headers.get("OpenAI-Conversation-Id") ??
    null;

  const headerEphemeral = headers.get("openai-ephemeral-user-id") ??
    headers.get("OpenAI-Ephemeral-User-Id") ??
    null;

  const conversationId = normalizeId(headerConversation) ??
    normalizeId(headerEphemeral);

  const isGpt = Boolean(conversationId);

  return {
    isGpt,
    conversationId,
    ephemeralUserId: normalizeId(headerEphemeral),
  };
}

export async function ensureGuestIdentity(
  options: EnsureGuestIdentityOptions,
): Promise<EnsureGuestIdentityResult> {
  const { supabase, conversationId } = options;
  const currency = options.currency?.toUpperCase?.() ?? null;
  const guestPhone = `${GPT_PHONE_PREFIX}${conversationId}`;
  const guestEmail = `gpt-${conversationId}@${GPT_EMAIL_DOMAIN}`;
  let createdUser = false;
  let createdContact = false;

  const { data: existingContact, error: contactLookupError } = await supabase
    .from("user_contacts")
    .select("id, user_id, preferred_currency")
    .eq("phone_e164", guestPhone)
    .maybeSingle();

  if (contactLookupError) {
    await reportEdgeFunctionError({
      functionName: "shared/gpt-guests",
      error: contactLookupError,
      context: {
        operation: "user_contacts.select_guest_contact",
        conversationId,
      },
    });
    throw new Error(
      `Failed to look up guest contact: ${contactLookupError.message}`,
    );
  }

  let userId = existingContact?.user_id ?? null;

  if (!userId) {
    // For GPT guests, we don't use email authentication - conversationId is the only identifier
    // We create a simple auth user entry using the conversationId directly
    try {
      // Use conversationId as the unique identifier for auth users
      const guestId = `gpt-${conversationId}`;

      // Check if auth user already exists by looking for users with this conversation_id in metadata
      const { data: existingUsers, error: authUserError } = await supabase.auth
        .admin.listUsers({
          page: 1,
          perPage: 1000,
        });

      if (authUserError) {
        throw new Error(`Failed to check auth user: ${authUserError.message}`);
      }

      const existingAuthUser = existingUsers.users.find(
        (user) => user.user_metadata?.conversation_id === conversationId,
      );

      if (existingAuthUser) {
        userId = existingAuthUser.id;
        console.log(
          `[ensureGuestIdentity] Found existing auth user for conversation ${conversationId}`,
        );
      } else {
        // Create auth user for GPT guest with conversationId as the primary identifier
        const { data: createdAuthUser, error: createAuthError } = await supabase
          .auth.admin.createUser({
            email: `${guestId}@guest.moneko`, // Required field but not used for authentication
            email_confirm: true,
            user_metadata: {
              full_name: "GPT Guest",
              conversation_id: conversationId,
              is_guest: true,
              phone_e164: guestPhone,
            },
          });

        if (createAuthError) {
          throw new Error(
            `Failed to create auth guest user: ${createAuthError.message}`,
          );
        }

        userId = createdAuthUser.user.id;
        createdUser = true;
        console.log(
          `[ensureGuestIdentity] Created new auth user for conversation ${conversationId}`,
        );
      }
    } catch (authError) {
      console.error(
        `[ensureGuestIdentity] Auth operation failed for conversation ${conversationId}:`,
        authError,
      );
      const message = authError instanceof Error
        ? authError.message
        : String(authError);
      throw new Error(`Auth system error: ${message}`);
    }
  }

  let contactId = existingContact?.id ?? null;

  if (!contactId) {
    const { data: newContact, error: createContactError } = await supabase
      .from("user_contacts")
      .upsert(
        {
          phone_e164: guestPhone,
          whatsapp_user_id: guestPhone,
          user_id: userId,
          verified: false,
          preferred_currency: currency,
        },
        { onConflict: "user_id" },
      )
      .select("id")
      .single();

    if (createContactError) {
      await reportEdgeFunctionError({
        functionName: "shared/gpt-guests",
        error: createContactError,
        context: {
          operation: "user_contacts.upsert_guest_contact",
          conversationId,
          userId,
        },
      });
      throw new Error(
        `Failed to create guest contact: ${createContactError.message}`,
      );
    }

    contactId = newContact.id;
    createdContact = true;
  } else if (!existingContact?.user_id) {
    const { data: existingUserContact, error: userContactLookupError } =
      await supabase
        .from("user_contacts")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

    if (userContactLookupError) {
      await reportEdgeFunctionError({
        functionName: "shared/gpt-guests",
        error: userContactLookupError,
        context: {
          operation: "user_contacts.select_existing_user_contact",
          conversationId,
          userId,
        },
      });
      throw new Error(
        `Failed to look up guest user contact: ${userContactLookupError.message}`,
      );
    }

    if (existingUserContact?.id && existingUserContact.id !== contactId) {
      const { data: mergeResult, error: mergeError } = await supabase.rpc(
        "merge_user_contacts",
        {
          p_primary_contact_id: contactId,
          p_secondary_contact_id: existingUserContact.id,
        },
      );

      if (mergeError || mergeResult?.success === false) {
        await reportEdgeFunctionError({
          functionName: "shared/gpt-guests",
          error: mergeError ?? mergeResult,
          context: {
            operation: "user_contacts.merge_guest_contact",
            conversationId,
            userId,
            contactId,
            existingUserContactId: existingUserContact.id,
          },
        });
        throw new Error(
          `Failed to merge guest contact: ${
            mergeError?.message ?? mergeResult?.error ?? "unknown error"
          }`,
        );
      }
    } else {
      const { error: updateContactError } = await supabase
        .from("user_contacts")
        .update({ user_id: userId })
        .eq("id", contactId);

      if (updateContactError) {
        await reportEdgeFunctionError({
          functionName: "shared/gpt-guests",
          error: updateContactError,
          context: {
            operation: "user_contacts.attach_guest_user",
            conversationId,
            userId,
            contactId,
          },
        });
        throw new Error(
          `Failed to attach user to guest contact: ${updateContactError.message}`,
        );
      }
    }
  } else if (currency && existingContact.preferred_currency !== currency) {
    const { error: updateCurrencyError } = await supabase
      .from("user_contacts")
      .update({ preferred_currency: currency })
      .eq("id", contactId);

    if (updateCurrencyError) {
      await reportEdgeFunctionError({
        functionName: "shared/gpt-guests",
        error: updateCurrencyError,
        context: {
          operation: "user_contacts.update_guest_currency",
          conversationId,
          userId,
          contactId,
        },
      });
      throw new Error(
        `Failed to update guest currency: ${updateCurrencyError.message}`,
      );
    }
  }

  return {
    userId,
    contactId: contactId!,
    createdUser,
    createdContact,
  };
}
