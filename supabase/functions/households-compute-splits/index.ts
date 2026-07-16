import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";
import {
  commitHouseholdSplitRecords,
  expectedSplitParentFromTransaction,
} from "../shared/household-auto-split.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

type SplitType = "equal" | "percentage" | "amount" | "shares";

interface SplitLine {
  user_id: string;
  amount_cents?: number | null;
  percentage?: number | null;
  shares?: number | null;
}

interface ComputeSplitsRequest {
  expense_id: string;
  household_id: string;
  payer_user_id: string;
  split_type: SplitType;
  currency: string;
  total_amount_cents: number;
  description?: string;
  splits: SplitLine[];
}

interface ComputeSplitsResponse {
  success: boolean;
  split_group_id?: string;
  split_lines?: any[];
  balances?: Record<string, number>; // user_id -> amount they owe (+) or are owed (-)
  error?: string;
}

function allocateCentsByWeights(
  totalCents: number,
  weights: number[],
): number[] {
  const safeTotal = Number.isFinite(totalCents)
    ? Math.max(0, Math.trunc(totalCents))
    : 0;
  const safeWeights = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const totalWeight = safeWeights.reduce((sum, w) => sum + w, 0);

  if (safeTotal === 0 || totalWeight <= 0 || safeWeights.length === 0) {
    return safeWeights.map(() => 0);
  }

  const floors: number[] = [];
  const fracs: { idx: number; frac: number }[] = [];
  let sumFloors = 0;

  for (let i = 0; i < safeWeights.length; i++) {
    const weight = safeWeights[i];
    if (weight <= 0) {
      floors.push(0);
      continue;
    }
    const raw = safeTotal * (weight / totalWeight);
    const floored = Math.floor(raw);
    const frac = raw - floored;
    floors.push(floored);
    sumFloors += floored;
    fracs.push({ idx: i, frac });
  }

  let remainder = safeTotal - sumFloors;
  if (remainder <= 0) return floors;

  fracs.sort((a, b) => b.frac - a.frac);
  if (fracs.length === 0) return floors;

  let cursor = 0;
  while (remainder > 0) {
    const target = fracs[cursor % fracs.length].idx;
    floors[target] += 1;
    remainder -= 1;
    cursor += 1;
  }

  return floors;
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
    const body: ComputeSplitsRequest = await req.json();
    const {
      expense_id,
      household_id,
      payer_user_id,
      split_type,
      currency,
      total_amount_cents,
      description,
      splits,
    } = body;

    // Validate required fields
    if (
      !expense_id ||
      !household_id ||
      !payer_user_id ||
      !split_type ||
      !currency ||
      !total_amount_cents ||
      !splits
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (
      !Number.isSafeInteger(total_amount_cents) || total_amount_cents <= 0
    ) {
      return new Response(
        JSON.stringify({ error: "total_amount_cents must be positive" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!Array.isArray(splits) || splits.length === 0) {
      return new Response(
        JSON.stringify({ error: "splits must be a non-empty array" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const normalizedCurrency = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
      return new Response(JSON.stringify({ error: "Invalid currency" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (
      splits.some((split) =>
        !split || typeof split.user_id !== "string" ||
        split.user_id.trim().length === 0 ||
        (split.amount_cents != null &&
          (!Number.isSafeInteger(split.amount_cents) ||
            split.amount_cents < 0)) ||
        (split.percentage != null &&
          (!Number.isFinite(split.percentage) || split.percentage < 0)) ||
        (split.shares != null &&
          (!Number.isSafeInteger(split.shares) || split.shares <= 0))
      )
    ) {
      return new Response(JSON.stringify({ error: "Invalid split values" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is a member of the household
    const { data: membership, error: membershipError } = await supabase
      .from("household_members")
      .select("id")
      .eq("household_id", household_id)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: "You are not a member of this household" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // This endpoint is compute-only: it may attach a split to the exact
    // active expense the caller selected, but it must never rewrite parent
    // accounting fields from request data. The RPC repeats this snapshot as
    // a row-locked CAS before making any change.
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .select(
        "id, user_id, household_id, amount_cents, currency, type, account_id, split_group_id",
      )
      .eq("id", expense_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (expenseError || !expense) {
      return new Response(JSON.stringify({ error: "Expense not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (
      String(expense.type ?? "expense") !== "expense" ||
      expense.household_id !== household_id ||
      Math.abs(Number(expense.amount_cents)) !== total_amount_cents ||
      String(expense.currency ?? "").trim().toUpperCase() !==
        normalizedCurrency ||
      expense.split_group_id != null ||
      typeof expense.account_id !== "string"
    ) {
      return new Response(
        JSON.stringify({
          error: "Expense changed; refresh before creating its split",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate all split participants are household members (SECURITY)
    const allUserIds = splits.map((s) => s.user_id.trim()).filter(Boolean);
    if (allUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid user IDs in splits" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Include payer in validation
    const userIdsToValidate = [...new Set([...allUserIds, payer_user_id])];

    if (new Set(allUserIds).size !== allUserIds.length) {
      return new Response(
        JSON.stringify({ error: "Each household member may appear only once" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: members, error: membersError } = await supabase
      .from("household_members")
      .select("user_id")
      .eq("household_id", household_id);

    if (membersError) {
      console.error("Error validating participants:", membersError);
      return new Response(
        JSON.stringify({ error: "Failed to validate participants" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const validMemberIds = new Set(members?.map((m) => m.user_id) || []);
    const invalidUserIds = userIdsToValidate.filter(
      (id) => !validMemberIds.has(id),
    );

    if (
      invalidUserIds.length > 0 ||
      validMemberIds.size !== new Set(allUserIds).size ||
      [...validMemberIds].some((id) => !allUserIds.includes(id))
    ) {
      return new Response(
        JSON.stringify({
          error: "Some participants are not household members",
          invalid_user_ids: invalidUserIds,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate split type and calculations
    let calculatedSplitLines: SplitLine[] = [];

    if (split_type === "equal") {
      // Equal split: divide total amount equally among all participants
      const amountPerPerson = Math.floor(total_amount_cents / splits.length);
      const remainder = total_amount_cents - amountPerPerson * splits.length;

      calculatedSplitLines = splits.map((split, index) => ({
        user_id: split.user_id,
        amount_cents: amountPerPerson + (index === 0 ? remainder : 0), // Give remainder to first person
        percentage: null,
        shares: null,
      }));
    } else if (split_type === "percentage") {
      // Percentage split: validate percentages sum to 100
      const totalPercentage = splits.reduce(
        (sum, split) => sum + (split.percentage || 0),
        0,
      );

      if (Math.abs(totalPercentage - 100) > 0.01) {
        return new Response(
          JSON.stringify({
            error: `Percentages must sum to 100, got ${totalPercentage}`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const weights = splits.map((split) => split.percentage || 0);
      const allocatedCents = allocateCentsByWeights(
        total_amount_cents,
        weights,
      );
      calculatedSplitLines = splits.map((split, index) => {
        const percentage = split.percentage || 0;
        return {
          user_id: split.user_id,
          amount_cents: allocatedCents[index] ?? 0,
          percentage,
          shares: null,
        };
      });
    } else if (split_type === "amount") {
      // Fixed amount split: validate amounts sum to total
      const totalAmount = splits.reduce(
        (sum, split) => sum + (split.amount_cents || 0),
        0,
      );

      if (totalAmount !== total_amount_cents) {
        return new Response(
          JSON.stringify({
            error:
              `Split amounts must sum to ${total_amount_cents}, got ${totalAmount}`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      calculatedSplitLines = splits.map((split) => ({
        user_id: split.user_id,
        amount_cents: split.amount_cents || 0,
        percentage: null,
        shares: null,
      }));
    } else if (split_type === "shares") {
      // Shares split: divide based on share ratios
      const totalShares = splits.reduce((sum, split) => {
        const shares = typeof split.shares === "number"
          ? Math.trunc(split.shares)
          : 0;
        return sum + (shares > 0 ? shares : 0);
      }, 0);

      if (totalShares === 0) {
        return new Response(
          JSON.stringify({ error: "Total shares must be greater than 0" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const weights = splits.map((split) => {
        const shares = typeof split.shares === "number"
          ? Math.trunc(split.shares)
          : 0;
        return shares > 0 ? shares : 0;
      });
      const allocatedCents = allocateCentsByWeights(
        total_amount_cents,
        weights,
      );
      calculatedSplitLines = splits.map((split, index) => {
        const sharesRaw = typeof split.shares === "number"
          ? Math.trunc(split.shares)
          : 0;
        const shares = sharesRaw > 0 ? sharesRaw : null;
        return {
          user_id: split.user_id,
          amount_cents: allocatedCents[index] ?? 0,
          percentage: null,
          // DB constraint: shares must be > 0 when present; treat <= 0 as excluded (null).
          shares,
        };
      });
    } else {
      return new Response(JSON.stringify({ error: "Invalid split_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if split group already exists for this transaction
    const { data: existingSplitGroup } = await supabase
      .from("expense_split_groups")
      .select("id")
      .eq("expense_id", expense_id)
      .single();

    if (existingSplitGroup) {
      return new Response(
        JSON.stringify({
          error: "A split already exists for this transaction",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const splitGroupId = crypto.randomUUID();
    const splitCreatedAt = new Date().toISOString();
    const splitLinesData = calculatedSplitLines.map((line) => ({
      split_group_id: splitGroupId,
      user_id: line.user_id,
      amount_cents: line.amount_cents,
      percentage: line.percentage,
      shares: line.shares,
      is_settled: false,
    }));
    const { data: committedSplit, error: commitError } =
      await commitHouseholdSplitRecords({
        supabase,
        actorUserId: user.id,
        group: {
          id: splitGroupId,
          household_id,
          expense_id,
          payer_user_id,
          split_type,
          currency: normalizedCurrency,
          total_amount_cents,
          description: description ?? null,
          created_at: splitCreatedAt,
        },
        lines: splitLinesData.map((line) => ({
          ...line,
          percentage: line.percentage ?? null,
          shares: line.shares ?? null,
          amount_cents: Number(line.amount_cents ?? 0),
          settled_at: null,
          created_at: splitCreatedAt,
        })),
        expectedParent: expectedSplitParentFromTransaction(
          expense as Record<string, unknown>,
        ),
        previousSplitGroupId: null,
        targetAccountId: expense.account_id,
      });

    if (commitError) {
      console.error("Error committing split write:", commitError);
      return new Response(
        JSON.stringify({ error: "Failed to create split" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Calculate balances (who owes whom)
    const balances: Record<string, number> = {};

    // Payer is owed the total amount
    balances[payer_user_id] = total_amount_cents;

    // Each participant owes their share
    for (const line of calculatedSplitLines) {
      if (line.user_id === payer_user_id) {
        // Payer owes themselves, so reduce what they're owed
        balances[payer_user_id] -= line.amount_cents!;
      } else {
        // Other participants owe money
        balances[line.user_id] = -line.amount_cents!;
      }
    }

    const notificationRows = Array.from(
      new Map(
        calculatedSplitLines
          .filter(
            (line) => line.user_id !== user.id && (line.amount_cents ?? 0) > 0,
          )
          .map((line) => [line.user_id, line]),
      ).values(),
    ).map((line) => ({
      household_id,
      user_id: line.user_id,
      event_type: "split_created",
      payload: {
        split_group_id: splitGroupId,
        split_id: splitGroupId,
        expense_id,
        household_id,
        payer_user_id,
        split_type,
        amount_cents: line.amount_cents,
        total_amount_cents,
        currency: normalizedCurrency,
        participant_count: splits.length,
      },
    }));

    if (notificationRows.length > 0) {
      const { error: notificationError } = await supabase
        .from("notification_events")
        .insert(notificationRows);
      if (notificationError) {
        console.error("Error creating split notifications:", notificationError);
      }
    }

    const response: ComputeSplitsResponse = {
      success: true,
      split_group_id: splitGroupId,
      split_lines:
        (committedSplit as { split_lines?: unknown[] } | null)?.split_lines ??
          splitLinesData,
      balances,
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
