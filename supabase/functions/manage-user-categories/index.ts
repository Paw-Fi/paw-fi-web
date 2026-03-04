import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeCategoryName(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function isValidCategoryName(name: string): boolean {
  if (!name || name.length > 96) return false;
  if (name.includes("`")) return false;
  if (/[\x00-\x1F\x7F]/.test(name)) return false;
  return true;
}

function isValidTransactionType(type: string): boolean {
  return type === "expense" || type === "income";
}

async function fetchUserEnvelopeIds(
  supabase: any,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("budget_envelopes")
    .select("id")
    .eq("user_id", userId);
  if (error) throw error;
  return ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
}

async function remapEnvelopeCategoryLinks(
  supabase: any,
  userId: string,
  oldCategory: string,
  newCategory: string,
): Promise<void> {
  const envelopeIds = await fetchUserEnvelopeIds(supabase, userId);
  if (envelopeIds.length === 0) return;

  const { data: existingLinks, error: existingLinksError } = await supabase
    .from("envelope_category_links")
    .select("envelope_id")
    .in("envelope_id", envelopeIds)
    .eq("category", oldCategory);
  if (existingLinksError) throw existingLinksError;

  const sourceLinks = (existingLinks ?? []) as Array<{ envelope_id: string }>;
  if (sourceLinks.length === 0) return;

  const upserts = sourceLinks.map((row) => ({
    envelope_id: row.envelope_id,
    category: newCategory,
  }));
  const { error: upsertError } = await supabase
    .from("envelope_category_links")
    .upsert(upserts, { onConflict: "envelope_id,category" });
  if (upsertError) throw upsertError;

  const { error: deleteOldError } = await supabase
    .from("envelope_category_links")
    .delete()
    .in(
      "envelope_id",
      sourceLinks.map((row) => row.envelope_id),
    )
    .eq("category", oldCategory);
  if (deleteOldError) throw deleteOldError;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ success: false, error: "Server not configured" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: { headers: { "X-Client-Info": "moneko-manage-user-categories" } },
  });

  const auth = await authenticateUser(req, supabase);
  if (!auth.success || !auth.userId) {
    return json(
      { success: false, error: auth.error ?? "Unauthorized" },
      auth.statusCode ?? 401,
    );
  }
  const userId = auth.userId;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }

  const action = String(body.action ?? "")
    .trim()
    .toLowerCase();

  try {
    if (action === "rename") {
      const oldName = normalizeCategoryName(body.oldName);
      const oldType = normalizeCategoryName(body.oldTransactionType);
      const newName = normalizeCategoryName(body.newName);
      const newType = normalizeCategoryName(body.newTransactionType);

      if (!isValidCategoryName(oldName) || !isValidCategoryName(newName)) {
        return json({ success: false, error: "Invalid category name" }, 400);
      }
      if (
        !isValidTransactionType(oldType) ||
        !isValidTransactionType(newType)
      ) {
        return json({ success: false, error: "Invalid transaction type" }, 400);
      }

      const { data: oldRow, error: oldRowError } = await supabase
        .from("user_transaction_categories")
        .select("color_argb,icon_key")
        .eq("user_id", userId)
        .eq("name", oldName)
        .eq("transaction_type", oldType)
        .maybeSingle();
      if (oldRowError) throw oldRowError;
      if (!oldRow) {
        return json(
          { success: false, error: "Source category not found" },
          404,
        );
      }

      const { error: upsertError } = await supabase
        .from("user_transaction_categories")
        .upsert(
          {
            user_id: userId,
            name: newName,
            transaction_type: newType,
            color_argb: oldRow.color_argb,
            icon_key: oldRow.icon_key ?? "tag",
          },
          { onConflict: "user_id,name,transaction_type" },
        );
      if (upsertError) throw upsertError;

      if (oldType === "income") {
        const { error } = await supabase
          .from("expenses")
          .update({ category: newName })
          .eq("user_id", userId)
          .eq("category", oldName)
          .eq("type", "income");
        if (error) throw error;
      } else {
        const { error: expenseError } = await supabase
          .from("expenses")
          .update({ category: newName })
          .eq("user_id", userId)
          .eq("category", oldName)
          .eq("type", "expense");
        if (expenseError) throw expenseError;

        const { error: nullTypeError } = await supabase
          .from("expenses")
          .update({ category: newName })
          .eq("user_id", userId)
          .eq("category", oldName)
          .is("type", null);
        if (nullTypeError) throw nullTypeError;
      }

      await supabase
        .from("user_category_preferences")
        .update({ category_name: newName })
        .eq("user_id", userId)
        .eq("transaction_type", oldType)
        .eq("category_name", oldName);

      await supabase
        .from("user_category_remaps")
        .update({ to_category_name: newName })
        .eq("user_id", userId)
        .eq("transaction_type", oldType)
        .eq("to_category_name", oldName);

      await supabase
        .from("user_category_remaps")
        .update({ from_category_name: newName })
        .eq("user_id", userId)
        .eq("transaction_type", oldType)
        .eq("from_category_name", oldName);

      await supabase
        .from("user_hidden_transaction_categories")
        .update({ category_name: newName, transaction_type: newType })
        .eq("user_id", userId)
        .eq("category_name", oldName)
        .eq("transaction_type", oldType);

      if (oldType === "expense") {
        await remapEnvelopeCategoryLinks(supabase, userId, oldName, newName);
      }

      if (oldName !== newName || oldType !== newType) {
        await supabase
          .from("user_transaction_categories")
          .delete()
          .eq("user_id", userId)
          .eq("name", oldName)
          .eq("transaction_type", oldType);
      }

      return json({ success: true });
    }

    if (action === "style") {
      const name = normalizeCategoryName(body.name);
      const type = normalizeCategoryName(body.transactionType);
      const iconKey = String(body.iconKey ?? "").trim();
      const colorArgb = Number(body.colorArgb ?? Number.NaN);
      if (
        !isValidCategoryName(name) ||
        !isValidTransactionType(type) ||
        !iconKey
      ) {
        return json({ success: false, error: "Invalid input" }, 400);
      }
      const { error } = await supabase
        .from("user_transaction_categories")
        .update({
          color_argb: colorArgb,
          icon_key: iconKey,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("name", name)
        .eq("transaction_type", type);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "hide") {
      const name = normalizeCategoryName(body.name);
      const type = normalizeCategoryName(body.transactionType);
      const hidden = body.hidden === true;
      if (
        !isValidCategoryName(name) ||
        !isValidTransactionType(type) ||
        name === "other" ||
        name === "uncategorized"
      ) {
        return json({ success: false, error: "Invalid input" }, 400);
      }
      if (hidden) {
        const { error } = await supabase
          .from("user_hidden_transaction_categories")
          .upsert(
            { user_id: userId, category_name: name, transaction_type: type },
            { onConflict: "user_id,category_name,transaction_type" },
          );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_hidden_transaction_categories")
          .delete()
          .eq("user_id", userId)
          .eq("category_name", name)
          .eq("transaction_type", type);
        if (error) throw error;
      }
      return json({ success: true });
    }

    if (action === "delete") {
      const name = normalizeCategoryName(body.name);
      const type = normalizeCategoryName(body.transactionType);
      const fallback =
        normalizeCategoryName(body.fallbackCategory ?? "other") || "other";
      if (
        !isValidCategoryName(name) ||
        !isValidTransactionType(type) ||
        name === "other"
      ) {
        return json({ success: false, error: "Invalid input" }, 400);
      }

      if (type === "income") {
        await supabase
          .from("expenses")
          .update({ category: fallback })
          .eq("user_id", userId)
          .eq("category", name)
          .eq("type", "income");
      } else {
        await supabase
          .from("expenses")
          .update({ category: fallback })
          .eq("user_id", userId)
          .eq("category", name)
          .eq("type", "expense");
        await supabase
          .from("expenses")
          .update({ category: fallback })
          .eq("user_id", userId)
          .eq("category", name)
          .is("type", null);
      }

      await supabase
        .from("user_category_preferences")
        .update({ category_name: fallback })
        .eq("user_id", userId)
        .eq("transaction_type", type)
        .eq("category_name", name);

      await supabase
        .from("user_category_remaps")
        .update({ to_category_name: fallback })
        .eq("user_id", userId)
        .eq("transaction_type", type)
        .eq("to_category_name", name);

      await supabase
        .from("user_category_remaps")
        .delete()
        .eq("user_id", userId)
        .eq("transaction_type", type)
        .eq("from_category_name", name);

      await supabase
        .from("user_hidden_transaction_categories")
        .delete()
        .eq("user_id", userId)
        .eq("category_name", name)
        .eq("transaction_type", type);

      await supabase
        .from("user_transaction_categories")
        .delete()
        .eq("user_id", userId)
        .eq("name", name)
        .eq("transaction_type", type);

      if (type === "expense") {
        await remapEnvelopeCategoryLinks(supabase, userId, name, fallback);
      }

      return json({ success: true });
    }

    if (action === "upsert") {
      const name = normalizeCategoryName(body.name);
      const type = normalizeCategoryName(body.transactionType);
      const iconKey = String(body.iconKey ?? "tag").trim() || "tag";
      const colorArgb = Number(body.colorArgb ?? Number.NaN);
      if (
        !isValidCategoryName(name) ||
        !isValidTransactionType(type) ||
        name === "other"
      ) {
        return json({ success: false, error: "Invalid input" }, 400);
      }

      const { error } = await supabase
        .from("user_transaction_categories")
        .upsert(
          {
            user_id: userId,
            name,
            transaction_type: type,
            color_argb: Number.isFinite(colorArgb) ? colorArgb : null,
            icon_key: iconKey,
          },
          { onConflict: "user_id,name,transaction_type" },
        );
      if (error) throw error;
      return json({ success: true });
    }

    return json({ success: false, error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("[manage-user-categories] error", error);
    return json({ success: false, error: String(error) }, 500);
  }
});
