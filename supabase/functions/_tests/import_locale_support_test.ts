import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import * as XLSX from "https://esm.sh/xlsx@0.18.5?no-dts";

import { extractDeterministicItemsFromTableRows } from "../shared/analyze-core.ts";
import { parseCsvFromText } from "../shared/import/csv.ts";
import {
  detectCurrencyFromText,
  parseDateFromText,
} from "../shared/import/types.ts";
import { parseXlsxFromBytes } from "../shared/import/xlsx.ts";

Deno.test("import locale: dotted numeric dates parse as day-first", () => {
  assertEquals(parseDateFromText("04.01.2026", "2026-04-17"), "2026-01-04");
});

Deno.test("import locale: Russian currency aliases normalize to RUB", () => {
  assertEquals(detectCurrencyFromText("1 110,00 RUR", "USD"), "RUB");
  assertEquals(detectCurrencyFromText("1 110,00 ₽", "USD"), "RUB");
});

Deno.test("import locale: CSV parser extracts Russian bank statement rows", () => {
  const csv = [
    "Дата проводки;Описание;Сумма в валюте счета",
    "04.01.2026;Операция по карте;−1 110,00 RUR",
    "07.01.2026;Поступление перевода;500,00 RUR",
  ].join("\n");

  const result = parseCsvFromText(csv, "2026-04-17", "USD");

  assertEquals(result.success, true);
  assertEquals(result.items.length, 2);

  assertEquals(result.items[0].date, "2026-01-04");
  assertEquals(result.items[0].amount, 1110);
  assertEquals(result.items[0].type, "expense");
  assertEquals(result.items[0].currency, "RUB");

  assertEquals(result.items[1].date, "2026-01-07");
  assertEquals(result.items[1].amount, 500);
  assertEquals(result.items[1].type, "income");
  assertEquals(result.items[1].currency, "RUB");
});

Deno.test("import locale: XLSX parser extracts Russian bank statement rows", () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Дата проводки", "Описание", "Сумма в валюте счета"],
    ["04.01.2026", "Операция по карте", "−1 110,00 RUR"],
    ["07.01.2026", "Поступление перевода", "500,00 RUR"],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Statement");

  const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const result = parseXlsxFromBytes(new Uint8Array(bytes), "2026-04-17", "USD");

  assertEquals(result.success, true);
  assertEquals(result.items.length, 2);

  const first = result.items[0];
  const second = result.items[1];
  assertExists(first);
  assertExists(second);

  assertEquals(first.date, "2026-01-04");
  assertEquals(first.type, "expense");
  assertEquals(first.currency, "RUB");

  assertEquals(second.date, "2026-01-07");
  assertEquals(second.type, "income");
  assertEquals(second.currency, "RUB");
});

Deno.test("import locale: PDF table extraction handles Russian bank rows", () => {
  const items = extractDeterministicItemsFromTableRows(
    [
      "Дата проводки | Код операции | Описание | Сумма в валюте счета",
      "04.01.2026 | CRD_4UA3H2 | Операция по карте | −1 110,00 RUR",
      "07.01.2026 | C170701260852484 | Поступление перевода | 500,00 RUR",
    ],
    "2026-04-17",
    "USD",
  );

  assertEquals(items.length, 2);
  assertEquals(items[0].date, "2026-01-04");
  assertEquals(items[0].type, "expense");
  assertEquals(items[0].currency, "RUB");
  assertEquals(items[1].date, "2026-01-07");
  assertEquals(items[1].type, "income");
  assertEquals(items[1].currency, "RUB");
});
