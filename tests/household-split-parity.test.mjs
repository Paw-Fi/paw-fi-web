import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

// Execute the actual backend helper, not a reimplementation of its algorithm.
const source = await readFile(new URL("../supabase/functions/shared/household-auto-split.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { buildHouseholdSplitRecords } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const fixtures = JSON.parse(await readFile(new URL("../../moneko-mobile/test/fixtures/household_split_allocation_cases.json", import.meta.url), "utf8"));
for (const fixture of fixtures) {
  test(`backend/mobile fixture ${fixture.type} ${fixture.cents} cents is stable and ID-keyed`, () => {
    const field = fixture.type === "amount" ? "amount" : fixture.type === "percentage" ? "percentage" : "shares";
    const custom = fixture.type === "equal" ? null : {
      splitType: fixture.type,
      memberSplits: fixture.members.map((userId, index) => ({ userId, [field]: fixture.values[index] })),
    };
    const original = JSON.stringify(custom);
    for (const reverse of [false, true]) {
      const result = buildHouseholdSplitRecords({
        householdId: "household", transactionId: "new-expense", payerUserId: "user-a",
        amountCents: fixture.cents, currency: "EUR", description: null,
        members: (reverse ? [...fixture.members].reverse() : fixture.members).map(user_id => ({ user_id })),
        customSplits: custom, splitGroupId: "new-group",
      });
      assert.equal(result.ok, true);
      assert.deepEqual(Object.fromEntries(result.lines.map(line => [line.user_id, line.amount_cents])), fixture.expected);
      assert.equal(result.lines.reduce((sum, line) => sum + line.amount_cents, 0), fixture.cents);
    }
    assert.equal(JSON.stringify(custom), original, "caller allocations are never mutated or reassigned by position");
  });
}

test("stable rounding does not change the existing positional invalid-payer fallback", () => {
  const result=buildHouseholdSplitRecords({householdId:"household",transactionId:"new-expense",
    payerUserId:"not-a-member",amountCents:10,currency:"EUR",description:null,
    members:[{user_id:"user-c"},{user_id:"user-b"},{user_id:"user-a"}],customSplits:null});
  assert.equal(result.ok,true);
  assert.equal(result.group.payer_user_id,"user-c");
  assert.deepEqual(Object.fromEntries(result.lines.map(line=>[line.user_id,line.amount_cents])),
    {"user-a":4,"user-b":3,"user-c":3});
});
