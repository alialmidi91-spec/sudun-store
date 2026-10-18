/** قراءة وكتابة آمنة في localStorage (تعمل حتى لو كان التخزين معطّلاً بالمتصفح) */
export function readStorage<T>(key: string, fallback: T, validate?: (v: unknown) => v is T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* التخزين غير متاح — نكمل بدون حفظ */
  }
}
