import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCorsHeaders } from "../shared/cors.ts";
import { authenticateUser } from "../shared/auth.ts";
import { assertScopeAccess, sanitizeUuid } from "../shared/accounts.ts";
import { getUserPremiumAccessByUserId } from "../shared/premium-access.ts";
import {
  buildCsv,
  buildPremiumZip,
  type PremiumZipFile,
  utf8Bytes,
} from "../shared/premium-export-utils.ts";
import { sanitizeStorageFilename } from "../shared/premium-storage.ts";

type ExportAction =
  | "create"
  | "status"
  | "download"
  | "list"
  | "list_attachments"
  | "download_attachment";
type ExportType =
  | "transactions_csv"
  | "reports_csv"
  | "tax_package_zip"
  | "files_zip"
  | "account_history_csv"
  | "category_data_csv"
  | "everything_zip";

interface ExportCenterRequest {
  action: ExportAction;
  jobId?: string;
  attachmentId?: string;
  exportType?: ExportType;
  filters?: ExportFilters;
}

interface ExportFilters {
  startDate?: string;
  endDate?: string;
  displayCurrency?: string;
  selectedCurrencies?: string[];
  accountIds?: string[];
  categories?: string[];
  householdId?: string | null;
  includeReceipts?: boolean;
  includeEmailAttachments?: boolean;
  includeAccountHistory?: boolean;
  includeCategoryData?: boolean;
}

interface NormalizedFilters {
  startDate: string;
  endDate: string;
  displayCurrency: string;
  selectedCurrencies: string[];
  accountIds: string[];
  categories: string[];
  householdId: string | null;
  includeReceipts: boolean;
  includeEmailAttachments: boolean;
  includeAccountHistory: boolean;
  includeCategoryData: boolean;
}

interface TransactionRow {
  id: string;
  date: string;
  type: string | null;
  amount_cents: number | null;
  currency: string | null;
  category: string | null;
  raw_text: string | null;
  merchant: string | null;
  account_id: string | null;
  receipt_image_url: string | null;
  attachments: unknown;
  created_at: string | null;
  analytics_is_final: boolean;
  analytics_spending_multiplier: number;
  analytics_counts_toward_income: boolean;
}

interface AccountRow {
  id: string;
  name: string;
  currency: string | null;
  opening_balance_cents: number | null;
  created_at: string | null;
  updated_at: string | null;
}

interface EmailAttachmentRow {
  id: string;
  storage_bucket: string;
  storage_path: string;
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
  created_at: string | null;
}

