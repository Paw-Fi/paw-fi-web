import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@13.10.0";
import { Environment } from "https://esm.sh/@apple/app-store-server-library@2.0.0?target=deno";

import { authenticateUser } from "../shared/auth.ts";
import {
  fetchAppStoreTransactionHistoryByOriginalId,
  findAppStoreSubscriptionStatusWithEnvironmentFallback,
  getValidatedAppStorePrivateKey,
  isAppStoreServerApiConfigured,
  type AppStoreApiConfig,
} from "../shared/app-store-api.ts";
import { getCorsHeaders } from "../shared/cors.ts";
import { normalizeLookupEmail } from "../shared/creator-user-lookup.ts";

interface LookupRequest {
  email?: string | null;
  section?: string | null;
  page?: number | null;
  pageSize?: number | null;
}

interface ProviderErrors {
  stripe?: string | null;
  appStore?: string | null;
}

const DEFAULT_PAGE_SIZE = 10;

type SectionName =
  | "transactions"
  | "accounts"
  | "budgets"
  | "recurring"
  | "devices"
  | "households"
  | "bank-connections"
  | "chat-sessions"
  | "email-import";

const PAGINATED_SECTIONS: Set<SectionName> = new Set([
  "transactions",
  "recurring",
  "chat-sessions",
]);

function isSectionName(value: unknown): value is SectionName {
  return typeof value === "string" && [
    "transactions",
    "accounts",
    "budgets",
    "recurring",
    "devices",
    "households",
    "bank-connections",
    "chat-sessions",
    "email-import",
  ].includes(value);
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { httpClient: Stripe.createFetchHttpClient() })
  : null;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") ?? "");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse({ error: "Server not configured" }, 500, corsHeaders);
  }

  const auth = await authenticateUser(req, supabase);
  if (!auth.success || !auth.userId) {
    return jsonResponse(
      { error: auth.error ?? "Unauthorized" },
      auth.statusCode ?? 401,
      corsHeaders,
    );
  }

  const creatorCheck = await supabase
    .from("users")
    .select("is_creator")
    .eq("id", auth.userId)
    .maybeSingle();

  if (creatorCheck.error) {
    return jsonResponse(
      { error: "Unable to verify creator access" },
      500,
      corsHeaders,
    );
  }

  if (!creatorCheck.data?.is_creator) {
    return jsonResponse({ error: "Forbidden" }, 403, corsHeaders);
  }

  const body = (await req.json().catch(() => null)) as LookupRequest | null;
  const email = normalizeLookupEmail(body?.email);

  if (!email) {
    return jsonResponse({ error: "Valid email is required" }, 400, corsHeaders);
  }

  const userResult = await supabase
    .from("users")
    .select("*")
    .ilike("email", email)
    .limit(2);

  if (userResult.error) {
    return jsonResponse({ error: "Failed to lookup user" }, 500, corsHeaders);
  }

  const exactUsers = (userResult.data ?? []).filter(
    (user) =>
      typeof user.email === "string" && user.email.toLowerCase() === email,
  );

  if (exactUsers.length === 0) {
    return jsonResponse({ user: null }, 200, corsHeaders);
  }

  const user = exactUsers[0];
  const section = body?.section;
  const page = Math.max(1, body?.page ?? 1);
  const pageSize = Math.max(
    1,
    Math.min(100, body?.pageSize ?? DEFAULT_PAGE_SIZE),
  );

  // SECTION MODE: fetch detailed data for a single section
  if (isSectionName(section)) {
    const sectionData = await fetchSectionData(
      supabase,
      user.id,
      section,
      page,
      pageSize,
    );
    return jsonResponse({ section, data: sectionData }, 200, corsHeaders);
  }

  // SUMMARY MODE: fetch core data + counts for all sections
  const [contactResult, subscriptionResult] = await Promise.all([
    fetchContact(user.id),
    fetchLatestSubscription(user.id),
  ]);

  if (contactResult.error || subscriptionResult.error) {
    return jsonResponse(
      { error: "Failed to load user details" },
      500,
      corsHeaders,
    );
  }

  const subscription = subscriptionResult.data;
  const errors: ProviderErrors = {};
  const [stripeData, appStoreData, counts] = await Promise.all([
    fetchStripeDetails(subscription, errors),
    fetchAppStoreDetails(supabase, subscription, errors),
    fetchAllSectionCounts(supabase, user.id),
  ]);

  return jsonResponse(
    {
      user,
      contact: contactResult.data ?? null,
      subscription: subscription ?? null,
      stripe: stripeData,
      appStore: appStoreData,
      errors,
      counts,
    },
    200,
    corsHeaders,
  );
});

