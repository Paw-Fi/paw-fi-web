import { useMemo, useState, type ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  Download,
  MousePointerClick,
  RefreshCw,
  Search,
  TableProperties,
} from "lucide-react";

import { CreatorHeader } from "@/components/creator/creator-header";
import { Badge } from "@/components/ui/badge";
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
  getAttributionSource,
  matchesAttributionSearch,
  summarizeDownloadAttributionRows,
  useDownloadAttributionSessions,
  type DownloadAttributionSession,
} from "@/hooks/use-download-attribution-sessions";

export const Route = createFileRoute("/creator/source-tracker/$source")({
  component: SourceTrackerDetailPage,
});

function SourceTrackerDetailPage() {
  const { source } = Route.useParams();
  const sourceName = safelyDecodeSource(source);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const { rows, isLoading, error } = useDownloadAttributionSessions(refreshKey);
  const sourceRows = useMemo(
    () => rows.filter((row) => getAttributionSource(row) === sourceName),
    [rows, sourceName],
  );
  const filteredRows = useMemo(
    () => sourceRows.filter((row) => matchesAttributionSearch(row, search)),
    [sourceRows, search],
  );
  const summary = useMemo(
    () => summarizeDownloadAttributionRows(sourceRows)[0] ?? null,
    [sourceRows],
  );

  return (
    <div className="min-h-screen bg-slate-950 py-10 text-white">
      <div className="mx-auto w-full max-w-7xl space-y-8 px-4">
        <CreatorHeader />
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Link
              to="/creator/source-tracker"
              className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to source counts
            </Link>
            <div className="space-y-1">
              <p className="text-xs tracking-[0.25em] text-white/60 uppercase">
                Source Detail
              </p>
              <h1 className="text-3xl font-bold text-white">{sourceName}</h1>
              <p className="max-w-2xl text-sm text-white/55">
                Breakdown of every attribution session recorded for this source.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10 gap-2 bg-transparent"
            onClick={() => setRefreshKey((key) => key + 1)}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Sessions"
            value={summary?.sessionCount ?? 0}
            icon={<TableProperties className="h-4 w-4" />}
          />
          <MetricCard
            title="Downloads"
            value={summary?.downloadedCount ?? 0}
            icon={<Download className="h-4 w-4" />}
          />
          <MetricCard
            title="Clicks"
            value={summary?.downloadClickCount ?? 0}
            icon={<MousePointerClick className="h-4 w-4" />}
          />
          <MetricCard
            title="Page Views"
            value={summary?.pageViewCount ?? 0}
            icon={<Search className="h-4 w-4" />}
          />
        </div>

        <Card className="border-white/10 bg-slate-900/50">
          <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                Search
              </CardDescription>
              <CardTitle className="mt-1 text-xl text-white">
                Filter rows for {sourceName}
              </CardTitle>
            </div>
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search session, URL, referrer, timezone..."
                className="border-white/10 bg-slate-950/80 pl-9 text-white placeholder:text-white/35"
              />
            </div>
          </CardHeader>
        </Card>

        {error && (
          <Card className="border-red-400/30 bg-red-500/10">
            <CardContent className="pt-6 text-sm text-red-100">
              {error}
            </CardContent>
          </Card>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">
              Session Breakdown
            </h2>
            <p className="text-sm text-white/45">
              {filteredRows.length.toLocaleString()} rows
            </p>
          </div>
          {isLoading && (
            <p className="rounded-lg border border-white/10 bg-slate-900/50 p-8 text-center text-sm text-white/45">
              Loading source rows...
            </p>
          )}
          {!isLoading && filteredRows.length === 0 && (
            <p className="rounded-lg border border-white/10 bg-slate-900/50 p-8 text-center text-sm text-white/45">
              No rows matched this source and search.
            </p>
          )}
          <div className="grid gap-4">
            {filteredRows.map((row) => (
              <AttributionRowCard key={row.id} row={row} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <Card className="border-white/10 bg-slate-900/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
          {title}
        </CardDescription>
        <div className="rounded-full bg-white/10 p-2 text-white/70">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-white">
          {value.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}

function AttributionRowCard({ row }: { row: DownloadAttributionSession }) {
  return (
    <Card className="border-white/10 bg-slate-900/50">
      <CardHeader className="gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
            Session
          </CardDescription>
          <CardTitle className="truncate font-mono text-base text-white">
            {row.session_id}
          </CardTitle>
          <p className="truncate text-sm text-white/45">
            Visitor: {row.visitor_id || "-"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-white/10 text-white/75">
            {row.downloaded ? "Downloaded" : "No download"}
          </Badge>
          {row.clicked_platforms.map((platform) => (
            <Badge
              key={platform}
              variant="outline"
              className="border-white/10 text-white/75"
            >
              {platform}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DetailItem label="First source" value={row.first_source} />
          <DetailItem label="Last source" value={row.last_source} />
          <DetailItem
            label="Page views"
            value={row.page_view_count.toLocaleString()}
          />
          <DetailItem
            label="Download clicks"
            value={row.download_click_count.toLocaleString()}
          />
          <DetailItem label="First path" value={row.first_path} />
          <DetailItem label="Last path" value={row.last_path} />
          <DetailItem label="Referrer domain" value={row.referrer_domain} />
          <DetailItem label="Timezone" value={row.timezone} />
          <DetailItem label="Language" value={row.language} />
          <DetailItem label="Viewport" value={row.viewport} />
          <DetailItem label="Created" value={formatDate(row.created_at)} />
          <DetailItem label="Updated" value={formatDate(row.updated_at)} />
          <DetailItem
            label="iOS clicked"
            value={formatDate(row.ios_clicked_at)}
          />
          <DetailItem
            label="Android clicked"
            value={formatDate(row.android_clicked_at)}
          />
          <DetailItem
            label="First downloaded"
            value={formatDate(row.first_downloaded_at)}
          />
          <DetailItem
            label="Last downloaded"
            value={formatDate(row.last_downloaded_at)}
          />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <DetailBlock
            label="First landing URL"
            value={row.first_landing_url}
          />
          <DetailBlock label="Last URL" value={row.last_url} />
          <DetailBlock label="Referrer" value={row.referrer} />
          <DetailBlock label="User agent" value={row.user_agent} />
          <DetailBlock
            label="First query params"
            value={stringifyJson(row.first_query_params)}
          />
          <DetailBlock
            label="Last query params"
            value={stringifyJson(row.last_query_params)}
          />
          <DetailBlock
            label="All query params"
            value={stringifyJson(row.all_query_params)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/40 p-3">
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-1 truncate text-sm text-white/80">{value || "-"}</p>
    </div>
  );
}

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/40 p-3">
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-1 font-mono text-xs leading-5 break-words text-white/75">
        {value || "-"}
      </p>
    </div>
  );
}

function safelyDecodeSource(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function stringifyJson(value: Record<string, any>): string {
  return JSON.stringify(value, null, 2);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
