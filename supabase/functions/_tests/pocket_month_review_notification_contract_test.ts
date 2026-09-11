/// <reference lib="deno.ns" />

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const producerMigration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260910120000_harden_pockets_month_review_notification_delivery.sql",
    import.meta.url,
  ),
);
const fallbackWorker = await Deno.readTextFile(
  new URL("../households-process-notifications/index.ts", import.meta.url),
);

Deno.test(
  "pocket review reminders are created once on each local financial-cycle start",
  () => {
    assert(
      producerMigration.includes("financial_cycle_start_for_month") &&
        producerMigration.includes(
          "= (timezone(contact.timezone_name, now()))::date",
        ),
      "The producer must use each user's local financial-cycle start date",
    );
    assert(
      producerMigration.includes("'*/15 * * * *'") &&
        producerMigration.includes("ON CONFLICT DO NOTHING"),
      "The producer must retry throughout the morning without duplicate cycle events",
    );
    assert(
      producerMigration.includes("'expires_at'") &&
        producerMigration.includes("AT TIME ZONE candidate.timezone_name"),
      "The notification must expire at the next local day boundary",
    );
  },
);

Deno.test(
  "the fallback notification worker can deliver or expire a pocket review event",
  () => {
    assert(
      fallbackWorker.includes('case "pockets_month_review"') &&
        fallbackWorker.includes("openPocketsPage"),
      "The fallback worker must recognize pocket review events and retain the Pockets deep link",
    );
    assert(
      fallbackWorker.includes("Pocket month review expired before delivery"),
      "The fallback worker must not send a stale financial-cycle reminder",
    );
  },
);
