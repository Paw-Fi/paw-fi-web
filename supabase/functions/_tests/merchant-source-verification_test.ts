import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import {
  verifyMerchantSources,
  enrichSourceVerifiedMerchantItems,
} from "../shared/merchant-source-verification.ts";
import { enrichAnalyzedMerchantItems } from "../shared/merchant-analysis.ts";
import { enrichVerifiedInteractiveItems } from "../shared/interactive-transaction-analysis.ts";
import type { InteractiveItem } from "../shared/interactive-transaction-contract.ts";
import * as XLSX from "https://esm.sh/xlsx@0.18.5?no-dts";

Deno.test(
  "near-deadline financial success skips optional logos rather than becoming an analysis timeout",
  async () => {
    const items = [
      {
        merchant: "Tesco",
        amount: 5,
        currency: "EUR",
        merchant_structured_name: "stale",
      },
    ];
    const result = await enrichSourceVerifiedMerchantItems({
      body: { text: "Tesco groceries 5 EUR" },
      items,
      deadlineAt: Date.now() - 1,
      merchantContext: {
        userId: "user",
        supabase: {
          rpc: () => {
            throw new Error("must not resolve");
          },
        },
      },
      complete: async () => {
        throw new Error("must not verify after deadline");
      },
    });
    assertEquals(result, [
      {
        merchant: "Tesco",
        amount: 5,
        currency: "EUR",
        merchant_auto_resolution_blocked: true,
      },
    ]);
  },
);

Deno.test(
  "slow optional lookup respects the remaining request budget and preserves successful financial items",
  async () => {
    const items = [{ merchant: "Tesco", amount: 5, currency: "EUR" }];
    const result = await enrichSourceVerifiedMerchantItems({
      body: { text: "Tesco groceries 5 EUR" },
      items,
      deadlineAt: Date.now() + 20,
      merchantContext: {
        userId: "user",
        supabase: { rpc: async () => new Promise(() => {}) },
      },
      complete: async () => ({
        verdicts: [{ itemIndex: 0, approved: true, evidence: "Tesco" }],
      }),
    });
    assertEquals(
      result,
      items.map((item) => ({
        ...item,
        merchant_auto_resolution_blocked: true,
      })),
    );
  },
);

Deno.test(
  "both Analyze transport paths opt into source verification after receipt transformation",
  async () => {
    const endpoint = await Deno.readTextFile(
      new URL("../analyze-expense/index.ts", import.meta.url),
    );
    assertEquals(endpoint.includes("verifyMerchantSource:"), false);
    assertEquals(
      endpoint.match(/merchantDeadlineAt: Date.now\(\)/g)?.length,
      2,
    );
    assertStringIncludes(endpoint, "answers: request.answers");
    const wrapper = await Deno.readTextFile(
      new URL("../shared/analyzed-merchant-enrichment.ts", import.meta.url),
    );
    assertEquals(
      wrapper.indexOf("await params.transformItems") <
        wrapper.indexOf("await enrichSourceVerifiedMerchantItems"),
      true,
    );
    assertStringIncludes(wrapper, "items: transformedItems");
  },
);

Deno.test(
  "interactive logo failure keeps verified financial data and carries durable abstention",
  async () => {
    const items = [
      {
        merchant: "星巴克",
        amount: 5,
        category: "food",
        type: "expense",
        currency: "EUR",
        date: "2026-10-07",
        description: "Coffee",
        explicitFields: [],
        destination: {
          householdId: null,
          isPortfolio: false,
          accountId: null,
          accountCurrency: null,
          spaceLabel: "Personal",
        },
      },
    ] as InteractiveItem[];
    const failed = await enrichVerifiedInteractiveItems(
      items,
      async () => {
        throw new Error("unavailable");
      },
      true,
    );
    assertEquals(
      failed,
      items.map((item) => ({
        ...item,
        merchant_auto_resolution_blocked: true,
      })),
    );
    const blocked = await enrichVerifiedInteractiveItems(
      items,
      async () => [
        {
          merchant_id: "stale",
          merchant_domain: "wrong.com",
          merchant_auto_resolution_blocked: true,
          merchant_candidates: [{ name: "星巴克", domain: "starbucks.com" }],
        },
      ],
      true,
    );
    assertEquals(blocked[0].merchant_id, undefined);
    assertEquals(blocked[0].merchant_domain, undefined);
    assertEquals(blocked[0].merchant_auto_resolution_blocked, true);
    assertEquals(blocked[0].merchant_candidates, [
      { name: "星巴克", domain: "starbucks.com" },
    ]);
  },
);

