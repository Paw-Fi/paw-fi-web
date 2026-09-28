/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { validateCurrency } from "../shared/currency-validator.ts";
import { resolveCurrencyFromOCR } from "../shared/ocr-currency-resolver.ts";

Deno.test("currency support: accepts MDL and MUR", () => {
  assertEquals(validateCurrency("mdl"), "MDL");
  assertEquals(validateCurrency("mur"), "MUR");
  assertEquals(validateCurrency("amd"), "AMD");
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

Deno.test("currency support: resolves Armenian dram name and symbol", () => {
  assertEquals(
    resolveCurrencyFromOCR({
      rawOcrText: "Total 100 Armenian Dram",
      userPreferredCurrency: "USD",
    }).finalCurrencyCode,
    "AMD",
  );
  assertEquals(
    resolveCurrencyFromOCR({
      rawOcrText: "֏ 100",
      userPreferredCurrency: "USD",
    }).finalCurrencyCode,
    "AMD",
  );
});

Deno.test("currency support: does not treat Armenian prose as AMD", () => {
  assertEquals(
    resolveCurrencyFromOCR({
      rawOcrText: "Դրա արժեքը 500",
      userPreferredCurrency: "USD",
    }).finalCurrencyCode,
    "USD",
  );
});
