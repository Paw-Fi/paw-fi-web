import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  classifyPlaidDuplicateIdentity,
  type PlaidDuplicateAccountIdentity,
} from "../shared/plaid-duplicate-identity.ts";

const existing: PlaidDuplicateAccountIdentity = {
  providerAccountId: "existing-account-id",
  persistentAccountId: "persistent-1",
  institutionId: "ins_1",
  name: "Checking",
  mask: "1234",
  currency: "USD",
  type: "depository",
  subtype: "checking",
};

Deno.test("different authoritative persistent IDs remain distinct", () => {
  assertEquals(
    classifyPlaidDuplicateIdentity({
      selected: {
        ...existing,
        providerAccountId: "new-account-id",
        persistentAccountId: "persistent-2",
      },
      existing,
      phase: "authoritative",
    }),
    "distinct",
  );
});

Deno.test("equal authoritative persistent IDs are duplicates", () => {
  assertEquals(
    classifyPlaidDuplicateIdentity({
      selected: { ...existing, providerAccountId: "new-account-id" },
      existing,
      phase: "authoritative",
    }),
    "duplicate",
  );
});

Deno.test("mixed persistent-ID availability is ambiguous, not distinct", () => {
  assertEquals(
    classifyPlaidDuplicateIdentity({
      selected: { ...existing, persistentAccountId: null },
      existing,
      phase: "authoritative",
    }),
    "ambiguous",
  );
});

Deno.test("matching provider IDs are duplicates when persistent identity is incomplete", () => {
  assertEquals(
    classifyPlaidDuplicateIdentity({
      selected: {
        ...existing,
        persistentAccountId: null,
        providerAccountId: "same-account-id",
      },
      existing: {
        ...existing,
        persistentAccountId: null,
        providerAccountId: "same-account-id",
      },
      phase: "authoritative",
    }),
    "duplicate",
  );
});

Deno.test("Link metadata creates a candidate rather than a false definitive match", () => {
  assertEquals(
    classifyPlaidDuplicateIdentity({
      selected: {
        providerAccountId: "new-account-id",
        institutionId: "ins_1",
        name: "Checking",
        mask: "1234",
        type: "depository",
        subtype: "checking",
      },
      existing,
      phase: "link",
    }),
    "candidate",
  );
});

Deno.test("different institutions do not match fallback signatures", () => {
  assertEquals(
    classifyPlaidDuplicateIdentity({
      selected: {
        ...existing,
        persistentAccountId: null,
        institutionId: "ins_2",
      },
      existing: { ...existing, persistentAccountId: null },
      phase: "authoritative",
    }),
    "none",
  );
});

Deno.test("different currencies do not match authoritative fallback signatures", () => {
  assertEquals(
    classifyPlaidDuplicateIdentity({
      selected: {
        ...existing,
        persistentAccountId: null,
        currency: "EUR",
      },
      existing: { ...existing, persistentAccountId: null },
      phase: "authoritative",
    }),
    "none",
  );
});

Deno.test("database guard serializes and blocks mixed persistent-ID signatures", async () => {
  const migration = await Deno.readTextFile(
    new URL(
      "../../migrations/20260719148000_complete_plaid_duplicate_identity.sql",
      import.meta.url,
    ),
  );

  assertStringIncludes(migration, "then 'signature:' || v_signature");
  assertStringIncludes(
    migration,
    "when v_persistent_id is not null\n            and nullif(trim(coalesce(",
  );
  assertStringIncludes(
    migration,
    "else 'account_signature_incomplete_persistent_identity'",
  );
  assertStringIncludes(
    migration,
    "else 'household:' || v_household_id::text",
  );
  assertStringIncludes(
    migration,
    "on right_account.scope_key = left_account.scope_key",
  );
  assertStringIncludes(migration, "to service_role");
});
