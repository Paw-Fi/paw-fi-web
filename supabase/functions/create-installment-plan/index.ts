import {
  jsonResponse,
  mapRpcError,
  withPaymentPlanContext,
} from "../shared/payment-plan-api.ts";

Deno.serve(async (req: Request) => {
  const prep = await withPaymentPlanContext(req);
  if (prep.response) return prep.response;

  const { supabase, userId, requestBody } = prep.context!;

  const { data, error } = await supabase.rpc("create_installment_plan", {
    p_actor_user_id: userId,
    p_payload: requestBody,
  });

  if (error) return mapRpcError(error, "Failed to create installment plan");

  return jsonResponse({
    success: true,
    plan: (data as Record<string, unknown>)?.plan,
    occurrences: (data as Record<string, unknown>)?.occurrences ?? [],
  });
});
