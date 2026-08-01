import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

import { corsHeaders } from "../shared/cors.ts";
import {
  authenticateUserOrInternalSecret,
  buildInternalInvokeHeaders,
  resolveAnyInternalFunctionKey,
} from "../shared/auth.ts";
import {
  type AndroidNotificationClassification,
  type AndroidNotificationInput,
  buildAndroidNotificationFailureResult,
  buildAndroidNotificationFieldProvenance,
  classifyAndroidNotification,
} from "../shared/android-notification-classifier.ts";
import {
  assertAccountInScope,
  assertScopeAccess,
  getAccountOrNull,
  resolveDefaultAccountIdStrict,
} from "../shared/accounts.ts";
import {
  type AndroidRecurringScheduleRow,
  type AndroidSavedRecurringRow,
  findAndroidRecurringCaptureMatch,
  savedExpenseMatchesRecurringReplacement,
} from "../shared/android-recurring-capture.ts";
import { loadCategoryContext } from "../shared/category-resolution.ts";
import { reportEdgeFunctionError } from "../shared/edge-error-alert.ts";
import {
  hasPlusEntitlement,
  jsonSubscriptionRequired,
  loadLatestSubscriptionForUser,
} from "../shared/plus-entitlement.ts";
import {
  createVertexGenerativeAI,
  getVertexAiConfigFromEnv,
} from "../shared/vertex-ai-chat.ts";
import { getLocalYyyyMmDdInTimeZone } from "../shared/wallet-capture.ts";
import { sendNotificationCapturePushBestEffort } from "../shared/notification-capture-push.ts";

const MAX_REQUEST_BYTES = 32_000;
const MAX_FIELD_LENGTH = 2_000;
const MAX_TEXT_LINES = 20;
const DEFAULT_HOURLY_AI_LIMIT = 60;
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
}): Promise<
  | { status: "claimed"; id: string }
  | { status: "cached"; result: Record<string, unknown> }
  | { status: "processing" }
  | { status: "rate_limited" }
> {
  const { data, error } = await params.supabase.rpc(
    "claim_notification_capture_classification",
    {
      p_user_id: params.userId,
      p_event_key: params.eventKey,
      p_source_package: params.notification.packageName,
      p_source_app_label: params.notification.sourceAppLabel ?? null,
      p_hourly_limit: params.hourlyLimit,
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
  if (result.status === "claimed" && typeof result.eventId === "string") {
    return { status: "claimed", id: result.eventId };
  }
  throw new Error("INVALID_CLASSIFICATION_CLAIM");
}

async function finalizeClassificationEvent(params: {
  supabase: any;
  eventId: string;
  status: "ignored" | "saved" | "failed";
  classification?: AndroidNotificationClassification;
  expenseId?: string | null;
  result: Record<string, unknown>;
}): Promise<void> {
  const { error } = await params.supabase
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
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.eventId);
  if (error) throw error;
}

function ignoredMessage(
  classification: AndroidNotificationClassification,
): string {
  switch (classification.reasonCode) {
    case "promotion":
      return "Moneko identified a promotion, so nothing was added.";
    case "not_posted":
      return "Moneko could not confirm a completed transaction, so nothing was added.";
    case "transfer_requires_wallets":
      return "Moneko found a transfer, but could not safely resolve both wallets.";
    case "rate_limited":
      return "Moneko paused AI capture after unusually high notification activity.";
    default:
      return "Moneko could not verify this notification, so nothing was added.";
  }
}

async function sendDecisionPush(params: {
  supabase: any;
  userId: string;
  title: string;
  body: string;
  eventType: string;
  deepLink?: string;
  notificationId: string;
}): Promise<void> {
  await sendNotificationCapturePushBestEffort({
    supabase: params.supabase,
    userId: params.userId,
    title: params.title,
    body: params.body,
    data: {
      event_type: params.eventType,
      notification_type: "android_notification_capture",
      notification_id: params.notificationId,
      deep_link: params.deepLink ?? "moneko://home",
    },
    firebaseProjectId: Deno.env.get("FIREBASE_PROJECT_ID") || "",
    firebaseServiceAccountJson: Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") ||
      "",
    iosBundleId: Deno.env.get("IOS_BUNDLE_ID") || "com.moneko.mobile",
  });
}

function previousDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().slice(0, 10);
}

