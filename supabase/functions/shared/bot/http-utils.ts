import { corsHeaders } from "../cors.ts";

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function hasExpiredSubscriptionAccess(
  subscription?: {
    status?: string | null;
    currentPeriodEnd?: string | Date | null;
  } | null,
): boolean {
  if (!subscription) return false;

  const normalizedStatus = String(subscription.status ?? "").toLowerCase();
  if (normalizedStatus !== "trialing" && normalizedStatus !== "active") {
    return false;
  }

  if (subscription.currentPeriodEnd == null) return false;
  const periodEnd = new Date(subscription.currentPeriodEnd);
  if (Number.isNaN(periodEnd.getTime())) return false;
  return periodEnd.getTime() <= Date.now();
}
