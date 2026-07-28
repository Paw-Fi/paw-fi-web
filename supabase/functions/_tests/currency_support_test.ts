/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { validateCurrency } from "../shared/currency-validator.ts";
import { resolveCurrencyFromOCR } from "../shared/ocr-currency-resolver.ts";

Deno.test("currency support: accepts MDL and MUR", () => {
  assertEquals(validateCurrency("mdl"), "MDL");
  assertEquals(validateCurrency("mur"), "MUR");
});

Deno.test(
  "currency support: resolves explicit Moldovan and Mauritian names",
  () => {
    assertEquals(
      resolveCurrencyFromOCR({
        rawOcrText: "Total 100 Moldovan Leu",
        userPreferredCurrency: "USD",
      }).finalCurrencyCode,
      "MDL",
    );
    assertEquals(
      resolveCurrencyFromOCR({
        rawOcrText: "Total 100 Mauritian Rupee",
        userPreferredCurrency: "USD",
      }).finalCurrencyCode,
      "MUR",
    );
  },
);
