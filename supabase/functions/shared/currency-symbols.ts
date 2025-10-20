/**
 * Currency code to symbol mapping
 * Maps ISO 4217 currency codes to their common symbols
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  // Major currencies
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'JPY': '¥',
  'CNY': '¥',
  'CHF': 'CHF',
  'CAD': 'C$',
  'AUD': 'A$',
  'NZD': 'NZ$',
  'HKD': 'HK$',
  'SGD': 'S$',
  'KRW': '₩',
  'INR': '₹',
  'RUB': '₽',
  'BRL': 'R$',
  'MXN': 'Mex$',
  'ZAR': 'R',
  'SEK': 'kr',
  'NOK': 'kr',
  'DKK': 'kr',
  'PLN': 'zł',
  'THB': '฿',
  'IDR': 'Rp',
  'MYR': 'RM',
  'PHP': '₱',
  'TRY': '₺',
  'AED': 'د.إ',
  'SAR': 'ر.س',
  'EGP': 'E£',
  'NGN': '₦',
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
