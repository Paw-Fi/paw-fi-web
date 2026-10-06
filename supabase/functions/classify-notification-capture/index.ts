import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

import { corsHeaders } from "../shared/cors.ts";
import {
  authenticateUserOrInternalSecret,
  buildInternalInvokeHeaders,
  resolveAnyInternalFunctionKey,
} from "../shared/auth.ts";
import {
  ANDROID_NOTIFICATION_CLASSIFIER_PIPELINE_VERSION,
  type AndroidNotificationClassification,
  type AndroidNotificationInput,
  buildAndroidNotificationClassificationContextHash,
  buildAndroidNotificationDependencyFailure,
  buildAndroidNotificationFailureResult,
  buildAndroidNotificationFieldProvenance,
  buildNotificationCaptureTransaction,
  classifyAndroidNotification,
  httpStatusForAndroidNotificationFailure,
  NOTIFICATION_CAPTURE_MAX_REQUEST_BYTES,
} from "../shared/android-notification-classifier.ts";
import {
  assertAccountInScope,
  assertScopeAccess,
  getAccountOrNull,
  resolveDefaultAccountIdStrict,
} from "../shared/accounts.ts";
import {
  type AndroidRecurringScheduleRow,
  notificationRecurringConfirmationPayload,
  type NotificationRecurringOccurrence,
  resolveNotificationRecurringOccurrence,
  scaleNotificationRecurringSplit,
} from "../shared/android-recurring-capture.ts";
import { loadCategoryContext } from "../shared/category-resolution.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import {
  hasCapturePlusEntitlement,
  jsonSubscriptionRequired,
  loadLatestSubscriptionForUser,
} from "../shared/plus-entitlement.ts";
import { queueCapturePlusRequiredNotification } from "../shared/capture-plus-notification.ts";
import {
  createVertexGenerativeAI,
  getVertexAiConfigFromEnv,
} from "../shared/vertex-ai-chat.ts";
import {
  getLocalYyyyMmDdInTimeZone,
  resolveNotificationCaptureSource,
  resolveWalletCaptureAccountForCurrency,
} from "../shared/wallet-capture.ts";

const MAX_FIELD_LENGTH = 2_000;
const MAX_TEXT_LINES = 20;
const DEFAULT_HOURLY_AI_LIMIT = 60;
const MAX_EVENT_ATTEMPTS = 3;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface NotificationCaptureRequest {
  userId?: string | null;
  captureSource?: string | null;
  idempotencyKey?: string | null;
  clientCreatedAt?: string | null;
  householdId?: string | null;
  isPortfolio?: boolean;
  accountId?: string | null;
  notification?: AndroidNotificationInput | null;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function optionalString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function sanitizeUuid(value: unknown): string | null {
  const normalized = optionalString(value, 80);
  return normalized && UUID_REGEX.test(normalized) ? normalized : null;
}

function sanitizeNotification(value: unknown): AndroidNotificationInput | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const packageName = optionalString(raw.packageName, 200);
  if (!packageName || !/^[A-Za-z0-9._-]+$/.test(packageName)) return null;
  const rawLines = Array.isArray(raw.textLines) ? raw.textLines : [];
  const rawMessages = Array.isArray(raw.messages) ? raw.messages : [];
  const rawAdditionalText = Array.isArray(raw.additionalText)
    ? raw.additionalText
    : [];
  return {
    packageName,
    sourceAppLabel: optionalString(raw.sourceAppLabel, 120),
    isGroupSummary: raw.isGroupSummary === true,
    notificationKey: optionalString(raw.notificationKey, 240),
    notificationPostTime: optionalString(raw.notificationPostTime, 80),
    title: optionalString(raw.title, MAX_FIELD_LENGTH),
    text: optionalString(raw.text, MAX_FIELD_LENGTH),
    bigText: optionalString(raw.bigText, MAX_FIELD_LENGTH),
    subText: optionalString(raw.subText, MAX_FIELD_LENGTH),
    summaryText: optionalString(raw.summaryText, MAX_FIELD_LENGTH),
    infoText: optionalString(raw.infoText, MAX_FIELD_LENGTH),
    conversationTitle: optionalString(raw.conversationTitle, MAX_FIELD_LENGTH),
    tickerText: optionalString(raw.tickerText, MAX_FIELD_LENGTH),
    textLines: rawLines
      .map((line) => optionalString(line, 500))
      .filter((line): line is string => line != null)
      .slice(0, MAX_TEXT_LINES),
    messages: rawMessages
      .map((message) => optionalString(message, 500))
      .filter((message): message is string => message != null)
      .slice(0, MAX_TEXT_LINES),
    additionalText: rawAdditionalText
      .map((text) => optionalString(text, 500))
      .filter((text): text is string => text != null)
      .slice(0, MAX_TEXT_LINES),
  };
}

