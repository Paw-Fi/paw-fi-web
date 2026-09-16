/// <reference lib="deno.ns" />

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

const sourceUrl = new URL("../telegram-ai-bot/index.ts", import.meta.url);

async function readTelegramBotSource() {
  return await Deno.readTextFile(sourceUrl);
}

Deno.test("telegram starts typing before reserving idempotency", async () => {
  const source = await readTelegramBotSource();
  const heartbeatStart = source.indexOf(
    "const stopTypingHeartbeat = startTelegramTypingHeartbeat(",
  );
  const reservation = source.indexOf("reserve = await reserveIdempotency(");

  assert(heartbeatStart >= 0, "typing heartbeat must be created");
  assert(reservation >= 0, "idempotency must be reserved");
  assert(
    heartbeatStart < reservation,
    "typing heartbeat must begin before the idempotency RPC",
  );
});

Deno.test("telegram stops typing for duplicate updates", async () => {
  const source = await readTelegramBotSource();
  const duplicateStart = source.indexOf(
    'if (reserve.status === "duplicate") {',
  );
  const duplicateReturn = source.indexOf(
    "return jsonResponse({ ok: true });",
    duplicateStart,
  );
  const stopHeartbeat = source.indexOf("stopTypingHeartbeat(", duplicateStart);

  assert(duplicateStart >= 0, "duplicate branch must exist");
  assert(stopHeartbeat > duplicateStart, "duplicate branch must stop typing");
  assertEquals(
    stopHeartbeat < duplicateReturn,
    true,
    "typing must stop before the duplicate response returns",
  );
});

Deno.test(
  "telegram stops typing after fresh processing completes",
  async () => {
    const source = await readTelegramBotSource();
    const backgroundStart = source.indexOf("runBackgroundTask(");
    const finallyStart = source.indexOf("} finally {", backgroundStart);
    const stopHeartbeat = source.indexOf("stopTypingHeartbeat(", finallyStart);

    assert(backgroundStart >= 0, "fresh work must run in the background");
    assert(
      finallyStart > backgroundStart,
      "fresh work must clean up in finally",
    );
    assert(
      stopHeartbeat > finallyStart,
      "fresh work must stop typing in finally",
    );
  },
);
