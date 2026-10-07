/**
 * Masks Personally Identifiable Information (PII) such as phone numbers for UK GDPR compliance.
 * Example: '919737893728' -> '+91 ••••• •3728'
 * Example: '447123456789' -> '+44 ••••• •6789'
 */
export function maskPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '[NO_PHONE]';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length <= 4) return '••••';

  const countryPrefix = cleaned.length > 10 ? `+${cleaned.slice(0, cleaned.length - 10)} ` : '';
  const lastFour = cleaned.slice(-4);
  return `${countryPrefix}••••• •${lastFour}`;
}