Deno.test(
  "document evidence excludes filenames and preserves verbatim quotes and newlines",
  async () => {
    const source = '加盟店: Café "Central"\n5 EUR';
    const body = {
      attachments: [
        {
          filename: "Starbucks.csv",
          contentType: "text/csv",
          data: encodeBase64(new TextEncoder().encode(source)),
        },
      ],
    };
    const verdicts = await verifyMerchantSources({
      body,
      items: [{ merchant: 'Café "Central"' }, { merchant: "Starbucks" }],
      complete: async () => ({
        verdicts: [
          { itemIndex: 0, approved: true, evidence: source },
          { itemIndex: 1, approved: true, evidence: "Starbucks" },
        ],
      }),
    });
    assertEquals(verdicts[0]?.approved, true);
    assertEquals(verdicts[1], null);
  },
);

Deno.test(
  "spreadsheet preview retains original multilingual row evidence",
  async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["加盟店", "金額"],
        ["星巴克", "12,50"],
      ]),
      "支出",
    );
    const bytes = new Uint8Array(
      XLSX.write(workbook, { type: "array", bookType: "xlsx" }),
    );
    const verdicts = await verifyMerchantSources({
      body: {
        attachments: [
          {
            filename: "bank.xlsx",
            contentType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            data: encodeBase64(bytes),
          },
        ],
      },
      items: [{ merchant: "星巴克", amount: 12.5 }],
      complete: async (parts) => {
        assertStringIncludes(JSON.stringify(parts), "星巴克");
        return {
          verdicts: [{ itemIndex: 0, approved: true, evidence: "星巴克" }],
        };
      },
    });
    assertEquals(verdicts[0]?.approved, true);
  },
);

Deno.test(
  "stale source approval and lookup failure cannot drop the durable block",
  async () => {
    const items = [
      { merchant: "Tesco", amount: 5 },
      { merchant: "星巴克", amount: 6 },
    ];
    const result = await enrichAnalyzedMerchantItems({
      items,
      userId: "user",
      sourceVerdicts: [
        { approved: true, merchant: "Other", evidence: "Other" },
        { approved: true, merchant: "星巴克", evidence: "星巴克" },
      ],
      supabase: {
        rpc: () => {
          throw new Error("offline");
        },
      },
    });
    assertEquals(
      result,
      items.map((item) => ({
        ...item,
        merchant_auto_resolution_blocked: true,
      })),
    );
  },
);

Deno.test(
  "source verifier grounds multilingual evidence without rewriting transactions",
  async () => {
    const text = "دفعت ١٢٫٥٠ في مقهى النور";
    const items = [{ merchant: "مقهى النور", amount: 12.5, currency: "EUR" }];
    const original = structuredClone(items);
    const verdicts = await verifyMerchantSources({
      body: { text },
      items,
      complete: async (parts) => {
        assertStringIncludes(JSON.stringify(parts), text);
        return {
          verdicts: [{ itemIndex: 0, approved: true, evidence: "مقهى النور" }],
        };
      },
    });
    assertEquals(verdicts[0]?.approved, true);
    assertEquals(items, original);
  },
);

Deno.test(
  "missing, duplicate, malformed and invented source evidence abstain per item",
  async () => {
    const items = [0, 1, 2, 3, 4].map(() => ({ merchant: "Tesco" }));
    const verdicts = await verifyMerchantSources({
      body: { text: "Tesco groceries" },
      items,
      complete: async () => ({
        verdicts: [
          { itemIndex: 0, approved: true, evidence: "Tesco" },
          { itemIndex: 0, approved: false, evidence: "" },
          { itemIndex: 1, approved: "true", evidence: "Tesco" },
          { itemIndex: 2, approved: true, evidence: "Starbucks" },
          { itemIndex: 3, approved: false, evidence: "" },
          { itemIndex: 99, approved: true, evidence: "Tesco" },
        ],
      }),
    });
    assertEquals(
      verdicts.map((value) => value?.approved ?? false),
      [false, false, false, false, false],
    );
  },
);

Deno.test(
  "clarification evidence is available and source-absent domains are discarded",
  async () => {
    const verdicts = await verifyMerchantSources({
      body: { text: "coffee 5" },
      items: [{ merchant: "星巴克" }],
      answers: [{ question: "Where?", answer: "星巴克" }],
      complete: async (parts) => {
        assertStringIncludes(JSON.stringify(parts), "星巴克");
        return {
          verdicts: [
            {
              itemIndex: 0,
              approved: true,
              evidence: "星巴克",
              merchantUrl: "starbucks.com",
              merchantUrlEvidence: "starbucks.com",
            },
          ],
        };
      },
    });
    assertEquals(verdicts[0]?.approved, true);
    assertEquals(verdicts[0]?.merchantUrl, undefined);
  },
);

