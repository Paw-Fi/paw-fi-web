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

  if (typeof planId !== "string" || planId.trim().length === 0) {
    return errorResponse("planId is required", 400);
  }

  const { data, error } = await supabase.rpc("skip_next_recurring_occurrence", {
    p_actor_user_id: userId,
    p_plan_id: planId,
  });

  if (error) return mapRpcError(error, "Failed to skip recurring occurrence");

  return jsonResponse({
    success: true,
    skippedDate: (data as Record<string, unknown>)?.skippedDate,
    plan: (data as Record<string, unknown>)?.plan,
  });
});
