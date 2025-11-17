/**
 * Currency code to symbol mapping
 * Maps ISO 4217 currency codes to their common symbols
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
'AED': 'د.إ',
  'AUD': 'A\$',
  'BRL': 'R\$',
  'CAD': 'C\$',
  'CHF': 'CHF',
  'CLP': 'CLP\$',
  'CNY': '¥',
  'CZK': 'Kč',
  'DKK': 'kr',
  'DOP': 'RD\$',
  'EGP': 'E£',
  'EUR': '€',
  'GBP': '£',
  'GHS': '₵',
  'GTQ': 'Q',
  'HKD': 'HK\$',
  'IDR': 'Rp',
  'INR': '₹',
  'JPY': '¥',
  'KES': 'KSh',
  'KRW': '₩',
  'LKR': 'Rs',
  'MXN': 'MX\$',
  'MYR': 'RM',
  'NGN': '₦',
  'NOK': 'kr',
  'NZD': 'NZ\$',
  'PHP': '₱',
  'PLN': 'zł',
  'PKR': '₨',
  'PYG': '₲',
  'RSD': 'Дин.',
  'RUB': '₽',
  'SAR': 'ر.س',
  'SEK': 'kr',
  'SGD': 'S\$',
  'THB': '฿',
  'TRY': '₺',
  'UAH': '₴',
  'USD': '\$',
  'VND': '₫',
  'ZAR': 'R',
  'HUF': 'Ft',
};

/**
 * Get currency symbol for a currency code
 * Falls back to $ if currency not found
 */
export function getCurrencySymbol(code?: string | null): string {
  if (!code) return '$';
  const upper = code.toUpperCase().trim();
  return CURRENCY_SYMBOLS[upper] || '$';
}

/**
 * Format amount with currency symbol
 * @param cents - Amount in cents
 * @param currencyCode - ISO currency code (e.g., 'USD', 'MYR')
 * @returns Formatted string like "RM75.00" or "$100.00"
 */
export function formatMoney(cents: number, currencyCode?: string | null): string {
  const symbol = getCurrencySymbol(currencyCode);
  const amount = (cents / 100).toFixed(2);
  return `${symbol}${amount}`;
}