Deno.test(
  "source verifier carries original image/audio/PDF bytes and decoded document text",
  async () => {
    const media = encodeBase64(new Uint8Array([1, 2, 3]));
    for (const body of [
      { image: { data: media, contentType: "image/png" } },
      {
        audio: {
          data: "",
          bytes: new Uint8Array([1, 2, 3]),
          contentType: "audio/mp3",
        },
      },
      {
        attachments: [
          {
            data: media,
            contentType: "application/pdf",
            filename: "receipt.pdf",
          },
        ],
      },
    ]) {
      const verdicts = await verifyMerchantSources({
        body,
        items: [{ merchant: "Tesco" }],
        complete: async (parts) => {
          assertEquals(
            parts.some(
              (part) => "inlineData" in part && part.inlineData.data === media,
            ),
            true,
          );
          return {
            verdicts: [{ itemIndex: 0, approved: true, evidence: "Tesco" }],
          };
        },
      });
      assertEquals(verdicts[0]?.approved, true);
    }
    const text = "日付,加盟店,金額\n2026-10-07,星巴克,5";
    const verdicts = await verifyMerchantSources({
      body: {
        attachments: [
          {
            data: encodeBase64(new TextEncoder().encode(text)),
            contentType: "text/csv",
            filename: "bank.csv",
          },
        ],
      },
      items: [{ merchant: "星巴克" }],
      complete: async (parts) => {
        assertStringIncludes(JSON.stringify(parts), "加盟店");
        return {
          verdicts: [{ itemIndex: 0, approved: true, evidence: "星巴克" }],
        };
      },
    });
    assertEquals(verdicts[0]?.approved, true);
  },
);

Deno.test(
  "verifier failure, timeout, oversized source and blank merchants cannot authorize logos",
  async () => {
    for (const complete of [
      async () => {
        throw new Error("unavailable");
      },
      async () => new Promise(() => {}),
      async () => ({ verdicts: "invalid" }),
    ]) {
      const verdicts = await verifyMerchantSources({
        body: { text: "coffee 5" },
        items: [{ merchant: "Starbucks" }],
        complete,
        timeoutMs: 5,
      });
      assertEquals(verdicts[0]?.approved ?? false, false);
    }
    for (const [body, items] of [
      [{ text: "x".repeat(100_000) }, [{ merchant: "Tesco" }]],
      [{ text: "coffee 5" }, [{ merchant: "" }]],
    ] as const) {
      await verifyMerchantSources({
        body,
        items: [...items],
        complete: async () => {
          throw new Error("must not call model");
        },
      });
    }
  },
);

Deno.test(
  "rejected evidence blocks internal/domain/search enrichment and removes stale logo metadata",
  async () => {
    const original = {
      merchant: "Starbucks",
      merchantUrl: "starbucks.com",
      merchantCountry: "US",
      merchant_id: "stale",
      merchant_domain: "starbucks.com",
      merchant_structured_name: "Starbucks",
      merchant_candidates: [{ name: "Starbucks", domain: "starbucks.com" }],
      amount: 5,
      currency: "EUR",
      description: "Coffee",
      date: "2026-10-07",
    };
    const [result] = await enrichAnalyzedMerchantItems({
      items: [original],
      sourceVerdicts: [null],
      userId: "user",
      supabase: {
        rpc: () => {
          throw new Error("must not resolve");
        },
        from: () => {
          throw new Error("must not resolve");
        },
      },
    });
    assertEquals(result, {
      merchant: "Starbucks",
      merchantUrl: "starbucks.com",
      amount: 5,
      currency: "EUR",
      description: "Coffee",
      date: "2026-10-07",
      merchant_auto_resolution_blocked: true,
    });
    assertEquals(original.merchant_id, "stale");
  },
);

Deno.test(
  "approved source uses only verified domain and preserves existing canonical hits",
  async () => {
    const id = "4d055fac-88b0-4750-b606-92f37c008975";
    const supabase = {
      rpc: () => ({ data: "tesco", error: null }),
      from: (table: string) => {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: () =>
            table === "merchant_user_overrides"
              ? { data: { action: "map", merchant_id: id }, error: null }
              : {
                  data: { id, canonical_name: "Tesco", domain: "tesco.com" },
                  error: null,
                },
        };
        return query;
      },
    };
    const [result] = await enrichAnalyzedMerchantItems({
      items: [{ merchant: "Tesco", amount: 5 }],
      userId: "user",
      supabase,
      sourceVerdicts: [
        { approved: true, merchant: "Tesco", evidence: "Tesco" },
      ],
    });
    assertEquals(result.merchant_id, id);
    assertEquals(result.merchant_domain, "tesco.com");
    assertEquals(result.merchant_auto_resolution_blocked, undefined);
  },
);