// ====================
// SECTION COUNTS (for summary mode)
// ====================

async function fetchAllSectionCounts(client: typeof supabase, userId: string) {
  const [
    transactionsCount,
    accountsCount,
    budgetsCount,
    recurringCount,
    devicesCount,
    householdsCount,
    bankConnectionsCount,
    chatSessionsCount,
    emailImportSendersCount,
  ] = await Promise.all([
    countRows(client, "expenses", "user_id", userId),
    countRows(client, "accounts", "user_id", userId),
    countRows(client, "budgets", "user_id", userId),
    countRowsFiltered(client, "expenses", "user_id", userId, {
      is_recurring: true,
    }),
    countRows(client, "devices", "user_id", userId),
    countRows(client, "household_members", "user_id", userId),
    countRows(client, "bank_connections", "user_id", userId),
    countRows(client, "chat_sessions", "user_id", userId),
    countRows(client, "email_import_sender_whitelist", "user_id", userId),
  ]);

  return {
    transactions: transactionsCount,
    accounts: accountsCount,
    budgets: budgetsCount,
    recurring: recurringCount,
    devices: devicesCount,
    households: householdsCount,
    bankConnections: bankConnectionsCount,
    chatSessions: chatSessionsCount,
    emailImportSenders: emailImportSendersCount,
  };
}

