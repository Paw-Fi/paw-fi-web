import { resolveBotSpaceScope, type BotSpaceMeta } from "./household-utils.ts";

function assertEquals(actual: unknown, expected: unknown, message?: string) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(
      `${message ?? "assertEquals failed"}\nactual: ${actualJson}\nexpected: ${expectedJson}`,
    );
  }
}

const personalSpace: BotSpaceMeta = {
  id: "space-1",
  name: "Family",
  isPortfolio: false,
};

const portfolioSpace: BotSpaceMeta = {
  id: "space-2",
  name: "Investing",
  isPortfolio: true,
};

function buildSpaceMap() {
  return new Map<string, BotSpaceMeta>([
    [personalSpace.id, personalSpace],
    [personalSpace.name.toLowerCase(), personalSpace],
    [portfolioSpace.id, portfolioSpace],
    [portfolioSpace.name.toLowerCase(), portfolioSpace],
  ]);
}

Deno.test("golden space scope resolves direct household ids", () => {
  assertEquals(
    resolveBotSpaceScope({ household_id: "space-1" }, buildSpaceMap()),
    {
      householdId: "space-1",
      spaceMeta: personalSpace,
    },
  );
});

Deno.test("golden space scope resolves household names", () => {
  assertEquals(
    resolveBotSpaceScope({ household_name: "Investing" }, buildSpaceMap()),
    {
      householdId: "space-2",
      spaceMeta: portfolioSpace,
    },
  );
});

Deno.test("golden space scope supports camelCase household names", () => {
  assertEquals(
    resolveBotSpaceScope({ householdName: "Family" }, buildSpaceMap()),
    {
      householdId: "space-1",
      spaceMeta: personalSpace,
    },
  );
});

Deno.test("golden space scope preserves unknown direct ids", () => {
  assertEquals(
    resolveBotSpaceScope({ household_id: "missing" }, buildSpaceMap()),
    {
      householdId: "missing",
    },
  );
});

Deno.test(
  "golden space scope returns personal scope when no space is requested",
  () => {
    assertEquals(resolveBotSpaceScope({}, buildSpaceMap()), {
      householdId: null,
    });
  },
);
