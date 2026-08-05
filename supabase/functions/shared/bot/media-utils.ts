/// <reference lib="deno.ns" />

export function buildGeminiHighDemandMessage(language?: string | null): string {
  const normalized = String(language || "en")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (normalized === "zh") {
    return "Moneko 当前请求量较高。请稍后再试。";
  }
  if (normalized === "zh_tw") {
    return "Moneko 當前請求量較高。請稍後再試。";
  }
  return "We’re experiencing high demand right now. Please try again shortly.";
}

export function buildProcessingFailureMessage(
  language?: string | null,
): string {
  const normalized = String(language || "en")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (normalized === "zh") {
    return "我刚刚处理你的消息时遇到了临时问题。请过几秒再试一次。";
  }
  if (normalized === "zh_tw") {
    return "我剛剛處理你的訊息時遇到了臨時問題。請過幾秒再試一次。";
  }
  return "I hit a temporary issue while processing your message. Please try again in a few seconds.";
}

export function runBackgroundTask(task: Promise<unknown>): void {
  const edgeRuntime = (globalThis as any)?.EdgeRuntime;
  if (edgeRuntime?.waitUntil) {
    edgeRuntime.waitUntil(task);
    return;
  }
  void task;
}

export function decodeBase64(data: string): Uint8Array {
  const cleaned = data.replace(/^data:.*;base64,/, "");
  const bin = atob(cleaned);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

export function uint8ToBase64(buf: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < buf.length; i += chunkSize) {
    const subarray = buf.subarray(i, Math.min(i + chunkSize, buf.length));
    binary += String.fromCharCode.apply(null, Array.from(subarray));
  }
  return btoa(binary);
}

export function truncateTextByCodePoints(input: string, max: number): string {
  const arr = Array.from((input || "").trim());
  if (arr.length <= max) return arr.join("");
  return arr.slice(0, Math.max(0, max - 1)).join("") + "…";
}

export function extractQuickChartUrl(text: string): {
  url: string | null;
  cleanedText: string;
} {
  const input = (text || "").trim();
  if (!input) return { url: null, cleanedText: "" };

  const regex = /(https?:\/\/quickchart\.io\/chart[^\s<>"]+)/gi;
  const matches = input.match(regex) || [];
  const raw = matches[0] || "";
  const url = raw ? raw.replace(/[)\].,!?;:]+$/g, "") : null;
  if (!url) return { url: null, cleanedText: input };

  const withoutUrl = input.replace(raw, "");
  const cleanedText = withoutUrl
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();

  return { url, cleanedText };
}

export function parseQuickChartConfigFromUrl(url: string): unknown | null {
  try {
    const u = new URL(url);
    if (!/quickchart\.io$/i.test(u.hostname)) return null;
    if (!u.pathname.startsWith("/chart")) return null;
    if (u.pathname.startsWith("/chart/render/")) return null;
    const c = u.searchParams.get("c");
    if (!c) return null;
    const decoded = decodeURIComponent(c);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function createQuickChartShortUrl(
  chartConfig: unknown,
): Promise<string | null> {
  try {
    const res = await fetch("https://quickchart.io/chart/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chart: chartConfig,
        format: "png",
        width: 720,
        height: 480,
        devicePixelRatio: 2,
        backgroundColor: "white",
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as any;
    if (!json?.success || typeof json?.url !== "string") return null;
    return json.url;
  } catch {
    return null;
  }
}

export async function normalizeQuickChartMediaUrl(
  url: string,
): Promise<string> {
  const input = (url || "").trim();
  if (!input) return input;
  if (/^https?:\/\/quickchart\.io\/chart\/render\//i.test(input)) {
    return input;
  }
  const cfg = parseQuickChartConfigFromUrl(input);
  if (!cfg) return input;
  return (await createQuickChartShortUrl(cfg)) || input;
}

export function extractChartMediaUrlFromToolResult(
  toolResult: unknown,
): string | null {
  if (!toolResult || typeof toolResult !== "object") return null;

  const candidateValues = [
    (toolResult as Record<string, unknown>).url,
    (toolResult as Record<string, unknown>).chart_url,
    (toolResult as Record<string, any>).snapshot?.chart_url,
    (toolResult as Record<string, any>).data?.chart_url,
  ];

  for (const value of candidateValues) {
    if (typeof value !== "string") continue;
    const cleaned = value.trim();
    if (!cleaned) continue;
    if (!/^https?:\/\/quickchart\.io\/chart/i.test(cleaned)) continue;
    return cleaned;
  }

  return null;
}

export async function runAnalyzeExpenseWithTimeout(
  payload: any,
  apiKey: string | undefined,
  timeoutMs: number,
  timeoutError: string,
  logPrefix = "ai-bot",
): Promise<any> {
  try {
    // Loading document parsers eagerly pulls Node-compatibility shims into
    // every text-only bot request. Supabase Edge isolates can reject those
    // shims while settling microtasks, so load them only for media analysis.
    const { runAnalyzeExpense } = await import("../analyze-core.ts");
    const analysisPromise = runAnalyzeExpense(payload, apiKey || "");
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), timeoutMs);
    });

    return await Promise.race([analysisPromise, timeoutPromise]);
  } catch (error) {
    console.error(`[${logPrefix}] analyze-expense timeout/error:`, error);
    return {
      success: false,
      error: timeoutError,
      language: "en",
    };
  }
}
