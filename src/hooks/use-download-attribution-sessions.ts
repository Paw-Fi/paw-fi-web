import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";

export type DownloadAttributionSession =
  Database["public"]["Tables"]["download_attribution_sessions"]["Row"];

export interface DownloadAttributionSourceSummary {
  source: string;
  sessionCount: number;
  downloadedCount: number;
  downloadClickCount: number;
  pageViewCount: number;
  iosClickCount: number;
  androidClickCount: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
}

export interface DownloadAttributionTotals {
  sessionCount: number;
  sourceCount: number;
  downloadedCount: number;
  downloadClickCount: number;
}

export function useDownloadAttributionSessions(refreshKey = 0) {
  const [rows, setRows] = useState<DownloadAttributionSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function fetchRows() {
      setIsLoading(true);
      setError(null);

      try {
        const nextRows = await fetchAllDownloadAttributionSessions();

        if (!isCancelled) {
          setRows(nextRows);
        }
      } catch (fetchError) {
        if (!isCancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load source tracker data",
          );
          setRows([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchRows();

    return () => {
      isCancelled = true;
    };
  }, [refreshKey]);

  const summaries = useMemo(
    () => summarizeDownloadAttributionRows(rows),
    [rows],
  );
  const totals = useMemo<DownloadAttributionTotals>(
    () => ({
      sessionCount: rows.length,
      sourceCount: summaries.length,
      downloadedCount: rows.filter((row) => row.downloaded).length,
      downloadClickCount: rows.reduce(
        (total, row) => total + row.download_click_count,
        0,
      ),
    }),
    [rows, summaries.length],
  );

  return { rows, summaries, totals, isLoading, error };
}

export function getAttributionSource(row: DownloadAttributionSession): string {
  return row.source || row.last_source || row.first_source || "direct";
}

export function matchesAttributionSearch(
  row: DownloadAttributionSession,
  search: string,
): boolean {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return [
    getAttributionSource(row),
    row.first_source,
    row.last_source,
    row.session_id,
    row.visitor_id,
    row.first_landing_url,
    row.last_url,
    row.first_path,
    row.last_path,
    row.referrer,
    row.referrer_domain,
    row.language,
    row.timezone,
    row.viewport,
    row.user_agent,
    row.clicked_platforms.join(" "),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedSearch));
}

export function summarizeDownloadAttributionRows(
  rows: DownloadAttributionSession[],
): DownloadAttributionSourceSummary[] {
  const summariesBySource = new Map<string, DownloadAttributionSourceSummary>();

  for (const row of rows) {
    const source = getAttributionSource(row);
    const current = summariesBySource.get(source) ?? {
      source,
      sessionCount: 0,
      downloadedCount: 0,
      downloadClickCount: 0,
      pageViewCount: 0,
      iosClickCount: 0,
      androidClickCount: 0,
      firstSeenAt: null,
      lastSeenAt: null,
    };

    summariesBySource.set(source, {
      ...current,
      sessionCount: current.sessionCount + 1,
      downloadedCount: current.downloadedCount + (row.downloaded ? 1 : 0),
      downloadClickCount: current.downloadClickCount + row.download_click_count,
      pageViewCount: current.pageViewCount + row.page_view_count,
      iosClickCount: current.iosClickCount + (row.ios_clicked_at ? 1 : 0),
      androidClickCount:
        current.androidClickCount + (row.android_clicked_at ? 1 : 0),
      firstSeenAt: earliestTimestamp(current.firstSeenAt, row.created_at),
      lastSeenAt: latestTimestamp(current.lastSeenAt, row.updated_at),
    });
  }

  return Array.from(summariesBySource.values()).sort((a, b) => {
    if (b.sessionCount !== a.sessionCount) {
      return b.sessionCount - a.sessionCount;
    }

    return b.downloadClickCount - a.downloadClickCount;
  });
}

async function fetchAllDownloadAttributionSessions(): Promise<
  DownloadAttributionSession[]
> {
  const pageSize = 1000;
  let from = 0;
  let rows: DownloadAttributionSession[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("download_attribution_sessions")
      .select("*")
      .order("updated_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    const page = data ?? [];
    rows = [...rows, ...page];

    if (page.length < pageSize) {
      return rows;
    }

    from += pageSize;
  }
}

function earliestTimestamp(current: string | null, candidate: string): string {
  if (!current) {
    return candidate;
  }

  return new Date(candidate).getTime() < new Date(current).getTime()
    ? candidate
    : current;
}

function latestTimestamp(current: string | null, candidate: string): string {
  if (!current) {
    return candidate;
  }

  return new Date(candidate).getTime() > new Date(current).getTime()
    ? candidate
    : current;
}
