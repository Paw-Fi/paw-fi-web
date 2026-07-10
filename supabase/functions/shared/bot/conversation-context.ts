import { buildCategoryGuide } from "../formatting-helpers.ts";
import {
  fetchUserCategoryPreferences,
  fetchUserCategoryRemaps,
  fetchUserCustomCategories,
  fetchUserHiddenCategories,
  mergeAllowedCategories,
} from "../user-categories.ts";

type SupabaseLike = {
  from: (table: string) => any;
};

export async function loadBotCategoryContext(params: {
  supabase: SupabaseLike;
  userId: string;
}) {
  const { supabase, userId } = params;
  const [
    customCategories,
    hiddenCategories,
    categoryPreferences,
    categoryRemaps,
  ] = await Promise.all([
    fetchUserCustomCategories({ supabase, userId }),
    fetchUserHiddenCategories({ supabase, userId }),
    fetchUserCategoryPreferences({ supabase, userId }),
    fetchUserCategoryRemaps({ supabase, userId }),
  ]);
  const { expenseCategories, incomeCategories } = mergeAllowedCategories({
    customCategories,
    hiddenCategories,
  });

  return {
    customCategories,
    hiddenCategories,
    categoryPreferences,
    categoryRemaps,
    allowedExpenseCategories: expenseCategories,
    allowedIncomeCategories: incomeCategories,
    categoryGuideForUser: buildCategoryGuide([
      ...expenseCategories,
      ...incomeCategories,
    ]),
  };
}

export async function loadGeminiChatHistory(params: {
  supabase: SupabaseLike;
  sessionId: string;
  limit?: number;
}) {
  const { supabase, sessionId, limit = 20 } = params;
  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("chat_session_id", sessionId)
    .order("timestamp", { ascending: false })
    .limit(limit);

  const historyParts = (history || []).reverse().map((message: any) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
  while (historyParts.length > 0 && historyParts[0].role === "model") {
    historyParts.shift();
  }
  return historyParts;
}
