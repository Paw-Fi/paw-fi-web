# Premium Dashboard And Export Center Implementation Plan

> **For the next AI agent:** This is an implementation handoff. Build the feature task-by-task, verify after each major task, and do not revive the abandoned Goals feature. Use the existing Moneko web and Supabase patterns instead of creating a parallel architecture.

**Goal:** Replace the current `/dashboard` under-development placeholder with a premium-only freelancer/small-business money dashboard and export center, including secure premium-only retention and export of original email-import attachments.

**Primary user:** Freelancers and small businesses who need to quickly understand their money situation, find what needs action, and export everything needed for accounting, tax prep, reporting, or backup.

**Product benchmark:** Similar quality and usefulness to Monarch Money, YNAB, QuickBooks Solopreneur, and Wave, but optimized around Moneko's data model: AI transaction capture, email file import, wallets/accounts, budgets/pockets/envelopes, receipts/attachments, categories, recurring transactions, and mobile-first capture.

**Key decision already approved:** `/dashboard` should automatically show the new premium dashboard for premium users. Free/plus users should see a friendly premium preview/upgrade state. Email import remains available to free/plus users, but only premium users get original forwarded attachment retention and exportable originals.

---

## Current Codebase Context

### Web App Stack

- App: `moneko-web`
- Router: TanStack Router file routes.
- Data fetching: `@tanstack/react-query`.
- UI: React 19, Tailwind CSS, existing shadcn-style components in `src/components/ui`.
- Charts: Recharts and existing chart wrappers in `src/components/ui/chart.tsx`.
- Supabase client: `src/lib/supabase.ts`.
- Dashboard shell: `src/components/performance/dashboard-route-component.tsx`.
- Current `/dashboard` home component: `src/components/performance/dashboard-home-route-component.tsx`.
- Current route: `src/routes/dashboard/_layout.index.tsx`, lazy-loads `DashboardHomeRouteComponent`.

### Existing Dashboard State

- `src/components/performance/dashboard-home-route-component.tsx` currently shows an under-development placeholder and mobile app download buttons.
- `src/components/performance/dashboard-route-component.tsx` provides the authenticated dashboard shell/sidebar and wraps content with `ProtectedRouteSubscription`.
- `ProtectedRouteSubscription` only checks authentication, not premium access.
- Existing menu items are currently marked `comingSoon` and prevent navigation.
- Membership management already exists under `/dashboard/user-settings/membership`.

### Existing Subscription Context

- Frontend hook: `src/hooks/use-subscription.ts`.
- Backend function: `supabase/functions/get-subscription/index.ts`.
- Plan hierarchy: `supabase/functions/shared/subscription-constants.ts`.
- Plans in hierarchy: `free`, `plus`, `premium`, `lifetime`.
- Active statuses: `active`, `trialing`.
- Premium dashboard should allow `premium`. Consider whether `lifetime` should also pass because hierarchy puts it above premium. If product says lifetime includes premium, allow it. If not, restrict to exact `premium`.
- Server-side checks are mandatory. Client-side premium gating is UX only.

### Existing Finance Data Surface

Use active concepts only:

- Transactions are stored in `public.expenses` with `type = 'expense'` or `type = 'income'`.
- Expense listing Edge Function: `supabase/functions/list-expenses/index.ts`.
- Income listing Edge Function: `supabase/functions/list-income/index.ts`.
- Batch save function: `supabase/functions/save-transactions-batch/index.ts`.
- Wallet/accounts overview function: `supabase/functions/wallets-overview/index.ts`.
- Budget function: `supabase/functions/get-budget/index.ts`.
- Categories function: `supabase/functions/categories/index.ts`.
- User/contact settings are stored in `user_contacts`.
- Email import events are stored in `email_import_events`.
- Receipt image field exists on transactions: `receipt_image_url`.
- Transaction `attachments` JSONB exists on `expenses`; migration comment says array of attachment objects `[{url, type, name, size}]`.
- Merchant support exists in `expenses` and `save-transactions-batch` accepts `merchant`.
- Wallet/account binding uses `account_id` and must follow existing multi-currency rules.

### Abandoned Feature Constraint

Do not use or extend Goals:

- Do not use `financial_goals`.
- Do not use `features/goals`, `list-goals`, `create-goal`, `acknowledge-goal`, `goal-*` Edge Functions, or goal context.
- Do not add goals data to dashboard, reports, AI advice, or exports.
- For “Savings goals”, use active concepts instead: pockets/budgets/envelopes, wallet balances, budget targets, cashflow, and financial health profile.

### Multi-Currency Constraint

Moneko separates aggregate calculations from row-level display:

- Aggregate totals convert included selected-currency values into display/base currency before summing.
- Row-level transactions, wallet cards, pocket cards, and detail rows stay in their native currency.
- Currency selection filters which currencies are included.
- If multiple currencies are selected, aggregate values convert into the display/base currency; rows remain native.
- Do not do save-time conversion.
- Transaction currency must match wallet currency.
- Dashboard aggregates should align with existing backend currency behavior and use existing currency helpers/RPCs when available.

### Email Import Current Behavior

Relevant file: `supabase/functions/resend-inbound-webhook/index.ts`.

Current flow:

1. Resend sends webhook to `resend-inbound-webhook`.
2. Function verifies Svix signature.
3. Function checks recipient inbox and resolves sender owner.
4. Function verifies sender auth headers.
5. Function fetches attachment metadata from Resend.
6. Function downloads each supported attachment.
7. Function converts bytes to base64 and calls `runAnalyzeExpense`.
8. Function maps analyzed items and calls `saveTransactionsBatchInternal`.
9. Function writes result summary to `email_import_events`.
10. Function sends follow-up email.
11. It currently discards original attachment bytes after processing.

Current follow-up email text explicitly says Moneko does not store forwarded attachments. This must remain true for free/plus users and change for premium users only.

---

## User-Facing Scope

### Premium Dashboard Overview

Premium users should immediately see:

- Cash on hand.
- Net worth / total balance.
- Income vs expenses.
- Net cashflow.
- Monthly profit/loss.
- Upcoming bills or recurring items.
- Budget/pocket/envelope progress.
- Receipt and attachment coverage.
- Alerts and action items.
- Searchable recent transactions.
- Fast filters by date range, wallet/account, category, currency, space/household, client/project if schema exists.

### Freelancer And Small-Business Useful Widgets

Prioritize widgets that help a business operator take action:

- “You made/lost X this month.”
- “Your biggest expense categories this month.”
- “X transactions need categories.”
- “X expenses are missing receipts.”
- “Your tax package is ready for this date range.”
- “Upcoming recurring bills due soon.”
- “Top income sources/clients” if source/client/project fields exist.
- “Receipt coverage” percentage.
- “Export everything for accountant.”

### Export Center

Premium users need exports for accounting, tax, reporting, and backup:

- Export all transactions as CSV first. XLSX can be a follow-up if a Deno-safe XLSX writer is added.
- Export reports as PDF/CSV. Start with CSV; PDF can be a follow-up if a safe Deno-compatible PDF solution is chosen.
- Export receipts, images, and email-import original attachments as ZIP.
- Export invoices if product invoices exist. Current Stripe billing invoices are available via `useSubscription`; avoid presenting them as business invoices unless a business invoice schema exists.
- Export account history.
- Export category/group data.
- Export tax-ready package.
- Select date range, account/wallet, category, currency, space/household, client/project if schema exists, and file type.
- Bulk export everything with one click.
- Show progress/status and export history.

### Premium Access UX

Free/plus users should see a friendly preview, not a dead-end error:

- “Your mobile capture still works.”
- “Premium unlocks business dashboard, secure file retention, and export packages.”
- Show sample dashboard cards with disabled overlay.
- Clear CTA to upgrade/manage membership.
- Link to `/dashboard/user-settings/membership`.

---

## Architecture

### Frontend Data Flow

`/dashboard` route -> dashboard shell -> `DashboardHomeRouteComponent` -> `PremiumAccessGate` -> `PremiumDashboardHome` -> React Query hooks -> Supabase Edge Functions.

Proposed frontend files:

