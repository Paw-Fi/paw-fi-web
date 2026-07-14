import {
  upsertEnvelopeAllocation,
  upsertEnvelopeCategoryLink,
} from "../budgets-helpers.ts";
import { formatInvokeError } from "../formatting-helpers.ts";

type SupabaseLike = {
  from: (table: string) => any;
};

export type BudgetEnvelopeRowLite = {
  id: string;
  name: string;
  updated_at: string | null;
  budget_percentage?: number | null;
};

export function normalizeEnvelopeName(value: string): string {
  return (value || "").trim().toLowerCase();
}

export function normalizePeriodMonth(value: string): string {
  const trimmed = (value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed.slice(0, 7)}-01`;
  }
  if (trimmed.length >= 7) return `${trimmed.slice(0, 7)}-01`;
  return trimmed;
}

function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  const rounded = Math.round(value * 100) / 100;
  const isInt = Math.abs(rounded - Math.round(rounded)) < 1e-9;
  return `${isInt ? Math.round(rounded) : rounded}%`;
}

export function buildBudgetDoneText(
  pockets: Array<{ name: string; percentage: number }>,
): string {
  const cleaned = pockets
    .map((p) => ({
      name: (p.name || "").trim(),
      percentage: Number(p.percentage) || 0,
    }))
    .filter((p) => p.name.length > 0);
  if (!cleaned.length) return "Done — budget updated.";
  const list = cleaned
    .map((p) => `${p.name} ${formatPct(p.percentage)}`)
    .join(", ");
  return `Done — updated pockets: ${list}.`;
}

function isNewerIso(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const ta = a ? Date.parse(a) : Number.NEGATIVE_INFINITY;
  const tb = b ? Date.parse(b) : Number.NEGATIVE_INFINITY;
  return ta > tb;
}

export async function consolidateDuplicateEnvelopesForBudget(
  supabase: SupabaseLike,
  budgetId: string,
  periodMonth: string,
  debugNotes: string[],
  debugEnabled = true,
): Promise<Map<string, BudgetEnvelopeRowLite>> {
  const normalizedPeriod = normalizePeriodMonth(periodMonth);
  const { data: envRowsRaw, error: envErr } = await supabase
    .from("budget_envelopes")
    .select("id, name, updated_at, budget_percentage")
    .eq("budget_id", budgetId);

  const envRows = (envRowsRaw || []) as BudgetEnvelopeRowLite[];
  if (envErr) {
    const formatted = formatInvokeError(envErr);
    if (debugEnabled) {
      debugNotes.push(`budget_envelopes load error: ${formatted}`);
    }
    return new Map();
  }

  const byNorm = new Map<string, BudgetEnvelopeRowLite[]>();
  for (const row of envRows) {
    const norm = normalizeEnvelopeName(row?.name || "");
    if (!norm) continue;
    const list = byNorm.get(norm) || [];
    list.push(row);
    byNorm.set(norm, list);
  }

  const duplicateGroups = Array.from(byNorm.entries()).filter(
    ([, rows]) => rows.length > 1,
  );
  if (!duplicateGroups.length) {
    const map = new Map<string, BudgetEnvelopeRowLite>();
    for (const [norm, rows] of byNorm.entries()) {
      const chosen = rows.reduce((acc, cur) =>
        isNewerIso(cur.updated_at, acc.updated_at) ? cur : acc,
      );
      map.set(norm, chosen);
    }
    return map;
  }

  for (const [norm, group] of duplicateGroups) {
    const ids = group.map((r) => r.id).filter(Boolean);
    if (ids.length < 2) continue;

    const { data: linksRaw, error: linksErr } = await supabase
      .from("envelope_category_links")
      .select("envelope_id, category")
      .in("envelope_id", ids);
    if (linksErr && debugEnabled) {
      debugNotes.push(
        `envelope_category_links load error (${norm}): ${formatInvokeError(
          linksErr,
        )}`,
      );
    }
    const links = (linksRaw || []) as Array<{
      envelope_id: string;
      category: string;
    }>;

    const linkCounts = new Map<string, number>();
    for (const l of links) {
      const id = String((l as any)?.envelope_id || "");
      if (!id) continue;
      linkCounts.set(id, (linkCounts.get(id) || 0) + 1);
    }

    const canonical = group.reduce((acc, cur) => {
      const accCount = linkCounts.get(acc.id) || 0;
      const curCount = linkCounts.get(cur.id) || 0;
      if (curCount !== accCount) return curCount > accCount ? cur : acc;
      return isNewerIso(cur.updated_at, acc.updated_at) ? cur : acc;
    });
    const canonicalId = canonical.id;
    const dupIds = ids.filter((id) => id !== canonicalId);
    if (!canonicalId || dupIds.length === 0) continue;

    const categoriesToUpsert = new Set<string>();
    for (const l of links) {
      const envId = String((l as any)?.envelope_id || "");
      if (!dupIds.includes(envId)) continue;
      const cat = String((l as any)?.category || "");
      if (!cat) continue;
      categoriesToUpsert.add(cat);
    }
    for (const cat of categoriesToUpsert) {
      await upsertEnvelopeCategoryLink(supabase as any, canonicalId, cat);
    }

    if (dupIds.length) {
      await supabase
        .from("envelope_category_links")
        .delete()
        .in("envelope_id", dupIds);
    }

    const { data: canonicalAlloc } = await supabase
      .from("envelope_allocations")
      .select("envelope_id")
      .eq("envelope_id", canonicalId)
      .eq("period_month", normalizedPeriod)
      .maybeSingle();

    if (!canonicalAlloc) {
      const { data: dupAllocs } = await supabase
        .from("envelope_allocations")
        .select("amount_cents")
        .in("envelope_id", dupIds)
        .eq("period_month", normalizedPeriod);
      const sum = (dupAllocs || []).reduce((acc: number, row: any) => {
        const v = Number(row?.amount_cents) || 0;
        return acc + v;
      }, 0);
      if (sum > 0) {
        await upsertEnvelopeAllocation(
          supabase as any,
          canonicalId,
          normalizedPeriod,
          sum,
        );
      }
    }

    await supabase
      .from("envelope_allocations")
      .delete()
      .in("envelope_id", dupIds);
    const { error: deleteEnvErr } = await supabase
      .from("budget_envelopes")
      .delete()
      .in("id", dupIds);
    if (deleteEnvErr && debugEnabled) {
      debugNotes.push(
        `duplicate envelope delete error (${norm}): ${formatInvokeError(
          deleteEnvErr,
        )}`,
      );
    }
  }

  const { data: finalRowsRaw } = await supabase
    .from("budget_envelopes")
    .select("id, name, updated_at, budget_percentage")
    .eq("budget_id", budgetId);
  const finalRows = (finalRowsRaw || []) as BudgetEnvelopeRowLite[];
  const map = new Map<string, BudgetEnvelopeRowLite>();
  for (const row of finalRows) {
    const norm = normalizeEnvelopeName(row?.name || "");
    if (!norm) continue;
    const existing = map.get(norm);
    if (!existing || isNewerIso(row.updated_at, existing.updated_at)) {
      map.set(norm, row);
    }
  }
  return map;
}
