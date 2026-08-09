/// <reference lib="deno.ns" />

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test(
  "bot media analysis is included in the static module graph",
  async () => {
    const mediaUtilsSource = await Deno.readTextFile(
      new URL("../shared/bot/media-utils.ts", import.meta.url),
    );

    assert(
      mediaUtilsSource.includes(
        'import { runAnalyzeExpense } from "../analyze-core.ts";',
      ),
    );
    assertEquals(
      mediaUtilsSource.includes('await import("../analyze-core.ts")'),
      false,
    );
  },
);

Deno.test(
  "bot media analysis reports swallowed infrastructure errors",
  async () => {
    const mediaUtilsSource = await Deno.readTextFile(
      new URL("../shared/bot/media-utils.ts", import.meta.url),
    );

    assert(mediaUtilsSource.includes("reportEdgeFunctionError"));
    assert(mediaUtilsSource.includes("_backend_failure_reported"));
    assert(
      mediaUtilsSource.includes('error.message === "timeout"'),
      "Expected timeout errors to remain excluded from infrastructure alerts",
    );
  },
);

Deno.test("Telegram and WhatsApp share the media analysis helper", async () => {
  const sources = await Promise.all([
    Deno.readTextFile(new URL("../telegram-ai-bot/index.ts", import.meta.url)),
    Deno.readTextFile(
      new URL("../twilio-whatsapp-ai-bot/index.ts", import.meta.url),
    ),
  ]);

  for (const source of sources) {
    assert(source.includes("runAnalyzeExpenseWithTimeout"));
  }
});