async function countRows(
  client: typeof supabase,
  table: string,
  column: string,
  userId: string,
): Promise<number> {
  try {
    const { count, error } = await client
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(column, userId);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function countRowsFiltered(
  client: typeof supabase,
  table: string,
  column: string,
  userId: string,
  filters: Record<string, unknown>,
): Promise<number> {
  try {
    let query = client
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(column, userId);
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

// ====================
// SECTION DATA FETCHER (dispatches to specific section fetchers)
// ====================

async function fetchSectionData(
  client: typeof supabase,
  userId: string,
  section: SectionName,
  page: number,
  pageSize: number,
): Promise<Record<string, unknown>> {
  const offset = (page - 1) * pageSize;

  switch (section) {
    case "transactions":
      return await fetchTransactionsSection(client, userId, page, pageSize, offset);
    case "accounts":
      return await fetchAccountsSection(client, userId);
    case "budgets":
      return await fetchBudgetsSection(client, userId);
    case "recurring":
      return await fetchRecurringSection(client, userId, page, pageSize, offset);
    case "devices":
      return await fetchDevicesSection(client, userId);
    case "households":
      return await fetchHouseholdsSection(client, userId);
    case "bank-connections":
      return await fetchBankConnectionsSection(client, userId);
    case "chat-sessions":
      return await fetchChatSessionsSection(client, userId, page, pageSize, offset);
    case "email-import":
      return await fetchEmailImportSection(client, userId);
    default:
      return {};
  }
}

async function fetchContact(userId: string) {
  return await supabase
    .from("user_contacts")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
}

async function fetchLatestSubscription(userId: string) {
  return await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

async function fetchStripeDetails(
  subscription: Record<string, any> | null,
  errors: ProviderErrors,
) {
  const customerId = subscription?.stripe_customer_id;
  if (!customerId) return null;

  if (!stripe) {
    errors.stripe = "Stripe is not configured";
    return null;
  }

  try {
    const [customer, invoices, paymentMethods, charges] = await Promise.all([
      stripe.customers.retrieve(customerId),
      stripe.invoices.list({ customer: customerId, limit: 20 }),
      stripe.paymentMethods.list({ customer: customerId, type: "card" }),
      stripe.charges.list({ customer: customerId, limit: 20 }),
    ]);

    return {
      customer: sanitizeStripeCustomer(customer),
      invoices: invoices.data.map(sanitizeStripeInvoice),
      paymentMethods: paymentMethods.data.map(sanitizePaymentMethod),
      charges: charges.data.map(sanitizeStripeCharge),
    };
  } catch (error) {
    errors.stripe =
      error instanceof Error ? error.message : "Stripe lookup failed";
    return null;
  }
}

async function fetchAppStoreDetails(
  client: typeof supabase,
  subscription: Record<string, any> | null,
  errors: ProviderErrors,
) {
  const originalTransactionId = subscription?.app_store_original_transaction_id;
  if (!originalTransactionId) return null;

  const config = getAppStoreConfig(errors);
  if (!config) {
    errors.appStore ??= "App Store Server API is not configured";
    return await fetchAppStoreBacklog(client, originalTransactionId, null);
  }

  const environmentHint = resolveAppStoreEnvironment(
    subscription?.app_store_environment,
  );

  try {
    const historyLookup = await fetchAppStoreHistoryWithFallback(
      config,
      originalTransactionId,
      environmentHint,
    );
    const transactions = historyLookup.transactions;
    const latestTransaction = transactions[0] ?? null;
    const status = latestTransaction?.transactionId
      ? await findAppStoreSubscriptionStatusWithEnvironmentFallback({
          config,
          environmentHint: historyLookup.environment,
          transactionId: latestTransaction.transactionId,
          originalTransactionId,
          productId: latestTransaction.productId,
        })
      : null;
    const backlog = await fetchAppStoreBacklog(
      client,
      originalTransactionId,
      null,
    );

    return {
      originalTransactionId,
      environmentHint: historyLookup.environment,
      latestTransaction,
      transactions,
      status,
      backlog: backlog?.backlog ?? [],
    };
  } catch (error) {
    errors.appStore =
      error instanceof Error ? error.message : "App Store lookup failed";
    return await fetchAppStoreBacklog(
      client,
      originalTransactionId,
      environmentHint,
    );
  }
}

async function fetchAppStoreHistoryWithFallback(
  config: AppStoreApiConfig,
  originalTransactionId: string,
  environmentHint: Environment,
) {
  try {
    return {
      environment: environmentHint,
      transactions: await fetchAppStoreTransactionHistoryByOriginalId({
        config,
        originalTransactionId,
        environment: environmentHint,
        limit: 20,
      }),
    };
  } catch (firstError) {
    const fallbackEnvironment =
      environmentHint === Environment.SANDBOX
        ? Environment.PRODUCTION
        : Environment.SANDBOX;
    try {
      return {
        environment: fallbackEnvironment,
        transactions: await fetchAppStoreTransactionHistoryByOriginalId({
          config,
          originalTransactionId,
          environment: fallbackEnvironment,
          limit: 20,
        }),
      };
    } catch {
      throw firstError;
    }
  }
}

function getAppStoreConfig(errors: ProviderErrors): AppStoreApiConfig | null {
  const config = {
    issuerId: Deno.env.get("APPLE_APP_STORE_ISSUER_ID") ?? "",
    keyId: Deno.env.get("APPLE_APP_STORE_KEY_ID") ?? "",
    bundleId: Deno.env.get("APPLE_BUNDLE_ID") ?? "",
    privateKey: Deno.env.get("APPLE_APP_STORE_PRIVATE_KEY") ?? "",
  };

  if (!isAppStoreServerApiConfigured(config)) return null;

  try {
    return {
      ...config,
      privateKey: getValidatedAppStorePrivateKey(config.privateKey),
    };
  } catch (error) {
    errors.appStore =
      error instanceof Error
        ? error.message
        : "App Store private key is invalid";
    return null;
  }
}

async function fetchAppStoreBacklog(
  client: typeof supabase,
  originalTransactionId: string,
  environmentHint: Environment | null,
) {
  const { data, error } = await client
    .from("app_store_notification_backlog")
    .select("*")
    .eq("original_transaction_id", originalTransactionId)
    .order("last_seen_at", { ascending: false })
    .limit(20);

  if (error) {
    return {
      originalTransactionId,
      environmentHint,
      backlog: [],
      backlogError: "Failed to load App Store notification backlog",
    };
  }

  return {
    originalTransactionId,
    environmentHint,
    backlog: data ?? [],
  };
}

function resolveAppStoreEnvironment(value: unknown): Environment {
  if (typeof value === "string" && value.toLowerCase() === "sandbox") {
    return Environment.SANDBOX;
  }
  return Environment.PRODUCTION;
}

function sanitizeStripeCustomer(
  customer: Stripe.Response<Stripe.Customer | Stripe.DeletedCustomer>,
) {
  if (customer.deleted) {
    return { id: customer.id, deleted: true };
  }

  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    currency: customer.currency,
    created: toIsoFromStripeSeconds(customer.created),
    delinquent: customer.delinquent,
    metadata: customer.metadata,
  };
}

function sanitizeStripeInvoice(invoice: Stripe.Invoice) {
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    amountPaid: centsToMajor(invoice.amount_paid),
    amountDue: centsToMajor(invoice.amount_due),
    currency: invoice.currency,
    created: toIsoFromStripeSeconds(invoice.created),
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    invoicePdf: invoice.invoice_pdf,
    subscription:
      typeof invoice.subscription === "string" ? invoice.subscription : null,
  };
}

function sanitizePaymentMethod(paymentMethod: Stripe.PaymentMethod) {
  return {
    id: paymentMethod.id,
    type: paymentMethod.type,
    created: toIsoFromStripeSeconds(paymentMethod.created),
    card: paymentMethod.card
      ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year,
          funding: paymentMethod.card.funding,
          country: paymentMethod.card.country,
        }
      : null,
  };
}

function sanitizeStripeCharge(charge: Stripe.Charge) {
  return {
    id: charge.id,
    status: charge.status,
    paid: charge.paid,
    refunded: charge.refunded,
    disputed: charge.disputed,
    amount: centsToMajor(charge.amount),
    amountCaptured: centsToMajor(charge.amount_captured),
    amountRefunded: centsToMajor(charge.amount_refunded),
    currency: charge.currency,
    created: toIsoFromStripeSeconds(charge.created),
    receiptUrl: charge.receipt_url,
    paymentMethod:
      typeof charge.payment_method === "string" ? charge.payment_method : null,
  };
}

function centsToMajor(value: number) {
  return value / 100;
}

function toIsoFromStripeSeconds(value: number | null | undefined) {
  return typeof value === "number"
    ? new Date(value * 1000).toISOString()
    : null;
}

// ====================
// SECTION DATA FETCHERS (lazy-loaded with pagination)
// ====================

async function fetchTransactionsSection(
  client: typeof supabase,
  userId: string,
  page: number,
  pageSize: number,
  offset: number,
): Promise<Record<string, unknown>> {
  try {
    const [
      pageResult,
      countResult,
      totalsResult,
    ] = await Promise.all([
      client
        .from("expenses")
        .select(
          "id,date,amount_cents,currency,category,source,type,account_id,created_at,updated_at",
        )
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1),
      client
        .from("expenses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      client
        .from("expenses")
        .select("amount_cents,currency,type")
        .eq("user_id", userId)
        .limit(10000),
    ]);

    const totalsMap = new Map<
      string,
      { expense: number; income: number; expenseCount: number; incomeCount: number }
    >();
    for (const rec of totalsResult.data ?? []) {
      const key = rec.currency ?? "UNKNOWN";
      const entry = totalsMap.get(key) ?? {
        expense: 0,
        income: 0,
        expenseCount: 0,
        incomeCount: 0,
      };
      if (rec.type === "income") {
        entry.income += rec.amount_cents ?? 0;
        entry.incomeCount += 1;
      } else {
        entry.expense += rec.amount_cents ?? 0;
        entry.expenseCount += 1;
      }
      totalsMap.set(key, entry);
    }

    const totalsByCurrency = Array.from(totalsMap.entries()).map(
      ([currency, val]) => ({
        currency,
        expenseTotalCents: val.expense,
        incomeTotalCents: val.income,
        expenseCount: val.expenseCount,
        incomeCount: val.incomeCount,
      }),
    );

    return {
      rows: pageResult.data ?? [],
      totalCount: countResult.count ?? 0,
      page,
      pageSize,
      totalsByCurrency,
    };
  } catch {
    return { rows: [], totalCount: 0, page, pageSize, totalsByCurrency: [] };
  }
}

async function fetchAccountsSection(
  client: typeof supabase,
  userId: string,
): Promise<Record<string, unknown>> {
  try {
    const { data, error } = await client
      .from("accounts")
      .select(
        "id,name,icon,color,opening_balance_cents,goal_amount_cents,is_default,is_system,is_archived,household_id,linked_bank_account_id,created_at,updated_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return { rows: [] };
    return { rows: data ?? [] };
  } catch {
    return { rows: [] };
  }
}

async function fetchBudgetsSection(
  client: typeof supabase,
  userId: string,
): Promise<Record<string, unknown>> {
  try {
    const { data: budgets, error: budgetsError } = await client
      .from("budgets")
      .select(
        "id,period_month,currency,total_budget_cents,household_id,created_at,updated_at",
      )
      .eq("user_id", userId)
      .order("period_month", { ascending: false })
      .limit(50);

    if (budgetsError || !budgets || budgets.length === 0) {
      return { budgets: [], envelopes: [] };
    }

    const budgetIds = budgets.map((b) => b.id);
    const { data: envelopes, error: envelopesError } = await client
      .from("budget_envelopes")
      .select(
        "id,budget_id,name,budget_percentage,currency,icon,color,created_at,updated_at",
      )
      .in("budget_id", budgetIds)
      .order("created_at", { ascending: false })
      .limit(200);

    if (envelopesError) {
      return { budgets, envelopes: [] };
    }

    return { budgets, envelopes: envelopes ?? [] };
  } catch {
    return { budgets: [], envelopes: [] };
  }
}

async function fetchRecurringSection(
  client: typeof supabase,
  userId: string,
  page: number,
  pageSize: number,
  offset: number,
): Promise<Record<string, unknown>> {
  try {
    const [pageResult, countResult] = await Promise.all([
      client
        .from("expenses")
        .select(
          "id,date,amount_cents,currency,category,source,type,recurrence_rule,is_recurring,created_at,updated_at",
        )
        .eq("user_id", userId)
        .eq("is_recurring", true)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1),
      client
        .from("expenses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_recurring", true),
    ]);

    return {
      rows: pageResult.data ?? [],
      totalCount: countResult.count ?? 0,
      page,
      pageSize,
    };
  } catch {
    return { rows: [], totalCount: 0, page, pageSize };
  }
}

async function fetchDevicesSection(
  client: typeof supabase,
  userId: string,
): Promise<Record<string, unknown>> {
  try {
    const { data, error } = await client
      .from("devices")
      .select(
        "id,platform,device_model,os_version,app_version,locale,timezone,is_active,last_seen_at,created_at,updated_at",
      )
      .eq("user_id", userId)
      .order("last_seen_at", { ascending: false, nullsFirst: false })
      .limit(50);

    if (error) return { rows: [] };
    return { rows: data ?? [] };
  } catch {
    return { rows: [] };
  }
}

async function fetchHouseholdsSection(
  client: typeof supabase,
  userId: string,
): Promise<Record<string, unknown>> {
  try {
    const { data: memberships, error: membershipsError } = await client
      .from("household_members")
      .select("household_id,role,joined_at,created_at,updated_at")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false });

    if (membershipsError || !memberships || memberships.length === 0) {
      return { rows: [] };
    }

    const householdIds = memberships.map((m) => m.household_id);
    const [householdsResult, membersResult] = await Promise.all([
      client
        .from("households")
        .select(
          "id,name,owner_id,currency,cover_image_url,theme_color,created_at,updated_at",
        )
        .in("id", householdIds)
        .order("created_at", { ascending: false }),
      client
        .from("household_members")
        .select("household_id,user_id,role,joined_at")
        .in("household_id", householdIds),
    ]);

    if (householdsResult.error || !householdsResult.data) return { rows: [] };

    const memberCounts = new Map<string, number>();
    for (const m of membersResult.data ?? []) {
      memberCounts.set(
        m.household_id,
        (memberCounts.get(m.household_id) ?? 0) + 1,
      );
    }

    const rows = householdsResult.data.map((h) => ({
      ...h,
      member_count: memberCounts.get(h.id) ?? 0,
      current_user_role: memberships.find((m) => m.household_id === h.id)
        ?.role ?? null,
      current_user_joined_at: memberships.find(
        (m) => m.household_id === h.id,
      )?.joined_at ?? null,
    }));

    return { rows };
  } catch {
    return { rows: [] };
  }
}