const EXPORT_TYPES = new Set<ExportType>([
  "transactions_csv",
  "reports_csv",
  "tax_package_zip",
  "files_zip",
  "account_history_csv",
  "category_data_csv",
  "everything_zip",
]);
const PENDING_STATUSES = new Set([
  "queued",
  "preparing",
  "collecting_files",
  "generating",
]);
const JSON_HEADERS = { "Content-Type": "application/json" };
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_REGEX = /^[A-Z]{3}$/;

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin") || "");
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Method not allowed" },
      405,
      corsHeaders,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { success: false, error: "Server configuration error" },
      500,
      corsHeaders,
    );
  }

  try {
    const body = await readJsonBody(req);
    if (!isValidAction(body.action)) {
      return jsonResponse(
        { success: false, error: "Invalid action" },
        400,
        corsHeaders,
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: { headers: { "X-Client-Info": "moneko-premium-export-center" } },
    });

    const auth = await authenticateUser(req, supabase);
    if (!auth.success || !auth.userId) {
      return jsonResponse(
        { success: false, error: auth.error ?? "Unauthorized" },
        auth.statusCode ?? 401,
        corsHeaders,
      );
    }

    const access = await getUserPremiumAccessByUserId(supabase, auth.userId);
    if (!access.hasPremiumAccess) {
      return jsonResponse(
        {
          success: false,
          error: "Premium access required",
          code: "PREMIUM_REQUIRED",
          plan: access.plan,
          status: access.status,
        },
        403,
        corsHeaders,
      );
    }

    if (body.action === "list_attachments") {
      const filters = validateFilters(body.filters ?? {});
      if ("error" in filters) {
        return jsonResponse(
          { success: false, error: filters.error },
          400,
          corsHeaders,
        );
      }
      return jsonResponse(
        {
          success: true,
          data: await listAttachments(supabase, auth.userId, filters),
        },
        200,
        corsHeaders,
      );
    }

    if (body.action === "download_attachment") {
      const attachmentId = sanitizeUuid(body.attachmentId ?? null);
      if (!attachmentId) {
        return jsonResponse(
          { success: false, error: "Invalid attachmentId" },
          400,
          corsHeaders,
        );
      }
      const attachment = await getOwnAttachment(
        supabase,
        auth.userId,
        attachmentId,
      );
      if (!attachment) {
        return jsonResponse(
          { success: false, error: "Attachment not found" },
          404,
          corsHeaders,
        );
      }
      if (!attachment.storage_path.startsWith(`${auth.userId}/`)) {
        return jsonResponse(
          { success: false, error: "Attachment not found" },
          404,
          corsHeaders,
        );
      }
      const { data, error } = await supabase.storage
        .from("email-import-attachments")
        .createSignedUrl(attachment.storage_path, 60 * 10, {
          download: attachment.filename,
        });
      if (error || !data?.signedUrl) {
        throw error ?? new Error("signed URL missing");
      }
      return jsonResponse(
        {
          success: true,
          data: {
            signedUrl: data.signedUrl,
            expiresIn: 600,
            filename: attachment.filename,
          },
        },
        200,
        corsHeaders,
      );
    }

    if (body.action === "list") {
      return jsonResponse(
        { success: true, data: await listJobs(supabase, auth.userId) },
        200,
        corsHeaders,
      );
    }

    if (body.action === "status") {
      const jobId = sanitizeUuid(body.jobId ?? null);
      if (!jobId) {
        return jsonResponse(
          { success: false, error: "Invalid jobId" },
          400,
          corsHeaders,
        );
      }
      return jsonResponse(
        { success: true, data: await getOwnJob(supabase, auth.userId, jobId) },
        200,
        corsHeaders,
      );
    }

    if (body.action === "download") {
      const jobId = sanitizeUuid(body.jobId ?? null);
      if (!jobId) {
        return jsonResponse(
          { success: false, error: "Invalid jobId" },
          400,
          corsHeaders,
        );
      }
      const job = await getOwnJob(supabase, auth.userId, jobId);
      if (!job || job.status !== "ready" || !job.storage_path) {
        return jsonResponse(
          { success: false, error: "Export is not ready" },
          404,
          corsHeaders,
        );
      }
      const { data, error } = await supabase.storage
        .from(job.storage_bucket || "premium-exports")
        .createSignedUrl(job.storage_path, 60 * 10);
      if (error || !data?.signedUrl) {
        throw error ?? new Error("signed URL missing");
      }
      return jsonResponse(
        {
          success: true,
          data: { job, signedUrl: data.signedUrl, expiresIn: 600 },
        },
        200,
        corsHeaders,
      );
    }

    const exportType = body.exportType;
    if (!exportType || !EXPORT_TYPES.has(exportType)) {
      return jsonResponse(
        { success: false, error: "Invalid exportType" },
        400,
        corsHeaders,
      );
    }
    const filters = validateFilters(body.filters ?? {});
    if ("error" in filters) {
      return jsonResponse(
        { success: false, error: filters.error },
        400,
        corsHeaders,
      );
    }
    const canAccessScope = await assertScopeAccess(
      supabase,
      auth.userId,
      filters.householdId,
    );
    if (!canAccessScope) {
      return jsonResponse(
        { success: false, error: "Forbidden scope" },
        403,
        corsHeaders,
      );
    }

    const job = await createQueuedJob(
      supabase,
      auth.userId,
      exportType,
      filters,
    );
    const readyJob = await generateExport(
      supabase,
      auth.userId,
      job.id,
      exportType,
      filters,
    );
    return jsonResponse({ success: true, data: readyJob }, 200, corsHeaders);
  } catch (error) {
    console.error("[premium-export-center] failed", error);
    return jsonResponse(
      { success: false, error: "Export center request failed" },
      500,
      corsHeaders,
    );
  }
});