async function claimClassificationEvent(params: {
  supabase: any;
  userId: string;
  eventKey: string;
  notification: AndroidNotificationInput;
  hourlyLimit: number;
  contextHash: string;
}): Promise<
  | {
    status: "claimed";
    id: string;
    processingToken: string;
    attemptNumber: number;
  }
  | { status: "cached"; result: Record<string, unknown> }
  | { status: "processing" }
  | { status: "rate_limited" }
> {
  const { data, error } = await params.supabase.rpc(
    "claim_notification_capture_classification_v2",
    {
      p_user_id: params.userId,
      p_event_key: params.eventKey,
      p_source_package: params.notification.packageName,
      p_source_app_label: params.notification.sourceAppLabel ?? null,
      p_hourly_limit: params.hourlyLimit,
      p_pipeline_version: ANDROID_NOTIFICATION_CLASSIFIER_PIPELINE_VERSION,
      p_context_hash: params.contextHash,
      p_max_event_attempts: MAX_EVENT_ATTEMPTS,
    },
  );
  if (error) throw error;
  const result = data && typeof data === "object"
    ? (data as Record<string, unknown>)
    : {};
  if (result.status === "cached" && result.result) {
    return {
      status: "cached",
      result: result.result as Record<string, unknown>,
    };
  }
  if (result.status === "processing") return { status: "processing" };
  if (result.status === "rate_limited") return { status: "rate_limited" };
  if (
    result.status === "claimed" &&
    typeof result.eventId === "string" &&
    typeof result.processingToken === "string" &&
    typeof result.attemptNumber === "number"
  ) {
    return {
      status: "claimed",
      id: result.eventId,
      processingToken: result.processingToken,
      attemptNumber: result.attemptNumber,
    };
  }
  throw new Error("INVALID_CLASSIFICATION_CLAIM");
}

