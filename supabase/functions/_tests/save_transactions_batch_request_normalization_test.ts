/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  normalizeBatchCategory,
  normalizeBatchTransactionInput,
} from "../save-transactions-batch/request-normalization.ts";

Deno.test(
  "save-transactions-batch request normalization: accepts signed amounts when explicit type is valid",
  () => {
    assertEquals(
      normalizeBatchTransactionInput({ type: "expense", amount: -3431 }),
      { ok: true, type: "expense", amount: 3431 },
    );
    assertEquals(
      normalizeBatchTransactionInput({ type: " Income ", amount: -25425 }),
      { ok: true, type: "income", amount: 25425 },
    );
  },
);

Deno.test(
  "save-transactions-batch request normalization: derives only expense from negative amount without reading localized text",
  () => {
    assertEquals(
      normalizeBatchTransactionInput({ type: "โอนไป", amount: -70 }),
      { ok: true, type: "expense", amount: 70 },
    );
  },
);

Deno.test(
  "save-transactions-batch request normalization: rejects positive amount without explicit API type",
  () => {
    assertEquals(
      normalizeBatchTransactionInput({ type: "จาก", amount: 25425 }),
      { ok: false, error: "Invalid or missing type" },
    );
    assertEquals(
      normalizeBatchTransactionInput({ amount: 25425 }),
      { ok: false, error: "Invalid or missing type" },
    );
  },
);

Deno.test(
  "save-transactions-batch request normalization: rejects non-finite and zero amounts",
  () => {
    assertEquals(
      normalizeBatchTransactionInput({ type: "expense", amount: 0 }),
      { ok: false, error: "Invalid amount" },
    );
    assertEquals(
      normalizeBatchTransactionInput({ type: "expense", amount: Number.NaN }),
      { ok: false, error: "Invalid amount" },
    );
  },
);

Deno.test(
  "save-transactions-batch request normalization: preserves safe localized categories and falls back without language mapping",
  () => {
    assertEquals(normalizeBatchCategory("อาหาร"), {
      category: "อาหาร",
      usedFallback: false,
    });
    assertEquals(normalizeBatchCategory(""), {
      category: "uncategorized",
      usedFallback: true,
    });
    assertEquals(normalizeBatchCategory("rent `oops`"), {
      category: "other",
      usedFallback: true,
    });
  },
);
