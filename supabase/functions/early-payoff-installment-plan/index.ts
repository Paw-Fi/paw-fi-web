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
  const amountCents = requestBody.amountCents;
  const paymentDate = requestBody.paymentDate;
  const idempotencyKey = requestBody.idempotencyKey;
  const notes = requestBody.notes;

  if (typeof planId !== "string" || planId.trim().length === 0) {
    return errorResponse("planId is required", 400);
  }
  if (
    typeof amountCents !== "number" || !Number.isInteger(amountCents) ||
    amountCents <= 0
  ) {
    return errorResponse("amountCents must be a positive integer", 400);
  }
  if (typeof paymentDate !== "string" || paymentDate.trim().length === 0) {
    return errorResponse("paymentDate is required", 400);
  }

  const { data, error } = await supabase.rpc("early_payoff_installment_plan", {
    p_actor_user_id: userId,
    p_plan_id: planId,
    p_amount_cents: amountCents,
    p_payment_date: paymentDate,
    p_idempotency_key: typeof idempotencyKey === "string"
      ? idempotencyKey
      : null,
    p_notes: typeof notes === "string" ? notes : null,
  });

  if (error) {
    return mapRpcError(error, "Failed to early-payoff installment plan");
  }

  return jsonResponse({
    success: true,
    plan: (data as Record<string, unknown>)?.plan,
    updatedOccurrences: (data as Record<string, unknown>)?.updatedOccurrences ??
      [],
  });
});
