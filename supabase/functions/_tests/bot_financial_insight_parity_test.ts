/// <reference lib="deno.ns" />

import { assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test(
  "WhatsApp and Telegram use the shared financial insight pipeline",
  async () => {
    const [whatsapp, telegram] = await Promise.all([
      Deno.readTextFile(
        new URL("../twilio-whatsapp-ai-bot/index.ts", import.meta.url),
      ),
      Deno.readTextFile(
        new URL("../telegram-ai-bot/index.ts", import.meta.url),
      ),
    ]);

    for (const source of [whatsapp, telegram]) {
      assertStringIncludes(
        source,
        'from "../shared/bot/financial-insight-tool.ts"',
      );
      assertStringIncludes(source, "executeBotFinancialInsight({");
      assertStringIncludes(source, "routeFinancialInsightToolCall({");
    }
    assertStringIncludes(
      whatsapp,
      "!TWILIO_AUTH_TOKEN || !isFormUrlEncoded || !hasTwilioSignature",
    );
  },
);