async function readJsonBody(req: Request): Promise<ExportCenterRequest> {
  const text = await req.text();
  if (!text.trim()) return { action: "list" };
  return JSON.parse(text) as ExportCenterRequest;
}

function isValidAction(action: unknown): action is ExportAction {
  return (
    action === "create" ||
    action === "status" ||
    action === "download" ||
    action === "list" ||
    action === "list_attachments" ||
    action === "download_attachment"
  );
}

function validateFilters(
  filters: ExportFilters,
): NormalizedFilters | { error: string } {
  const now = new Date();
  const startDate =
    normalizeDate(filters.startDate) ?? `${now.getUTCFullYear()}-01-01`;
  const endDate =
    normalizeDate(filters.endDate) ?? now.toISOString().slice(0, 10);
  if (
    (filters.startDate && !normalizeDate(filters.startDate)) ||
    (filters.endDate && !normalizeDate(filters.endDate))
  ) {
    return { error: "Invalid date range" };
  }
  if (startDate > endDate) return { error: "startDate must be before endDate" };
  const displayCurrency = normalizeCurrency(filters.displayCurrency) ?? "USD";
  const selectedCurrencies = normalizeCurrencies(
    filters.selectedCurrencies,
  ) ?? [displayCurrency];
  const accountIds = normalizeUuidList(filters.accountIds);
  const householdId =
    filters.householdId == null ? null : sanitizeUuid(filters.householdId);
  if (filters.householdId && !householdId) {
    return { error: "Invalid householdId" };
  }
  if (filters.accountIds && accountIds == null) {
    return { error: "Invalid accountIds" };
  }

  return {
    startDate,
    endDate,
    displayCurrency,
    selectedCurrencies,
    accountIds: accountIds ?? [],
    categories: normalizeTextList(filters.categories),
    householdId,
    includeReceipts: filters.includeReceipts !== false,
    includeEmailAttachments: filters.includeEmailAttachments !== false,
    includeAccountHistory: filters.includeAccountHistory !== false,
    includeCategoryData: filters.includeCategoryData !== false,
  };
}

