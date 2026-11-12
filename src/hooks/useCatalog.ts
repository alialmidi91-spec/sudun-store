import { useEffect, useSyncExternalStore } from 'react';
import { fetchProducts, getCatalogSnapshot, subscribeCatalog, type CatalogSnapshot } from '../lib/catalog';

/**
 * المنتجات الحالية للمتجر (من Supabase أو من الملف الثابت).
 * يبدأ الجلب تلقائياً، ويرجع status: loading | ready | error.
 */
export function useCatalog(): CatalogSnapshot & { retry: () => void } {
  const snap = useSyncExternalStore(subscribeCatalog, getCatalogSnapshot, getCatalogSnapshot);
  useEffect(() => {
    fetchProducts().catch(() => undefined);
  }, []);
  return { ...snap, retry: () => void fetchProducts().catch(() => undefined) };
}