- Modify: `src/components/performance/dashboard-home-route-component.tsx`
- Create: `src/features/premium-dashboard/components/premium-access-gate.tsx`
- Create: `src/features/premium-dashboard/components/premium-upgrade-preview.tsx`
- Create: `src/features/premium-dashboard/components/premium-dashboard-home.tsx`
- Create: `src/features/premium-dashboard/components/dashboard-metric-card.tsx`
- Create: `src/features/premium-dashboard/components/action-items-panel.tsx`
- Create: `src/features/premium-dashboard/components/cashflow-chart.tsx`
- Create: `src/features/premium-dashboard/components/budget-progress-panel.tsx`
- Create: `src/features/premium-dashboard/components/transactions-search-panel.tsx`
- Create: `src/features/premium-dashboard/components/export-center.tsx`
- Create: `src/features/premium-dashboard/components/export-job-status.tsx`
- Create: `src/features/premium-dashboard/hooks/use-premium-dashboard-summary.ts`
- Create: `src/features/premium-dashboard/hooks/use-premium-export-jobs.ts`
- Create: `src/features/premium-dashboard/lib/premium-access.ts`
- Create: `src/features/premium-dashboard/lib/formatters.ts`
- Create: `src/features/premium-dashboard/types.ts`

Keep component files focused. If a component exceeds roughly 300-400 lines, split subcomponents.

### Backend Data Flow

Premium summary:

`PremiumDashboardHome` -> `supabase.functions.invoke('premium-dashboard-summary')` -> authenticate JWT -> assert premium -> query aggregates -> return dashboard DTO.

Export package:

`ExportCenter` -> `supabase.functions.invoke('premium-export-center', { action: 'create' })` -> authenticate JWT -> assert premium -> validate filters -> create export job -> generate file -> upload to private `premium-exports` bucket -> return job -> user polls status -> signed download URL.

Email attachment retention:

`resend-inbound-webhook` -> resolve owner -> assert owner premium -> after attachment download, upload original bytes to private `email-import-attachments` bucket -> insert `email_import_attachments` metadata -> analyze and save transactions as before -> link saved transaction IDs if possible.

---

## Backend Schema Plan

Create a new migration with `supabase migration new premium_dashboard_exports` or the repo's current migration workflow. Do not edit already-applied historical migrations.

### Private Storage Buckets

Add buckets:

```sql
insert into storage.buckets (id, name, public)
values
  ('email-import-attachments', 'email-import-attachments', false),
  ('premium-exports', 'premium-exports', false)
on conflict (id) do nothing;
```

Storage policies:

- Service role can manage `email-import-attachments` and `premium-exports`.
- Authenticated users should not directly list buckets broadly.
- Prefer signed URLs from server function for downloads.
- If allowing direct select policies, restrict path first folder to `auth.uid()::text` and still prefer short-lived signed URLs.

### `email_import_attachments`

Create table:

```sql
create table if not exists public.email_import_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  email_import_event_id uuid not null references public.email_import_events(id) on delete cascade,
  provider text not null default 'resend',
  provider_email_id text null,
  storage_bucket text not null default 'email-import-attachments',
  storage_path text not null,
  filename text not null,
  content_type text null,
  size_bytes bigint null,
  sha256 text null,
  status text not null default 'stored' check (status in ('stored', 'linked', 'orphaned', 'deleted')),
  transaction_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, email_import_event_id, sha256)
);

create index if not exists email_import_attachments_user_created_idx
  on public.email_import_attachments (user_id, created_at desc);

create index if not exists email_import_attachments_event_idx
  on public.email_import_attachments (email_import_event_id);
```

RLS:

```sql
alter table public.email_import_attachments enable row level security;

create policy "Users can view their own email import attachments"
  on public.email_import_attachments
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
```

Do not create broad insert/update/delete policies for authenticated users. Inserts/updates should happen from service-role Edge Functions.

### `premium_export_jobs`

Create table:

```sql
create table if not exists public.premium_export_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'preparing', 'collecting_files', 'generating', 'ready', 'failed', 'expired')),
  export_type text not null check (export_type in ('transactions_csv', 'reports_csv', 'tax_package_zip', 'files_zip', 'account_history_csv', 'category_data_csv', 'everything_zip')),
  filters jsonb not null default '{}'::jsonb,
  storage_bucket text not null default 'premium-exports',
  storage_path text null,
  file_name text null,
  mime_type text null,
  size_bytes bigint null,
  error_text text null,
  progress_percent integer not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null,
  expires_at timestamptz null
);

create index if not exists premium_export_jobs_user_created_idx
  on public.premium_export_jobs (user_id, created_at desc);

create index if not exists premium_export_jobs_user_status_idx
  on public.premium_export_jobs (user_id, status, created_at desc);
```

