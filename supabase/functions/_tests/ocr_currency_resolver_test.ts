/// <reference lib="deno.ns" />

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  resolveCurrencyFromOCR,
  resolveSingleStrongCurrencyEvidenceFromOCRText,
} from "../shared/ocr-currency-resolver.ts";

function resolve(params: {
  detectedCurrencySymbol?: string;
  detectedCurrencyCode?: string;
  rawOcrText?: string;
  userPreferredCurrency: string;
}) {
  return resolveCurrencyFromOCR(params).finalCurrencyCode;
}

Deno.test(
  "ocr currency resolver: ambiguous dollar symbol uses CAD preference",
  () => {
    assertEquals(
      resolve({
        detectedCurrencySymbol: "$",
        rawOcrText: "$12.50",
        userPreferredCurrency: "CAD",
      }),
      "CAD",
    );
  },
);

Deno.test(
  "ocr currency resolver: ambiguous dollar symbol uses SGD preference",
  () => {
    assertEquals(
      resolve({
        detectedCurrencySymbol: "$",
        rawOcrText: "$12.50",
        userPreferredCurrency: "SGD",
      }),
      "SGD",
    );
  },
);

Deno.test(
  "ocr currency resolver: ambiguous dollar symbol uses AUD preference",
  () => {
    assertEquals(
      resolve({
        detectedCurrencySymbol: "$",
        rawOcrText: "$12.50",
        userPreferredCurrency: "AUD",
      }),
      "AUD",
    );
  },
);

Deno.test(
  "ocr currency resolver: USD code with dollar overrides CAD preference",
  () => {
    const result = resolveCurrencyFromOCR({
      detectedCurrencySymbol: "$",
      detectedCurrencyCode: "USD",
      rawOcrText: "USD $12.50",
      userPreferredCurrency: "CAD",
    });

    assertEquals(result.finalCurrencyCode, "USD");
    assertEquals(result.reason, "explicit_currency_code_found");
  },
);

Deno.test(
  "ocr currency resolver: localized C$ overrides USD preference",
  () => {
    assertEquals(
      resolve({
        detectedCurrencySymbol: "C$",
        rawOcrText: "C$12.50",
        userPreferredCurrency: "USD",
      }),
      "CAD",
    );
  },
);

Deno.test(
  "ocr currency resolver: localized A$ overrides CAD preference",
  () => {
    assertEquals(
      resolve({
        detectedCurrencySymbol: "A$",
        rawOcrText: "A$12.50",
        userPreferredCurrency: "CAD",
      }),
      "AUD",
    );
  },
);

Deno.test("ocr currency resolver: yen symbol uses JPY preference", () => {
  assertEquals(
    resolve({
      detectedCurrencySymbol: "¥",
      rawOcrText: "¥1200",
      userPreferredCurrency: "JPY",
    }),
    "JPY",
  );
});

Deno.test("ocr currency resolver: yen symbol uses CNY preference", () => {
  assertEquals(
    resolve({
      detectedCurrencySymbol: "¥",
      rawOcrText: "¥1200",
      userPreferredCurrency: "CNY",
    }),
    "CNY",
  );
});

Deno.test(
  "ocr currency resolver: unknown or missing currency falls back to user preference",
  () => {
    const result = resolveCurrencyFromOCR({
      rawOcrText: "total 12.50",
      userPreferredCurrency: "CAD",
    });

    assertEquals(result.finalCurrencyCode, "CAD");
    assertEquals(result.reason, "fallback_user_preference");
  },
);

Deno.test(
  "ocr currency resolver: unambiguous EUR and GBP still resolve",
  () => {
    assertEquals(
      resolve({
        detectedCurrencySymbol: "€",
        rawOcrText: "€20.00",
        userPreferredCurrency: "CAD",
      }),
      "EUR",
    );
    assertEquals(
      resolve({
        detectedCurrencySymbol: "£",
        rawOcrText: "£20.00",
        userPreferredCurrency: "GBP",
      }),
      "GBP",
    );
  },
);

Deno.test(
  "ocr currency resolver: unambiguous symbol in raw text still resolves",
  () => {
    assertEquals(
      resolve({ rawOcrText: "Total €20.00", userPreferredCurrency: "CAD" }),
      "EUR",
    );
  },
);

Deno.test(
  "ocr currency resolver: merchant country can override when no ambiguous symbol exists",
  () => {
    const result = resolveCurrencyFromOCR({
      rawOcrText: "total 12.50",
      userPreferredCurrency: "CAD",
      merchantCountry: "US",
    });

    assertEquals(result.finalCurrencyCode, "USD");
    assertEquals(result.reason, "merchant_country_override");
  },
);

Deno.test(
  "ocr currency resolver: merchant country is strong evidence for bare dollar",
  () => {
    const result = resolveCurrencyFromOCR({
      detectedCurrencySymbol: "$",
      rawOcrText: "$12.50 total",
      userPreferredCurrency: "CAD",
      merchantCountry: "US",
    });

    assertEquals(result.finalCurrencyCode, "USD");
    assertEquals(result.reason, "merchant_country_override");
  },
);

Deno.test(
  "ocr currency resolver: source evidence helper ignores mixed currencies",
  () => {
    assertEquals(
      resolveSingleStrongCurrencyEvidenceFromOCRText(
        "Statement currency EUR\nRefund USD 5.00",
      ),
      null,
    );
    assertEquals(
      resolveSingleStrongCurrencyEvidenceFromOCRText(
        "Statement currency EUR\nCoffee 4.00\nLunch 12.00",
      ),
      "EUR",
    );
  },
);

Deno.test(
  "ocr currency resolver: AI-guessed USD from bare dollar does not override CAD",
  () => {
    const result = resolveCurrencyFromOCR({
      detectedCurrencySymbol: "$",
      detectedCurrencyCode: "USD",
      rawOcrText: "$12.50 total",
      userPreferredCurrency: "CAD",
    });

    assertEquals(result.finalCurrencyCode, "CAD");
    assertEquals(result.reason, "ambiguous_symbol_used_user_preference");
  },
);
