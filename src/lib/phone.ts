import { normalizeDigits } from './format';

/**
 * يقبل الأرقام العراقية بالصيغ: 07701234567 · 7701234567 · 9647701234567 · +964 770 123 4567 · 00964...
 * ويعيدها بالصيغة المحلية 07XXXXXXXXX، أو null إذا كان الرقم غير صالح.
 */
export function normalizeIraqiPhone(input: string): string | null {
  let digits = normalizeDigits(input).replace(/[^\d]/g, '');
  if (digits.startsWith('00964')) digits = digits.slice(5);
  else if (digits.startsWith('964')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return /^7\d{9}$/.test(digits) ? `0${digits}` : null;
}
