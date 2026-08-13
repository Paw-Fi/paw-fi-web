import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Apple,
  CreditCard,
  Search,
  UserSearch,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

import { CreatorHeader } from "@/components/creator/creator-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreatorUserLookup,
  type SectionName,
} from "@/hooks/use-creator-user-lookup";

export const Route = createFileRoute("/creator/user-lookup")({
  component: CreatorUserLookupPage,
});

function CreatorUserLookupPage() {
  const [email, setEmail] = useState("");
  const [lastSearch, setLastSearch] = useState<string | null>(null);
  const lookup = useCreatorUserLookup();

  const normalizedEmail = email.trim().toLowerCase();
  const result = lookup.data;
  const user = asRecord(result?.user);
  const contact = asRecord(result?.contact);
  const subscription = asRecord(result?.subscription);
  const stripe = asRecord(result?.stripe);
  const appStore = asRecord(result?.appStore);
  const counts = result?.counts;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!normalizedEmail) return;
    setLastSearch(normalizedEmail);
    void lookup.lookup(normalizedEmail);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-20 selection:bg-slate-800">
      <CreatorHeader />

      <div className="mx-auto w-full max-w-7xl space-y-10 px-6 pt-8">
        {/* Header & Page Title */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
              <span>Creator Console</span>
              <span className="text-slate-600">•</span>
              <span>Support & User Directory</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              User Lookup
            </h1>
            <p className="max-w-2xl text-xs text-slate-400 font-normal">
              Search exact user emails and review unified profile, contact details, subscriptions, payment provider records, transactions, wallets, budgets, recurring items, devices, households, bank connections, AI chat history, and email import settings.
            </p>
          </div>
        </header>

        {/* Sleek Search Bar */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <UserSearch className="h-4 w-4 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Lookup User Account by Email
            </h3>
          </div>
          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={handleSubmit}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter user email (e.g. user@example.com)..."
                className="h-9 border-slate-800 bg-slate-950 pl-8 text-xs text-slate-200 placeholder:text-slate-500"
              />
            </div>
            <Button
              type="submit"
              disabled={!normalizedEmail || lookup.isLoading}
              className="h-9 gap-1.5 whitespace-nowrap bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white px-4 transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              <span>{lookup.isLoading ? "Looking up..." : "Lookup User"}</span>
            </Button>
          </form>
          {lastSearch ? (
            <p className="text-[11px] text-slate-500 font-mono">
              Last query: <span className="text-slate-400">{lastSearch}</span>
            </p>
          ) : null}
        </div>

        {lookup.error ? <ErrorCard message={lookup.error} /> : null}

        {!lookup.isLoading && result?.user === null ? (
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-8 text-center text-xs text-slate-500">
            No user found matching email <strong className="text-slate-300 font-semibold">{lastSearch ?? normalizedEmail}</strong>.
          </div>
        ) : null}

        {lookup.isLoading ? <LoadingGrid /> : null}

        {user ? (
          <div className="space-y-6">
            {/* Hero Live User Stat Blocks Strip */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Target User Overview
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-slate-500">Live Database Match</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryBlock
                  title="Account Email"
                  value={stringValue(user.email)}
                  detail={`ID: ${stringValue(user.id)}`}
                  badgeText="PROFILE"
                />
                <SummaryBlock
                  title="User Full Name"
                  value={stringValue(user.full_name) || "Not provided"}
                  detail={`Registered: ${formatDateString(stringValue(user.created_at))}`}
                  badgeText="PROFILE"
                />
                <SummaryBlock
                  title="Platform & Region"
                  value={stringValue(contact?.platform) || "Unknown Platform"}
                  detail={`Timezone: ${stringValue(contact?.preferred_timezone) || "N/A"}`}
                  badgeText="CONTACT"
                />
                <SummaryBlock
                  title="Subscription Plan"
                  value={stringValue(subscription?.plan) || "free"}
                  detail={
                    [
                      stringValue(subscription?.status),
                      stringValue(subscription?.provider),
                      stringValue(subscription?.billing_interval),
                    ]
                      .filter(Boolean)
                      .join(" / ") || "No subscription row"
                  }
                  badgeText="BILLING"
                />
              </div>
            </div>

            {/* Detailed Accordion Workbenches */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <Accordion type="multiple" defaultValue={["subscription", "profile"]}>
                {/* EAGERLY-LOADED SECTIONS (from initial lookup) */}
                <ExpandableDetailSection
                  value="subscription"
                  title="Subscription Details"
                  summary={compactSummary([
                    subscription?.plan,
                    subscription?.status,
                    subscription?.provider,
                  ])}
                  rows={[
                    ["Subscription ID", subscription?.id],
                    ["Provider", subscription?.provider],
                    ["Plan Tier", subscription?.plan],
                    ["Current Status", subscription?.status],
                    ["Billing Interval", subscription?.billing_interval],
                    ["Stripe Customer ID", subscription?.stripe_customer_id],
                    ["Stripe Subscription ID", subscription?.stripe_subscription_id],
                    ["App Store Original Tx ID", subscription?.app_store_original_transaction_id],
                    ["App Store Environment", subscription?.app_store_environment],
                    ["Current Period Ends", subscription?.current_period_end],
                    ["Cancel at Period End", subscription?.cancel_at_period_end],
                    ["Created At", subscription?.created_at],
                    ["Updated At", subscription?.updated_at],
                  ]}
                />
                <ExpandableDetailSection
                  value="profile"
                  title="Supabase User Profile"
                  summary={compactSummary([user.email, user.full_name])}
                  rows={[
                    ["User ID", user.id],
                    ["Email Address", user.email],
                    ["Full Name", user.full_name],
                    ["Registered Date", user.created_at],
                    ["Profile Updated", user.updated_at],
                    ["Last Login", user.last_login],
                    ["User Level", user.level],
                    ["Total XP", user.total_xp],
                    ["Is Creator", user.is_creator],
                  ]}
                />
                <ExpandableDetailSection
                  value="contact"
                  title="Contact & Preferences"
                  summary={compactSummary([
                    contact?.platform,
                    contact?.preferred_currency,
                    contact?.preferred_timezone,
                  ])}
                  rows={[
                    ["Contact ID", contact?.id],
                    ["Operating Platform", contact?.platform],
                    ["Phone Number", contact?.phone_e164],
                    ["WhatsApp User ID", contact?.whatsapp_user_id],
                    ["Telegram User ID", contact?.telegram_user_id],
                    ["Telegram Chat ID", contact?.telegram_chat_id],
                    ["Verified Status", contact?.verified],
                    ["Preferred Currency", contact?.preferred_currency],
                    ["Preferred Language", contact?.preferred_language],
                    ["Preferred Timezone", contact?.preferred_timezone],
                    ["Wallet Capture Enabled", contact?.wallet_capture_enabled],
                    ["Email Import Enabled", contact?.email_import_enabled],
                    ["Email Import Household", contact?.email_import_household_id],
                    ["Email Import Portfolio", contact?.email_import_is_portfolio],
                    ["Email Import Account ID", contact?.email_import_account_id],
                    ["Created At", contact?.created_at],
                    ["Updated At", contact?.updated_at],
                  ]}
                />
                <AccordionItem value="providers" className="border-slate-800">
                  <AccordionTrigger className="py-3 text-xs font-semibold uppercase tracking-wider text-slate-200 hover:no-underline">
                    <AccordionTitle
                      title="Payment Provider Health"
                      summary={compactSummary([
                        result?.errors?.stripe ? "Stripe error" : "Stripe OK",
                        result?.errors?.appStore
                          ? "App Store error"
                          : "App Store OK",
                      ])}
                    />
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <ProviderStatusRows errors={result?.errors} />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="stripe" className="border-slate-800">
                  <AccordionTrigger className="py-3 text-xs font-semibold uppercase tracking-wider text-slate-200 hover:no-underline">
                    <AccordionTitle
                      title="Stripe Records (Invoices & Charges)"
                      summary={compactSummary([
                        `${asArray(stripe?.invoices).length} invoices`,
                        `${asArray(stripe?.charges).length} charges`,
                      ])}
                    />
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <StripeSection
                      stripe={stripe}
                      error={result?.errors?.stripe}
                    />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="app-store" className="border-slate-800">
                  <AccordionTrigger className="py-3 text-xs font-semibold uppercase tracking-wider text-slate-200 hover:no-underline">
                    <AccordionTitle
                      title="App Store Records (StoreKit Transactions)"
                      summary={compactSummary([
                        `${asArray(appStore?.transactions).length} transactions`,
                        `${asArray(appStore?.backlog).length} backlog`,
                      ])}
                    />
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <AppStoreSection
                      appStore={appStore}
                      error={result?.errors?.appStore}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* LAZY-LOADED SECTIONS (fetch on expand) */}
                <LazyAccordionItem
                  value="transactions"
                  title="Transactions"
                  summary={counts ? `${counts.transactions} total` : "—"}
                  section="transactions"
                  lookup={lookup}
                  paginated
                >
                  <TransactionsContent lookup={lookup} />
                </LazyAccordionItem>
                <LazyAccordionItem
                  value="accounts"
                  title="Wallets & Accounts"
                  summary={counts ? `${counts.accounts} accounts` : "—"}
                  section="accounts"
                  lookup={lookup}
                >
                  <AccountsContent lookup={lookup} />
                </LazyAccordionItem>
                <LazyAccordionItem
                  value="budgets"
                  title="Budgets & Pockets"
                  summary={counts ? `${counts.budgets} budgets` : "—"}
                  section="budgets"
                  lookup={lookup}
                >
                  <BudgetsContent lookup={lookup} />
                </LazyAccordionItem>
                <LazyAccordionItem
                  value="recurring"
                  title="Recurring Transactions"
                  summary={counts ? `${counts.recurring} recurring` : "—"}
                  section="recurring"
                  lookup={lookup}
                  paginated
                >
                  <RecurringContent lookup={lookup} />
                </LazyAccordionItem>
                <LazyAccordionItem
                  value="devices"
                  title="Registered Devices"
                  summary={counts ? `${counts.devices} devices` : "—"}
                  section="devices"
                  lookup={lookup}
                >
                  <DevicesContent lookup={lookup} />
                </LazyAccordionItem>
                <LazyAccordionItem
                  value="households"
                  title="Households"
                  summary={counts ? `${counts.households} households` : "—"}
                  section="households"
                  lookup={lookup}
                >
                  <HouseholdsContent lookup={lookup} />
                </LazyAccordionItem>
                <LazyAccordionItem
                  value="bank-connections"
                  title="Bank Connections"
                  summary={counts ? `${counts.bankConnections} connections` : "—"}
                  section="bank-connections"
                  lookup={lookup}
                >
                  <BankConnectionsContent lookup={lookup} />
                </LazyAccordionItem>
                <LazyAccordionItem
                  value="chat-sessions"
                  title="AI Chat Sessions"
                  summary={counts ? `${counts.chatSessions} sessions` : "—"}
                  section="chat-sessions"
                  lookup={lookup}
                  paginated
                >
                  <ChatSessionsContent lookup={lookup} />
                </LazyAccordionItem>
                <LazyAccordionItem
                  value="email-import"
                  title="Email Import Settings"
                  summary={
                    counts
                      ? `${counts.emailImportSenders} senders`
                      : "—"
                  }
                  section="email-import"
                  lookup={lookup}
                >
                  <EmailImportContent lookup={lookup} contact={contact} />
                </LazyAccordionItem>
              </Accordion>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ====================
// LAZY ACCORDION ITEM WRAPPER
// ====================

interface LazyAccordionItemProps {
  value: string;
  title: string;
  summary: string;
  section: SectionName;
  lookup: ReturnType<typeof useCreatorUserLookup>;
  paginated?: boolean;
  children: ReactNode;
}

function LazyAccordionItem({
  value,
  title,
  summary,
  section,
  lookup,
  children,
}: LazyAccordionItemProps) {
  return (
    <AccordionItem value={value} className="border-slate-800">
      <AccordionTrigger className="py-3 text-xs font-semibold uppercase tracking-wider text-slate-200 hover:no-underline">
        <AccordionTitle title={title} summary={summary} />
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <LazySectionLoader section={section} lookup={lookup}>
          {children}
        </LazySectionLoader>
      </AccordionContent>
    </AccordionItem>
  );
}

function LazySectionLoader({
  section,
  lookup,
  children,
}: {
  section: SectionName;
  lookup: ReturnType<typeof useCreatorUserLookup>;
  children: ReactNode;
}) {
  const sectionState = lookup.sections[section];

  useEffect(() => {
    if (!sectionState?.loaded && !sectionState?.isLoading) {
      void lookup.fetchSection(section);
    }
  }, [section, sectionState?.loaded, sectionState?.isLoading, lookup]);

  if (!sectionState || sectionState.isLoading) {
    return <SectionLoading />;
  }

  if (sectionState.error) {
    return <SectionErrorText message={sectionState.error} />;
  }

  return <>{children}</>;
}

function SectionLoading() {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
      <span>Loading...</span>
    </div>
  );
}

function SectionErrorText({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded border border-rose-900/40 bg-rose-950/20 px-3 py-2 text-xs text-rose-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
      <span>{message}</span>
    </div>
  );
}

// ====================
// PAGINATION CONTROLS
// ====================

function PaginationControls({
  page,
  pageSize,
  totalCount,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between gap-2 pt-2">
      <span className="text-[11px] font-mono text-slate-500">
        Showing {from}–{to} of {totalCount}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-7 px-2 text-xs border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[11px] font-mono text-slate-400 px-2">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-7 px-2 text-xs border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ====================
// LAZY SECTION CONTENT COMPONENTS
// ====================

function TransactionsContent({
  lookup,
}: {
  lookup: ReturnType<typeof useCreatorUserLookup>;
}) {
  const state = lookup.sections["transactions"];
  if (!state?.data) return <EmptySection text="No transaction data available." />;

  const rows = asArray(state.data.rows) as Record<string, unknown>[];
  const totalsByCurrency = asArray(state.data.totalsByCurrency) as Array<
    Record<string, unknown>
  >;

  return (
    <div className="space-y-4 pt-1">
      {totalsByCurrency.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {totalsByCurrency.map((total) => (
            <div
              key={stringValue(total.currency)}
              className="rounded border border-slate-800/60 bg-slate-900/30 px-3 py-2 text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">
                  {stringValue(total.currency)}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {(total.expenseCount as number ?? 0) +
                    (total.incomeCount as number ?? 0)} txns
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-400">Expense</span>
                <span className="font-mono text-slate-300">
                  {formatCents(total.expenseTotalCents)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400">Income</span>
                <span className="font-mono text-slate-300">
                  {formatCents(total.incomeTotalCents)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <DataTable
        title={`Transactions (${state.totalCount} total)`}
        rows={rows}
        columns={["date", "type", "amount_cents", "currency", "category", "source"]}
      />
      <PaginationControls
        page={state.page}
        pageSize={state.pageSize}
        totalCount={state.totalCount}
        onPageChange={(page) => void lookup.fetchSection("transactions", page, state.pageSize)}
      />
    </div>
  );
}

function AccountsContent({
  lookup,
}: {
  lookup: ReturnType<typeof useCreatorUserLookup>;
}) {
  const state = lookup.sections["accounts"];
  if (!state?.data) return <EmptySection text="No wallets or accounts found." />;

  const rows = asArray(state.data.rows) as Record<string, unknown>[];
  if (rows.length === 0) return <EmptySection text="No wallets or accounts found." />;

  return (
    <div className="space-y-4 pt-1">
      <DataTable
        title="Wallets & Accounts"
        rows={rows}
        columns={[
          "name",
          "icon",
          "color",
          "opening_balance_cents",
          "goal_amount_cents",
          "is_default",
          "is_archived",
          "household_id",
          "created_at",
        ]}
      />
    </div>
  );
}

function BudgetsContent({
  lookup,
}: {
  lookup: ReturnType<typeof useCreatorUserLookup>;
}) {
  const state = lookup.sections["budgets"];
  if (!state?.data) return <EmptySection text="No budgets or pockets found." />;

  const budgets = asArray(state.data.budgets) as Record<string, unknown>[];
  const envelopes = asArray(state.data.envelopes) as Record<string, unknown>[];

  if (budgets.length === 0) return <EmptySection text="No budgets or pockets found." />;

  return (
    <div className="space-y-4 pt-1">
      <DataTable
        title="Monthly Budgets"
        rows={budgets}
        columns={[
          "period_month",
          "currency",
          "total_budget_cents",
          "household_id",
          "created_at",
        ]}
      />
      <DataTable
        title="Pockets (Envelopes)"
        rows={envelopes}
        columns={[
          "name",
          "budget_percentage",
          "currency",
          "icon",
          "color",
          "budget_id",
          "created_at",
        ]}
      />
    </div>
  );
}

function RecurringContent({
  lookup,
}: {
  lookup: ReturnType<typeof useCreatorUserLookup>;
}) {
  const state = lookup.sections["recurring"];
  if (!state?.data) return <EmptySection text="No recurring transactions found." />;

  const rows = asArray(state.data.rows) as Record<string, unknown>[];
  if (rows.length === 0) return <EmptySection text="No recurring transactions found." />;

  return (
    <div className="space-y-4 pt-1">
      <DataTable
        title={`Recurring Transactions (${state.totalCount} total)`}
        rows={rows}
        columns={[
          "date",
          "type",
          "amount_cents",
          "currency",
          "category",
          "source",
          "recurrence_rule",
          "created_at",
        ]}
      />
      <PaginationControls
        page={state.page}
        pageSize={state.pageSize}
        totalCount={state.totalCount}
        onPageChange={(page) => void lookup.fetchSection("recurring", page, state.pageSize)}
      />
    </div>
  );
}

function DevicesContent({
  lookup,
}: {
  lookup: ReturnType<typeof useCreatorUserLookup>;
}) {
  const state = lookup.sections["devices"];
  if (!state?.data) return <EmptySection text="No registered devices found." />;

  const rows = asArray(state.data.rows) as Record<string, unknown>[];
  if (rows.length === 0) return <EmptySection text="No registered devices found." />;

  return (
    <div className="space-y-4 pt-1">
      <DataTable
        title="Registered Devices"
        rows={rows}
        columns={[
          "platform",
          "device_model",
          "os_version",
          "app_version",
          "locale",
          "timezone",
          "is_active",
          "last_seen_at",
          "created_at",
        ]}
      />
    </div>
  );
}

function HouseholdsContent({
  lookup,
}: {
  lookup: ReturnType<typeof useCreatorUserLookup>;
}) {
  const state = lookup.sections["households"];
  if (!state?.data) return <EmptySection text="No households found." />;

  const rows = asArray(state.data.rows) as Record<string, unknown>[];
  if (rows.length === 0) return <EmptySection text="No households found." />;

  return (
    <div className="space-y-4 pt-1">
      <DataTable
        title="Households"
        rows={rows}
        columns={[
          "name",
          "currency",
          "current_user_role",
          "member_count",
          "theme_color",
          "owner_id",
          "current_user_joined_at",
          "created_at",
        ]}
      />
    </div>
  );
}

function BankConnectionsContent({
  lookup,
}: {
  lookup: ReturnType<typeof useCreatorUserLookup>;
}) {
  const state = lookup.sections["bank-connections"];
  if (!state?.data) return <EmptySection text="No bank connections found." />;

  const connections = asArray(state.data.connections) as Record<string, unknown>[];
  const bankAccounts = asArray(state.data.bankAccounts) as Record<string, unknown>[];

  if (connections.length === 0) return <EmptySection text="No bank connections found." />;

  return (
    <div className="space-y-4 pt-1">
      <DataTable
        title="Bank Connections"
        rows={connections}
        columns={[
          "provider",
          "status",
          "country_code",
          "last_synced_at",
          "error_code",
          "error_message",
          "created_at",
        ]}
      />
      <DataTable
        title="Linked Bank Accounts"
        rows={bankAccounts}
        columns={[
          "name",
          "official_name",
          "mask",
          "currency",
          "type",
          "subtype",
          "status",
          "provider",
          "last_synced_at",
        ]}
      />
    </div>
  );
}

function ChatSessionsContent({
  lookup,
}: {
  lookup: ReturnType<typeof useCreatorUserLookup>;
}) {
  const state = lookup.sections["chat-sessions"];
  if (!state?.data) return <EmptySection text="No AI chat sessions found." />;

  const rows = asArray(state.data.rows) as Record<string, unknown>[];
  if (rows.length === 0) return <EmptySection text="No AI chat sessions found." />;

  return (
    <div className="space-y-4 pt-1">
      <DataTable
        title={`AI Chat Sessions (${state.totalCount} total)`}
        rows={rows}
        columns={[
          "model",
          "is_active",
          "message_count",
          "session_id",
          "created_at",
          "updated_at",
        ]}
      />
      <PaginationControls
        page={state.page}
        pageSize={state.pageSize}
        totalCount={state.totalCount}
        onPageChange={(page) => void lookup.fetchSection("chat-sessions", page, state.pageSize)}
      />
    </div>
  );
}

function EmailImportContent({
  lookup,
  contact,
}: {
  lookup: ReturnType<typeof useCreatorUserLookup>;
  contact: Record<string, unknown> | null;
}) {
  const state = lookup.sections["email-import"];
  const senders = state?.data
    ? (asArray(state.data.senders) as Record<string, unknown>[])
    : [];

  return (
    <div className="space-y-4 pt-1">
      <DetailRows
        rows={[
          ["Email Import Enabled", contact?.email_import_enabled],
          ["Import Household ID", contact?.email_import_household_id],
          ["Import Is Portfolio", contact?.email_import_is_portfolio],
          ["Import Account ID", contact?.email_import_account_id],
        ]}
      />
      <DataTable
        title="Approved Senders"
        rows={senders}
        columns={["sender_email", "normalized_sender_email", "created_at"]}
      />
    </div>
  );
}

// ====================
// SHARED UI COMPONENTS
// ====================

function SummaryBlock({
  title,
  value,
  detail,
  badgeText,
}: {
  title: string;
  value: string;
  detail: string;
  badgeText?: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-slate-800/80 bg-slate-950/60 p-4 transition-colors hover:border-slate-700/80 space-y-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            {title}
          </span>
          {badgeText && (
            <span className="text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.2 rounded border border-slate-800 bg-slate-900 text-slate-400">
              {badgeText}
            </span>
          )}
        </div>

        <div className="text-xl font-extrabold tracking-tight text-white break-words pt-0.5">
          {value}
        </div>
      </div>

      <p className="text-xs text-slate-500 font-normal leading-tight break-all">
        {detail}
      </p>
    </div>
  );
}

function AccordionTitle({
  title,
  summary,
}: {
  title: string;
  summary: string;
}) {
  return (
    <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pr-2">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-200">{title}</span>
      <span className="text-xs font-normal text-slate-400">{summary}</span>
    </div>
  );
}

function ExpandableDetailSection({
  value,
  title,
  summary,
  rows,
}: {
  value: string;
  title: string;
  summary: string;
  rows: Array<[string, unknown]>;
}) {
  return (
    <AccordionItem value={value} className="border-slate-800">
      <AccordionTrigger className="py-3 text-xs font-semibold uppercase tracking-wider text-slate-200 hover:no-underline">
        <AccordionTitle title={title} summary={summary} />
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <DetailRows rows={rows} />
      </AccordionContent>
    </AccordionItem>
  );
}

function DetailRows({ rows }: { rows: Array<[string, unknown]> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex justify-between gap-4 rounded border border-slate-800/60 bg-slate-900/30 px-3 py-2 text-xs"
        >
          <span className="text-slate-400 font-medium">{label}</span>
          <span className="max-w-[65%] text-right font-mono break-all text-slate-200">
            {displayValue(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ProviderStatusRows({
  errors,
}: {
  errors?: { stripe?: string | null; appStore?: string | null };
}) {
  return (
    <div className="grid gap-2 text-xs sm:grid-cols-2">
      <StatusRow label="Stripe Integration" error={errors?.stripe} />
      <StatusRow label="App Store Integration" error={errors?.appStore} />
    </div>
  );
}

function StatusRow({ label, error }: { label: string; error?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded border border-slate-800/60 bg-slate-900/30 px-3 py-2">
      <span className="text-slate-300 font-medium">{label}</span>
      <span className={error ? "text-right font-semibold text-rose-400" : "text-emerald-400 font-medium"}>
        {error || "Operational"}
      </span>
    </div>
  );
}

function StripeSection({
  stripe,
  error,
}: {
  stripe: Record<string, unknown> | null;
  error?: string | null;
}) {
  const customer = asRecord(stripe?.customer);
  const invoices = asArray(stripe?.invoices)
    .map(asRecord)
    .filter(Boolean) as Record<string, unknown>[];
  const charges = asArray(stripe?.charges)
    .map(asRecord)
    .filter(Boolean) as Record<string, unknown>[];
  const paymentMethods = asArray(stripe?.paymentMethods)
    .map(asRecord)
    .filter(Boolean) as Record<string, unknown>[];

  return (
    <div className="space-y-4 pt-1">
      <SectionError icon={<CreditCard className="h-4 w-4" />} error={error} />
      {customer ? (
        <DetailRows
          rows={[
            ["Customer ID", customer.id],
            ["Customer Email", customer.email],
            ["Customer Name", customer.name],
            ["Currency", customer.currency],
            ["Created", customer.created],
            ["Delinquent", customer.delinquent],
            ["Metadata", customer.metadata],
          ]}
        />
      ) : (
        <p className="text-xs text-slate-500 text-center py-2">
          No Stripe customer record found.
        </p>
      )}
      <DataTable
        title="Invoices"
        rows={invoices}
        columns={[
          "created",
          "status",
          "number",
          "amountPaid",
          "amountDue",
          "currency",
          "subscription",
        ]}
      />
      <DataTable
        title="Charges"
        rows={charges}
        columns={[
          "created",
          "status",
          "paid",
          "amount",
          "amountRefunded",
          "currency",
          "refunded",
          "disputed",
        ]}
      />
      <DataTable
        title="Payment Methods"
        rows={paymentMethods}
        columns={[
          "created",
          "type",
          "card.brand",
          "card.last4",
          "card.expMonth",
          "card.expYear",
          "card.funding",
          "card.country",
        ]}
      />
    </div>
  );
}

function AppStoreSection({
  appStore,
  error,
}: {
  appStore: Record<string, unknown> | null;
  error?: string | null;
}) {
  const transactions = asArray(appStore?.transactions)
    .map(asRecord)
    .filter(Boolean) as Record<string, unknown>[];
  const backlog = asArray(appStore?.backlog)
    .map(asRecord)
    .filter(Boolean) as Record<string, unknown>[];
  const latestTransaction = asRecord(appStore?.latestTransaction);
  const status = asRecord(appStore?.status);
  const environmentHint = stringValue(appStore?.environmentHint);
  const originalTransactionId = stringValue(appStore?.originalTransactionId);

  return (
    <div className="space-y-4 pt-1">
      <SectionError icon={<Apple className="h-4 w-4" />} error={error} />
      <DetailRows
        rows={[
          ["Original Transaction ID", originalTransactionId],
          ["Environment", environmentHint],
          [
            "Subscription Status",
            status ? JSON.stringify(status) : null,
          ],
          [
            "Latest Transaction",
            latestTransaction ? JSON.stringify(latestTransaction) : null,
          ],
        ]}
      />
      <DataTable
        title="Transactions"
        rows={transactions}
        columns={[
          "purchaseDate",
          "transactionId",
          "originalTransactionId",
          "productId",
          "type",
          "expiresDate",
          "quantity",
        ]}
      />
      <DataTable
        title="Notification Backlog"
        rows={backlog}
        columns={[
          "last_seen_at",
          "transaction_id",
          "store_product_id",
          "notification_type",
          "resolved_at",
          "last_error",
        ]}
      />
    </div>
  );
}

function SectionError({
  icon,
  error,
}: {
  icon: ReactNode;
  error?: string | null;
}) {
  if (!error) return null;
  return (
    <div className="flex items-start gap-2 rounded border border-rose-900/40 bg-rose-950/20 px-3 py-2 text-xs text-rose-300">
      {icon}
      <span>{error}</span>
    </div>
  );
}

function DataTable({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: Record<string, unknown>[];
  columns: string[];
}) {
  return (
    <div className="space-y-2 rounded border border-slate-800 bg-slate-950/60 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900/40">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">{title}</h3>
        <span className="text-[10px] font-mono text-slate-500">{rows.length} records</span>
      </div>

      {rows.length === 0 ? (
        <p className="px-3 py-4 text-xs text-slate-500 text-center">
          No records available.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-900/60 border-b border-slate-800">
              <TableRow className="border-slate-800 hover:bg-transparent">
                {columns.map((column) => (
                  <TableHead key={column} className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-8">
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow
                  key={`${title}-${index}`}
                  className="border-slate-800/60 hover:bg-slate-900/40 transition-colors"
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column}
                      className="max-w-[220px] truncate text-xs text-slate-300 py-2 font-mono"
                    >
                      {displayValue(getNestedValue(row, column))}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-rose-900/40 bg-rose-950/20 p-4 text-xs text-rose-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
      <span>{message}</span>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {["User Profile", "Subscription", "Payment Records"].map((label) => (
        <div key={label} className="rounded-lg border border-slate-800 bg-slate-950/60 p-6 text-center text-xs text-slate-500">
          Loading {label}...
        </div>
      ))}
    </div>
  );
}

function EmptySection({ text }: { text: string }) {
  return (
    <p className="px-3 py-4 text-xs text-slate-500 text-center">{text}</p>
  );
}

// ====================
// HELPERS
// ====================

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getNestedValue(row: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((value, key) => asRecord(value)?.[key], row);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function formatCents(value: unknown): string {
  if (typeof value !== "number") return "-";
  return (value / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateString(value: string): string {
  if (!value) return "N/A";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function compactSummary(values: unknown[]): string {
  const summary = values
    .map(displayValue)
    .filter((value) => value !== "-")
    .join(" / ");

  return summary || "No data";
}
