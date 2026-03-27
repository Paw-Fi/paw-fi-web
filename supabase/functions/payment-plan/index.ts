/// <reference lib="deno.ns" />
import {
  errorResponse,
  jsonResponse,
  mapRpcError,
  withPaymentPlanContext,
} from "../shared/payment-plan-api.ts";

interface ActionConfig {
  rpc: string;
  buildArgs: (
    userId: string,
    body: Record<string, unknown>,
  ) => Record<string, unknown> | string;
  success: (data: Record<string, unknown> | null) => Record<string, unknown>;
}

const actionConfigs: Record<string, ActionConfig> = {
  create_recurring: {
    rpc: "create_recurring_plan",
    buildArgs: (userId, body) => ({
      p_actor_user_id: userId,
      p_payload: body,
    }),
    success: (data) => ({
      success: true,
      plan: data?.plan,
    }),
  },
  create_installment: {
    rpc: "create_installment_plan",
    buildArgs: (userId, body) => ({
      p_actor_user_id: userId,
      p_payload: body,
    }),
    success: (data) => ({
      success: true,
      plan: data?.plan,
      occurrences: data?.occurrences ?? [],
    }),
  },
  skip_recurring: {
    rpc: "skip_next_recurring_occurrence",
    buildArgs: (userId, body) => {
      const planId = body.planId;
      if (typeof planId !== "string" || planId.trim().length === 0) {
        return "planId is required";
      }
      return {
        p_actor_user_id: userId,
        p_plan_id: planId,
      };
    },
    success: (data) => ({
      success: true,
      skippedDate: data?.skippedDate,
      plan: data?.plan,
    }),
  },
  skip_installment: {
    rpc: "skip_next_installment_occurrence",
    buildArgs: (userId, body) => {
      const planId = body.planId;
      if (typeof planId !== "string" || planId.trim().length === 0) {
        return "planId is required";
      }
      return {
        p_actor_user_id: userId,
        p_plan_id: planId,
        p_reason: typeof body.reason === "string" ? body.reason : null,
      };
    },
    success: (data) => ({
      success: true,
      skippedOccurrenceId: data?.skippedOccurrenceId,
      replacementOccurrence: data?.replacementOccurrence,
      plan: data?.plan,
    }),
  },
  mark_paid: {
    rpc: "mark_plan_occurrence_paid",
    buildArgs: (userId, body) => buildPaymentArgs(userId, body, "normal"),
    success: (data) => ({
      success: true,
      plan: data?.plan,
      occurrence: data?.occurrence,
    }),
  },
  mark_partially_paid: {
    rpc: "mark_plan_occurrence_paid",
    buildArgs: (userId, body) => buildPaymentArgs(userId, body, "partial"),
    success: (data) => ({
      success: true,
      plan: data?.plan,
      occurrence: data?.occurrence,
    }),
  },
  early_payoff: {
    rpc: "early_payoff_installment_plan",
    buildArgs: (userId, body) => {
      const planId = body.planId;
      const amountCents = body.amountCents;
      const paymentDate = body.paymentDate;
      if (typeof planId !== "string" || planId.trim().length === 0) {
        return "planId is required";
      }
      if (
        typeof amountCents !== "number" || !Number.isInteger(amountCents) ||
        amountCents <= 0
      ) {
        return "amountCents must be a positive integer";
      }
      if (typeof paymentDate !== "string" || paymentDate.trim().length === 0) {
        return "paymentDate is required";
      }
      return {
        p_actor_user_id: userId,
        p_plan_id: planId,
        p_amount_cents: amountCents,
        p_payment_date: paymentDate,
        p_idempotency_key: typeof body.idempotencyKey === "string"
          ? body.idempotencyKey
          : null,
        p_notes: typeof body.notes === "string" ? body.notes : null,
      };
    },
    success: (data) => ({
      success: true,
      plan: data?.plan,
      updatedOccurrences: data?.updatedOccurrences ?? [],
    }),
  },
  cancel: {
    rpc: "cancel_payment_plan",
    buildArgs: (userId, body) => {
      const planId = body.planId;
      if (typeof planId !== "string" || planId.trim().length === 0) {
        return "planId is required";
      }
      return {
        p_actor_user_id: userId,
        p_plan_id: planId,
        p_reason: typeof body.reason === "string" ? body.reason : null,
      };
    },
    success: (data) => ({
      success: true,
      plan: data?.plan,
    }),
  },
};

Deno.serve(async (req: Request) => {
  const prep = await withPaymentPlanContext(req);
  if (prep.response) return prep.response;

  const { supabase, userId, requestBody } = prep.context!;
  const action = requestBody.action;

  if (typeof action !== "string" || action.trim().length === 0) {
    return errorResponse("action is required", 400);
  }

  const config = actionConfigs[action.trim()];
  if (!config) {
    return errorResponse("Unsupported payment-plan action", 400);
  }

  const builtArgs = config.buildArgs(userId, requestBody);
  if (typeof builtArgs === "string") {
    return errorResponse(builtArgs, 400);
  }

  const { data, error } = await supabase.rpc(config.rpc, builtArgs);
  if (error) {
    return mapRpcError(
      error,
      `Failed to execute payment-plan action: ${action}`,
    );
  }

  return jsonResponse(
    config.success((data ?? null) as Record<string, unknown> | null),
  );
});

function buildPaymentArgs(
  userId: string,
  body: Record<string, unknown>,
  paymentKind: "normal" | "partial",
): Record<string, unknown> | string {
  const planId = body.planId;
  const occurrenceId = body.occurrenceId;
  const amountCents = body.amountCents;
  const paymentDate = body.paymentDate;

  if (typeof planId !== "string" || planId.trim().length === 0) {
    return "planId is required";
  }
  if (typeof occurrenceId !== "string" || occurrenceId.trim().length === 0) {
    return "occurrenceId is required";
  }
  if (
    typeof amountCents !== "number" || !Number.isInteger(amountCents) ||
    amountCents <= 0
  ) {
    return "amountCents must be a positive integer";
  }
  if (typeof paymentDate !== "string" || paymentDate.trim().length === 0) {
    return "paymentDate is required";
  }

  return {
    p_actor_user_id: userId,
    p_plan_id: planId,
    p_occurrence_id: occurrenceId,
    p_amount_cents: amountCents,
    p_payment_date: paymentDate,
    p_payment_kind: paymentKind,
    p_idempotency_key: typeof body.idempotencyKey === "string"
      ? body.idempotencyKey
      : null,
    p_notes: typeof body.notes === "string" ? body.notes : null,
  };
}
