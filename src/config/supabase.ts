/**
 * إعدادات Supabase (قاعدة بيانات المنتجات + صور + دخول المدير).
 *
 * القيم تأتي من متغيرات البيئة وقت البناء (Netlify → Site configuration → Environment variables):
 *   VITE_SUPABASE_URL        مثل https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY   المفتاح العام (anon / publishable) — آمن للواجهة لأن الحماية بسياسات RLS
 *
 * ⚠️ لا تضعي أبداً مفتاح service_role أو sb_secret_ هنا: هذا الملف يُرسل للمتصفح.
 * إذا لم تُضبط المتغيرات، يعمل المتجر من الملف الثابت src/data/products.ts كما كان.
 */
const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

/** يرفض أي مفتاح سري وُضع بالخطأ بمكان المفتاح العام */
export function isSecretKey(key: string): boolean {
  if (!key) return false;
  if (key.startsWith('sb_secret_')) return true;
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return /"role"\s*:\s*"service_role"/.test(json);
  } catch {
    return false;
  }
}

const secretKeyMisused = isSecretKey(rawKey);
if (secretKeyMisused && typeof console !== 'undefined') {
  console.error('VITE_SUPABASE_ANON_KEY يحتوي مفتاحاً سرياً (service_role). تم تجاهله — استخدمي المفتاح العام anon فقط.');
}

export const supabaseConfig = {
  url: rawUrl,
  anonKey: secretKeyMisused ? '' : rawKey,
};

export const isSupabaseConfigured = /^https?:\/\/[^\s]+$/.test(supabaseConfig.url) && supabaseConfig.anonKey.length > 20;

/** اسم حاوية صور المنتجات في Supabase Storage (تُنشأ بملف supabase/migrations) */
export const PRODUCT_IMAGES_BUCKET = 'product-images';
/** أقصى حجم لصورة واحدة (يطابق حد الحاوية في قاعدة البيانات) */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
