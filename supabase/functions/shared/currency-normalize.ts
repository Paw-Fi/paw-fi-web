/**
 * Normalize free-form currency inputs (codes/symbols/aliases) to ISO 4217 codes.
 * Returns a 3‑letter uppercase code if recognized, otherwise null.
 */
export function normalizeCurrencyCode(input?: string | null): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();

  // Already a plausible 3-letter code
  if (/^[A-Z]{3}$/.test(upper)) {
    return upper;
  }

  // Symbol/alias map (common OCR results and regional notations)
  const map: Record<string, string> = {
    // Dollar variants
    '$': 'USD',
    'US$': 'USD',
    'U$': 'USD',

    // Rand (South Africa)
    'R': 'ZAR',
    'RJ': 'ZAR', // observed misread

    // Ringgit (Malaysia)
    'RM': 'MYR',

    // Riyal (Saudi Arabia)
    'ر.س': 'SAR',

    // Dirham (UAE)
    'د.إ': 'AED',

    // Pound, Euro, Yen signs
    '£': 'GBP',
    '€': 'EUR',
    '₪': 'ILS',
    // Ambiguous: '¥' = JPY or CNY → treat as null, caller should fallback to preferred
    '¥': '',

    // Dollar with country letters
    'A$': 'AUD',
    'AU$': 'AUD',
    'C$': 'CAD',
    'CA$': 'CAD',
    'S$': 'SGD',
    'HK$': 'HKD',
    'NZ$': 'NZD',
    'MX$': 'MXN',
    'R$': 'BRL',

    // Jamaica Dollar
    'J$': 'JMD',

    // Malawi Kwacha
    'MK': 'MWK',

    // Syrian Pound
    '£S': 'SYP',

    // Zambian Kwacha
    'ZK': 'ZMW',

    // Kenya Shilling
    'KSH': 'KES',
    'KSHS': 'KES',
  };

  if (Object.prototype.hasOwnProperty.call(map, upper)) {
    const code = map[upper];
    return code && code.length === 3 ? code : null;
  }

  return null;
}

