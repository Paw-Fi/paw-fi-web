/// <reference lib="deno.ns" />
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  buildCheckoutRedirectUrls,
  checkoutAllowedHosts,
} from "../shared/checkout-redirect.ts";

Deno.test(
  "checkout redirects: ignores request origin as fallback authority",
  () => {
    const redirects = buildCheckoutRedirectUrls({
      appUrl: "https://moneko.io",
      successUrl: null,
      cancelUrl: null,
    });

    assertEquals(
      redirects.successUrl,
      "https://moneko.io/checkout?status=success&session_id={CHECKOUT_SESSION_ID}",
    );
    assertEquals(
      redirects.cancelUrl,
      "https://moneko.io/checkout?status=canceled&session_id={CHECKOUT_SESSION_ID}",
    );
  },
);

Deno.test(
  "checkout redirects: rejects caller supplied external redirect urls",
  () => {
    const redirects = buildCheckoutRedirectUrls({
      appUrl: "https://moneko.io",
      successUrl:
        "https://evil.example/checkout?session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "https://evil.example/canceled",
    });

    assertEquals(
      redirects.successUrl,
      "https://moneko.io/checkout?status=success&session_id={CHECKOUT_SESSION_ID}",
    );
    assertEquals(
      redirects.cancelUrl,
      "https://moneko.io/checkout?status=canceled&session_id={CHECKOUT_SESSION_ID}",
    );
  },
);

Deno.test(
  "checkout redirects: static allowlist excludes arbitrary origin host",
  () => {
    const allowedHosts = checkoutAllowedHosts("https://moneko.io");

    assertEquals(allowedHosts.has("moneko.io"), true);
    assertEquals(allowedHosts.has("www.moneko.io"), true);
    assertEquals(allowedHosts.has("evil.example"), false);
  },
);

Deno.test(
  "checkout redirects: rejects http redirects for production hosts",
  () => {
    const redirects = buildCheckoutRedirectUrls({
      appUrl: "https://moneko.io",
      successUrl: "http://moneko.io/checkout?session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "http://www.moneko.io/canceled",
    });

    assertEquals(
      redirects.successUrl,
      "https://moneko.io/checkout?status=success&session_id={CHECKOUT_SESSION_ID}",
    );
    assertEquals(
      redirects.cancelUrl,
      "https://moneko.io/checkout?status=canceled&session_id={CHECKOUT_SESSION_ID}",
    );
  },
);

Deno.test(
  "checkout redirects: rejects localhost redirects unless explicitly allowed",
  () => {
    const redirects = buildCheckoutRedirectUrls({
      appUrl: "https://moneko.io",
      successUrl:
        "http://localhost:5173/checkout?session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "http://127.0.0.1:5173/canceled",
    });

    assertEquals(
      redirects.successUrl,
      "https://moneko.io/checkout?status=success&session_id={CHECKOUT_SESSION_ID}",
    );
    assertEquals(
      redirects.cancelUrl,
      "https://moneko.io/checkout?status=canceled&session_id={CHECKOUT_SESSION_ID}",
    );
  },
);

Deno.test(
  "checkout redirects: localhost app url does not allow localhost redirects by default",
  () => {
    const redirects = buildCheckoutRedirectUrls({
      appUrl: "http://localhost:5173",
      successUrl:
        "http://localhost:5173/checkout?session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "http://127.0.0.1:5173/canceled",
    });

    assertEquals(
      redirects.successUrl,
      "https://moneko.io/checkout?status=success&session_id={CHECKOUT_SESSION_ID}",
    );
    assertEquals(
      redirects.cancelUrl,
      "https://moneko.io/checkout?status=canceled&session_id={CHECKOUT_SESSION_ID}",
    );
  },
);

Deno.test(
  "checkout redirects: allowLocalhost permits localhost redirect urls",
  () => {
    const redirects = buildCheckoutRedirectUrls({
      appUrl: "https://moneko.io",
      successUrl:
        "http://localhost:3000/checkout?status=success&session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "http://127.0.0.1:3000/checkout?status=canceled&session_id={CHECKOUT_SESSION_ID}",
      allowLocalhost: true,
    });

    assertEquals(
      redirects.successUrl,
      "http://localhost:3000/checkout?status=success&session_id={CHECKOUT_SESSION_ID}",
    );
    assertEquals(
      redirects.cancelUrl,
      "http://127.0.0.1:3000/checkout?status=canceled&session_id={CHECKOUT_SESSION_ID}",
    );
  },
);
