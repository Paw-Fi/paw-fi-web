/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  applyOwnedInboundEventUpdate,
  buildEmailImportDebugTraceId,
  resolveDuplicateWebhookStatusCode,
} from "../shared/email-import-event-state.ts";

type EmailImportEventRow = {
  id: string;
  status: string;
  processing_attempt_count: number;
  user_id: string | null;
  error_text: string | null;
  result?: Record<string, unknown> | null;
  processed_at?: string | null;
  lock_expires_at?: string | null;
};

class FakeUpdateQuery {
  #row: EmailImportEventRow;
  #patch: Record<string, unknown>;
  #filters = new Map<string, unknown>();

  constructor(row: EmailImportEventRow, patch: Record<string, unknown>) {
    this.#row = row;
    this.#patch = patch;
  }

  eq(column: string, value: unknown) {
    this.#filters.set(column, value);
    return this;
  }

  select(_columns: string) {
    return this;
  }

  async maybeSingle() {
    for (const [column, value] of this.#filters.entries()) {
      if ((this.#row as Record<string, unknown>)[column] !== value) {
        return { data: null, error: null };
      }
    }

    Object.assign(this.#row, this.#patch);
    return { data: { id: this.#row.id }, error: null };
  }
}

class FakeSupabase {
  row: EmailImportEventRow;

  constructor(row: EmailImportEventRow) {
    this.row = row;
  }

  from(table: string) {
    if (table !== "email_import_events") {
      throw new Error(`Unexpected table: ${table}`);
    }

    return {
      update: (patch: Record<string, unknown>) =>
        new FakeUpdateQuery(this.row, patch),
    };
  }
}

Deno.test(
  "resend inbound webhook: stale attempt cannot finalize after takeover",
  async () => {
    const supabase = new FakeSupabase({
      id: "event-1",
      status: "processing",
      processing_attempt_count: 2,
      user_id: null,
      error_text: null,
      lock_expires_at: "2026-04-23T14:32:26.803Z",
    });

    await assertRejects(
      () =>
        applyOwnedInboundEventUpdate({
          supabase,
          owner: {
            rowId: "event-1",
            attemptCount: 1,
          },
          patch: {
            status: "processed",
          },
        }),
      Error,
      "INBOUND_EVENT_LEASE_LOST",
    );

    await applyOwnedInboundEventUpdate({
      supabase,
      owner: {
        rowId: "event-1",
        attemptCount: 2,
      },
      patch: {
        status: "processed",
        processed_at: "2026-04-23T14:40:00.000Z",
      },
    });

    assertEquals(supabase.row.status, "processed");
    assertEquals(supabase.row.processing_attempt_count, 2);
  },
);

Deno.test(
  "resend inbound webhook: email import debug trace id is stable across exact replays",
  () => {
    assertEquals(
      buildEmailImportDebugTraceId("fb0fc7d4-b42d-485f-8764-705e648e3466"),
      buildEmailImportDebugTraceId("fb0fc7d4-b42d-485f-8764-705e648e3466"),
    );
  },
);

Deno.test(
  "resend inbound webhook: duplicate deliveries acknowledge webhook delivery",
  () => {
    assertEquals(resolveDuplicateWebhookStatusCode(true), 200);
    assertEquals(resolveDuplicateWebhookStatusCode(false), 200);
  },
);