async function fetchBankConnectionsSection(
  client: typeof supabase,
  userId: string,
): Promise<Record<string, unknown>> {
  try {
    const [connectionsResult, accountsResult] = await Promise.all([
      client
        .from("bank_connections")
        .select(
          "id,provider,status,last_synced_at,error_code,error_message,country_code,household_id,created_at,updated_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      client
        .from("bank_accounts")
        .select(
          "id,bank_connection_id,provider,name,official_name,mask,currency,type,subtype,status,last_synced_at,created_at,updated_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (connectionsResult.error) return { connections: [], bankAccounts: [] };

    return {
      connections: connectionsResult.data ?? [],
      bankAccounts: accountsResult.data ?? [],
    };
  } catch {
    return { connections: [], bankAccounts: [] };
  }
}

async function fetchChatSessionsSection(
  client: typeof supabase,
  userId: string,
  page: number,
  pageSize: number,
  offset: number,
): Promise<Record<string, unknown>> {
  try {
    const [pageResult, countResult] = await Promise.all([
      client
        .from("chat_sessions")
        .select("id,session_id,model,is_active,created_at,updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .range(offset, offset + pageSize - 1),
      client
        .from("chat_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

    const sessions = pageResult.data ?? [];
    if (sessions.length === 0) {
      return { rows: [], totalCount: countResult.count ?? 0, page, pageSize };
    }

    const sessionIds = sessions.map((s) => s.id);
    const { data: messageRows } = await client
      .from("chat_messages")
      .select("chat_session_id")
      .in("chat_session_id", sessionIds);

    const counts = new Map<string, number>();
    for (const m of messageRows ?? []) {
      counts.set(
        m.chat_session_id,
        (counts.get(m.chat_session_id) ?? 0) + 1,
      );
    }

    return {
      rows: sessions.map((s) => ({
        ...s,
        message_count: counts.get(s.id) ?? 0,
      })),
      totalCount: countResult.count ?? 0,
      page,
      pageSize,
    };
  } catch {
    return { rows: [], totalCount: 0, page, pageSize };
  }
}

async function fetchEmailImportSection(
  client: typeof supabase,
  userId: string,
): Promise<Record<string, unknown>> {
  try {
    const { data: senders, error } = await client
      .from("email_import_sender_whitelist")
      .select("id,sender_email,normalized_sender_email,created_at,updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return { senders: [] };
    return { senders: senders ?? [] };
  } catch {
    return { senders: [] };
  }
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