async function finalizeClassificationEvent(params: {
  supabase: any;
  eventId: string;
  processingToken: string;
  status: "ignored" | "saved" | "failed";
  classification?: AndroidNotificationClassification;
  expenseId?: string | null;
  result: Record<string, unknown>;
}): Promise<void> {
  const { data, error } = await params.supabase
    .from("notification_capture_classifications")
    .update({
      status: params.status,
      decision: params.classification?.action ?? null,
      reason_code: params.classification?.reasonCode ?? null,
      subtype: params.classification?.subtype ?? null,
      confidence: params.classification?.confidence ?? null,
      model: params.classification?.model ?? null,
      verification_model: params.classification?.verificationModel ?? null,
      field_provenance: params.classification
        ? buildAndroidNotificationFieldProvenance(params.classification)
        : null,
      expense_id: params.expenseId ?? null,
      result: params.result,
      processing_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.eventId)
    .eq("processing_token", params.processingToken)
    .eq("status", "processing")
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("STALE_CLASSIFICATION_CLAIM");
}

async function loadRecurringSchedules(params: {
  supabase: any;
  userId: string;
  householdId: string | null;
  currency: string;
  transactionType: string;
}): Promise<AndroidRecurringScheduleRow[]> {
  let query = params.supabase
    .from("expenses")
    .select(
      "id, date, amount_cents, currency, type, merchant, account_id, household_id, split_group_id, recurrence_rule",
    )
    .eq("user_id", params.userId)
    .eq("currency", params.currency)
    .eq("type", params.transactionType)
    .eq("is_recurring", true)
    .is("deleted_at", null);
  query = params.householdId
    ? query.eq("household_id", params.householdId)
    : query.is("household_id", null);
  const schedules: AndroidRecurringScheduleRow[] = [];
  for (let offset = 0;; offset += 250) {
    const { data, error } = await query.order("id").range(offset, offset + 249);
    if (error) throw error;
    if (!Array.isArray(data)) {
      throw new Error("INVALID_RECURRING_CATALOG_RESPONSE");
    }
    schedules.push(...data);
    if (data.length < 250) return schedules;
  }
}

async function invokeWalletCapture(params: {
  request: Request;
  body: NotificationCaptureRequest;
  userId: string;
  notification: AndroidNotificationInput;
  classification: AndroidNotificationClassification;
  eventKey: string;
  accountId: string | null;
  accountCurrency: string | null;
}): Promise<{ response: Response; payload: Record<string, unknown> }> {
  const authorization = params.request.headers.get("Authorization") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const internalKey = resolveAnyInternalFunctionKey();
  const url = `${
    Deno.env.get(
      "SUPABASE_URL",
    )
  }/functions/v1/save-wallet-transaction`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(internalKey
        ? buildInternalInvokeHeaders(internalKey)
        : { Authorization: authorization, apikey: anonKey }),
    },
    body: JSON.stringify({
      captureSource: resolveNotificationCaptureSource(
        params.body.captureSource,
      ),
      userId: params.userId,
      idempotencyKey: `${params.eventKey}|transaction`,
      clientCreatedAt: params.body.clientCreatedAt,
      householdId: params.body.householdId,
      isPortfolio: params.body.isPortfolio === true,
      ...(params.accountId ? { accountId: params.accountId } : {}),
      transaction: buildNotificationCaptureTransaction(
        params.notification,
        // A completed payment is an actual, not a forecast-only template.
        {
          ...params.classification,
          isRecurring: false,
          recurrenceRule: undefined,
        },
        params.accountCurrency,
      ),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  return {
    response,
    payload: payload && typeof payload === "object" ? payload : {},
  };
}

async function invokeNotificationRecurringConfirmation(params: {
  supabase: any;
  request: Request;
  userId: string;
  eventKey: string;
  occurrence: NotificationRecurringOccurrence;
  classification: AndroidNotificationClassification;
  notification: AndroidNotificationInput;
  accountId: string | null;
}): Promise<{ response: Response; payload: Record<string, unknown> }> {
  const { schedule, scheduledOccurrenceDate } = params.occurrence;
  const idempotencyKey = `${params.eventKey}|transaction`;
  // Recover a committed write when the classification acknowledgement failed.
  // The exact event key is identity evidence; amount/name proximity is not.
  const { data: prior, error: priorError } = await params.supabase
    .from("recurring_occurrences")
    .select("actual_transaction_id, status")
    .eq("recurring_id", schedule.id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (priorError) throw priorError;
  if (prior?.status === "confirmed" && prior.actual_transaction_id) {
    const { data: transaction, error } = await params.supabase.from("expenses")
      .select("*").eq("id", prior.actual_transaction_id)
      .eq("user_id", params.userId).is("deleted_at", null).maybeSingle();
    if (error) throw error;
    if (!transaction) throw new Error("RECURRING_CONFIRMATION_RECOVERY_FAILED");
    const payload = notificationRecurringConfirmationPayload({
      success: true,
      data: { duplicate: true, transaction },
    });
    return { response: jsonResponse(payload), payload };
  }
  let customSplits: unknown = null;
  let payerUserId: string | null = null;
  if (
    schedule.household_id && schedule.split_group_id &&
    schedule.type === "expense"
  ) {
    const { data: group, error: groupError } = await params.supabase
      .from("expense_split_groups")
      .select("payer_user_id, total_amount_cents, currency")
      .eq("id", schedule.split_group_id).eq("expense_id", schedule.id)
      .eq("household_id", schedule.household_id).maybeSingle();
    if (groupError) throw groupError;
    if (
      !group || group.currency !== params.classification.currency ||
      !sanitizeUuid(group.payer_user_id)
    ) {
      throw new Error("INVALID_RECURRING_SAVED_SPLIT");
    }
    const { data: lines, error: linesError } = await params.supabase
      .from("expense_split_lines").select("user_id, amount_cents")
      .eq("split_group_id", schedule.split_group_id).order("user_id");
    if (linesError) throw linesError;
    customSplits = scaleNotificationRecurringSplit(
      lines ?? [],
      group.total_amount_cents,
      Math.round(params.classification.amount! * 100),
    );
    payerUserId = group.payer_user_id;
  }
  const internalKey = resolveAnyInternalFunctionKey();
  const response = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/confirm-recurring-occurrence`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(internalKey ? buildInternalInvokeHeaders(internalKey) : {
          Authorization: params.request.headers.get("Authorization") || "",
          apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
        }),
      },
      body: JSON.stringify({
        userId: params.userId,
        recurringId: schedule.id,
        scheduledOccurrenceDate,
        paidDate: params.classification.date,
        amount: params.classification.amount,
        accountId: params.accountId,
        merchant: params.classification.merchant,
        description: params.classification.description ?? "",
        customSplits,
        payerUserId,
        updateFutureAmount: false,
        idempotencyKey,
      }),
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    // A conflicting actual or departed split participant needs resolution; it
    // must not cause an automatic second payment or discard the notification.
    if (
      ["OCCURRENCE_CONFLICT", "OCCURRENCE_SPLIT_MEMBER_NOT_ACTIVE"].includes(
        payload?.code,
      )
    ) {
      throw new Error("NOTIFICATION_RECURRING_REQUIRES_REVIEW");
    }
    return { response, payload };
  }
  return {
    response,
    payload: notificationRecurringConfirmationPayload(payload),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  let eventId: string | null = null;
  let processingToken: string | null = null;
  let attemptNumber = 0;
  let supabase: any = null;
  let committedResponse: {
    body: Record<string, unknown>;
    status: number;
  } | null = null;
  try {
    const rawBody = await req.text();
    if (
      new TextEncoder().encode(rawBody).length >
        NOTIFICATION_CAPTURE_MAX_REQUEST_BYTES
    ) {
      return jsonResponse({ success: false, error: "Payload too large" }, 413);
    }
    let body: NotificationCaptureRequest;
    try {
      body = JSON.parse(rawBody) as NotificationCaptureRequest;
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
    }

    const notification = sanitizeNotification(body.notification);
    const eventKey = optionalString(body.idempotencyKey, 300);
    if (!notification || !eventKey) {
      return jsonResponse(
        {
          success: false,
          error: "Valid notification and idempotency key required",
        },
        400,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { success: false, error: "Server configuration error" },
        500,
      );
    }
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const auth = await authenticateUserOrInternalSecret(req, supabase);
    if (!auth.success) {
      return jsonResponse(
        { success: false, error: auth.error || "Unauthorized" },
        auth.statusCode ?? 401,
      );
    }
    const userId = auth.isInternalService
      ? sanitizeUuid(body.userId)
      : (auth.userId ?? null);
    if (!userId) {
      return jsonResponse(
        { success: false, error: "Unable to resolve user" },
        401,
      );
    }

    const subscription = await loadLatestSubscriptionForUser(supabase, userId);
    if (!hasCapturePlusEntitlement(subscription)) {
      try {
        await queueCapturePlusRequiredNotification({
          supabase,
          userId,
          captureSource: body.captureSource,
        });
      } catch (notificationError) {
        console.warn(
          "[classify-notification-capture] Failed to queue Plus-required notification",
          notificationError,
        );
      }
      return jsonResponse(jsonSubscriptionRequired("wallet capture"), 403);
    }

    const { data: contact, error: contactError } = await supabase
      .from("user_contacts")
      .select(
        "preferred_currency, preferred_language, preferred_timezone, wallet_capture_enabled",
      )
      .eq("user_id", userId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (contactError) throw contactError;
    if (contact?.wallet_capture_enabled === false) {
      return jsonResponse(
        { success: false, error: "Wallet capture is disabled" },
        403,
      );
    }

    const householdId = sanitizeUuid(body.householdId);
    const rawHouseholdId = optionalString(body.householdId, 80);
    if (rawHouseholdId && !householdId) {
      return jsonResponse(
        { success: false, error: "Valid household id required" },
        400,
      );
    }
    const requestedAccountId = sanitizeUuid(body.accountId);
    const rawAccountId = optionalString(body.accountId, 80);
    if (rawAccountId && !requestedAccountId) {
      return jsonResponse(
        { success: false, error: "Valid account id required" },
        400,
      );
    }

    if (!(await assertScopeAccess(supabase, userId, householdId))) {
      return jsonResponse(
        { success: false, error: "Destination scope is not accessible" },
        400,
      );
    }
    const accountId = requestedAccountId ??
      (await resolveDefaultAccountIdStrict(supabase, { userId, householdId }));
    let accountCurrency: string | null = null;
    if (accountId) {
      const isAccountInScope = await assertAccountInScope(supabase, accountId, {
        userId,
        householdId,
      });
      if (!isAccountInScope) {
        return jsonResponse(
          {
            success: false,
            error: "Provided account does not belong to this scope",
          },
          400,
        );
      }
      const account = await getAccountOrNull(supabase, accountId);
      accountCurrency = typeof account?.currency === "string"
        ? account.currency.trim().toUpperCase()
        : null;
      if (!accountCurrency) {
        return jsonResponse(
          { success: false, error: "Selected account has no currency" },
          400,
        );
      }
    }

    const categoryContext = await loadCategoryContext({ supabase, userId });
    const preferredTimezone = typeof contact?.preferred_timezone === "string"
      ? contact.preferred_timezone
      : null;
    const clientDate = body.clientCreatedAt
      ? new Date(body.clientCreatedAt)
      : new Date();
    const fallbackDate = getLocalYyyyMmDdInTimeZone(
      preferredTimezone,
      Number.isNaN(clientDate.getTime()) ? new Date() : clientDate,
    );
    const contextHash = await buildAndroidNotificationClassificationContextHash(
      {
        householdId,
        accountId,
        accountCurrency,
        preferredCurrency: typeof contact?.preferred_currency === "string"
          ? contact.preferred_currency
          : null,
        preferredLanguage: typeof contact?.preferred_language === "string"
          ? contact.preferred_language
          : null,
        expenseCategories: Array.from(categoryContext.allowedExpenseSet),
        incomeCategories: Array.from(categoryContext.allowedIncomeSet),
      },
    );
    const hourlyLimit = Math.max(
      1,
      Number.parseInt(
        Deno.env.get("ANDROID_NOTIFICATION_AI_HOURLY_LIMIT") ||
          String(DEFAULT_HOURLY_AI_LIMIT),
        10,
      ) || DEFAULT_HOURLY_AI_LIMIT,
    );
    const claim = await claimClassificationEvent({
      supabase,
      userId,
      eventKey,
      notification,
      hourlyLimit,
      contextHash,
    });
    if (claim.status === "cached") {
      if (claim.result.success === false && claim.result.retryable === false) {
        return jsonResponse(
          {
            success: false,
            code: "CLASSIFICATION_TERMINAL",
            error: "Notification classification failed",
            retryable: false,
          },
          422,
        );
      }
      return jsonResponse(claim.result);
    }
    if (claim.status === "processing") {
      return jsonResponse(
        {
          success: false,
          code: "REQUEST_IN_PROGRESS",
          error: "Notification classification is already in progress",
        },
        409,
      );
    }
    if (claim.status === "rate_limited") {
      return jsonResponse(
        {
          success: false,
          code: "RATE_LIMITED",
          error: "Notification classification rate limit reached",
        },
        429,
      );
    }
    eventId = claim.id;
    processingToken = claim.processingToken;
    attemptNumber = claim.attemptNumber;

    const genAI = createVertexGenerativeAI(getVertexAiConfigFromEnv());
    const classification = await classifyAndroidNotification({
      genAI,
      notification,
      fallbackDate,
      accountCurrency,
      preferredCurrency: contact?.preferred_currency,
      preferredLanguage: contact?.preferred_language,
      expenseCategories: Array.from(categoryContext.allowedExpenseSet).sort(),
      incomeCategories: Array.from(categoryContext.allowedIncomeSet).sort(),
    });

    if (classification.action === "ignore") {
      const result = {
        success: true,
        ignored: true,
        reasonCode: classification.reasonCode,
        subtype: classification.subtype,
        confidence: classification.confidence,
        pipelineVersion: ANDROID_NOTIFICATION_CLASSIFIER_PIPELINE_VERSION,
        classifierModel: classification.model ?? null,
        verificationModel: classification.verificationModel ?? null,
        normalizationDiagnostics: classification.normalizationDiagnostics ??
          null,
      };
      await finalizeClassificationEvent({
        supabase,
        eventId,
        processingToken,
        status: "ignored",
        classification,
        result,
      });
      return jsonResponse(result);
    }

    const captureAccountId = await resolveWalletCaptureAccountForCurrency(
      supabase,
      {
        userId,
        householdId,
        accountId,
        accountCurrency,
        transactionCurrency: classification.currency!,
      },
    );

    // A one-off payment to the same business near a due date is not proof of
    // recurrence. Only independently verified recurring semantics authorize it.
    const schedules =
      classification.isRecurring && classification.recurrenceRule
        ? await loadRecurringSchedules({
          supabase,
          userId,
          householdId,
          currency: classification.currency!,
          transactionType: classification.transactionType!,
        })
        : [];
    const occurrence = await resolveNotificationRecurringOccurrence(schedules, {
      merchant: classification.merchant!,
      currency: classification.currency!,
      transactionType: classification.transactionType!,
      accountId: captureAccountId,
      frequency: classification.recurrenceRule?.frequency,
      interval: classification.recurrenceRule?.interval,
      date: classification.date,
    }, async (args) => {
      const { data, error } = await supabase.rpc(
        "calculate_next_occurrence_on_or_after",
        args,
      );
      if (error) throw error;
      return data;
    });
    const saved = occurrence
      ? await invokeNotificationRecurringConfirmation({
        supabase,
        request: req,
        userId,
        eventKey,
        occurrence,
        classification,
        notification,
        accountId: captureAccountId,
      })
      : await invokeWalletCapture({
        request: req,
        body,
        userId,
        notification,
        classification,
        eventKey,
        accountId: captureAccountId,
        accountCurrency: classification.currency!,
      });
    if (!saved.response.ok) {
      const saveFailureResult = buildAndroidNotificationDependencyFailure(
        `WALLET_CAPTURE_SAVE_HTTP_${saved.response.status}`,
        saved.response.status,
      );
      if (attemptNumber === 1) {
        await reportEdgeFunctionError({
          functionName: "classify-notification-capture",
          error: new Error(saveFailureResult.diagnosticCode),
          context: {
            stage: "wallet_capture_save",
            eventId,
            status: saved.response.status,
            dependencyCode: optionalString(saved.payload.code, 80),
            accountCurrency,
            transactionCurrency: classification.currency,
            currencySource: classification.currencySource,
            reassignedAccount: captureAccountId !== accountId,
          },
        });
      }
      await finalizeClassificationEvent({
        supabase,
        eventId,
        processingToken,
        status: "failed",
        classification,
        result: saveFailureResult,
      });
      return jsonResponse(saved.payload, saved.response.status);
    }

    const savedData =
      saved.payload.data && typeof saved.payload.data === "object"
        ? (saved.payload.data as Record<string, unknown>)
        : {};
    const expenseId = optionalString(savedData.id, 80);
    if (
      saved.payload.success !== true ||
      (!expenseId && saved.payload.ignored !== true)
    ) {
      throw new Error("INVALID_CAPTURE_SAVE_RESPONSE");
    }
    const result = {
      ...saved.payload,
      classification: {
        subtype: classification.subtype,
        confidence: classification.confidence,
        isRecurring: classification.isRecurring,
        classifierModel: classification.model ?? null,
        verificationModel: classification.verificationModel ?? null,
        currencySource: classification.currencySource ?? null,
        pipelineVersion: ANDROID_NOTIFICATION_CLASSIFIER_PIPELINE_VERSION,
      },
    };
    await finalizeClassificationEvent({
      supabase,
      eventId,
      processingToken,
      status: saved.payload.ignored === true ? "ignored" : "saved",
      classification,
      expenseId,
      result,
    });
    committedResponse = { body: result, status: saved.response.status };

    return jsonResponse(result, saved.response.status);
  } catch (error) {
    if (committedResponse) {
      await reportEdgeFunctionError({
        functionName: "classify-notification-capture",
        error: new Error("POST_SAVE_RECONCILIATION_FAILED"),
        context: { stage: "post_save_reconciliation", eventId },
      });
      return jsonResponse(committedResponse.body, committedResponse.status);
    }
    const failureResult = buildAndroidNotificationFailureResult(error);
    console.error("[classify-notification-capture] Request failed", {
      error: failureResult.diagnosticCode,
      eventId,
      diagnostics: failureResult.diagnostics,
    });
    if (attemptNumber <= 1) {
      await reportEdgeFunctionError({
        functionName: "classify-notification-capture",
        error: new Error(failureResult.diagnosticCode),
        context: {
          stage: "classification",
          eventId,
          diagnosticCode: failureResult.diagnosticCode,
          diagnostics: failureResult.diagnostics,
        },
      });
    }
    if (supabase && eventId && processingToken) {
      await finalizeClassificationEvent({
        supabase,
        eventId,
        processingToken,
        status: "failed",
        result: failureResult,
      }).catch(() => undefined);
    }
    const failureStatus = httpStatusForAndroidNotificationFailure(
      failureResult,
    );
    return jsonResponse(
      {
        success: false,
        code: failureResult.retryable
          ? "CLASSIFICATION_RETRYABLE"
          : "CLASSIFICATION_TERMINAL",
        error: "Notification classification failed",
        retryable: failureResult.retryable,
      },
      failureStatus,
    );
  }
});