async function loadRecurringSchedules(params: {
  supabase: any;
  userId: string;
  householdId: string | null;
}): Promise<AndroidRecurringScheduleRow[]> {
  let query = params.supabase
    .from("expenses")
    .select(
      "id, date, amount_cents, currency, type, merchant, raw_text, account_id, recurrence_rule",
    )
    .eq("user_id", params.userId)
    .eq("is_recurring", true)
    .is("deleted_at", null);
  query = params.householdId
    ? query.eq("household_id", params.householdId)
    : query.is("household_id", null);
  const { data, error } = await query.limit(250);
  if (error) throw error;
  return Array.isArray(data) ? (data as AndroidRecurringScheduleRow[]) : [];
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
      captureSource: "android_notification_listener",
      userId: params.userId,
      idempotencyKey: `${params.eventKey}|transaction`,
      clientCreatedAt: params.body.clientCreatedAt,
      householdId: params.body.householdId,
      isPortfolio: params.body.isPortfolio === true,
      accountId: params.accountId,
      suppressNotification: params.classification.isRecurring,
      transaction: {
        merchantName: params.classification.merchant,
        type: params.classification.transactionType,
        amount: params.classification.amount,
        currency: params.classification.currency,
        currencyEvidenceRaw: params.classification.currencyEvidenceRaw,
        currencyEvidenceType:
          params.classification.currencySource === "account_context"
            ? "ai_account_context"
            : params.classification.currencySource === "user_preference"
            ? "ai_user_preference"
            : "ai_notification_explicit",
        currencyAmbiguous: params.classification.currencyAmbiguous,
        accountCurrency: params.accountCurrency,
        date: params.classification.date,
        packageName: params.notification.packageName,
        sourceAppLabel: params.notification.sourceAppLabel,
        notificationKey: params.notification.notificationKey,
        externalSourceId: params.notification.notificationKey,
        notificationPostTime: params.notification.notificationPostTime,
        note: params.classification.description,
        categoryHint: params.classification.category,
        isRecurring: params.classification.isRecurring,
        recurrenceRule: params.classification.recurrenceRule,
      },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  return {
    response,
    payload: payload && typeof payload === "object" ? payload : {},
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
  let supabase: any = null;
  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).length > MAX_REQUEST_BYTES) {
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
    if (!hasPlusEntitlement(subscription)) {
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
    });
    if (claim.status === "cached") return jsonResponse(claim.result);
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

    const rejectClaimedRequest = async (error: string): Promise<Response> => {
      const result = { success: false, error };
      await finalizeClassificationEvent({
        supabase,
        eventId: claim.id,
        status: "failed",
        result,
      });
      return jsonResponse(result, 400);
    };

    if (!(await assertScopeAccess(supabase, userId, householdId))) {
      return await rejectClaimedRequest("Destination scope is not accessible");
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
        return await rejectClaimedRequest(
          "Provided account does not belong to this scope",
        );
      }
      const account = await getAccountOrNull(supabase, accountId);
      accountCurrency = typeof account?.currency === "string"
        ? account.currency.trim().toUpperCase()
        : null;
      if (!accountCurrency) {
        return await rejectClaimedRequest("Selected account has no currency");
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
        classifierModel: classification.model ?? null,
        verificationModel: classification.verificationModel ?? null,
        normalizationDiagnostics: classification.normalizationDiagnostics ??
          null,
      };
      await finalizeClassificationEvent({
        supabase,
        eventId,
        status: "ignored",
        classification,
        result,
      });
      await sendDecisionPush({
        supabase,
        userId,
        title: "Notification not added",
        body: ignoredMessage(classification),
        eventType: "notification_capture_ignored",
        notificationId: eventId,
      });
      return jsonResponse(result);
    }

    let replacedSchedule: AndroidRecurringScheduleRow | null = null;
    if (classification.isRecurring && classification.recurrenceRule) {
      const schedules = await loadRecurringSchedules({
        supabase,
        userId,
        householdId,
      });
      const recurringMatch = findAndroidRecurringCaptureMatch(schedules, {
        merchant: classification.merchant!,
        amountCents: Math.round(classification.amount! * 100),
        currency: classification.currency!,
        transactionType: classification.transactionType!,
        accountId,
        frequency: classification.recurrenceRule.frequency,
        date: classification.date,
      });
      if (recurringMatch?.kind === "existing") {
        const result = {
          success: true,
          ignored: true,
          reasonCode: "recurring_schedule_exists",
          recurringId: recurringMatch.schedule.id,
        };
        await finalizeClassificationEvent({
          supabase,
          eventId,
          status: "ignored",
          classification,
          result,
        });
        await sendDecisionPush({
          supabase,
          userId,
          title: "Recurring transaction already tracked",
          body:
            "This completed notification is already covered by an existing recurring schedule. No duplicate was added.",
          eventType: "notification_capture_recurring_existing",
          deepLink: `moneko://recurring/${recurringMatch.schedule.id}`,
          notificationId: eventId,
        });
        return jsonResponse(result);
      }
      if (recurringMatch?.kind === "replacement") {
        replacedSchedule = recurringMatch.schedule;
      }
    }

    const saved = await invokeWalletCapture({
      request: req,
      body,
      userId,
      notification,
      classification,
      eventKey,
      accountId,
      accountCurrency,
    });
    if (!saved.response.ok) {
      await reportEdgeFunctionError({
        functionName: "classify-notification-capture",
        error: new Error(`WALLET_CAPTURE_SAVE_HTTP_${saved.response.status}`),
        context: {
          stage: "wallet_capture_save",
          eventId,
          status: saved.response.status,
        },
      });
      await finalizeClassificationEvent({
        supabase,
        eventId,
        status: "failed",
        classification,
        result: {
          success: false,
          error: "Wallet capture save failed",
          status: saved.response.status,
        },
      });
      return jsonResponse(saved.payload, saved.response.status);
    }

    const savedData =
      saved.payload.data && typeof saved.payload.data === "object"
        ? (saved.payload.data as Record<string, unknown>)
        : {};
    const savedMeta =
      saved.payload.meta && typeof saved.payload.meta === "object"
        ? (saved.payload.meta as Record<string, unknown>)
        : {};
    const isCrossSourceLogicalDuplicate = String(
      savedMeta.deduplicationReason ?? "",
    ).startsWith("android_logical_duplicate");
    const expenseId = optionalString(savedData.id, 80);
    let didReplaceSchedule = false;
    if (
      replacedSchedule &&
      expenseId &&
      classification.recurrenceRule &&
      !isCrossSourceLogicalDuplicate
    ) {
      const { data: savedExpense, error: savedExpenseError } = await supabase
        .from("expenses")
        .select(
          "id, amount_cents, currency, type, account_id, is_recurring, recurrence_rule",
        )
        .eq("id", expenseId)
        .eq("user_id", userId)
        .maybeSingle();
      if (savedExpenseError) throw savedExpenseError;

      if (
        savedExpense &&
        savedExpenseMatchesRecurringReplacement(
          savedExpense as AndroidSavedRecurringRow,
          {
            replacedScheduleId: replacedSchedule.id,
            amountCents: Math.round(classification.amount! * 100),
            currency: classification.currency!,
            transactionType: classification.transactionType!,
            accountId,
            frequency: classification.recurrenceRule.frequency,
          },
        )
      ) {
        const replacementRule = {
          ...(replacedSchedule.recurrence_rule ?? {}),
          end_date: previousDate(classification.date),
        };
        const { error: closeError } = await supabase
          .from("expenses")
          .update({ recurrence_rule: replacementRule })
          .eq("id", replacedSchedule.id)
          .eq("user_id", userId);
        if (closeError) throw closeError;
        didReplaceSchedule = true;
      }
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
      },
    };
    await finalizeClassificationEvent({
      supabase,
      eventId,
      status: "saved",
      classification,
      expenseId,
      result,
    });

    const savedIsRecurring = savedData.is_recurring === true;
    if (
      classification.isRecurring &&
      expenseId &&
      savedIsRecurring &&
      (!replacedSchedule || didReplaceSchedule)
    ) {
      await sendDecisionPush({
        supabase,
        userId,
        title: didReplaceSchedule
          ? "Recurring transaction replaced"
          : "Recurring transaction created",
        body: didReplaceSchedule
          ? "Moneko ended the previous recurring schedule and created a replacement for the updated amount."
          : "Moneko created a recurring transaction from a completed notification.",
        eventType: didReplaceSchedule
          ? "notification_capture_recurring_replaced"
          : "notification_capture_recurring_created",
        deepLink: `moneko://recurring/${expenseId}`,
        notificationId: eventId,
      });
    }

    return jsonResponse(result, saved.response.status);
  } catch (error) {
    const failureResult = buildAndroidNotificationFailureResult(error);
    console.error("[classify-notification-capture] Request failed", {
      error: failureResult.diagnosticCode,
      eventId,
      diagnostics: failureResult.diagnostics,
    });
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
    if (supabase && eventId) {
      await finalizeClassificationEvent({
        supabase,
        eventId,
        status: "failed",
        result: failureResult,
      }).catch(() => undefined);
    }
    return jsonResponse(
      { success: false, error: "Notification classification failed" },
      503,
    );
  }
});