RLS:

```sql
alter table public.premium_export_jobs enable row level security;

create policy "Users can view their own premium export jobs"
  on public.premium_export_jobs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
```

Again, do not allow client inserts/updates. Create jobs via Edge Function only.

### Optional Join Table For Exact Transaction Attachment Links

If time permits, add:

```sql
create table if not exists public.transaction_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  transaction_id uuid not null references public.expenses(id) on delete cascade,
  email_import_attachment_id uuid references public.email_import_attachments(id) on delete set null,
  source text not null default 'email_import',
  created_at timestamptz not null default now(),
  unique (transaction_id, email_import_attachment_id)
);

alter table public.transaction_attachments enable row level security;

create policy "Users can view their own transaction attachments"
  on public.transaction_attachments
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
```

This is optional for the first version. The simpler version exports all saved email attachments by user/date/event without per-row linking.

---

## Shared Backend Helpers

### Create `supabase/functions/shared/premium-access.ts`

Responsibilities:

- Authenticate caller using existing `authenticateUser` or `authenticateUserOrInternalSecret` when internal use is needed.
- Load latest subscription row from `subscriptions`.
- Decide premium eligibility.
- Return a normalized object to avoid duplicating checks in multiple functions.

Suggested interface:

```ts
export interface PremiumAccessResult {
  userId: string;
  hasPremiumAccess: boolean;
  plan: string;
  status: string;
  reason?: string;
}
```

Suggested access logic:

```ts
const activeStatuses = new Set(["active", "trialing"]);
const premiumPlans = new Set(["premium", "lifetime"]);
```

If `lifetime` should not include premium, remove it from `premiumPlans`. Product should decide before implementation.

Server-side functions that use this helper:

- `premium-dashboard-summary`
- `premium-export-center`
- `resend-inbound-webhook` owner premium retention check

Important: `resend-inbound-webhook` is invoked by Resend, not by an authenticated browser user, so it should check premium by `owner.userId` with service role after owner resolution, not via JWT.

---

## Edge Function Plan

### `premium-dashboard-summary`

Create: `supabase/functions/premium-dashboard-summary/index.ts`

Request method: `POST`.

Input schema:

```ts
interface DashboardSummaryRequest {
  startDate?: string;
  endDate?: string;
  displayCurrency?: string;
  selectedCurrencies?: string[];
  accountId?: string | null;
  householdId?: string | null;
  category?: string | null;
  search?: string | null;
  clientId?: string | null;
  projectId?: string | null;
}
```

Validate all inputs. Use simple local validators or `zod` if edge function bundling supports it safely. This repo already depends on `zod` in web, but Edge Functions may not have a shared import. If using Deno npm imports, pin the version.

Output DTO:

```ts
interface PremiumDashboardSummary {
  period: {
    startDate: string;
    endDate: string;
    displayCurrency: string;
  };
  totals: {
    cashOnHandCents: number;
    netWorthCents: number;
    incomeCents: number;
    expenseCents: number;
    netCashflowCents: number;
    profitLossCents: number;
    receiptCoveragePercent: number;
  };
  trends: Array<{
    date: string;
    incomeCents: number;
    expenseCents: number;
    netCashflowCents: number;
  }>;
  actionItems: Array<{
    id: string;
    severity: "info" | "warning" | "urgent" | "success";
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
  }>;
  budgetProgress: Array<{
    id: string;
    name: string;
    allocatedCents: number;
    spentCents: number;
    remainingCents: number;
    currency: string;
  }>;
  topCategories: Array<{
    category: string;
    amountCents: number;
    transactionCount: number;
    currency: string;
  }>;
  recentTransactions: Array<{
    id: string;
    type: "income" | "expense";
    date: string;
    amountCents: number;
    currency: string;
    category: string;
    description: string | null;
    merchant: string | null;
    accountId: string | null;
    accountName: string | null;
    receiptImageUrl: string | null;
    attachmentCount: number;
  }>;
  exportReadiness: {
    transactionCount: number;
    receiptCount: number;
    emailAttachmentCount: number;
    uncategorizedCount: number;
    missingReceiptCount: number;
  };
}
```

