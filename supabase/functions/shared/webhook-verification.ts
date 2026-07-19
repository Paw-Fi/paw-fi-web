/**
 * Webhook Verification Utilities
 *
 * Provides signature verification for Plaid and Tink webhooks.
 *
 * Plaid: Uses JWT with ES256, verified against a JWK from /webhook_verification_key/get
 * Tink: Uses HMAC-SHA256 with X-Tink-Signature header
 */

import { fetchWithRetry } from "./bank-retry.ts";
import { getPlaidConfig } from "./plaid-client.ts";

// ============================================================================
// PLAID WEBHOOK VERIFICATION
// ============================================================================

interface PlaidJWKCache {
  key: PlaidJWK;
  expiresAt: number;
}

interface PlaidJWK {
  alg: string;
  crv: string;
  kid: string;
  kty: string;
  use: string;
  x: string;
  y: string;
  created_at: number;
  expired_at: number | null;
}

interface PlaidWebhookVerificationKeyResponse {
  key: PlaidJWK;
  request_id: string;
}

// Cache JWKs for 24 hours to reduce API calls
const jwkCache = new Map<string, PlaidJWKCache>();
const JWK_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const PLAID_MAX_WEBHOOK_AGE_SECONDS = 5 * 60;

/**
 * Fetches the JWK for a given key ID from Plaid.
 */
