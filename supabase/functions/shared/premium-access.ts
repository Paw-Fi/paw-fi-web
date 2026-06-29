import { authenticateUser } from "./auth.ts";
import { ACTIVE_STATUSES } from "./subscription-constants.ts";

export interface PremiumAccessResult {
  userId: string;
  hasPremiumAccess: boolean;
  plan: string;
  status: string;
  reason?: string;
}

const PREMIUM_PLANS = new Set(["premium", "lifetime"]);
const ACTIVE_STATUS_SET = new Set(ACTIVE_STATUSES);

interface SupabasePremiumClient {
  from: (table: string) => any;
}

export async function getUserPremiumAccessByUserId(
  supabase: SupabasePremiumClient,
  userId: string,
): Promise<PremiumAccessResult> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[premium-access] Failed to load subscription", {
      userId,
      error: error.message,
    });
    return {
      userId,
      hasPremiumAccess: false,
      plan: "unknown",
      status: "unknown",
      reason: "subscription_lookup_failed",
    };
  }

  const plan = normalizeValue(data?.plan, "free");
  const status = normalizeValue(data?.status, "none");
  const hasPremiumAccess = PREMIUM_PLANS.has(plan) &&
    ACTIVE_STATUS_SET.has(status as (typeof ACTIVE_STATUSES)[number]);

  return {
    userId,
    hasPremiumAccess,
    plan,
    status,
    ...(hasPremiumAccess ? {} : { reason: resolveReason(plan, status) }),
  };
}

export async function requirePremiumAccessForRequest(
  req: Request,
  supabase: SupabasePremiumClient & Parameters<typeof authenticateUser>[1],
): Promise<PremiumAccessResult & { errorResponse?: Response }> {
  const auth = await authenticateUser(req, supabase);
  if (!auth.success || !auth.userId) {
    return {
      userId: "",
      hasPremiumAccess: false,
      plan: "unknown",
      status: "unknown",
      reason: "unauthorized",
      errorResponse: jsonResponse(
        { success: false, error: auth.error ?? "Unauthorized" },
        auth.statusCode ?? 401,
      ),
    };
  }

  const access = await getUserPremiumAccessByUserId(supabase, auth.userId);
  if (!access.hasPremiumAccess) {
    return {
      ...access,
      errorResponse: jsonResponse(
        {
          success: false,
          error: "Premium access required",
          code: "PREMIUM_REQUIRED",
          plan: access.plan,
          status: access.status,
          reason: access.reason,
        },
        403,
      ),
    };
  }

  return access;
}

function normalizeValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().toLowerCase()
    : fallback;
}

function resolveReason(plan: string, status: string): string {
  if (!PREMIUM_PLANS.has(plan)) return "plan_not_premium";
  if (!ACTIVE_STATUS_SET.has(status as (typeof ACTIVE_STATUSES)[number])) {
    return "subscription_not_active";
  }
  return "premium_required";
}

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
