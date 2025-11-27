import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

export type SupabaseClient = ReturnType<typeof createClient>;

export async function updatePreferredCurrency(
  supabase: SupabaseClient,
  contactId: string,
  currency: string
) {
  return supabase
    .from("user_contacts")
    .update({ preferred_currency: currency, updated_at: new Date().toISOString() })
    .eq("id", contactId)
    .select("preferred_currency")
    .single();
}
