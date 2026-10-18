import { siteConfig } from '../config/site';

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** يحوّل أي رقم إلى عدد صحيح آمن بالدينار (لا كسور في الدينار) */
export function toIQD(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

/** 15000 → "15,000 د.ع" */
export function formatIQD(value: number): string {
  return `${numberFormatter.format(toIQD(value))} ${siteConfig.currencyLabel}`;
}

/** يحوّل الأرقام العربية الهندية والفارسية إلى أرقام لاتينية */
export function normalizeDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** يوحّد النص العربي للبحث (إزالة التشكيل وتوحيد الألف والياء والتاء المربوطة) */
export function normalizeArabic(input: string): string {
  return normalizeDigits(input)
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
