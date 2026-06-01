/// <reference lib="deno.ns" />

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildCsv,
  buildPremiumZip,
  csvCell,
} from "../shared/premium-export-utils.ts";

Deno.test("premium exports: csvCell escapes formulas and quotes", () => {
  assertEquals(csvCell("=SUM(A1:A2)"), "'=SUM(A1:A2)");
  assertEquals(csvCell("+danger"), "'+danger");
  assertEquals(csvCell("-danger"), "'-danger");
  assertEquals(csvCell("@danger"), "'@danger");
  assertEquals(csvCell('merchant "quoted"'), '"merchant ""quoted"""');
});

Deno.test(
  "premium exports: buildCsv includes UTF-8 BOM and escaped values",
  () => {
    const csv = buildCsv([
      ["description", "amount"],
      ["=danger", "12.34"],
    ]);

    assert(csv.startsWith("\uFEFF"));
    assertStringIncludes(csv, "'=danger,12.34");
  },
);

Deno.test(
  "premium exports: buildPremiumZip creates a readable zip directory",
  async () => {
    const zipBytes = await buildPremiumZip([
      {
        path: "manifest.json",
        bytes: new TextEncoder().encode('{"ok":true}'),
      },
      {
        path: "transactions.csv",
        bytes: new TextEncoder().encode("date,amount\n2026-06-01,12"),
      },
    ]);
    const zipText = new TextDecoder().decode(zipBytes);

    assert(zipBytes.length > 100);
    assertStringIncludes(zipText, "manifest.json");
    assertStringIncludes(zipText, "transactions.csv");
    assertEquals(zipBytes[0], 0x50);
    assertEquals(zipBytes[1], 0x4b);
  },
);
