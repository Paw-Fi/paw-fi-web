/// <reference lib="deno.ns" />

import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  resolveBotMerchantIdentityFields,
  type NormalizedTransactionToolArgs,
} from "../shared/bot/transaction-tool.ts";

const transaction: NormalizedTransactionToolArgs = {
  type: "expense",
  amount: 12.5,
  category: "food",
  currency: "GBP",
  merchant: "Tesco",
};

Deno.test(
  "bot transaction merchant enrichment resolves raw merchant text",
  async () => {
    let calls = 0;
    const fields = await resolveBotMerchantIdentityFields({
      transaction,
      supabase: {},
      userId: "00000000-0000-4000-8000-000000000001",
      preferredTimezone: "Europe/London",
      resolveIdentity: async (params) => {
        calls += 1;
        assertEquals(params.merchant, "Tesco");
        assertEquals(params.currency, "GBP");
        assertEquals(params.preferredTimezone, "Europe/London");
        return {
          merchantId: "00000000-0000-4000-8000-000000000002",
          merchantDomain: "tesco.com",
          merchantStructuredName: "Tesco",
          merchantResolutionSource: "headless_ai_candidate",
        };
      },
    });

    assertEquals(calls, 1);
    assertEquals(fields, {
      merchantId: "00000000-0000-4000-8000-000000000002",
      merchantStructuredName: "Tesco",
    });
  },
);

Deno.test(
  "bot transaction merchant enrichment preserves analyzed identity",
  async () => {
    const fields = await resolveBotMerchantIdentityFields({
      transaction: {
        ...transaction,
        merchantId: "00000000-0000-4000-8000-000000000003",
        merchantStructuredName: "Tesco PLC",
      },
      supabase: {},
      userId: "00000000-0000-4000-8000-000000000001",
      resolveIdentity: async () => {
        throw new Error("resolver must not be called");
      },
    });

    assertEquals(fields, {
      merchantId: "00000000-0000-4000-8000-000000000003",
      merchantStructuredName: "Tesco PLC",
    });
  },
);

Deno.test("bot transaction merchant enrichment is non-blocking", async () => {
  const fields = await resolveBotMerchantIdentityFields({
    transaction,
    supabase: {},
    userId: "00000000-0000-4000-8000-000000000001",
    resolveIdentity: async () => {
      throw new Error("Logo.dev unavailable");
    },
  });

  assertEquals(fields, {});
});

Deno.test(
  "Telegram and WhatsApp enrich batch saves and merchant updates",
  async () => {
    const sources = await Promise.all([
      Deno.readTextFile(
        new URL("../telegram-ai-bot/index.ts", import.meta.url),
      ),
      Deno.readTextFile(
        new URL("../twilio-whatsapp-ai-bot/index.ts", import.meta.url),
      ),
    ]);

    for (const source of sources) {
      assertStringIncludes(source, "resolveBotMerchantIdentityFields");
      assertStringIncludes(source, "merchant_id = merchantIdentity.merchantId");
      assertStringIncludes(source, "merchant_structured_name =");
    }
  },
);
