import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

import type { PdfAnalysisResult } from "./types.ts";

function getCacheTtlHours(): number {
  try {
    return Number(Deno.env.get("PDF_ANALYSIS_CACHE_TTL_HOURS") || 24);
  } catch {
    return 24;
  }
}

export interface PdfAnalysisLogEntry {
  requestId: string;
  hash: string;
  documentType: string;
  pageCount: number;
  extractionStrategy: string;
  aiProvider?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  cacheHit: boolean;
  anomaly?: unknown;
}

export interface PdfAnalysisStorage {
  get(hash: string): Promise<PdfAnalysisResult | null>;
  set(hash: string, result: PdfAnalysisResult): Promise<void>;
  log(entry: PdfAnalysisLogEntry): Promise<void>;
}

function getSupabaseAdminClient() {
  let url: string | undefined;
  let key: string | undefined;
  try {
    url = Deno.env.get("SUPABASE_URL");
    key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  } catch {
    url = undefined;
    key = undefined;
  }
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function sanitizeResultForStorage(
  result: PdfAnalysisResult,
): PdfAnalysisResult {
  const clone = JSON.parse(JSON.stringify(result)) as PdfAnalysisResult;
  delete clone.raw_text;
  clone.metadata = {
    ...clone.metadata,
    cache_hit: false,
  };
  return clone;
}

export function createPdfAnalysisStorage(): PdfAnalysisStorage {
  const supabase = getSupabaseAdminClient();

  return {
    async get(hash: string): Promise<PdfAnalysisResult | null> {
      if (!supabase) return null;

      const { data, error } = await supabase
        .from("pdf_analysis_cache")
        .select("result, expires_at")
        .eq("hash", hash)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (error || !data?.result) return null;

      const result = data.result as PdfAnalysisResult;
      result.metadata = {
        ...result.metadata,
        cache_hit: true,
      };
      return result;
    },

    async set(hash: string, result: PdfAnalysisResult): Promise<void> {
      if (!supabase || result.error) return;

      const expiresAt = new Date(
        Date.now() + getCacheTtlHours() * 60 * 60 * 1000,
      ).toISOString();
      const payload = sanitizeResultForStorage(result);

      await supabase.from("pdf_analysis_cache").upsert(
        {
          hash,
          result: payload,
          expires_at: expiresAt,
        },
        { onConflict: "hash" },
      );
    },

    async log(entry: PdfAnalysisLogEntry): Promise<void> {
      if (!supabase) return;

      await supabase.from("pdf_analysis_logs").insert({
        request_id: entry.requestId,
        hash: entry.hash,
        document_type: entry.documentType,
        page_count: entry.pageCount,
        extraction_strategy: entry.extractionStrategy,
        ai_provider: entry.aiProvider || null,
        input_tokens: entry.inputTokens || null,
        output_tokens: entry.outputTokens || null,
        latency_ms: entry.latencyMs || null,
        cache_hit: entry.cacheHit,
        anomaly: entry.anomaly ?? null,
      });
    },
  };
}
