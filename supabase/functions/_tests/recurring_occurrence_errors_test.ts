import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { recurringOccurrenceDatabaseFailure } from "../shared/recurring-occurrence-errors.ts";

Deno.test("recurring confirmation: only authoritative domain rejections cancel mutations", () => {
  for (
    const code of [
      "OCCURRENCE_NOT_SCHEDULED",
      "OCCURRENCE_CONFLICT",
      "OCCURRENCE_ACCOUNT_SCOPE_MISMATCH",
    ]
  ) {
    const failure = recurringOccurrenceDatabaseFailure({
      code: "P0001",
      message: code,
    });
    assertEquals(failure.status, 400);
    assertEquals(failure.body.code, code);
  }
  assertEquals(
    recurringOccurrenceDatabaseFailure({
      code: "P0001",
      message: "OCCURRENCE_UNAUTHORIZED",
    }).status,
    403,
  );
});

Deno.test("recurring confirmation: infrastructure and unrecognized failures retain queued work", () => {
  for (
    const error of [
      { code: "40001", message: "serialization failure" },
      { code: "40P01", message: "deadlock" },
      { code: "57014", message: "timeout" },
      { code: "08006", message: "connection failure" },
      { code: "PGRST000", message: "connection unavailable" },
      { code: "PGRST205", message: "schema cache unavailable" },
      { code: "P0001", message: "OCCURRENCE_FAILED" },
      { message: "Failed to fetch" },
      { code: "08006", message: "OCCURRENCE_CONFLICT" },
    ]
  ) {
    const failure = recurringOccurrenceDatabaseFailure(error);
    assertEquals(failure.status, 503);
    assertEquals(failure.body.code, "SERVER_ERROR");
  }
});