Implementation notes:

- Authenticate JWT.
- Assert premium access server-side.
- Query only the authenticated user's personal scope plus allowed household/portfolio scopes. Reuse patterns from `list-expenses`, `list-income`, and `wallets-overview`.
- Avoid raw SQL string interpolation. Use Supabase query builder or RPC with parameterized SQL.
- For first version, return aggregates in native selected/display currency if conversion helpers are not easily reusable. If multi-currency selected values are included, use existing currency rates/helpers or follow current RPC behavior. Do not fake conversion.
- Recent transaction row display should keep native currency.

### `premium-export-center`

Create: `supabase/functions/premium-export-center/index.ts`

Request method: `POST`.

Input:

```ts
interface ExportCenterRequest {
  action: "create" | "status" | "download" | "list";
  jobId?: string;
  exportType?:
    | "transactions_csv"
    | "reports_csv"
    | "tax_package_zip"
    | "files_zip"
    | "account_history_csv"
    | "category_data_csv"
    | "everything_zip";
  filters?: {
    startDate?: string;
    endDate?: string;
    displayCurrency?: string;
    selectedCurrencies?: string[];
    accountIds?: string[];
    categories?: string[];
    householdId?: string | null;
    clientId?: string | null;
    projectId?: string | null;
    includeReceipts?: boolean;
    includeEmailAttachments?: boolean;
    includeAccountHistory?: boolean;
    includeCategoryData?: boolean;
  };
}
```

Actions:

- `create`: Validate premium, create job, generate export synchronously for first version if small enough, update job, return job.
- `status`: Validate premium, return own job status.
- `download`: Validate premium, create short-lived signed URL for own ready job.
- `list`: Validate premium, return recent own jobs.

File formats:

- `transactions_csv`: CSV Blob uploaded as `text/csv`.
- `reports_csv`: CSV with summary rows and breakdowns.
- `files_zip`: ZIP including receipt images and premium email import originals.
- `tax_package_zip`: ZIP containing transactions CSV, category CSV, summary CSV, receipts/files folder, and a manifest JSON.
- `everything_zip`: ZIP containing all available exports.

ZIP dependency:

- Prefer a Deno-compatible library that can run in Supabase Edge Functions.
- Pin the version.
- If uncertain, implement CSV exports first and leave ZIP generation as the next task, but the final target is ZIP.

CSV safety:

- Escape values correctly.
- Prevent spreadsheet formula injection by prefixing cells beginning with `=`, `+`, `-`, or `@` with `'`.
- Include UTF-8 BOM if needed for Excel compatibility.

Export manifest example:

```json
{
  "generatedAt": "2026-06-01T00:00:00.000Z",
  "userId": "...",
  "dateRange": { "startDate": "2026-01-01", "endDate": "2026-03-31" },
  "exportType": "tax_package_zip",
  "files": [
    { "path": "transactions.csv", "type": "transactions" },
    { "path": "receipts/example.pdf", "type": "attachment" }
  ]
}
```

---

## Email Attachment Retention Plan

Modify: `supabase/functions/resend-inbound-webhook/index.ts`.

### New Logic

After owner resolution and `owner.enabled` check:

1. Check owner premium access by `owner.userId` using service role.
2. Store `const shouldRetainOriginalAttachments = ownerHasPremiumAccess`.
3. Use this flag in the attachment processing loop.

During each attachment loop, after bytes are read and size-validated:

1. If `shouldRetainOriginalAttachments` is true:
   - Sanitize filename.
   - Compute SHA-256.
   - Build path like `${owner.userId}/${event.data.email_id}/${attachmentIndex + 1}-${shaPrefix}-${safeFilename}`.
   - Upload to private bucket `email-import-attachments` with content type.
   - Insert metadata into `email_import_attachments`.
   - Keep inserted attachment ID in a local map by attachment filename/index.
2. Continue analysis exactly as before.
3. Add source metadata to mapped transaction items if implementing transaction linking now.

Suggested helper functions inside the webhook or shared file:

