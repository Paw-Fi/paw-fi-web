/// <reference lib="deno.ns" />

import {
  buildMerchantSearchQueries,
  normalizeMerchantDescriptor,
} from "../shared/merchant-resolution.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test(
  "mechanically fingerprints evidence without semantic rewriting",
  () => {
    assertEquals(
      normalizeMerchantDescriptor("  STARBUCKS   12345 DUBLIN IE ").name,
      "starbucks 12345 dublin ie",
    );
    assertEquals(
      normalizeMerchantDescriptor("PAYPAL *NETFLIX").name,
      "paypal *netflix",
    );
    assertEquals(
      normalizeMerchantDescriptor("AMZN Mktp IE*38291").name,
      "amzn mktp ie*38291",
    );
    assertEquals(
      normalizeMerchantDescriptor("APPLE.COM/BILL").name,
      "apple.com/bill",
    );
  },
);

Deno.test(
  "normalization fixtures preserve multilingual and ambiguous evidence",
  () => {
    const fixtures = [
      [" Starbucks ", "starbucks"],
      ["STARBUCKS #123", "starbucks #123"],
      ["STARBUCKS 12345 DUBLIN IE", "starbucks 12345 dublin ie"],
      ["PAYPAL *NETFLIX", "paypal *netflix"],
      ["SQ *THE DAILY GRIND", "sq *the daily grind"],
      ["AMZN Mktp IE*38291", "amzn mktp ie*38291"],
      ["APPLE.COM/BILL", "apple.com/bill"],
      ["THE CORNER SHOP", "the corner shop"],
      ["星巴克上海南京西路店", "星巴克上海南京西路店"],
      ["スターバックス 新宿店", "スターバックス 新宿店"],
      ["스타벅스 강남점", "스타벅스 강남점"],
      ["مطعم محلي", "مطعم محلي"],
      ["ร้านกาแฟ ...", "ร้านกาแฟ ..."],
      ["London Drugs", "london drugs"],
      ["Card Factory", "card factory"],
      ["Credit Karma", "credit karma"],
      ["99 Ranch Market", "99 ranch market"],
      ["Studio 54", "studio 54"],
      ["全家", "全家"],
      ["ロ\u30fcソン", "ロ\u30fcソン"],
      ["Cà phê", "cà phê"],
    ] as const;
    for (const [input, expected] of fixtures) {
      assertEquals(normalizeMerchantDescriptor(input).name, expected, input);
    }
    assertEquals(
      normalizeMerchantDescriptor(null, { rawText: "Dinner with James" }).name,
      "",
    );
    assertEquals(
      normalizeMerchantDescriptor(null, {
        rawText: "PAYPAL *NETFLIX",
        rawTextIsMerchantDescriptor: true,
      }).name,
      "paypal *netflix",
    );
  },
);

Deno.test("normalization uses NFC without changing merchant semantics", () => {
  assertEquals(
    normalizeMerchantDescriptor("Cafe\u0301\u00a0\u00a0Central").name,
    normalizeMerchantDescriptor("Café Central").name,
  );
});

Deno.test(
  "does not use English words to reject or reinterpret evidence",
  () => {
    assertEquals(normalizeMerchantDescriptor("CARD PAYMENT").isUseful, true);
    assertEquals(
      normalizeMerchantDescriptor("SQ *THE DAILY GRIND DUBLIN 02").name,
      "sq *the daily grind dublin 02",
    );
    assertEquals(buildMerchantSearchQueries("SQ *THE DAILY GRIND DUBLIN 02"), [
      "SQ *THE DAILY GRIND DUBLIN 02",
    ]);
  },
);
