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
  TrendingUp,
} from "lucide-react";

import { CreatorHeader } from "@/components/creator/creator-header";
import { RangeComparisonCard } from "@/components/performance/range-comparison-card";
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
  getAttributionSource,
  matchesAttributionSearch,
  summarizeDownloadAttributionRows,
  useDownloadAttributionSessions,
  type DownloadAttributionSession,
} from "@/hooks/use-download-attribution-sessions";
import { useCreatorDateRange } from "@/hooks/use-creator-date-range";
import { dateToIso } from "@/lib/creator-date-range";
import { parseISO } from "date-fns";

export const Route = createFileRoute("/creator/source-tracker/$source")({
  component: SourceTrackerDetailPage,
});

function SourceTrackerDetailPage() {
  const { source } = Route.useParams();
  const sourceName = safelyDecodeSource(source);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");

  const {
    rangePreset,
    startDate,
    endDate,
    compareEnabled,
    compareMode,
    compareStartDate,
    compareEndDate,
    normalizedRange,
    compareRange,
    rangeLabel,
    compareLabel,
    setStartDate,
    setEndDate,
    setCompareEnabled,
    setCompareMode,
    setCompareStartDate,
    setCompareEndDate,
    applyPreset,
  } = useCreatorDateRange();

  const { rows, isLoading, error } = useDownloadAttributionSessions(refreshKey);

  // All-time rows for this source
  const allTimeSourceRows = useMemo(
    () => rows.filter((row) => getAttributionSource(row) === sourceName),
    [rows, sourceName],
  );

  // Period filtered rows for this source
  const sourceRowsInRange = useMemo(
    () =>
      allTimeSourceRows.filter((row) => {
        const key = safeDateKey(row.created_at);
        return key !== null && key >= normalizedRange.start && key <= normalizedRange.end;
      }),
    [allTimeSourceRows, normalizedRange.end, normalizedRange.start],
  );

  const sourceRowsInCompareRange = useMemo(
    () =>
      allTimeSourceRows.filter((row) => {
        const key = safeDateKey(row.created_at);
        return key !== null && key >= compareRange.start && key <= compareRange.end;
      }),
    [allTimeSourceRows, compareRange.end, compareRange.start],
  );

  // Search filtered rows
  const filteredRows = useMemo(
    () => sourceRowsInRange.filter((row) => matchesAttributionSearch(row, search)),
    [sourceRowsInRange, search],
  );

  // Summaries
  const allTimeSummary = useMemo(
    () => summarizeDownloadAttributionRows(allTimeSourceRows)[0] ?? null,
    [allTimeSourceRows],
  );

  const periodSummary = useMemo(
    () => summarizeDownloadAttributionRows(sourceRowsInRange)[0] ?? null,
    [sourceRowsInRange],
  );

  const compareSummary = useMemo(
    () => summarizeDownloadAttributionRows(sourceRowsInCompareRange)[0] ?? null,
    [sourceRowsInCompareRange],
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-20 selection:bg-slate-800">
      <CreatorHeader />

      <div className="mx-auto w-full max-w-7xl space-y-10 px-6 pt-8">
        {/* Header & Page Title */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-800/80 pb-6">
          <div className="space-y-2">
            <Link
              to="/creator/source-tracker"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to source directory</span>
            </Link>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                <span>Creator Console</span>
                <span className="text-slate-600">•</span>
                <span>Source Analytics</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                {sourceName}
              </h1>
              <p className="max-w-2xl text-xs text-slate-400 font-normal">
                Detailed attribution breakdown and session log recorded for channel "{sourceName}".
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900 hover:text-white gap-1.5 transition-all text-xs"
              disabled={isLoading || allTimeSourceRows.length === 0}
              onClick={() => exportInfluencerReportPdf(sourceName, allTimeSourceRows)}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Export PDF Report</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="border border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900 hover:text-white gap-1.5 transition-all text-xs"
              onClick={() => setRefreshKey((key) => key + 1)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
          </div>
        </header>

        {/* Global Date Control Toolbar */}
        <RangeComparisonCard
          rangePreset={rangePreset}
          startDate={startDate}
          endDate={endDate}
          compareEnabled={compareEnabled}
          compareMode={compareMode}
          compareStartDate={compareStartDate}
          compareEndDate={compareEndDate}
          rangeLabel={rangeLabel}
          compareLabel={compareLabel}
          onPresetChange={applyPreset}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onCompareToggle={() => setCompareEnabled((prev) => !prev)}
          onCompareModeChange={setCompareMode}
          onCompareStartDateChange={setCompareStartDate}
          onCompareEndDateChange={setCompareEndDate}
        />

        {/* SECTION 1: ALL-TIME OVERVIEW vs PERIOD ACTIVITY */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Source Channel Performance
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-medium text-slate-300">{rangeLabel}</span>
              {compareEnabled && (
                <>
                  <span className="text-slate-600">vs</span>
                  <span className="font-medium text-indigo-300">{compareLabel}</span>
                </>
              )}
              <span className="text-slate-600">·</span>
              <span className="font-mono">
                All-Time: {(allTimeSummary?.sessionCount ?? 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricBlock
              title="Tracked Sessions"
              value={periodSummary?.sessionCount ?? 0}
              detail={
                compareEnabled
                  ? formatChangeDelta(
                      periodSummary?.sessionCount ?? 0,
                      compareSummary?.sessionCount ?? 0,
                    )
                  : `All-time total: ${(allTimeSummary?.sessionCount ?? 0).toLocaleString()}`
              }
              badgeText="PERIOD"
            />
            <MetricBlock
              title="Downloaded Sessions"
              value={periodSummary?.downloadedCount ?? 0}
              detail={
                compareEnabled
                  ? formatChangeDelta(
                      periodSummary?.downloadedCount ?? 0,
                      compareSummary?.downloadedCount ?? 0,
                    )
                  : `All-time downloads: ${(allTimeSummary?.downloadedCount ?? 0).toLocaleString()}`
              }
              badgeText="PERIOD"
            />
            <MetricBlock
              title="Download Clicks"
              value={periodSummary?.downloadClickCount ?? 0}
              detail={
                compareEnabled
                  ? formatChangeDelta(
                      periodSummary?.downloadClickCount ?? 0,
                      compareSummary?.downloadClickCount ?? 0,
                    )
                  : `All-time clicks: ${(allTimeSummary?.downloadClickCount ?? 0).toLocaleString()}`
              }
              badgeText="PERIOD"
            />
            <MetricBlock
              title="Total Page Views"
              value={periodSummary?.pageViewCount ?? 0}
              detail={
                compareEnabled
                  ? formatChangeDelta(
                      periodSummary?.pageViewCount ?? 0,
                      compareSummary?.pageViewCount ?? 0,
                    )
                  : `All-time views: ${(allTimeSummary?.pageViewCount ?? 0).toLocaleString()}`
              }
              badgeText="PERIOD"
            />
          </div>
        </section>

        {/* SEARCH TOOLBAR */}
        <section className="space-y-4 pt-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-slate-800 bg-slate-900/40 p-3.5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Search Channel Session Logs
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Filter session IDs, paths, referrers, and timezones for {sourceName}
              </p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search session, URL, timezone..."
                className="h-8 border-slate-800 bg-slate-950 pl-8 text-xs text-slate-200 placeholder:text-slate-500"
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-rose-900/40 bg-rose-950/20 p-4 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* SECTION 2: VIRTUALIZED ATTRIBUTION SESSIONS TABLE */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Session Breakdown ({filteredRows.length.toLocaleString()} rows)
            </h2>
            <span className="text-[11px] font-mono text-slate-500">
              Showing filtered date range results
            </span>
          </div>

          {isLoading && (
            <p className="rounded-lg border border-slate-800 bg-slate-950/60 p-8 text-center text-xs text-slate-500">
              Loading source session logs...
            </p>
          )}
          {!isLoading && filteredRows.length === 0 && (
            <p className="rounded-lg border border-slate-800 bg-slate-950/60 p-8 text-center text-xs text-slate-500">
              No sessions matched this source, date range, and search query.
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

function MetricBlock({
  title,
  value,
  detail,
  badgeText,
}: {
  title: string;
  value: number;
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

        <div className="text-3xl font-extrabold tracking-tight text-white pt-0.5">
          {value.toLocaleString()}
        </div>
      </div>

      <p className="text-xs text-slate-500 font-normal leading-tight">
        {detail}
      </p>
    </div>
  );
}

function VirtualizedAttributionRowsTable({
  rows,
}: {
  rows: DownloadAttributionSession[];
}) {
  const rowHeight = 48;
  const viewportHeight = 600;
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
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden space-y-2 p-1">
      <div
        className="max-h-[600px] overflow-auto rounded border border-slate-800/80"
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9">Platforms</TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9">Created</TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9 text-right">Views</TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9">Downloaded</TableHead>
              <TableHead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider h-9">Timezone</TableHead>
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
                className="h-12 border-slate-800/60 hover:bg-slate-900/40 transition-colors"
              >
                <TableCell className="py-2">
                  <PlatformBadges row={row} />
                </TableCell>
                <TableCell className="text-xs text-slate-300 py-2">
                  {formatDate(row.created_at)}
                </TableCell>
                <TableCell className="text-right text-xs font-semibold text-slate-300 py-2">
                  {row.page_view_count.toLocaleString()}
                </TableCell>
                <TableCell className="py-2">
                  <span
                    className={
                      row.downloaded
                        ? "text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded border border-emerald-900/50 bg-emerald-950/40 text-emerald-300"
                        : "text-[10px] font-medium uppercase px-1.5 py-0.2 rounded border border-slate-800 bg-slate-900 text-slate-400"
                    }
                  >
                    {row.downloaded ? "Yes" : "No"}
                  </span>
                </TableCell>
                <TableCell className="max-w-[180px] truncate text-xs text-slate-400 py-2">
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
      <p className="px-3 pb-2 text-[11px] text-slate-500 font-mono">
        Showing rows {visibleRange.startIndex + 1}-{visibleRange.endIndex} of{" "}
        {rows.length.toLocaleString()}
      </p>
    </div>
  );
}

function PlatformBadges({ row }: { row: DownloadAttributionSession }) {
  if (row.clicked_platforms.length === 0) {
    return <span className="text-slate-600 text-xs">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {row.clicked_platforms.map((platform) => (
        <span
          key={platform}
          className="text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.2 rounded border border-slate-800 bg-slate-900 text-slate-300"
        >
          {platform}
        </span>
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

function safeDateKey(value: string | null): string | null {
  if (!value) return null;
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return dateToIso(parsed);
}

function calculateChangePercent(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

function formatChangeDelta(current: number, previous: number): string {
  const delta = current - previous;
  const sign = delta >= 0 ? "+" : "-";
  const absDelta = Math.abs(delta).toLocaleString();
  const percent = calculateChangePercent(current, previous);

  if (previous <= 0) {
    return `${sign}${absDelta}`;
  }

  return `${sign}${absDelta} (${percent >= 0 ? "+" : ""}${percent}%)`;
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

