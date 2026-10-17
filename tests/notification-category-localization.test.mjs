import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { notificationCategoryKeys } from "../supabase/functions/shared/notification-category-keys.ts";
import {
  getExpenseCategories,
  getIncomeCategories,
} from "../supabase/functions/shared/category-colors.ts";
import {
  createNotificationTranslator,
  localizeNotificationCategory,
} from "../supabase/functions/shared/notification-localization.ts";
import messages from "../supabase/functions/shared/notification-translations.json" with {
  type: "json",
};

const languages = [
  "de",
  "es",
  "fr",
  "it",
  "ja",
  "ko",
  "nl",
  "ur",
  "ru",
  "th",
  "uk",
  "zh",
  "zh_TW",
  "vi",
];

test("every built-in category displays its catalog label in all supported non-English locales", () => {
  assert.equal(Object.keys(notificationCategoryKeys).length, 127);
  for (
    const category of [...getExpenseCategories(), ...getIncomeCategories()]
  ) {
    assert.ok(Object.hasOwn(notificationCategoryKeys, category), category);
  }
  for (const [category, key] of Object.entries(notificationCategoryKeys)) {
    for (const language of languages) {
      const locale = language === "zh_TW" ? "zh_Hant_HK" : language;
      assert.equal(
        localizeNotificationCategory(category, locale),
        messages[key][language],
        `${category}/${language}`,
      );
    }
    assert.equal(localizeNotificationCategory(category, "en"), null);
    assert.equal(localizeNotificationCategory(category, "unsupported"), null);
  }
  assert.equal(localizeNotificationCategory("GROCERIES", "fr_CA"), "Courses");
  assert.equal(
    localizeNotificationCategory("health_insurance", "ja"),
    messages.notificationCategoryHealthInsurance.ja,
  );
});

test("custom names and prototype property names are never interpreted as built-in categories", () => {
  for (
    const value of [
      "My groceries",
      "Courses",
      "私の保険",
      "家庭保險 {0} $&",
      "constructor",
      "__proto__",
      "toString",
      "",
    ]
  ) {
    assert.equal(localizeNotificationCategory(value, "fr"), null, value);
  }
});

test("missing and invalid category translations preserve the caller's English fallback", () => {
  const entry = messages.notificationCategoryGroceries;
  const saved = entry.fr;
  try {
    for (const value of ["", "  ", "bad {0}"]) {
      entry.fr = value;
      assert.equal(localizeNotificationCategory("groceries", "fr"), null);
    }
    delete entry.fr;
    assert.equal(localizeNotificationCategory("groceries", "fr"), null);
    delete messages.notificationCategoryGroceries;
    assert.equal(localizeNotificationCategory("groceries", "fr"), null);
  } finally {
    entry.fr = saved;
    messages.notificationCategoryGroceries = entry;
  }
});

test("category labels do not overwrite ordinary messages with the same English text", () => {
  assert.equal(
    createNotificationTranslator("fr").t("Other"),
    messages.walletCaptureOtherCategory.fr,
  );
  assert.equal(
    localizeNotificationCategory("other", "fr"),
    messages.notificationCategoryOther.fr,
  );
});

const mobileRoot = new URL("../../moneko-mobile/", import.meta.url);
const registryPath = new URL(
  "lib/features/home/presentation/constants/category_constants.dart",
  mobileRoot,
);

test(
  "the backend category map and all labels match mobile's selected runtime localization",
  { skip: !existsSync(registryPath) },
  () => {
    const source = readFileSync(registryPath, "utf8");
    const block =
      source.split("Map<String, String> _categoryTranslationsFor(")[1].split(
        "\nfinal Set<String>",
      )[0];
    const pairs = [...block.matchAll(/'([^']+)': l10n\.(\w+)/g)].map((
      match,
    ) => [match[1], match[2]]);
    const expected = Object.fromEntries(
      pairs.map((
        [category, key],
      ) => [category, `notificationCategory${key.slice("category".length)}`]),
    );
    assert.deepEqual(notificationCategoryKeys, expected);
    for (const language of ["en", ...languages]) {
      const arb = JSON.parse(
        readFileSync(
          new URL(`lib/l10n/app_${language}.arb`, mobileRoot),
          "utf8",
        ),
      );
      const generatedFile = language === "zh_TW" ? "zh" : language;
      const generatedSource = readFileSync(
        new URL(`lib/l10n/app_localizations_${generatedFile}.dart`, mobileRoot),
        "utf8",
      );
      const generated = language === "zh_TW"
        ? generatedSource.split("class AppLocalizationsZhTw ")[1]
        : generatedSource;
      for (const [category, key] of pairs) {
        assert.equal(
          messages[expected[category]][language],
          arb[key],
          `${key}/${language}`,
        );
        const getter = generated.match(
          new RegExp(`String get ${key} => '((?:\\\\.|[^'\\\\])*)';`),
        );
        assert.ok(getter, `${key}/${language}: missing runtime getter`);
        const escapes = {
          n: "\n",
          r: "\r",
          t: "\t",
          b: "\b",
          f: "\f",
          "'": "'",
          '"': '"',
          "\\": "\\",
          $: "$",
        };
        const runtime = getter[1].replace(/\\(.)/g, (_, char) => {
          assert.ok(
            Object.hasOwn(escapes, char),
            `Unsupported Dart escape: ${char}`,
          );
          return escapes[char];
        });
        assert.equal(
          runtime,
          arb[key],
          `${key}/${language}: generated runtime is stale`,
        );
      }
    }
  },
);