- `sanitizeStorageFilename(filename: string): string`
- `sha256Hex(bytes: Uint8Array): Promise<string>`
- `storePremiumEmailImportAttachment(params): Promise<StoredEmailAttachment | null>`
- `isUserPremiumForRetention(supabase, userId): Promise<boolean>`

Important behavior:

- Attachment retention failure should not block transaction import unless storage failure indicates a systemic/security issue. Recommended first version: log/report the retention error, continue analysis, and include retention error in `email_import_events.result`.
- Do not store originals for non-premium users.
- Do not expose storage URLs in follow-up email.
- Do not upload to `expense-receipts` because that bucket is currently public. Use private `email-import-attachments`.

### Update Follow-Up Email

Modify `buildFollowupEmail` signature:

```ts
function buildFollowupEmail(params: {
  senderEmail: string;
  subjectLine: string;
  savedCount: number;
  duplicateCount: number;
  failedCount: number;
  transactions: Array<Record<string, unknown>>;
  attachmentResults: AttachmentProcessingResult[];
  retainedAttachmentCount: number;
  retainedOriginals: boolean;
});
```

Free/plus footer remains:

```text
Moneko does not store forwarded attachments on our servers. We download them temporarily only to extract transactions.
```

Premium footer becomes:

```text
Your original forwarded files were saved securely and are available from your Premium Export Center.
```

### Link Attachments To Saved Transactions

First-version option:

- Store attachment rows and include them in exports by `user_id`, `email_import_event_id`, and date range.
- Do not try exact per-transaction linking yet.

Better option:

- Extend `TransactionItem` in `save-transactions-batch/index.ts` with `sourceAttachmentId?: string`.
- Add `sourceAttachmentId` to `mappedItems` in `resend-inbound-webhook`.
- After save succeeds, map saved result indexes back to source attachment IDs.
- Update `email_import_attachments.transaction_ids`.
- Optionally insert `transaction_attachments` rows.

If implementing exact linking, be careful because one attachment can produce multiple transactions.

---

## Frontend Implementation Plan

### Modify Dashboard Home Entry

File: `src/components/performance/dashboard-home-route-component.tsx`

Replace placeholder with:

```tsx
import { PremiumAccessGate } from "@/features/premium-dashboard/components/premium-access-gate";
import { PremiumDashboardHome } from "@/features/premium-dashboard/components/premium-dashboard-home";
import { PremiumUpgradePreview } from "@/features/premium-dashboard/components/premium-upgrade-preview";

export function DashboardHomeRouteComponent() {
  return (
    <PremiumAccessGate fallback={<PremiumUpgradePreview />}>
      <PremiumDashboardHome />
    </PremiumAccessGate>
  );
}
```

Keep named export and default export because current lazy import expects `DashboardHomeRouteComponent`.

### `PremiumAccessGate`

Use:

- `useAuth`
- `useSubscription(user?.id)`
- Existing `SkeletonDashboard` or local skeleton.

Client logic:

```ts
const premiumPlans = new Set(["premium", "lifetime"]);
const activeStatuses = new Set(["active", "trialing"]);
const hasPremiumAccess =
  subscription &&
  premiumPlans.has(subscription.plan) &&
  activeStatuses.has(subscription.status);
```

If product says `lifetime` should not include premium, remove `lifetime`.

### `PremiumDashboardHome`

Sections:

1. Header:
   - Greeting: “Your business snapshot”
   - Date range selector: this month, last month, quarter, custom.
   - Export center button.
2. KPI grid:
   - Cash on hand.
   - Net worth.
   - Income.
   - Expenses.
   - Profit/loss.
   - Receipt coverage.
3. Action items panel.
4. Main grid:
   - Cashflow chart.
   - Budget/pocket/envelope progress.
   - Top categories.
   - Searchable transactions.
5. Export center section or tab.

UX requirements:

- Mobile-responsive layout.
- Friendly language, not accounting jargon.
- Tooltips for finance terms.
- Clear empty states.
- Loading skeletons.
- Error recovery with retry.
- One-click export actions.
- Keyboard and screen reader friendly controls.
- No emoji icons; use `lucide-react`.

### `usePremiumDashboardSummary`

Create hook with React Query:

```ts
useQuery({
  queryKey: ["premium-dashboard-summary", user?.id, filters],
  queryFn: () => fetchPremiumDashboardSummary(filters),
  enabled: Boolean(user?.id && hasPremiumAccess),
  staleTime: 60_000,
});
```

