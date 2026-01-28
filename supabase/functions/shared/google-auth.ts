type GoogleServiceAccount = {
  client_email: string
  private_key: string
  token_uri?: string
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '')

  const binary = atob(cleaned)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function base64UrlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function signJwtRs256(privateKeyPem: string, header: unknown, payload: unknown): Promise<string> {
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signingInput = `${encodedHeader}.${encodedPayload}`

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    new TextEncoder().encode(signingInput)
  )

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`
}

export async function getGoogleAccessToken(params: {
  serviceAccountJson: string
  scope: string
}): Promise<string> {
  const sa = JSON.parse(params.serviceAccountJson) as GoogleServiceAccount
  if (!sa.client_email || !sa.private_key) {
    throw new Error('Invalid Google service account JSON')
  }

  const now = Math.floor(Date.now() / 1000)
  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token'

  const assertion = await signJwtRs256(
    sa.private_key,
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: sa.client_email,
      scope: params.scope,
      aud: tokenUri,
      iat: now,
      exp: now + 60 * 60,
    }
  )

  const form = new URLSearchParams()
  form.set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer')
  form.set('assertion', assertion)

  const resp = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })

  const data = await resp.json().catch(() => null)
  if (!resp.ok || !data?.access_token) {
    throw new Error(`Failed to get Google access token: ${resp.status} ${JSON.stringify(data)}`)
  }

  return data.access_token as string
}
