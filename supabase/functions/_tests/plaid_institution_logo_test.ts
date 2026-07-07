import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildPlaidInstitutionLogoStoragePath,
  decodePlaidLogoBase64,
  hashLogoBytes,
} from "../shared/plaid-institution-logo-utils.ts";

Deno.test("decodePlaidLogoBase64 decodes Plaid logo payloads", () => {
  const bytes = decodePlaidLogoBase64("aGVsbG8=");

  assert(bytes);
  assertEquals(new TextDecoder().decode(bytes), "hello");
});

Deno.test("decodePlaidLogoBase64 accepts data URI payloads", () => {
  const bytes = decodePlaidLogoBase64("data:image/png;base64,aGVsbG8=");

  assert(bytes);
  assertEquals(new TextDecoder().decode(bytes), "hello");
});

Deno.test(
  "buildPlaidInstitutionLogoStoragePath keeps user id first for storage ownership policies",
  () => {
    const path = buildPlaidInstitutionLogoStoragePath({
      userId: "user-1",
      institutionId: "ins:123/456",
      hash: "abcdef12",
    });

    assertEquals(path, "user-1/wallet-logos/plaid-ins-123-456-abcdef12.png");
  },
);

Deno.test("hashLogoBytes returns a stable short sha256 prefix", async () => {
  const hash = await hashLogoBytes(new TextEncoder().encode("hello"));

  assertEquals(hash, "2cf24dba5fb0a30e");
});