async function listJobs(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("premium_export_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) throw error;
  return data ?? [];
}

async function listAttachments(
  supabase: any,
  userId: string,
  filters: NormalizedFilters,
) {
  let query = supabase
    .from("email_import_attachments")
    .select("id, filename, content_type, size_bytes, created_at")
    .eq("user_id", userId)
    .in("status", ["stored", "linked"])
    .gte("created_at", `${filters.startDate}T00:00:00.000Z`)
    .lte("created_at", `${filters.endDate}T23:59:59.999Z`)
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function getOwnAttachment(
  supabase: any,
  userId: string,
  attachmentId: string,
): Promise<EmailAttachmentRow | null> {
  const { data, error } = await supabase
    .from("email_import_attachments")
    .select(
      "id, storage_bucket, storage_path, filename, content_type, size_bytes, created_at",
    )
    .eq("id", attachmentId)
    .eq("user_id", userId)
    .in("status", ["stored", "linked"])
    .maybeSingle();
  if (error) throw error;
  return data as EmailAttachmentRow | null;
}

async function getOwnJob(supabase: any, userId: string, jobId: string) {
  const { data, error } = await supabase
    .from("premium_export_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function createQueuedJob(
  supabase: any,
  userId: string,
  exportType: ExportType,
  filters: NormalizedFilters,
) {
  const { data, error } = await supabase
    .from("premium_export_jobs")
    .insert({
      user_id: userId,
      export_type: exportType,
      filters,
      status: "queued",
      progress_percent: 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function generateExport(
  supabase: any,
  userId: string,
  jobId: string,
  exportType: ExportType,
  filters: NormalizedFilters,
) {
  try {
    await updateJob(supabase, jobId, {
      status: "preparing",
      progress_percent: 10,
    });
    const [transactions, accounts, emailAttachments] = await Promise.all([
      fetchTransactions(supabase, userId, filters),
      fetchAccounts(supabase, userId, filters),
      fetchEmailAttachments(supabase, userId, filters),
    ]);
    await updateJob(supabase, jobId, {
      status: "generating",
      progress_percent: 55,
    });

    const generated = await buildExportFile(
      supabase,
      userId,
      exportType,
      filters,
      transactions,
      accounts,
      emailAttachments,
    );
    const storagePath = `${userId}/${jobId}/${generated.fileName}`;
    const { error: uploadError } = await supabase.storage
      .from("premium-exports")
      .upload(storagePath, generated.bytes, {
        contentType: generated.mimeType,
        upsert: true,
      });
    if (uploadError) throw uploadError;

    await updateJob(supabase, jobId, {
      status: "ready",
      progress_percent: 100,
      storage_path: storagePath,
      file_name: generated.fileName,
      mime_type: generated.mimeType,
      size_bytes: generated.bytes.length,
      completed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    return await getOwnJob(supabase, userId, jobId);
  } catch (error) {
    await updateJob(supabase, jobId, {
      status: "failed",
      progress_percent: 100,
      error_text: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function updateJob(
  supabase: any,
  jobId: string,
  values: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("premium_export_jobs")
    .update(values)
    .eq("id", jobId);
  if (error) throw error;
}

async function buildExportFile(
  supabase: any,
  userId: string,
  exportType: ExportType,
  filters: NormalizedFilters,
  transactions: TransactionRow[],
  accounts: AccountRow[],
  emailAttachments: EmailAttachmentRow[],
): Promise<{ fileName: string; mimeType: string; bytes: Uint8Array }> {
  const stamp = new Date().toISOString().slice(0, 10);
  if (exportType === "transactions_csv") {
    return {
      fileName: `moneko-transactions-${stamp}.csv`,
      mimeType: "text/csv;charset=utf-8",
      bytes: utf8Bytes(buildTransactionsCsv(transactions, accounts)),
    };
  }
  if (exportType === "reports_csv") {
    return {
      fileName: `moneko-report-${stamp}.csv`,
      mimeType: "text/csv;charset=utf-8",
      bytes: utf8Bytes(buildReportsCsv(transactions, filters.displayCurrency)),
    };
  }
  if (exportType === "category_data_csv") {
    return {
      fileName: `moneko-categories-${stamp}.csv`,
      mimeType: "text/csv;charset=utf-8",
      bytes: utf8Bytes(buildCategoryCsv(transactions)),
    };
  }
  if (exportType === "account_history_csv") {
    return {
      fileName: `moneko-account-history-${stamp}.csv`,
      mimeType: "text/csv;charset=utf-8",
      bytes: utf8Bytes(buildAccountHistoryCsv(accounts, transactions)),
    };
  }

  const files = await buildZipFiles(
    supabase,
    userId,
    exportType,
    filters,
    transactions,
    accounts,
    emailAttachments,
  );
  return {
    fileName: `moneko-${exportType.replaceAll("_", "-")}-${stamp}.zip`,
    mimeType: "application/zip",
    bytes: await buildPremiumZip(files),
  };
}

async function buildZipFiles(
  supabase: any,
  userId: string,
  exportType: ExportType,
  filters: NormalizedFilters,
  transactions: TransactionRow[],
  accounts: AccountRow[],
  emailAttachments: EmailAttachmentRow[],
): Promise<PremiumZipFile[]> {
  const files: PremiumZipFile[] = [];
  const manifestFiles: Array<Record<string, unknown>> = [];
  const addText = (path: string, content: string, type: string) => {
    files.push({ path, bytes: utf8Bytes(content) });
    manifestFiles.push({ path, type });
  };

  if (exportType !== "files_zip") {
    addText(
      "transactions.csv",
      buildTransactionsCsv(transactions, accounts),
      "transactions",
    );
    addText(
      "reports.csv",
      buildReportsCsv(transactions, filters.displayCurrency),
      "report",
    );
    if (
      filters.includeCategoryData ||
      exportType === "tax_package_zip" ||
      exportType === "everything_zip"
    ) {
      addText(
        "categories.csv",
        buildCategoryCsv(transactions),
        "category_data",
      );
    }
    if (filters.includeAccountHistory || exportType === "everything_zip") {
      addText(
        "account-history.csv",
        buildAccountHistoryCsv(accounts, transactions),
        "account_history",
      );
    }
  }

  if (filters.includeEmailAttachments) {
    await addEmailAttachmentFiles(
      supabase,
      emailAttachments,
      files,
      manifestFiles,
    );
  }
  if (filters.includeReceipts) {
    await addReceiptFiles(transactions, files, manifestFiles);
  }

  addText(
    "manifest.json",
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        userId,
        dateRange: { startDate: filters.startDate, endDate: filters.endDate },
        exportType,
        files: manifestFiles,
      },
      null,
      2,
    ),
    "manifest",
  );
  return files;
}

async function addEmailAttachmentFiles(
  supabase: any,
  rows: EmailAttachmentRow[],
  files: PremiumZipFile[],
  manifestFiles: Array<Record<string, unknown>>,
) {
  for (const row of rows.slice(0, 200)) {
    const { data, error } = await supabase.storage
      .from(row.storage_bucket)
      .download(row.storage_path);
    if (error || !data) {
      manifestFiles.push({
        path: row.storage_path,
        type: "email_attachment",
        error: error?.message ?? "download failed",
      });
      continue;
    }
    const path = `email-originals/${row.id}-${sanitizeStorageFilename(
      row.filename,
    )}`;
    files.push({ path, bytes: new Uint8Array(await data.arrayBuffer()) });
    manifestFiles.push({
      path,
      type: "email_attachment",
      contentType: row.content_type,
      sizeBytes: row.size_bytes,
    });
  }
}

async function addReceiptFiles(
  transactions: TransactionRow[],
  files: PremiumZipFile[],
  manifestFiles: Array<Record<string, unknown>>,
) {
  for (const transaction of transactions
    .filter((row) => row.receipt_image_url)
    .slice(0, 200)) {
    try {
      const response = await fetch(transaction.receipt_image_url!);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const extension = inferExtension(
        response.headers.get("content-type"),
        transaction.receipt_image_url!,
      );
      const path = `receipts/${transaction.id}${extension}`;
      files.push({ path, bytes: new Uint8Array(await response.arrayBuffer()) });
      manifestFiles.push({
        path,
        type: "receipt",
        transactionId: transaction.id,
      });
    } catch (error) {
      manifestFiles.push({
        path: transaction.receipt_image_url,
        type: "receipt",
        transactionId: transaction.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

async function fetchTransactions(
  supabase: any,
  userId: string,
  filters: NormalizedFilters,
): Promise<TransactionRow[]> {
  let query = supabase
    .from("expenses")
    .select(
      "id, date, type, amount_cents, currency, category, raw_text, merchant, account_id, receipt_image_url, attachments, created_at, analytics_is_final, analytics_spending_multiplier, analytics_counts_toward_income",
    )
    .or("is_recurring.eq.false,is_recurring.is.null")
    .is("deleted_at", null)
    .gte("date", filters.startDate)
    .lte("date", filters.endDate)
    .in("currency", filters.selectedCurrencies)
    .order("date", { ascending: true })
    .limit(10000);
  query = filters.householdId
    ? query.eq("household_id", filters.householdId)
    : query.eq("user_id", userId).is("household_id", null);
  if (filters.householdId) {
    query = query.or(`user_id.eq.${userId},privacy_scope.eq.full`);
  }
  if (filters.accountIds.length > 0) {
    query = query.in("account_id", filters.accountIds);
  }
  if (filters.categories.length > 0) {
    query = query.in("category", filters.categories);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TransactionRow[];
}

async function fetchAccounts(
  supabase: any,
  userId: string,
  filters: NormalizedFilters,
): Promise<AccountRow[]> {
  let query = supabase
    .from("accounts")
    .select("id, name, currency, opening_balance_cents, created_at, updated_at")
    .in("currency", filters.selectedCurrencies)
    .eq("is_archived", false)
    .order("name", { ascending: true });
  query = filters.householdId
    ? query.eq("household_id", filters.householdId)
    : query.eq("user_id", userId).is("household_id", null);
  if (filters.accountIds.length > 0) query = query.in("id", filters.accountIds);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AccountRow[];
}

async function fetchEmailAttachments(
  supabase: any,
  userId: string,
  filters: NormalizedFilters,
): Promise<EmailAttachmentRow[]> {
  const { data, error } = await supabase
    .from("email_import_attachments")
    .select(
      "id, storage_bucket, storage_path, filename, content_type, size_bytes, created_at",
    )
    .eq("user_id", userId)
    .in("status", ["stored", "linked"])
    .gte("created_at", `${filters.startDate}T00:00:00.000Z`)
    .lte("created_at", `${filters.endDate}T23:59:59.999Z`)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as EmailAttachmentRow[];
}

function buildTransactionsCsv(
  transactions: TransactionRow[],
  accounts: AccountRow[],
): string {
  const accountNameById = new Map(
    accounts.map((account) => [account.id, account.name]),
  );
  return buildCsv([
    [
      "id",
      "date",
      "type",
      "amount_cents",
      "amount",
      "currency",
      "category",
      "merchant",
      "description",
      "account_id",
      "account_name",
      "receipt_image_url",
      "attachment_count",
      "created_at",
    ],
    ...transactions.map((row) => [
      row.id,
      row.date,
      normalizeType(row.type),
      Math.abs(Number(row.amount_cents ?? 0)),
      (Math.abs(Number(row.amount_cents ?? 0)) / 100).toFixed(2),
      normalizeCurrency(row.currency),
      row.category ?? "uncategorized",
      row.merchant ?? "",
      row.raw_text ?? "",
      row.account_id ?? "",
      row.account_id ? (accountNameById.get(row.account_id) ?? "") : "",
      row.receipt_image_url ?? "",
      attachmentCount(row.attachments),
      row.created_at ?? "",
    ]),
  ]);
}

function buildReportsCsv(
  transactions: TransactionRow[],
  displayCurrency: string,
): string {
  const displayRows = transactions.filter(
    (row) => normalizeCurrency(row.currency) === displayCurrency,
  );
  const income = sumCanonicalIncome(displayRows);
  const expenses = sumCanonicalSpending(displayRows);
  return buildCsv([
    ["metric", "amount_cents", "amount", "currency"],
    ["income", income, (income / 100).toFixed(2), displayCurrency],
    ["expenses", expenses, (expenses / 100).toFixed(2), displayCurrency],
    [
      "net_cashflow",
      income - expenses,
      ((income - expenses) / 100).toFixed(2),
      displayCurrency,
    ],
    [
      "transaction_count",
      displayRows.length,
      displayRows.length,
      displayCurrency,
    ],
  ]);
}

function buildCategoryCsv(transactions: TransactionRow[]): string {
  const categories = new Map<
    string,
    { amount: number; count: number; currency: string }
  >();
  for (const row of transactions) {
    const analyticsAmount = canonicalSpendingCents(row);
    if (analyticsAmount === 0) continue;
    const key = `${normalizeCurrency(row.currency)}:${normalizeCategory(
      row.category,
    )}`;
    const current = categories.get(key) ?? {
      amount: 0,
      count: 0,
      currency: normalizeCurrency(row.currency),
    };
    current.amount += analyticsAmount;
    current.count += 1;
    categories.set(key, current);
  }
  return buildCsv([
    ["category", "currency", "amount_cents", "amount", "transaction_count"],
    ...Array.from(categories.entries()).map(([key, value]) => [
      key.split(":").slice(1).join(":"),
      value.currency,
      value.amount,
      (value.amount / 100).toFixed(2),
      value.count,
    ]),
  ]);
}

function buildAccountHistoryCsv(
  accounts: AccountRow[],
  transactions: TransactionRow[],
): string {
  const rows = accounts.map((account) => {
    const accountTransactions = transactions.filter(
      (row) =>
        row.account_id === account.id &&
        normalizeCurrency(row.currency) === normalizeCurrency(account.currency),
    );
    const finalAccountTransactions = accountTransactions.filter(
      (row) => row.analytics_is_final,
    );
    const income = sumByType(finalAccountTransactions, "income");
    const expenses = sumByType(finalAccountTransactions, "expense");
    const opening = Number(account.opening_balance_cents ?? 0);
    return [
      account.id,
      account.name,
      normalizeCurrency(account.currency),
      opening,
      income,
      expenses,
      opening + income - expenses,
      account.created_at ?? "",
      account.updated_at ?? "",
    ];
  });
  return buildCsv([
    [
      "account_id",
      "account_name",
      "currency",
      "opening_balance_cents",
      "income_cents",
      "expense_cents",
      "ending_balance_cents",
      "created_at",
      "updated_at",
    ],
    ...rows,
  ]);
}

function sumByType(rows: TransactionRow[], type: "income" | "expense"): number {
  return rows
    .filter((row) => normalizeType(row.type) === type)
    .reduce((sum, row) => sum + Math.abs(Number(row.amount_cents ?? 0)), 0);
}

function sumCanonicalIncome(rows: TransactionRow[]): number {
  return rows
    .filter(
      (row) => row.analytics_is_final && row.analytics_counts_toward_income,
    )
    .reduce((sum, row) => sum + Math.abs(Number(row.amount_cents ?? 0)), 0);
}

function sumCanonicalSpending(rows: TransactionRow[]): number {
  return rows.reduce((sum, row) => sum + canonicalSpendingCents(row), 0);
}

function canonicalSpendingCents(row: TransactionRow): number {
  if (!row.analytics_is_final) return 0;
  return (
    Math.abs(Number(row.amount_cents ?? 0)) *
    Number(row.analytics_spending_multiplier ?? 0)
  );
}

function normalizeDate(value?: string | null): string | null {
  if (!value || !DATE_REGEX.test(value)) return null;
  return Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime())
    ? null
    : value;
}

function normalizeCurrency(value?: string | null): string {
  const normalized = (value ?? "USD").trim().toUpperCase();
  return CURRENCY_REGEX.test(normalized) ? normalized : "USD";
}

function normalizeCurrencies(values?: string[] | null): string[] | null {
  if (!Array.isArray(values)) return null;
  const normalized = Array.from(new Set(values.map(normalizeCurrency)));
  return normalized.length <= 20 ? normalized : [];
}

function normalizeUuidList(values?: string[] | null): string[] | null {
  if (!Array.isArray(values)) return [];
  const normalized = values
    .map((value) => sanitizeUuid(value))
    .filter((value): value is string => Boolean(value));
  return normalized.length === values.length && normalized.length <= 100
    ? normalized
    : null;
}

function normalizeTextList(values?: string[] | null): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value.length <= 120),
    ),
  ).slice(0, 100);
}

function normalizeType(value: string | null): "income" | "expense" {
  return String(value ?? "expense").toLowerCase() === "income"
    ? "income"
    : "expense";
}

function normalizeCategory(value: string | null): string {
  return (value ?? "uncategorized").trim().toLowerCase();
}

function attachmentCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function inferExtension(contentType: string | null, url: string): string {
  if (contentType?.includes("png")) return ".png";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) {
    return ".jpg";
  }
  if (contentType?.includes("pdf")) return ".pdf";
  const match = new URL(url).pathname.match(/\.[A-Za-z0-9]{1,8}$/);
  return match?.[0] ?? "";
}

function jsonResponse(
  payload: unknown,
  status: number,
  corsHeaders: Record<string, string>,
) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, ...JSON_HEADERS },
  });
}