Use `supabase.functions.invoke('premium-dashboard-summary', { body: filters })`.

### `ExportCenter`

State:

- `selectedExportType`
- `dateRange`
- `accountIds`
- `categories`
- `selectedCurrencies`
- `includeReceipts`
- `includeEmailAttachments`
- `isCreatingExport`
- selected job/status.

Use `useMutation` for create export and `useQuery` for status/list.

Polling:

- Poll status every 2 seconds while status is `queued`, `preparing`, `collecting_files`, or `generating`.
- Stop when `ready`, `failed`, or `expired`.

Download:

- Call `premium-export-center` with `action: 'download'` and `jobId`.
- Open returned signed URL.

---

## Detailed Task Breakdown

### Task 1: Premium Access Helpers

Files:

- Create: `src/features/premium-dashboard/lib/premium-access.ts`
- Create: `supabase/functions/shared/premium-access.ts`

Steps:

1. Implement frontend helper `hasPremiumDashboardAccess(subscription)`.
2. Implement backend helper `getUserPremiumAccessByUserId(supabase, userId)`.
3. Use `subscriptions` latest row by `user_id`, ordered by `created_at desc`.
4. Return structured reason for no access.
5. Add tests if backend function test patterns exist.
6. Run `npm run typecheck` after frontend helper is used.

### Task 2: Storage And Tables Migration

Files:

- Create migration under `supabase/migrations/` using Supabase CLI.

Steps:

1. Create private buckets `email-import-attachments` and `premium-exports`.
2. Create `email_import_attachments`.
3. Create `premium_export_jobs`.
4. Add RLS policies for user select only.
5. Add service-role storage policies.
6. Verify migration locally if Supabase local stack is available.

### Task 3: Premium Email Attachment Retention

Files:

- Modify: `supabase/functions/resend-inbound-webhook/index.ts`
- Optionally create: `supabase/functions/shared/storage-filenames.ts`

Steps:

1. Add owner premium lookup after owner resolution.
2. Add `retainedAttachmentCount` and `retentionErrors` tracking.
3. Add helper to sanitize filenames.
4. Add helper to compute SHA-256.
5. Upload original bytes for premium owners to private bucket.
6. Insert metadata row.
7. Include attachment retention summary in `email_import_events.result`.
8. Update follow-up email wording for premium owners only.
9. Keep free/plus behavior unchanged.
10. Verify no storage URLs are sent to users.

### Task 4: Dashboard Summary Edge Function

Files:

- Create: `supabase/functions/premium-dashboard-summary/index.ts`
- Add config if this repo uses per-function `config.toml`.

Steps:

1. Handle CORS and `OPTIONS`.
2. Require `POST`.
3. Authenticate user.
4. Assert premium access.
5. Validate filters.
6. Resolve accessible household/portfolio scopes.
7. Query transactions, accounts, budgets/envelopes, and email attachments.
8. Compute DTO.
9. Return friendly empty DTO if user has no data.
10. Do not return private storage paths.

### Task 5: Premium Dashboard Frontend

Files:

- Modify: `src/components/performance/dashboard-home-route-component.tsx`
- Create feature files under `src/features/premium-dashboard/`.

Steps:

1. Add access gate and upgrade preview.
2. Add dashboard summary hook.
3. Add metric cards.
4. Add action items panel.
5. Add cashflow chart.
6. Add transaction search panel.
7. Add responsive layout.
8. Add loading/error/empty states.
9. Add tooltips.
10. Run `npm run typecheck`.

### Task 6: Export Center Backend

Files:

- Create: `supabase/functions/premium-export-center/index.ts`

Steps:

1. Implement `list` action.
2. Implement `status` action.
3. Implement `download` action with signed URLs.
4. Implement `create` for `transactions_csv`.
5. Implement `create` for `category_data_csv`.
6. Implement `create` for `account_history_csv`.
7. Implement `files_zip` and `tax_package_zip` after selecting/pinning a Deno ZIP dependency.
8. Ensure CSV formula injection protection.
9. Ensure files are scoped to authenticated user.
10. Add export manifest JSON to ZIP packages.

### Task 7: Export Center Frontend

Files:

