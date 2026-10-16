import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export function resolveEmailLanguage(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "en";
  const parts = value.trim().replaceAll("_", "-").split("-");
  const primary = parts[0].toLowerCase();
  parts[0] = primary === "kr" ? "ko" : primary === "cn" ? "zh" : primary;
  try {
    const locale = new Intl.Locale(parts.join("-"));
    if (locale.language === "zh" && locale.maximize().script === "Hant") {
      return "zh-TW";
    }
    return [
        "en",
        "de",
        "es",
        "fr",
        "it",
        "ja",
        "ko",
        "nl",
        "ru",
        "th",
        "uk",
        "ur",
        "vi",
        "zh",
      ]
        .includes(locale.language)
      ? locale.language
      : "en";
  } catch {
    return "en";
  }
}

export async function loadRecipientEmailLanguageWithClient(
  client: Pick<SupabaseClient, "from">,
  email: string,
): Promise<string> {
  const { data: user, error: userError } = await client.from("users")
    .select("id").eq("email", email.trim().toLowerCase()).maybeSingle();
  if (userError) throw new Error("Email recipient lookup failed");
  if (!user) return "en";
  const { data: contact, error: contactError } = await client.from(
    "user_contacts",
  )
    .select("preferred_language").eq("user_id", user.id)
    .order("id", { ascending: false }).limit(1).maybeSingle();
  if (contactError) throw new Error("Email language lookup failed");
  return resolveEmailLanguage(contact?.preferred_language);
}

// An explicit account wins over mailbox lookup (verified receipt senders may
// deliver to several accounts, each with its own language preference).
export async function loadRecipientEmailLanguage(
  email: string,
  userId?: string,
): Promise<string> {
  const baseUrl = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!baseUrl || !key) {
    throw new Error("Email language lookup is not configured");
  }
  const read = async (table: string, query: Record<string, string>) => {
    const url = new URL(`/rest/v1/${table}`, baseUrl);
    url.search = new URLSearchParams(query).toString();
    const response = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`Email language lookup failed (${response.status})`);
    }
    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) {
      throw new Error("Invalid email language lookup response");
    }
    return rows as Record<string, unknown>[];
  };
  let actor = userId;
  if (!actor) {
    const users = await read("users", {
      select: "id",
      email: `eq.${email.trim().toLowerCase()}`,
      limit: "2",
    });
    if (users.length > 1) throw new Error("Ambiguous email recipient account");
    if (!users.length) return "en";
    if (typeof users[0].id !== "string") {
      throw new Error("Invalid email recipient account");
    }
    actor = users[0].id;
  }
  const contacts = await read("user_contacts", {
    select: "preferred_language",
    user_id: `eq.${actor}`,
    order: "id.desc",
    limit: "1",
  });
  return resolveEmailLanguage(contacts[0]?.preferred_language);
}
