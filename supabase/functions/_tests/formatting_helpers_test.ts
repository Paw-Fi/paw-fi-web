import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import { buildCategoryGuide } from "../shared/formatting-helpers.ts";

Deno.test(
  "formatting helpers: buildCategoryGuide preserves custom category label",
  () => {
    const guide = buildCategoryGuide(["custom 1", "groceries"]);

    assert(guide.includes("custom 1 ("));
    assert(guide.includes("groceries ("));
  },
);

Deno.test(
  "formatting helpers: buildCategoryGuide does not warn for custom categories",
  () => {
    const originalWarn = console.warn;
    const warnings: string[] = [];
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map((part) => String(part)).join(" "));
    };

    try {
      buildCategoryGuide(["custom 1", "custom 2"]);
    } finally {
      console.warn = originalWarn;
    }

    assertEquals(warnings.length, 0);
  },
);

Deno.test(
  "formatting helpers: buildCategoryGuide keeps canonical mapping behavior",
  () => {
    const guide = buildCategoryGuide(["restaurant", "unknown"]);

    assert(guide.includes("restaurants ("));
    assert(!guide.includes("restaurant ("));
    assert(guide.includes("other ("));
  },
);
