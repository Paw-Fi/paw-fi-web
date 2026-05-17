import { useMemo, useState, type ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  Download,
  Eye,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAttributionSource,
  matchesAttributionSearch,
  summarizeDownloadAttributionRows,
  useDownloadAttributionSessions,
  type DownloadAttributionSession,
} from "@/hooks/use-download-attribution-sessions";

export const Route = createFileRoute("/creator/source-tracker/")({
  component: SourceTrackerPage,
});

function SourceTrackerPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const { rows, totals, isLoading, error } =
    useDownloadAttributionSessions(refreshKey);
  const filteredRows = useMemo(
    () => rows.filter((row) => matchesAttributionSearch(row, search)),
    [rows, search],
  );
  const filteredSummaries = useMemo(
    () => summarizeDownloadAttributionRows(filteredRows),
    [filteredRows],
  );

  return (
    <div className="min-h-screen bg-slate-950 py-10 text-white">
      <div className="mx-auto w-full max-w-7xl space-y-8 px-4">
        <CreatorHeader />
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs tracking-[0.25em] text-white/60 uppercase">
              Creator Dashboard
            </p>
            <h1 className="text-3xl font-bold text-white">Source Tracker</h1>
            <p className="max-w-2xl text-sm text-white/55">
              Track download attribution sessions, source counts, platform
              clicks, and per-session metadata.
            </p>
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
            title="Tracked Sessions"
            value={totals.sessionCount}
            icon={<TableProperties className="h-4 w-4" />}
          />
          <MetricCard
            title="Unique Sources"
            value={totals.sourceCount}
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <MetricCard
            title="Downloaded Sessions"
            value={totals.downloadedCount}
            icon={<Download className="h-4 w-4" />}
          />
          <MetricCard
            title="Download Clicks"
            value={totals.downloadClickCount}
            icon={<MousePointerClick className="h-4 w-4" />}
          />
        </div>

        <Card className="border-white/10 bg-slate-900/50">
          <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
                Search
              </CardDescription>
              <CardTitle className="mt-1 text-xl text-white">
                Filter source tracker data
              </CardTitle>
            </div>
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search source, session, URL, referrer, timezone..."
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
            <h2 className="text-lg font-semibold text-white">Source Counts</h2>
            <p className="text-sm text-white/45">
              {filteredSummaries.length.toLocaleString()} sources
            </p>
          </div>
          <Card className="border-white/10 bg-slate-900/50">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/60">Source</TableHead>
                    <TableHead className="text-right text-white/60">
                      Sessions
                    </TableHead>
                    <TableHead className="text-right text-white/60">
                      Downloads
                    </TableHead>
                    <TableHead className="text-right text-white/60">
                      Clicks
                    </TableHead>
                    <TableHead className="text-right text-white/60">
                      iOS
                    </TableHead>
                    <TableHead className="text-right text-white/60">
                      Android
                    </TableHead>
                    <TableHead className="text-right text-white/60">
                      Details
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummaries.map((summary) => (
                    <TableRow
                      key={summary.source}
                      className="border-white/10 hover:bg-white/5"
                    >
                      <TableCell className="font-medium text-white">
                        {summary.source}
                      </TableCell>
                      <TableCell className="text-right text-white/80">
                        {summary.sessionCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-emerald-300">
                        {summary.downloadedCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sky-300">
                        {summary.downloadClickCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-white/70">
                        {summary.iosClickCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-white/70">
                        {summary.androidClickCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          to="/creator/source-tracker/$source"
                          params={{ source: summary.source }}
                          className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-1 text-xs text-white/75 transition hover:bg-white/10 hover:text-white"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Details
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && filteredSummaries.length === 0 && (
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-white/45"
                      >
                        No source data matched your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {isLoading && (
                <p className="py-8 text-center text-sm text-white/45">
                  Loading source tracker data...
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">
              Recent Sessions
            </h2>
            <p className="text-sm text-white/45">
              {filteredRows.length.toLocaleString()} rows
            </p>
          </div>
          <AttributionRowsTable rows={filteredRows.slice(0, 100)} />
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

function AttributionRowsTable({
  rows,
}: {
  rows: DownloadAttributionSession[];
}) {
  return (
    <Card className="border-white/10 bg-slate-900/50">
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/60">Source</TableHead>
              <TableHead className="text-white/60">Session</TableHead>
              <TableHead className="text-white/60">Path</TableHead>
              <TableHead className="text-white/60">Platforms</TableHead>
              <TableHead className="text-right text-white/60">Views</TableHead>
              <TableHead className="text-right text-white/60">Clicks</TableHead>
              <TableHead className="text-white/60">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className="border-white/10 hover:bg-white/5"
              >
                <TableCell className="font-medium text-white">
                  {getAttributionSource(row)}
                </TableCell>
                <TableCell className="max-w-[180px] truncate font-mono text-xs text-white/60">
                  {row.session_id}
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-white/75">
                  {row.last_path || row.first_path || "-"}
                </TableCell>
                <TableCell>
                  <PlatformBadges row={row} />
                </TableCell>
                <TableCell className="text-right text-white/75">
                  {row.page_view_count.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-white/75">
                  {row.download_click_count.toLocaleString()}
                </TableCell>
                <TableCell className="text-white/60">
                  {formatDate(row.updated_at)}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-white/45"
                >
                  No sessions to show.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PlatformBadges({ row }: { row: DownloadAttributionSession }) {
  if (row.clicked_platforms.length === 0) {
    return <span className="text-white/35">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {row.clicked_platforms.map((platform) => (
        <Badge
          key={platform}
          variant="outline"
          className="border-white/10 text-white/70"
        >
          {platform}
        </Badge>
      ))}
    </div>
  );
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
