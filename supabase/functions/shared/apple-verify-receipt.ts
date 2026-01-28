type AppleVerifyReceiptResponse = {
  status: number
  environment?: string
  receipt?: {
    in_app?: Array<Record<string, unknown>>
  }
  latest_receipt_info?: Array<Record<string, unknown>>
  pending_renewal_info?: Array<Record<string, unknown>>
}

async function postVerifyReceipt(params: {
  url: string
  receiptData: string
  sharedSecret: string
}): Promise<AppleVerifyReceiptResponse> {
  const resp = await fetch(params.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': params.receiptData,
      password: params.sharedSecret,
      'exclude-old-transactions': true,
    }),
  })

  const data = (await resp.json().catch(() => null)) as AppleVerifyReceiptResponse | null
  if (!data) {
    throw new Error(`Apple verifyReceipt returned invalid JSON (${resp.status})`)
  }
  return data
}

/**
 * Verifies an iOS App Store receipt.
 *
 * - Uses production endpoint first
 * - Automatically retries sandbox when Apple returns 21007
 */
export async function verifyAppleReceipt(params: {
  receiptData: string
  sharedSecret: string
}): Promise<AppleVerifyReceiptResponse> {
  const productionUrl = 'https://buy.itunes.apple.com/verifyReceipt'
  const sandboxUrl = 'https://sandbox.itunes.apple.com/verifyReceipt'

  const first = await postVerifyReceipt({
    url: productionUrl,
    receiptData: params.receiptData,
    sharedSecret: params.sharedSecret,
  })

  // 21007: sandbox receipt sent to production.
  if (first.status === 21007) {
    return await postVerifyReceipt({
      url: sandboxUrl,
      receiptData: params.receiptData,
      sharedSecret: params.sharedSecret,
    })
  }

  return first
}
