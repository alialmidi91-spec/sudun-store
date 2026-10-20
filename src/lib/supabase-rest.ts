import { PRODUCT_IMAGES_BUCKET, isSupabaseConfigured, supabaseConfig } from '../config/supabase';

/**
 * عميل Supabase صغير فوق fetch (بدون مكتبة إضافية):
 * - REST (PostgREST) للجداول
 * - Auth لتسجيل دخول المدير
 * - Storage لرفع صور المنتجات
 * كل الصلاحيات تُفرض داخل قاعدة البيانات بسياسات RLS — الواجهة لا تملك أي مفتاح سري.
 */

export class SupabaseError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

const TIMEOUT_MS = 20000;

function arabicMessage(status: number, code: string | undefined, raw: string): string {
  if (status === 0) return 'تعذّر الاتصال بالخادم. تأكدي من الإنترنت وحاولي مرة ثانية.';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(raw)) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(raw)) return 'هذا الحساب غير مفعّل بعد في Supabase.';
  if (code === '23505' || /duplicate key/i.test(raw)) return 'يوجد منتج آخر بنفس الرابط (slug). غيّري الرابط وحاولي مرة ثانية.';
  if (code === '23514' || /violates check constraint/i.test(raw)) return 'بعض القيم غير مقبولة في قاعدة البيانات (مثلاً السعر أو الحالة). راجعي الحقول.';
  if (code === '42501' || status === 401 || status === 403 || /row-level security/i.test(raw)) return 'ليس لديك صلاحية لهذه العملية. سجّلي الدخول بحساب المدير.';
  if (status === 413 || /payload too large|exceeded the maximum allowed size/i.test(raw)) return 'حجم الصورة أكبر من المسموح.';
  if (status === 429) return 'طلبات كثيرة خلال وقت قصير. انتظري قليلاً وحاولي مرة ثانية.';
  if (status >= 500) return 'خطأ مؤقت في الخادم. حاولي بعد قليل.';
  return 'حدث خطأ غير متوقع. حاولي مرة ثانية.';
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** JSON body */
  body?: unknown;
  /** ملف خام (للصور) */
  file?: Blob;
  /** رمز دخول المستخدم؛ بدونه يُستخدم المفتاح العام (زائر) */
  token?: string;
  headers?: Record<string, string>;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (!isSupabaseConfigured) throw new SupabaseError('قاعدة البيانات غير مربوطة بعد.', 0, 'not_configured');
  const headers: Record<string, string> = {
    apikey: supabaseConfig.anonKey,
    Authorization: `Bearer ${opts.token ?? supabaseConfig.anonKey}`,
    ...opts.headers,
  };
  let body: BodyInit | undefined;
  if (opts.file) {
    body = opts.file;
    headers['Content-Type'] = opts.file.type || 'application/octet-stream';
  } else if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers['Content-Type'] = 'application/json';
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(supabaseConfig.url + path, { method: opts.method ?? 'GET', headers, body, signal: ctrl.signal });
  } catch {
    throw new SupabaseError(arabicMessage(0, undefined, ''), 0, 'network');
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const obj = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    const code = (obj.code ?? obj.error_code ?? obj.error ?? obj.statusCode) as string | undefined;
    const raw = String(obj.message ?? obj.msg ?? obj.error_description ?? obj.error ?? text ?? '');
    throw new SupabaseError(arabicMessage(res.status, code ? String(code) : undefined, raw), res.status, code ? String(code) : undefined);
  }
  return data as T;
}

/* ---------------- REST (الجداول) ---------------- */

export function restSelect<T>(table: string, query: string, token?: string): Promise<T[]> {
  return request<T[]>(`/rest/v1/${table}?${query}`, { token });
}

export async function restInsert<T>(table: string, row: Record<string, unknown>, token: string): Promise<T> {
  const rows = await request<T[]>(`/rest/v1/${table}`, {
    method: 'POST',
    body: row,
    token,
    headers: { Prefer: 'return=representation' },
  });
  if (!Array.isArray(rows) || !rows.length) throw new SupabaseError('لم يتم الحفظ. تأكدي من صلاحيات حساب المدير.', 403, '42501');
  return rows[0];
}

export async function restUpdate<T>(table: string, id: string, patch: Record<string, unknown>, token: string): Promise<T> {
  const rows = await request<T[]>(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
    token,
    headers: { Prefer: 'return=representation' },
  });
  // سياسات RLS تُرجع قائمة فارغة بدل الخطأ عند عدم وجود صلاحية أو إذا انحذف المنتج
  if (!Array.isArray(rows) || !rows.length) throw new SupabaseError('لم يتم الحفظ: المنتج غير موجود أو ليس لديك صلاحية.', 404, 'not_saved');
  return rows[0];
}

export async function restDelete(table: string, id: string, token: string): Promise<void> {
  const rows = await request<unknown[]>(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
    headers: { Prefer: 'return=representation' },
  });
  if (!Array.isArray(rows) || !rows.length) throw new SupabaseError('لم يتم الحذف: المنتج غير موجود أو ليس لديك صلاحية.', 404, 'not_deleted');
}

/* ---------------- Auth (دخول المدير) ---------------- */

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  /** وقت انتهاء الرمز (ثواني منذ 1970) */
  expires_at: number;
  user: { id: string; email?: string };
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  user: { id: string; email?: string };
}

function toSession(t: TokenResponse): AuthSession {
  return {
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: t.expires_at ?? Math.floor(Date.now() / 1000) + (t.expires_in || 3600),
    user: { id: t.user.id, email: t.user.email },
  };
}

export async function signInWithPassword(email: string, password: string): Promise<AuthSession> {
  const t = await request<TokenResponse>('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
  return toSession(t);
}

export async function refreshSession(refreshToken: string): Promise<AuthSession> {
  const t = await request<TokenResponse>('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: refreshToken } });
  return toSession(t);
}

export async function signOut(token: string): Promise<void> {
  try {
    await request('/auth/v1/logout', { method: 'POST', token });
  } catch {
    /* حتى لو فشل الطلب نحذف الجلسة محلياً */
  }
}

/* ---------------- Storage (الصور) ---------------- */

export function publicImageUrl(objectPath: string): string {
  return `${supabaseConfig.url}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${objectPath.split('/').map(encodeURIComponent).join('/')}`;
}

/** يرجع مسار الملف داخل الحاوية إذا كان الرابط صورة مرفوعة على Supabase، وإلا null (مثل صور /images/products المحلية) */
export function objectPathFromUrl(url: string): string | null {
  const prefix = `${supabaseConfig.url}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;
  if (!supabaseConfig.url || !url.startsWith(prefix)) return null;
  return url.slice(prefix.length).split('/').map(decodeURIComponent).join('/');
}

export async function uploadImage(objectPath: string, file: Blob, token: string): Promise<string> {
  const encoded = objectPath.split('/').map(encodeURIComponent).join('/');
  await request(`/storage/v1/object/${PRODUCT_IMAGES_BUCKET}/${encoded}`, {
    method: 'POST',
    file,
    token,
    headers: { 'x-upsert': 'false', 'cache-control': '31536000' },
  });
  return publicImageUrl(objectPath);
}

export async function removeImages(objectPaths: string[], token: string): Promise<void> {
  if (!objectPaths.length) return;
  await request(`/storage/v1/object/${PRODUCT_IMAGES_BUCKET}`, { method: 'DELETE', body: { prefixes: objectPaths }, token });
}
