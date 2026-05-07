import { useState } from "react";
import type { FormEvent } from "react";
import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Apple,
  CreditCard,
  Search,
  UserSearch,
} from "lucide-react";

import { CreatorHeader } from "@/components/creator/creator-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCreatorUserLookup } from "@/hooks/use-creator-user-lookup";

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!normalizedEmail) return;
    setLastSearch(normalizedEmail);
    void lookup.lookup(normalizedEmail);
  }

  return (
    <div className="min-h-screen bg-slate-950 py-10 text-white">
      <div className="mx-auto w-full max-w-7xl space-y-8 px-4">
        <CreatorHeader />

        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs tracking-[0.25em] text-white/60 uppercase">
              Creator Dashboard
            </p>
            <h1 className="text-3xl font-bold text-white">User Lookup</h1>
            <p className="text-sm text-white/55">
              Search exact user emails and review Supabase, Stripe, and App
              Store details in one place.
            </p>
          </div>
        </header>

        <Card className="border-white/10 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <UserSearch className="h-5 w-5 text-blue-300" />
              Search by email
            </CardTitle>
            <CardDescription className="text-white/60">
              Exact email match, case-insensitive. Search only checks
              users.email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={handleSubmit}
            >
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="user@example.com"
                className="border-white/10 bg-slate-950/70 text-white placeholder:text-white/35"
              />
              <Button
                type="submit"
                disabled={!normalizedEmail || lookup.isLoading}
                className="gap-2 whitespace-nowrap"
              >
                <Search className="h-4 w-4" />
                {lookup.isLoading ? "Looking up..." : "Lookup"}
              </Button>
            </form>
            {lastSearch ? (
              <p className="mt-3 text-xs text-white/45">
                Last searched: {lastSearch}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {lookup.error ? <ErrorCard message={lookup.error} /> : null}

        {!lookup.isLoading && result?.user === null ? (
          <Card className="border-white/10 bg-slate-900/50">
            <CardContent className="py-8 text-sm text-white/60">
              No user found for {lastSearch ?? normalizedEmail}.
            </CardContent>
          </Card>
        ) : null}

        {lookup.isLoading ? <LoadingGrid /> : null}

        {user ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Email"
                value={stringValue(user.email)}
                detail={stringValue(user.id)}
              />
              <SummaryCard
                title="Name"
                value={stringValue(user.full_name) || "-"}
                detail={stringValue(user.created_at) || "No created date"}
              />
              <SummaryCard
                title="Platform"
                value={stringValue(contact?.platform) || "unknown"}
                detail={
                  stringValue(contact?.preferred_timezone) || "No timezone"
                }
              />
              <SummaryCard
                title="Subscription"
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
              />
            </div>

            <Card className="border-white/10 bg-slate-900/50">
              <CardContent className="py-2">
                <Accordion type="multiple" defaultValue={["subscription"]}>
                  <ExpandableDetailSection
                    value="subscription"
                    title="Subscription"
                    summary={compactSummary([
                      subscription?.plan,
                      subscription?.status,
                      subscription?.provider,
                    ])}
                    rows={[
                      ["ID", subscription?.id],
                      ["Provider", subscription?.provider],
                      ["Plan", subscription?.plan],
                      ["Status", subscription?.status],
                      ["Billing interval", subscription?.billing_interval],
                      ["Stripe customer", subscription?.stripe_customer_id],
                      [
                        "Stripe subscription",
                        subscription?.stripe_subscription_id,
                      ],
                      [
                        "App Store original transaction",
                        subscription?.app_store_original_transaction_id,
                      ],
                      [
                        "App Store environment",
                        subscription?.app_store_environment,
                      ],
                      ["Current period end", subscription?.current_period_end],
                      [
                        "Cancel at period end",
                        subscription?.cancel_at_period_end,
                      ],
                      ["Created", subscription?.created_at],
                      ["Updated", subscription?.updated_at],
                    ]}
                  />
                  <ExpandableDetailSection
                    value="profile"
                    title="Profile"
                    summary={compactSummary([user.email, user.full_name])}
                    rows={[
                      ["User ID", user.id],
                      ["Email", user.email],
                      ["Full name", user.full_name],
                      ["Created", user.created_at],
                      ["Updated", user.updated_at],
                      ["Last login", user.last_login],
                      ["Level", user.level],
                      ["Total XP", user.total_xp],
                      ["Creator", user.is_creator],
                    ]}
                  />
                  <ExpandableDetailSection
                    value="contact"
                    title="Contact"
                    summary={compactSummary([
                      contact?.platform,
                      contact?.preferred_currency,
                      contact?.preferred_timezone,
                    ])}
                    rows={[
                      ["Contact ID", contact?.id],
                      ["Platform", contact?.platform],
                      ["Phone", contact?.phone_e164],
                      ["WhatsApp", contact?.whatsapp_user_id],
                      ["Telegram", contact?.telegram_user_id],
                      ["Telegram chat", contact?.telegram_chat_id],
                      ["Verified", contact?.verified],
                      ["Currency", contact?.preferred_currency],
                      ["Language", contact?.preferred_language],
                      ["Timezone", contact?.preferred_timezone],
                      ["Wallet capture", contact?.wallet_capture_enabled],
                      ["Email import", contact?.email_import_enabled],
                      [
                        "Email import household",
                        contact?.email_import_household_id,
                      ],
                      [
                        "Email import portfolio",
                        contact?.email_import_is_portfolio,
                      ],
                      [
                        "Email import account",
                        contact?.email_import_account_id,
                      ],
                      ["Created", contact?.created_at],
                      ["Updated", contact?.updated_at],
                    ]}
                  />
                  <AccordionItem value="providers" className="border-white/10">
                    <AccordionTrigger className="py-3 text-white hover:no-underline">
                      <AccordionTitle
                        title="Provider Status"
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
                  <AccordionItem value="stripe" className="border-white/10">
                    <AccordionTrigger className="py-3 text-white hover:no-underline">
                      <AccordionTitle
                        title="Stripe"
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
                  <AccordionItem value="app-store" className="border-white/10">
                    <AccordionTrigger className="py-3 text-white hover:no-underline">
                      <AccordionTitle
                        title="App Store"
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
                </Accordion>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="border-white/10 bg-slate-900/50">
      <CardHeader className="pb-3">
        <CardDescription className="text-xs tracking-[0.25em] text-white/50 uppercase">
          {title}
        </CardDescription>
        <CardTitle className="text-xl break-words text-white">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs break-all text-white/45">
        {detail}
      </CardContent>
    </Card>
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
    <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-semibold text-white">{title}</span>
      <span className="text-xs font-normal text-white/45">{summary}</span>
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
    <AccordionItem value={value} className="border-white/10">
      <AccordionTrigger className="py-3 text-white hover:no-underline">
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
    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex justify-between gap-4 rounded-lg border border-white/5 px-3 py-2 text-sm"
        >
          <span className="text-white/45">{label}</span>
          <span className="max-w-[60%] text-right break-words text-white/80">
            {displayValue(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function DetailCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, unknown]>;
}) {
  return (
    <Card className="border-white/10 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-4 border-b border-white/5 pb-2 text-sm"
            >
              <span className="text-white/45">{label}</span>
              <span className="max-w-[60%] text-right break-words text-white/80">
                {displayValue(value)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProviderStatusCard({
  errors,
}: {
  errors?: { stripe?: string | null; appStore?: string | null };
}) {
  return (
    <Card className="border-white/10 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="text-white">Provider Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <StatusRow label="Stripe" error={errors?.stripe} />
        <StatusRow label="App Store" error={errors?.appStore} />
      </CardContent>
    </Card>
  );
}

function ProviderStatusRows({
  errors,
}: {
  errors?: { stripe?: string | null; appStore?: string | null };
}) {
  return (
    <div className="grid gap-2 text-sm sm:grid-cols-2">
      <StatusRow label="Stripe" error={errors?.stripe} />
      <StatusRow label="App Store" error={errors?.appStore} />
    </div>
  );
}

function StatusRow({ label, error }: { label: string; error?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-white/10 px-3 py-2">
      <span className="text-white/60">{label}</span>
      <span className={error ? "text-right text-red-300" : "text-emerald-300"}>
        {error || "Loaded or not applicable"}
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
    <div className="space-y-4">
      <SectionError icon={<CreditCard className="h-4 w-4" />} error={error} />
      <DataTable
        title="Invoices"
        rows={invoices}
        columns={["created", "status", "amountPaid", "currency", "number"]}
      />
      <DataTable
        title="Charges"
        rows={charges}
        columns={["created", "status", "amount", "currency", "refunded"]}
      />
      <DataTable
        title="Payment Methods"
        rows={paymentMethods}
        columns={[
          "created",
          "type",
          "card.brand",
          "card.last4",
          "card.expYear",
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

  return (
    <div className="space-y-4">
      <SectionError icon={<Apple className="h-4 w-4" />} error={error} />
      <DataTable
        title="Transactions"
        rows={transactions}
        columns={[
          "purchaseDate",
          "transactionId",
          "productId",
          "type",
          "expiresDate",
        ]}
      />
      <DataTable
        title="Notification Backlog"
        rows={backlog}
        columns={[
          "last_seen_at",
          "transaction_id",
          "store_product_id",
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
    <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
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
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-white/80">{title}</h3>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-white/10 px-3 py-4 text-sm text-white/45">
          No records available.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              {columns.map((column) => (
                <TableHead key={column} className="text-white/55">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow
                key={`${title}-${index}`}
                className="border-white/5 hover:bg-white/5"
              >
                {columns.map((column) => (
                  <TableCell
                    key={column}
                    className="max-w-[220px] truncate text-white/75"
                  >
                    {displayValue(getNestedValue(row, column))}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-red-500/30 bg-red-500/10">
      <CardContent className="flex items-start gap-3 py-4 text-sm text-red-200">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        {message}
      </CardContent>
    </Card>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {["Profile", "Subscription", "Payments"].map((label) => (
        <Card key={label} className="border-white/10 bg-slate-900/50">
          <CardContent className="py-8 text-sm text-white/45">
            Loading {label}...
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

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