async function fetchPlaidJWK(keyId: string): Promise<PlaidJWK> {
  // Check cache first
  const cached = jwkCache.get(keyId);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (
    cached &&
    cached.expiresAt > Date.now() &&
    (!cached.key.expired_at || cached.key.expired_at > nowSeconds)
  ) {
    return cached.key;
  }
  jwkCache.delete(keyId);

  const config = getPlaidConfig();
  const response = await fetchWithRetry(
    `${config.baseUrl}/webhook_verification_key/get`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Plaid-Version": config.apiVersion,
      },
      body: JSON.stringify({
        client_id: config.clientId,
        secret: config.secret,
        key_id: keyId,
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Failed to fetch Plaid JWK: ${response.status} - ${errorBody}`,
    );
  }

  const data = (await response.json()) as PlaidWebhookVerificationKeyResponse;
  validatePlaidJWK(data.key, keyId, nowSeconds);

  // Cache the key
  jwkCache.set(keyId, {
    key: data.key,
    expiresAt: Math.min(
      Date.now() + JWK_CACHE_TTL_MS,
      data.key.expired_at == null
        ? Number.POSITIVE_INFINITY
        : data.key.expired_at * 1000,
    ),
  });

  return data.key;
}

function validatePlaidJWK(
  jwk: PlaidJWK,
  expectedKeyId: string,
  nowSeconds: number,
): void {
  if (
    jwk.kid !== expectedKeyId ||
    jwk.alg !== "ES256" ||
    jwk.kty !== "EC" ||
    jwk.crv !== "P-256" ||
    jwk.use !== "sig" ||
    !jwk.x ||
    !jwk.y ||
    (jwk.expired_at != null && jwk.expired_at <= nowSeconds)
  ) {
    throw new Error("Plaid returned an invalid webhook verification key");
  }
}

/**
 * Base64URL decode helper
 */
function base64UrlDecode(input: string): Uint8Array {
  // Replace URL-safe characters with standard Base64
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if needed
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Imports a Plaid JWK as a CryptoKey for verification
 */
async function importPlaidJWK(jwk: PlaidJWK): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "jwk",
    {
      kty: jwk.kty,
      crv: jwk.crv,
      x: jwk.x,
      y: jwk.y,
    },
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    false,
    ["verify"],
  );
}

export interface PlaidWebhookVerificationResult {
  valid: boolean;
  error?: string;
  keyId?: string;
}

export interface PlaidWebhookClaimsValidationParams {
  body: string;
  payload: {
    iat?: number;
    request_body_sha256?: string;
  };
  nowSeconds?: number;
}

export async function validatePlaidWebhookClaims(
  params: PlaidWebhookClaimsValidationParams,
): Promise<PlaidWebhookVerificationResult> {
  const { payload } = params;
  const nowSeconds = params.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (!Number.isFinite(payload.iat)) {
    return { valid: false, error: "Missing iat in JWT payload" };
  }

  const issuedAt = payload.iat!;
  if (issuedAt > nowSeconds) {
    return { valid: false, error: "Token issued in the future" };
  }

  if (issuedAt < nowSeconds - PLAID_MAX_WEBHOOK_AGE_SECONDS) {
    return { valid: false, error: "Token expired (iat too old)" };
  }

  if (!payload.request_body_sha256) {
    return {
      valid: false,
      error: "Missing request_body_sha256 in JWT payload",
    };
  }

  const bodyBytes = new TextEncoder().encode(params.body);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bodyBytes);
  const computedHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (!constantTimeCompare(computedHash, payload.request_body_sha256)) {
    return { valid: false, error: "Body hash mismatch" };
  }

  return { valid: true };
}

/**
 * Verifies a Plaid webhook signature.
 *
 * @param body - The raw request body as a string
 * @param plaidVerificationHeader - The Plaid-Verification header value (JWT)
 * @returns Verification result
 */
export async function verifyPlaidWebhook(
  body: string,
  plaidVerificationHeader: string | null,
): Promise<PlaidWebhookVerificationResult> {
  if (!plaidVerificationHeader) {
    return { valid: false, error: "Missing Plaid-Verification header" };
  }

  try {
    // Split JWT into parts
    const parts = plaidVerificationHeader.split(".");
    if (parts.length !== 3) {
      return { valid: false, error: "Invalid JWT format" };
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header
    const headerJson = new TextDecoder().decode(base64UrlDecode(headerB64));
    const header = JSON.parse(headerJson) as {
      alg: string;
      kid: string;
      typ: string;
    };

    // Validate algorithm - MUST be ES256
    if (header.alg !== "ES256") {
      return {
        valid: false,
        error: `Invalid algorithm: ${header.alg}, expected ES256`,
      };
    }

    if (!header.kid) {
      return { valid: false, error: "Missing kid in JWT header" };
    }

    // Fetch the JWK
    const jwk = await fetchPlaidJWK(header.kid);

    // Import the key
    const cryptoKey = await importPlaidJWK(jwk);

    // Prepare signature and data for verification
    const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signatureBytes = base64UrlDecode(signatureB64);

    if (signatureBytes.length !== 64) {
      return { valid: false, error: "Invalid ES256 signature length" };
    }

    // Verify signature
    const isValid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      cryptoKey,
      signatureBytes,
      signedData,
    );

    if (!isValid) {
      return {
        valid: false,
        error: "Signature verification failed",
        keyId: header.kid,
      };
    }

    // Decode payload and verify claims
    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const payload = JSON.parse(payloadJson) as {
      iat?: number;
      request_body_sha256?: string;
    };

    const claimsResult = await validatePlaidWebhookClaims({ body, payload });
    if (!claimsResult.valid) {
      return { ...claimsResult, keyId: header.kid };
    }

    return { valid: true, keyId: header.kid };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown verification error";
    return { valid: false, error: message };
  }
}

// ============================================================================
// TINK WEBHOOK VERIFICATION
// ============================================================================

const TINK_WEBHOOK_SECRET_ENV = "TINK_WEBHOOK_SECRET";

// Maximum age of webhook (15 minutes) to prevent replay attacks while allowing delayed deliveries
// Extended from 5 minutes to handle provider outages and retry storms
const TINK_MAX_TIMESTAMP_AGE_SECONDS = 900;

export interface TinkWebhookVerificationResult {
  valid: boolean;
  error?: string;
  timestamp?: number;
}

/**
 * Parses the X-Tink-Signature header.
 * Format: "t=<timestamp>,v1=<signature>" (may have spaces after commas)
 */
function parseTinkSignatureHeader(
  header: string,
): { timestamp: string; signature: string } | null {
  const parts = header.split(",");
  let timestamp: string | null = null;
  let signature: string | null = null;

  for (const part of parts) {
    const [key, ...valueParts] = part.split("=");
    const value = valueParts.join("="); // Handle values that might contain '='
    // Trim whitespace from keys and values to handle "t=..., v1=..." format
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();
    if (trimmedKey === "t") {
      timestamp = trimmedValue;
    } else if (trimmedKey === "v1") {
      signature = trimmedValue;
    }
  }

  if (!timestamp || !signature) {
    return null;
  }

  return { timestamp, signature };
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Computes HMAC-SHA256 signature.
 */
async function computeHmacSha256(
  secret: string,
  message: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verifies a Tink webhook signature.
 *
 * @param body - The raw request body as a string
 * @param tinkSignatureHeader - The X-Tink-Signature header value
 * @param secret - Optional secret override (defaults to TINK_WEBHOOK_SECRET env var)
 * @returns Verification result
 */
export async function verifyTinkWebhook(
  body: string,
  tinkSignatureHeader: string | null,
  secret?: string,
): Promise<TinkWebhookVerificationResult> {
  const webhookSecret = secret || Deno.env.get(TINK_WEBHOOK_SECRET_ENV);

  if (!webhookSecret) {
    return { valid: false, error: "TINK_WEBHOOK_SECRET not configured" };
  }

  if (!tinkSignatureHeader) {
    return { valid: false, error: "Missing X-Tink-Signature header" };
  }

  const parsed = parseTinkSignatureHeader(tinkSignatureHeader);
  if (!parsed) {
    return { valid: false, error: "Invalid X-Tink-Signature header format" };
  }

  const { timestamp, signature: receivedSignature } = parsed;

  // Verify timestamp freshness
  const timestampSeconds = parseInt(timestamp, 10);
  if (isNaN(timestampSeconds)) {
    return { valid: false, error: "Invalid timestamp in signature header" };
  }

  const now = Math.floor(Date.now() / 1000);
  const age = now - timestampSeconds;

  if (age > TINK_MAX_TIMESTAMP_AGE_SECONDS) {
    return {
      valid: false,
      error: `Timestamp too old (${age}s > ${TINK_MAX_TIMESTAMP_AGE_SECONDS}s)`,
      timestamp: timestampSeconds,
    };
  }

  if (age < -60) {
    // Allow 1 minute clock skew into the future
    return {
      valid: false,
      error: "Timestamp is in the future",
      timestamp: timestampSeconds,
    };
  }

  // Compute expected signature
  const messageToSign = `${timestamp}.${body}`;
  const expectedSignature = await computeHmacSha256(
    webhookSecret,
    messageToSign,
  );

  // Constant-time comparison
  if (!constantTimeCompare(expectedSignature, receivedSignature)) {
    return {
      valid: false,
      error: "Signature mismatch",
      timestamp: timestampSeconds,
    };
  }

  return { valid: true, timestamp: timestampSeconds };
}

// ============================================================================
// WEBHOOK IDEMPOTENCY
// ============================================================================

export interface WebhookIdempotencyResult {
  isDuplicate: boolean;
  error?: string;
}

/**
 * Generates a SHA-256 hash of the input string (first 32 chars of hex = 128 bits).
 * Used to create a compact content fingerprint for idempotency.
 */
async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // Return first 32 hex chars (128 bits) for stronger collision resistance
  return hashArray
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Recursively sorts object keys for deterministic JSON serialization.
 * This ensures nested objects are also sorted, unlike JSON.stringify with array replacer.
 */
function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  for (const key of keys) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * Generates a unique webhook event ID for idempotency checking.
 *
 * Uses provider-supplied identifiers plus a content hash to prevent
 * replay attacks and ensure deterministic deduplication.
 *
 * IMPORTANT: Two distinct webhook deliveries must generate different IDs.
 * We achieve this by including:
 * - Structural identifiers (item_id, webhook_type, etc.)
 * - A hash of the full payload (including nested fields) to disambiguate events
 *
 * For Plaid: item_id + webhook_type + webhook_code + content_hash
 * For Tink: event + externalUserId + credentialsId + content_hash
 */
export async function generateWebhookEventId(
  provider: "plaid" | "tink",
  payload: Record<string, unknown>,
): Promise<string> {
  // Create a stable JSON string of the payload for hashing
  // Use recursive key sorting to ensure nested objects are also deterministic
  const sortedPayload = sortObjectKeys(payload);
  const payloadString = JSON.stringify(sortedPayload);
  const contentHash = await hashContent(payloadString);

  if (provider === "plaid") {
    const itemId = payload.item_id as string;
    const webhookCode = payload.webhook_code as string;
    const webhookType = payload.webhook_type as string;

    // Combine structural identifiers with content hash
    return `plaid:${itemId}:${webhookType}:${webhookCode}:${contentHash}`;
  } else {
    const event = payload.event as string;
    const context = payload.context as
      | { userId?: string; externalUserId?: string }
      | undefined;
    const externalUserId =
      context?.externalUserId || context?.userId || "unknown";
    const content = payload.content as
      | {
          credentialsId?: string;
        }
      | undefined;
    const credentialsId = content?.credentialsId || "";

    // Combine structural identifiers with content hash
    return `tink:${event}:${externalUserId}:${credentialsId}:${contentHash}`;
  }
}
