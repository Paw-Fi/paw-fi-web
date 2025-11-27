const ENCODER = new TextEncoder();
const DECODER = new TextDecoder();
const IV_LENGTH = 12;
let cachedKey: CryptoKey | null = null;

async function getEncryptionKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const base64Key = Deno.env.get("PLAID_ENCRYPTION_KEY");
  if (!base64Key) {
    throw new Error("PLAID_ENCRYPTION_KEY is not configured");
  }
  const raw = decodeBase64(base64Key.trim());
  cachedKey = await crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  return cachedKey;
}

export async function encryptSecret(plainText: string): Promise<string> {
  if (!plainText) return plainText;
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    ENCODER.encode(plainText),
  );
  const cipherBytes = new Uint8Array(cipherBuffer);
  const payload = new Uint8Array(iv.length + cipherBytes.length);
  payload.set(iv, 0);
  payload.set(cipherBytes, iv.length);
  return encodeBase64(payload);
}

export async function decryptSecret(payload: string): Promise<string> {
  if (!payload) return payload;
  const key = await getEncryptionKey();
  const data = decodeBase64(payload);
  const iv = data.slice(0, IV_LENGTH);
  const cipher = data.slice(IV_LENGTH);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipher,
  );
  return DECODER.decode(plainBuffer);
}

function decodeBase64(value: string): Uint8Array {
  const sanitized = value.replace(/\s+/g, "");
  const binary = atob(sanitized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

