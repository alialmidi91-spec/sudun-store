import { products as productData } from '../data/products';
import { categories, materialLabel, priceRanges, type PriceRangeId } from '../data/taxonomy';
import { isSupabaseConfigured } from '../config/supabase';
import type { CategoryId, ColorFamily, MaterialId, Product } from '../types';
import { normalizeArabic } from './format';
import { rowToProduct, toStoreProduct, type ProductRow } from './product-mapping';
import { restSelect } from './supabase-rest';

/**
 * طبقة الوصول للبيانات:
 * - إذا كانت Supabase مربوطة (متغيرات VITE_SUPABASE_*) تُقرأ المنتجات المنشورة من قاعدة البيانات.
 * - وإلا يعمل المتجر من الملف الثابت src/data/products.ts كما كان.
 * تعديلات لوحة التحكم تظهر للزبونة عند فتح الموقع أو بعد دقيقة كحد أقصى أثناء التصفح.
 */
const CACHE_MS = 60_000;

export type CatalogStatus = 'loading' | 'ready' | 'error';
export interface CatalogSnapshot {
  status: CatalogStatus;
  products: Product[];
  error?: Error;
}

let snapshot: CatalogSnapshot = isSupabaseConfigured ? { status: 'loading', products: [] } : { status: 'ready', products: productData };
let loadedAt = 0;
let inflight: Promise<Product[]> | null = null;
const listeners = new Set<() => void>();

function setSnapshot(next: CatalogSnapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

export function getCatalogSnapshot(): CatalogSnapshot {
  return snapshot;
}

export function subscribeCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function loadRemote(): Promise<Product[]> {
  const rows = await restSelect<ProductRow>('products', 'select=*&status=eq.published&order=sort_order.asc,added_at.desc.nullslast,created_at.desc');
  return rows.flatMap((r) => {
    const p = rowToProduct(r);
    return p && p.status === 'published' ? [toStoreProduct(p)] : [];
  });
}

/** يجلب المنتجات المنشورة (مع ذاكرة مؤقتة قصيرة حتى ما يتكرر الطلب بكل صفحة) */
export async function fetchProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) return productData;
  const fresh = snapshot.status === 'ready' && Date.now() - loadedAt < CACHE_MS;
  if (fresh) return snapshot.products;
  if (!inflight) {
    inflight = loadRemote()
      .then((list) => {
        loadedAt = Date.now();
        setSnapshot({ status: 'ready', products: list });
        return list;
      })
      .catch((err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        // إذا عندنا نسخة سابقة نكمل بيها بدل ما نكسر الصفحة
        if (snapshot.status !== 'ready') setSnapshot({ status: 'error', products: [], error });
        throw error;
      })
      .finally(() => {
        inflight = null;
      });
  }
  if (snapshot.status === 'ready') {
    inflight.catch(() => undefined);
    return snapshot.products;
  }
  return inflight;
}

export async function fetchProductBySlug(slug: string): Promise<Product | undefined> {
  const list = await fetchProducts();
  return list.find((p) => p.slug === slug);
}

/** يُستدعى بعد أي تعديل من لوحة التحكم حتى يُعاد الجلب */
export function invalidateCatalog(): void {
  loadedAt = 0;
}

export type SortId = 'newest' | 'price-asc' | 'price-desc';

export const sortOptions: { id: SortId; label: string }[] = [
  { id: 'newest', label: 'الأحدث' },
  { id: 'price-asc', label: 'السعر: من الأقل' },
  { id: 'price-desc', label: 'السعر: من الأعلى' },
];

export interface CatalogFilters {
  q: string;
  categories: CategoryId[];
  materials: MaterialId[];
  colors: ColorFamily[];
  price: PriceRangeId | '';
  inStockOnly: boolean;
  sort: SortId;
}

export const emptyFilters: CatalogFilters = {
  q: '',
  categories: [],
  materials: [],
  colors: [],
  price: '',
  inStockOnly: false,
  sort: 'newest',
};

export function matchesQuery(p: Product, q: string): boolean {
  const needle = normalizeArabic(q);
  if (!needle) return true;
  const haystack = normalizeArabic(
    [
      p.name,
      p.shortDescription,
      categories[p.category].label,
      materialLabel(p.material) ?? '',
      ...p.colors.map((c) => c.name),
    ].join(' '),
  );
  return needle.split(' ').every((word) => haystack.includes(word));
}

export function applyFilters(list: Product[], f: CatalogFilters): Product[] {
  const range = priceRanges.find((r) => r.id === f.price);
  const result = list.filter(
    (p) =>
      matchesQuery(p, f.q) &&
      (!f.categories.length || f.categories.includes(p.category)) &&
      (!f.materials.length || (!!p.material && f.materials.includes(p.material))) &&
      (!f.colors.length || p.colors.some((c) => f.colors.includes(c.family))) &&
      (!range || (p.price >= range.min && p.price <= range.max)) &&
      (!f.inStockOnly || p.inStock),
  );

  const sorted = [...result];
  if (f.sort === 'price-asc') sorted.sort((a, b) => a.price - b.price);
  else if (f.sort === 'price-desc') sorted.sort((a, b) => b.price - a.price);
  else sorted.sort((a, b) => b.addedAt.localeCompare(a.addedAt));

  // المنتجات النافدة تنزل لآخر القائمة دون إخفائها
  return sorted.sort((a, b) => Number(b.inStock) - Number(a.inStock));
}

export function hasRealDiscount(p: Product): boolean {
  return typeof p.compareAtPrice === 'number' && p.compareAtPrice > p.price;
}