- Create/modify: `src/features/premium-dashboard/components/export-center.tsx`
- Create/modify: `src/features/premium-dashboard/hooks/use-premium-export-jobs.ts`

Steps:

1. Add quick export cards.
2. Add advanced filters.
3. Add create export mutation.
4. Add polling for active job status.
5. Add export history table.
6. Add progress display.
7. Add retry/error states.
8. Add download action.
9. Run `npm run typecheck`.

### Task 8: Final Verification And Review

Commands:

```bash
npm run typecheck
```

If tests exist or are added:

```bash
npm test
```

Manual verification checklist:

- Premium user sees dashboard.
- Free user sees upgrade preview.
- Plus user sees upgrade preview.
- Email import still works for free/plus and does not store originals.
- Email import works for premium and stores originals privately.
- Export job rejects free/plus server-side.
- Export job rejects attempts to download another user's job.
- Transaction rows display native currency.
- Aggregate totals follow multi-currency behavior.
- No broad storage paths or service-role secrets are exposed to browser.

---

## Security Requirements

- Never expose `SUPABASE_SERVICE_ROLE_KEY` or storage service paths to the browser.
- Server-side premium enforcement on all premium functions.
- Validate all export filters.
- Sanitize filenames before storage/ZIP.
- Use private buckets for email imports and exports.
- Use short-lived signed URLs for downloads.
- Restrict all database queries by authenticated user and allowed scope.
- Do not trust `userId` from browser payloads. Use JWT auth result.
- Do not store free/plus original forwarded attachments.
- Do not expose email-import originals in follow-up emails.
- Avoid formula injection in CSV exports.
- Do not use `user_metadata` for authorization.
- Do not add broad RLS policies like `TO authenticated` without ownership predicates.

---

## Product Copy Guidelines

Use friendly language:

- “Your business snapshot” instead of “financial statement”.
- “Money in” instead of “accounts receivable” unless actual invoices exist.
- “Money out” instead of “payables”.
- “Profit this month” instead of “net operating income”.
- “Needs your attention” instead of “exceptions”.
- “Export for your accountant” instead of “generate accounting artifact”.

Premium upgrade message:

```text
Turn Moneko into your business money command center.
Premium gives you a full dashboard, secure original file retention, and one-click exports for tax time, accounting, and backup.
```

Empty transactions message:

```text
No transactions here yet. Add transactions from the mobile app, forward receipts to your Moneko inbox, or import files to build your dashboard.
```

Premium email import follow-up:

```text
Your original forwarded files were saved securely and are available from your Premium Export Center.
```

Free/plus email import follow-up:

```text
Moneko does not store forwarded attachments on our servers. We download them temporarily only to extract transactions.
```

---

## Known Risks And Decisions To Confirm

1. `lifetime` access: Decide whether lifetime users get premium dashboard access. The current plan hierarchy places `lifetime` above `premium`, so this plan assumes yes unless product says otherwise.
2. ZIP generation: Pick and pin a Deno-compatible ZIP library before implementing ZIP packages.
3. PDF/XLSX exports: The first robust implementation should ship CSV and ZIP. Add PDF/XLSX only after selecting safe libraries that work in Supabase Edge Functions.
4. Client/project filters: Implement only if the other AI agent's premium schema includes client/project fields. Otherwise show disabled filters with clear copy.
5. Exact attachment-to-transaction linking: First version can export saved email attachments by event/date/user. Exact per-transaction linking is better but requires additional mapping work.
6. Multi-currency aggregation: Do not fake conversion. Use existing currency helpers/RPCs or return native-currency grouped aggregates until conversion is correctly wired.

---

## Definition Of Done

- `/dashboard` renders the premium command center for premium users.
- Free/plus users see a clear premium preview and upgrade CTA.
- Premium users can see cash, income, expense, cashflow, profit/loss, budget progress, action items, and searchable recent transactions.
- Premium users can create at least CSV exports and see export job status/history.
- Premium users' forwarded email attachments are stored privately and included in export scope.
- Free/plus email imports still work and do not store original attachments.
- Server-side premium checks protect dashboard summary, exports, and attachment downloads.
- `npm run typecheck` passes.
- Security review confirms no service-role exposure, no cross-user export access, and no public email attachment storage.
