interface OccurrenceDatabaseError {
  code?: string;
  message?: string;
}

export function recurringOccurrenceDatabaseFailure(
  error: OccurrenceDatabaseError,
) {
  // Only the RPC's explicit domain exceptions authorize cancelling a local mutation.
  const domainCode = error.code === "P0001"
    ? error.message?.match(/^OCCURRENCE_[A-Z_]+$/)?.[0]
    : null;
  if (domainCode && domainCode !== "OCCURRENCE_FAILED") {
    return {
      status: domainCode === "OCCURRENCE_UNAUTHORIZED" ? 403 : 400,
      body: { success: false, code: domainCode, error: error.message },
    };
  }
  return {
    status: 503,
    body: {
      success: false,
      code: "SERVER_ERROR",
      error: "Temporary recurring occurrence failure",
    },
  };
}

export function isRecurringOccurrenceRequestBody(
  value: unknown,
): value is Record<string, unknown> & {
  userId?: string;
  recurringId?: string;
  scheduledOccurrenceDate?: string;
} {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const body = value as Record<string, unknown>;
  const fields = [
    "userId",
    "recurringId",
    "scheduledOccurrenceDate",
    "paidDate",
    "accountId",
    "merchant",
    "description",
    "payerUserId",
    "clientRecordId",
    "clientMutationId",
    "idempotencyKey",
    "source",
    "category",
    "currency",
  ];
  return fields.every((field) =>
    body[field] == null || typeof body[field] === "string"
  ) &&
    (body.amount === undefined ||
      (typeof body.amount === "number" && Number.isFinite(body.amount))) &&
    (body.updateFutureAmount === undefined ||
      typeof body.updateFutureAmount === "boolean");
}
