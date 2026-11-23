import type { BotSpaceMeta } from "./household-utils.ts";
// Only channel code supplies the actor, after verifying the caller.
export async function readChatFinance(
  supabase: {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => PromiseLike<{ data: any; error: unknown }>;
  },
  userId: string,
  view: string,
  space: string | null,
  args: Record<string, unknown> = {},
) {
  const { data, error } = await supabase.rpc("read_chat_finance_v1", {
    p_actor: userId,
    p_read: view,
    p_space: space,
    p_args: args,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Unable to read the requested financial records.");
  }
  return data;
}

export async function loadFinanceSpaces(
  supabase: Parameters<typeof readChatFinance>[0],
  userId: string,
) {
  const { spaces } = await readChatFinance(supabase, userId, "spaces", null);
  if (!Array.isArray(spaces)) {
    throw new Error("Unable to load accessible Spaces");
  }
  const map = new Map<string, BotSpaceMeta>();
  const ambiguousNames = new Set<string>();
  for (const space of spaces) {
    const meta = {
      id: space.id,
      name: space.name,
      isPortfolio: space.is_portfolio === true,
    };
    map.set(meta.id, meta);
    const name = meta.name.trim().toLowerCase();
    if (map.has(name)) ambiguousNames.add(name);
    map.set(name, meta);
  }
  for (const name of ambiguousNames) map.delete(name);
  return map;
}
