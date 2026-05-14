import { useMemo, useState, type ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  Download,
  FileText,
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
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              className="gap-2 border-white/20 bg-transparent text-white hover:bg-white/10"
              disabled={isLoading || sourceRows.length === 0}
              onClick={() => exportInfluencerReportPdf(sourceName, sourceRows)}
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10 gap-2 bg-transparent"
              onClick={() => setRefreshKey((key) => key + 1)}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
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
          {filteredRows.length > 0 && (
            <VirtualizedAttributionRowsTable rows={filteredRows} />
          )}
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

function VirtualizedAttributionRowsTable({
  rows,
}: {
  rows: DownloadAttributionSession[];
}) {
  const rowHeight = 64;
  const viewportHeight = 640;
  const overscan = 8;
  const [scrollTop, setScrollTop] = useState(0);
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / rowHeight) - overscan,
    );
    const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
    const endIndex = Math.min(rows.length, startIndex + visibleCount);

    return { startIndex, endIndex };
  }, [rows.length, scrollTop]);
  const visibleRows = rows.slice(
    visibleRange.startIndex,
    visibleRange.endIndex,
  );
  const topPadding = visibleRange.startIndex * rowHeight;
  const bottomPadding = Math.max(
    0,
    (rows.length - visibleRange.endIndex) * rowHeight,
  );

  return (
    <Card className="border-white/10 bg-slate-900/50">
      <CardContent className="pt-6">
        <div
          className="max-h-[640px] overflow-auto rounded-lg border border-white/10"
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        >
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-slate-900">
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="min-w-[130px] text-white/60">
                  Platforms
                </TableHead>
                <TableHead className="min-w-[160px] text-white/60">
                  Created
                </TableHead>
                <TableHead className="min-w-[120px] text-right text-white/60">
                  Views
                </TableHead>
                <TableHead className="min-w-[140px] text-white/60">
                  Downloaded
                </TableHead>
                <TableHead className="min-w-[150px] text-white/60">
                  Timezone
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topPadding > 0 && (
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell
                    colSpan={5}
                    style={{ height: topPadding, padding: 0 }}
                  />
                </TableRow>
              )}
              {visibleRows.map((row) => (
                <TableRow
                  key={row.id}
                  className="h-16 border-white/10 hover:bg-white/5"
                >
                  <TableCell>
                    <PlatformBadges row={row} />
                  </TableCell>
                  <TableCell className="text-white/70">
                    {formatDate(row.created_at)}
                  </TableCell>
                  <TableCell className="text-right text-white/75">
                    {row.page_view_count.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        row.downloaded
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                          : "border-white/10 text-white/70"
                      }
                    >
                      {row.downloaded ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-white/65">
                    {row.timezone || "-"}
                  </TableCell>
                </TableRow>
              ))}
              {bottomPadding > 0 && (
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell
                    colSpan={5}
                    style={{ height: bottomPadding, padding: 0 }}
                  />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-xs text-white/40">
          Showing rows {visibleRange.startIndex + 1}-{visibleRange.endIndex} of{" "}
          {rows.length.toLocaleString()}
        </p>
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

function safelyDecodeSource(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function exportInfluencerReportPdf(
  sourceName: string,
  rows: DownloadAttributionSession[],
) {
  const reportWindow = window.open("", "_blank");

  if (!reportWindow) {
    return;
  }

  reportWindow.opener = null;
  reportWindow.document.write(buildInfluencerReportHtml(sourceName, rows));
  reportWindow.document.close();
  reportWindow.setTimeout(() => {
    reportWindow.focus();
    reportWindow.print();
  }, 250);
}

function buildInfluencerReportHtml(
  sourceName: string,
  rows: DownloadAttributionSession[],
): string {
  const summary = summarizeDownloadAttributionRows(rows)[0];
  const conversionRate =
    summary && summary.sessionCount > 0
      ? (summary.downloadedCount / summary.sessionCount) * 100
      : 0;
  const clicksPerSession =
    summary && summary.sessionCount > 0
      ? summary.downloadClickCount / summary.sessionCount
      : 0;
  const generatedAt = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(sourceName)} - Moneko Attribution Report</title>
  <style>
    @page { margin: 18mm; }
    * { box-sizing: border-box; }
    body { color: #111827; font-family: Inter, Arial, sans-serif; margin: 0; }
    h1, h2, h3, p { margin: 0; }
    .report { max-width: 1100px; margin: 0 auto; padding: 32px; }
    .header { border-bottom: 2px solid #111827; display: flex; justify-content: space-between; gap: 24px; padding-bottom: 24px; }
    .eyebrow { color: #64748b; font-size: 11px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; }
    .title { font-size: 32px; line-height: 1.15; margin-top: 8px; }
    .subtitle { color: #475569; font-size: 13px; margin-top: 10px; max-width: 650px; }
    .brand { text-align: right; white-space: nowrap; }
    .logo { border-radius: 14px; height: 56px; margin-bottom: 10px; width: 56px; }
    .brand-name { font-size: 22px; font-weight: 800; }
    .date { color: #64748b; font-size: 12px; margin-top: 8px; }
    .section { margin-top: 28px; page-break-inside: avoid; }
    .section-title { font-size: 16px; font-weight: 800; margin-bottom: 12px; }
    .metrics { display: grid; gap: 12px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .metric { border: 1px solid #d1d5db; border-radius: 12px; padding: 14px; }
    .metric-label { color: #64748b; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
    .metric-value { font-size: 26px; font-weight: 800; margin-top: 8px; }
    table { border-collapse: collapse; font-size: 12px; width: 100%; }
    th { background: #f1f5f9; color: #334155; font-size: 10px; letter-spacing: 0.08em; text-align: left; text-transform: uppercase; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; vertical-align: top; }
    td.number, th.number { text-align: right; }
    .note { color: #64748b; font-size: 11px; line-height: 1.6; margin-top: 12px; }
    .footer { border-top: 1px solid #d1d5db; color: #64748b; font-size: 11px; margin-top: 32px; padding-top: 14px; }
    @media print { .report { padding: 0; } }
  </style>
</head>
<body>
  <main class="report">
    <header class="header">
      <div>
        <p class="eyebrow">Influencer Attribution Report</p>
        <h1 class="title">${escapeHtml(sourceName)}</h1>
        <p class="subtitle">Formal performance report for dedicated Moneko download links attributed to this source.</p>
      </div>
      <div class="brand">
        <img class="logo" src="/logo192.png" alt="Moneko logo" />
        <div class="brand-name">Moneko</div>
        <div class="date">Generated ${escapeHtml(generatedAt)}</div>
      </div>
    </header>

    <section class="section">
      <h2 class="section-title">Executive Summary</h2>
      <div class="metrics">
        ${metricHtml("Sessions", summary?.sessionCount ?? 0)}
        ${metricHtml("Download Sessions", summary?.downloadedCount ?? 0)}
        ${metricHtml("Download Clicks", summary?.downloadClickCount ?? 0)}
        ${metricHtml("Page Views", summary?.pageViewCount ?? 0)}
        ${metricHtml("Conversion Rate", `${conversionRate.toFixed(1)}%`)}
        ${metricHtml("Clicks / Session", clicksPerSession.toFixed(2))}
        ${metricHtml("iOS Clicks", summary?.iosClickCount ?? 0)}
        ${metricHtml("Android Clicks", summary?.androidClickCount ?? 0)}
      </div>
      <p class="note">Conversion rate is calculated as downloaded sessions divided by tracked sessions. Clicks per session is calculated as total download clicks divided by tracked sessions.</p>
    </section>

    <section class="section">
      <h2 class="section-title">Session Activity</h2>
      <table>
        <thead>
          <tr>
            <th>Platforms</th>
            <th>Created</th>
            <th class="number">Views</th>
            <th>Downloaded</th>
            <th>Timezone</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(sessionRowHtml).join("")}
        </tbody>
      </table>
    </section>

    <footer class="footer">This report is generated from anonymous attribution sessions and excludes visitor identifiers and device user-agent details from the influencer-facing export.</footer>
  </main>
</body>
</html>`;
}

function metricHtml(label: string, value: string | number): string {
  return `<div class="metric"><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value">${escapeHtml(String(value))}</div></div>`;
}

function sessionRowHtml(row: DownloadAttributionSession): string {
  return `<tr>
    <td>${escapeHtml(row.clicked_platforms.join(", ") || "-")}</td>
    <td>${escapeHtml(formatDate(row.created_at))}</td>
    <td class="number">${row.page_view_count.toLocaleString()}</td>
    <td>${row.downloaded ? "Yes" : "No"}</td>
    <td>${escapeHtml(row.timezone || "-")}</td>
  </tr>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
