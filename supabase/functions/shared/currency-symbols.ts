/**
 * Currency code to symbol mapping
 * Maps ISO 4217 currency codes to their common symbols
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  'AED': 'د.إ',
  'ARS': 'ARS\$',
  'AUD': 'A\$',
  'BBD': 'Bds\$',
  'BDT': '৳',
  'BIF': 'Fr',
  'BND': 'B\$',
  'BSD': 'B\$',
  'BZD': 'BZ\$',
  'BRL': 'R\$',
  'CAD': 'C\$',
  'CHF': 'CHF',
  'CLP': 'CLP\$',
  'CNY': '¥',
  'COP': 'COP\$',
  'CZK': 'Kč',
  'DKK': 'kr',
  'CDF': 'Fr',
  'DJF': 'Fr',
  'DOP': 'RD\$',
  'DZD': 'د.ج',
  'EGP': 'E£',
  'ETB': 'Br',
  'EUR': '€',
  'FJD': 'FJ\$',
  'FKP': '£',
  'GBP': '£',
  'GIP': '£',
  'GHS': '₵',
  'GNF': 'Fr',
  'GTQ': 'Q',
  'GYD': 'G\$',
  'HKD': 'HK\$',
  'HUF': 'Ft',
  'JMD': 'J\$',
  'IDR': 'Rp',
  'ILS': '₪',
  'INR': '₹',
  'ISK': 'kr',
  'JOD': 'د.أ',
  'JPY': '¥',
  'KES': 'KSh',
  'KPW': '₩',
  'KRW': '₩',
  'KYD': 'CI\$',
  'LBP': 'ل.ل',
  'LRD': 'L\$',
  'LKR': 'Rs',
  'MOP': 'MOP$',
  'MMK': 'Ks',
  'MUR': 'Rs',
  'MXN': 'MX\$',
  'MYR': 'RM',
  'MWK': 'MK',
  'NAD': 'N\$',
  'NGN': '₦',
  'NOK': 'kr',
  'NPR': 'रू',
  'NZD': 'NZ\$',
  'PHP': '₱',
  'PEN': 'S/',
  'PLN': 'zł',
  'PKR': '₨',
  'PYG': '₲',
  'RSD': 'Дин.',
  'RON': 'RON',
  'RUB': '₽',
  'RWF': 'Fr',
  'SAR': 'ر.س',
  'SCR': '₨',
  'SDG': 'SDG',
  'SEK': 'kr',
  'SGD': 'S\$',
  'SHP': '£',
  'SRD': 'SRD',
  'SSP': 'SSP',
  'SYP': '£S',
  'THB': '฿',
  'TTD': 'TT\$',
  'TWD': 'NT$',
  'TRY': '₺',
  'UAH': '₴',
  'USD': '\$',
  'VND': '₫',
  'ZAR': 'R',
  'ZMW': 'ZK',
  'XOF': 'CFA',
  'CRC': '₡',
  'XAF': 'FCFA',
  'XCD': 'EC\$',
  'XPF': '₣',
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
