import { VALID_CURRENCIES } from "./currency-validator.ts";
import { normalizePreferredTimezone } from "./merchant-regional-selection.ts";

export interface AiCaptureDefaults {
  version: 1;
  capturedAt: string;
  date: string;
  currency?: string;
  preferredTimezone?: string;
}

// These are defaults captured by the submitting client, never authorization or
// wallet/Space membership. Current RLS and interactive verification still apply.
export function parseAiCaptureDefaults(
  value: unknown,
): AiCaptureDefaults | null {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid AI capture defaults");
  }
  const input = value as Record<string, unknown>;
  if (
    input.version !== 1 || typeof input.capturedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(
      input.capturedAt,
    ) ||
    !Number.isFinite(Date.parse(input.capturedAt)) ||
    typeof input.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    new Date(`${input.date}T00:00:00Z`).toISOString().slice(0, 10) !==
      input.date
  ) {
    throw new Error("Invalid AI capture clock");
  }
  const currency = input.currency == null ? undefined : input.currency;
  if (
    currency !== undefined && (typeof currency !== "string" ||
      !VALID_CURRENCIES.includes(currency))
  ) {
    throw new Error("Invalid AI capture currency");
  }
  let preferredTimezone: string | undefined;
  if (input.preferredTimezone != null) {
    if (
      typeof input.preferredTimezone !== "string" ||
      !input.preferredTimezone.trim()
    ) {
      throw new Error("Invalid AI capture timezone");
    }
    const zone = input.preferredTimezone.trim();
    const offset = /^(?:UTC|GMT)?([+-])(\d{2}):(\d{2})$/.exec(zone);
    if (offset) {
      const hours = Number(offset[2]);
      const minutes = Number(offset[3]);
      if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0)) {
        throw new Error("Invalid AI capture timezone");
      }
      preferredTimezone = `UTC${offset[1]}${offset[2]}:${offset[3]}`;
    } else {
      preferredTimezone = normalizePreferredTimezone(zone);
      if (!preferredTimezone) throw new Error("Invalid AI capture timezone");
    }
  }
  return {
    version: 1,
    capturedAt: input.capturedAt,
    date: input.date,
    currency: currency as string | undefined,
    preferredTimezone,
  };
}

export function applyAiCaptureDefaults<
  T extends {
    date?: string;
    currency?: string;
    preferredTimezone?: string;
  },
>(body: T, capture: AiCaptureDefaults | null): T {
  if (!capture) return body;
  return {
    ...body,
    date: capture.date,
    currency: capture.currency ?? body.currency,
    preferredTimezone: capture.preferredTimezone,
  };
}
