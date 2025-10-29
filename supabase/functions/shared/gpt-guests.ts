import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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

  const headerConversation =
    headers.get("openai-conversation-id") ??
    headers.get("OpenAI-Conversation-Id") ??
    null;

  const headerEphemeral =
    headers.get("openai-ephemeral-user-id") ??
    headers.get("OpenAI-Ephemeral-User-Id") ??
    null;

  const conversationId =
    normalizeId(headerConversation) ??
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
    throw new Error(`Failed to look up guest contact: ${contactLookupError.message}`);
  }

  let userId = existingContact?.user_id ?? null;

  if (!userId) {
    const { data: existingUser, error: existingUserError } = await supabase
      .from("users")
      .select("id")
      .eq("email", guestEmail)
      .maybeSingle();

    if (existingUserError) {
      throw new Error(`Failed to check for existing guest user: ${existingUserError.message}`);
    }

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const timestamp = new Date().toISOString();
      const { data: insertedUser, error: insertUserError } = await supabase
        .from("users")
        .insert({
          email: guestEmail,
          full_name: "GPT Guest",
          created_at: timestamp,
          updated_at: timestamp,
        })
        .select("id")
        .single();

      if (insertUserError) {
        throw new Error(`Failed to create guest user: ${insertUserError.message}`);
      }

      userId = insertedUser.id;
      createdUser = true;
    }
  }

  let contactId = existingContact?.id ?? null;

  if (!contactId) {
    const { data: newContact, error: createContactError } = await supabase
      .from("user_contacts")
      .insert({
        phone_e164: guestPhone,
        whatsapp_user_id: guestPhone,
        user_id: userId,
        verified: false,
        preferred_currency: currency,
      })
      .select("id")
      .single();

    if (createContactError) {
      throw new Error(`Failed to create guest contact: ${createContactError.message}`);
    }

    contactId = newContact.id;
    createdContact = true;
  } else if (!existingContact?.user_id) {
    const { error: updateContactError } = await supabase
      .from("user_contacts")
      .update({ user_id: userId })
      .eq("id", contactId);

    if (updateContactError) {
      throw new Error(`Failed to attach user to guest contact: ${updateContactError.message}`);
    }
  } else if (currency && existingContact.preferred_currency !== currency) {
    const { error: updateCurrencyError } = await supabase
      .from("user_contacts")
      .update({ preferred_currency: currency })
      .eq("id", contactId);

    if (updateCurrencyError) {
      throw new Error(`Failed to update guest currency: ${updateCurrencyError.message}`);
    }
  }

  return {
    userId,
    contactId: contactId!,
    createdUser,
    createdContact,
  };
}
