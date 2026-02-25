import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

interface ReportEdgeFunctionErrorInput {
  functionName: string;
  error: unknown;
  context?: Record<string, unknown>;
}

function floorToFiveMinuteWindow(date: Date) {
  const ms = date.getTime();
  const fiveMinutes = 5 * 60 * 1000;
  return new Date(Math.floor(ms / fiveMinutes) * fiveMinutes);
}

function hashFNV1a(str: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(1, maxLength - 3))}...`;
}

function scrubSensitiveText(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]")
    .replace(
      /(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi,
      "$1=[REDACTED]",
    )
    .replace(
      /[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
      "[REDACTED_JWT]",
    );
}

const SENSITIVE_KEY = /(token|secret|password|authorization|api[_-]?key)/i;

function sanitizeValue(
  value: unknown,
  keyHint: string | undefined,
  seen: WeakSet<object>,
  depth: number,
): unknown {
  if (depth > 6) return "[MAX_DEPTH_REACHED]";

  if (keyHint && SENSITIVE_KEY.test(keyHint)) {
    return "[REDACTED]";
  }

  if (typeof value === "string") {
    return scrubSensitiveText(truncate(value, 500));
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 50)
      .map((item) => sanitizeValue(item, undefined, seen, depth + 1));
  }

  if (value && typeof value === "object") {
    if (seen.has(value as object)) {
      return "[CIRCULAR_REFERENCE]";
    }
    seen.add(value as object);

    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const entries = Object.entries(obj).slice(0, 100);
    for (const [nestedKey, nestedValue] of entries) {
      result[nestedKey] = sanitizeValue(
        nestedValue,
        nestedKey,
        seen,
        depth + 1,
      );
    }

    if (Object.keys(obj).length > entries.length) {
      result.__truncated_keys = Object.keys(obj).length - entries.length;
    }

    return result;
  }

  return value;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message || "Unknown error",
      stack: typeof error.stack === "string" ? error.stack : "",
    };
  }

  if (typeof error === "string") {
    return {
      name: "Error",
      message: error,
      stack: "",
    };
  }

  return {
    name: "Error",
    message: (() => {
      try {
        return JSON.stringify(error);
      } catch {
        return String(error);
      }
    })(),
    stack: "",
  };
}

function buildFingerprint(
  functionName: string,
  name: string,
  message: string,
  stack: string,
) {
  const stackHead = stack.split("\n").slice(0, 3).join("\n");
  const source = `${functionName}|${name}|${message}|${stackHead}`;
  return hashFNV1a(source).toString(16).padStart(8, "0");
}

function sanitizeContext(context?: Record<string, unknown>) {
  if (!context || typeof context !== "object") return {};
  return sanitizeValue(context, undefined, new WeakSet<object>(), 0) as Record<
    string,
    unknown
  >;
}

export async function reportEdgeFunctionError({
  functionName,
  error,
  context,
}: ReportEdgeFunctionErrorInput) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) return;

  const normalized = normalizeError(error);
  const message = scrubSensitiveText(
    truncate(normalized.message || "Unknown error", 2000),
  );
  const stack = scrubSensitiveText(truncate(normalized.stack || "", 8000));
  const fingerprint = buildFingerprint(
    functionName,
    normalized.name,
    message,
    stack,
  );
  const windowStart = floorToFiveMinuteWindow(new Date()).toISOString();
  try {
    const sampleContext = (() => {
      try {
        return sanitizeContext(context);
      } catch {
        return { context_error: "sanitize_failed" };
      }
    })();

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const rpcCall = supabase
      .rpc("record_edge_error_aggregate", {
        p_window_start: windowStart,
        p_function_name: functionName,
        p_fingerprint: fingerprint,
        p_message: message,
        p_stack: stack,
        p_context: sampleContext,
      })
      .then(({ error }) => {
        if (error) throw error;
      });

    await Promise.race([
      rpcCall,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("edge error report timeout")), 1200);
      }),
    ]);
  } catch (reportError) {
    console.warn("[edge-error-alert] failed to record", {
      functionName,
      reportError,
    });
  }
}
