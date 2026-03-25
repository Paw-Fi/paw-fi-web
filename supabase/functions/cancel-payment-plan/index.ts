import {
  errorResponse,
  jsonResponse,
  mapRpcError,
  withPaymentPlanContext,
} from "../shared/payment-plan-api.ts";

Deno.serve(async (req: Request) => {
  const prep = await withPaymentPlanContext(req);
  if (prep.response) return prep.response;

  const { supabase, userId, requestBody } = prep.context!;

  const planId = requestBody.planId;
  const reason = requestBody.reason;

  if (typeof planId !== "string" || planId.trim().length === 0) {
    return errorResponse("planId is required", 400);
  }

  const { data, error } = await supabase.rpc("cancel_payment_plan", {
    p_actor_user_id: userId,
    p_plan_id: planId,
    p_reason: typeof reason === "string" ? reason : null,
  });

  if (error) return mapRpcError(error, "Failed to cancel payment plan");

  return jsonResponse({
    success: true,
    plan: (data as Record<string, unknown>)?.plan,
  });
});
