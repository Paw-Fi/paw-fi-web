/// <reference lib="deno.ns" />
import { PGlite } from "npm:@electric-sql/pglite@0.3.14";
import {
  assertEquals,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  notificationRecurringConfirmationPayload,
  resolveNotificationRecurringOccurrence,
  scaleNotificationRecurringSplit,
} from "../shared/android-recurring-capture.ts";
import { normalizeNotificationCounterparty } from "../shared/notification-capture-identity.ts";

const schedule = {
  id: "recurring-1",
  date: "2024-01-31",
  amount_cents: 1099,
  currency: "THB",
  type: "expense",
  merchant: "นาย ยุคนธร จันท",
  account_id: "wallet-1",
  recurrence_rule: { frequency: "monthly", anchor_date: "2024-01-31" },
};
const candidate = {
  merchant: schedule.merchant,
  currency: "THB",
  transactionType: "expense" as const,
  accountId: "wallet-1",
  frequency: "monthly",
  date: "2024-03-01",
};
async function calendarFixture() {
  const db = new PGlite();
  for (
    const file of [
      "20260408170000_add_recurring_aware_wallets_and_pockets_rpcs.sql",
      "20260716150000_fix_recurring_reminder_occurrence_selection.sql",
    ]
  ) {
    const sql = await Deno.readTextFile(
      new URL(`../../migrations/${file}`, import.meta.url),
    );
    await db.exec(sql.slice(0, sql.indexOf("$$;") + 3));
  }
  return {
    db,
    next: async (a: Record<string, unknown>) =>
      (await db.query<{ value: string | null }>(
        "select calculate_next_occurrence_on_or_after($1,$2,$3,$4,$5)::text value",
        [
          a.p_anchor_date,
          a.p_frequency,
          a.p_interval,
          a.p_end_date,
          a.p_reference_date,
        ],
      )).rows[0].value,
  };
}
Deno.test("notification identity preserves scripts, punctuation and meaningful names", () => {
  for (
    const name of [
      "นาย ยุคนธร จันท",
      "佐藤商店",
      "أحمد علي",
      "किरण शर्मा",
      "Google Pay",
      "Premium Bank",
      "7-Eleven",
    ]
  ) {
    assertEquals(
      normalizeNotificationCounterparty(name),
      name.normalize("NFKC").toLowerCase(),
    );
  }
  assertEquals(
    normalizeNotificationCounterparty("  ＡＣＭＥ\u00a0\u00a0銀行  "),
    "acme 銀行",
  );
  assertEquals(
    normalizeNotificationCounterparty("นาย กิตติ") ===
      normalizeNotificationCounterparty("นาย สมชาย"),
    false,
  );
});
Deno.test("recurring notification uses the actual production calendar for clamping, drift and intervals", async () => {
  const { db, next } = await calendarFixture();
  try {
    assertEquals(
      (await resolveNotificationRecurringOccurrence(
        [schedule],
        candidate,
        next,
      ))?.scheduledOccurrenceDate,
      "2024-02-29",
    );
    assertEquals(
      (await resolveNotificationRecurringOccurrence(
        [{
          ...schedule,
          recurrence_rule: {
            ...schedule.recurrence_rule,
            interval: 2,
          },
        }],
        { ...candidate, interval: 2, date: "2024-03-31" },
        next,
      ))?.scheduledOccurrenceDate,
      "2024-03-31",
    );
    assertEquals(
      await resolveNotificationRecurringOccurrence(
        [{
          ...schedule,
          recurrence_rule: {
            ...schedule.recurrence_rule,
            interval: 2,
          },
        }],
        { ...candidate, interval: 2 },
        next,
      ),
      null,
    );
    assertEquals(
      await resolveNotificationRecurringOccurrence([schedule], {
        ...candidate,
        interval: 2,
      }, next),
      null,
    );
    assertEquals(
      await resolveNotificationRecurringOccurrence(
        [{
          ...schedule,
          recurrence_rule: {
            ...schedule.recurrence_rule,
            end_date: "2024-01-31",
          },
        }],
        candidate,
        next,
      ),
      null,
    );
    assertEquals(
      await resolveNotificationRecurringOccurrence([schedule], {
        ...candidate,
        date: "2023-12-31",
      }, next),
      null,
    );
  } finally {
    await db.close();
  }
});
Deno.test("verified recurring payment matching supports multilingual identities and rejects unproven cadence", async () => {
  const { db, next } = await calendarFixture();
  try {
    for (
      const merchant of ["佐藤商店", "أحمد علي", "นาย ยุคนธร จันท", "किरण शर्मा"]
    ) {
      assertEquals(
        (await resolveNotificationRecurringOccurrence(
          [{ ...schedule, merchant }],
          { ...candidate, merchant },
          next,
        ))?.schedule.id,
        schedule.id,
      );
    }
    assertEquals(
      await resolveNotificationRecurringOccurrence([schedule], {
        ...candidate,
        frequency: undefined,
      }, next),
      null,
    );
    assertEquals(
      await resolveNotificationRecurringOccurrence([schedule], {
        ...candidate,
        merchant: "นาย ยุคนธร",
      }, next),
      null,
    );
    assertEquals(
      await resolveNotificationRecurringOccurrence([schedule], {
        ...candidate,
        frequency: "weekly",
      }, next),
      null,
    );
    for (
      const patch of [
        { currency: "USD" },
        { transactionType: "income" as const },
        { accountId: "wallet-2" },
        { accountId: null },
      ]
    ) {
      assertEquals(
        await resolveNotificationRecurringOccurrence([schedule], {
          ...candidate,
          ...patch,
        }, next),
        null,
      );
    }
    assertEquals(
      (await resolveNotificationRecurringOccurrence(
        [{ ...schedule, account_id: null }],
        candidate,
        next,
      ))?.schedule.id,
      schedule.id,
    );
  } finally {
    await db.close();
  }
});
Deno.test("recurring payments never arbitrarily choose among multiple schedules", async () => {
  const { db, next } = await calendarFixture();
  try {
    await assertRejects(
      () =>
        resolveNotificationRecurringOccurrence(
          [schedule, { ...schedule, id: "second", amount_cents: 9999 }],
          candidate,
          next,
        ),
      Error,
      "NOTIFICATION_RECURRING_MATCH_AMBIGUOUS",
    );
    const daily = {
      ...schedule,
      recurrence_rule: { frequency: "daily", anchor_date: "2024-01-31" },
    };
    assertEquals(
      (await resolveNotificationRecurringOccurrence([daily], {
        ...candidate,
        frequency: "daily",
      }, next))
        ?.scheduledOccurrenceDate,
      candidate.date,
    );
    await assertRejects(
      () =>
        resolveNotificationRecurringOccurrence(
          [schedule],
          candidate,
          async () => "2024-02-30",
        ),
      Error,
      "INVALID_RECURRING_CALENDAR_RESPONSE",
    );
  } finally {
    await db.close();
  }
});
Deno.test("changed recurring actual amounts preserve saved allocations with cent-exact rounding", () => {
  const lines = [
    { user_id: "b", amount_cents: 400 },
    { user_id: "a", amount_cents: 600 },
    { user_id: "new-member", amount_cents: 0 },
  ];
  assertEquals(scaleNotificationRecurringSplit(lines, 1000, 1299), {
    splitType: "amount",
    memberSplits: [
      { userId: "a", amount: 7.79 },
      { userId: "b", amount: 5.2 },
      { userId: "new-member", amount: 0 },
    ],
  });
  for (const amount of [1, 2, 999, 2147483647]) {
    const result = scaleNotificationRecurringSplit(lines, 1000, amount);
    assertEquals(
      result.memberSplits.reduce(
        (sum, x) => sum + Math.round(x.amount * 100),
        0,
      ),
      amount,
    );
    assertEquals(result.memberSplits[2].amount, 0);
  }
  assertThrows(() => scaleNotificationRecurringSplit(lines, 1100, 1299), Error);
  assertThrows(
    () => scaleNotificationRecurringSplit([...lines, lines[0]], 1400, 1299),
    Error,
  );
});
Deno.test("recurring confirmation exposes a confirmed actual acknowledgement and rejects malformed successes", () => {
  for (const duplicate of [false, true]) {
    assertEquals(
      notificationRecurringConfirmationPayload({
        success: true,
        data: {
          duplicate,
          transaction: { id: "actual", amount_cents: 1299 },
          occurrence: { id: "cycle" },
        },
      }),
      {
        success: true,
        duplicate,
        data: { id: "actual", amount_cents: 1299 },
        occurrence: { id: "cycle" },
        meta: { recurringOccurrenceConfirmed: true },
      },
    );
  }
  for (
    const payload of [{}, { success: true }, {
      success: false,
      data: { transaction: { id: "actual" } },
    }]
  ) {
    assertThrows(
      () => notificationRecurringConfirmationPayload(payload),
      Error,
      "INVALID_RECURRING_CONFIRMATION_RESPONSE",
    );
  }
});
