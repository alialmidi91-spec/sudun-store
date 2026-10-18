import { products as productData } from '../data/products';
import { categories, materialLabel, priceRanges, type PriceRangeId } from '../data/taxonomy';
import type { CategoryId, ColorFamily, MaterialId, Product } from '../types';
import { normalizeArabic } from './format';

/**
 * طبقة الوصول للبيانات. حالياً تقرأ من ملف ثابت،
 * ولاحقاً يمكن استبدالها بطلب API دون تغيير الصفحات.
 */
export async function fetchProducts(): Promise<Product[]> {
  return productData;
}

export async function fetchProductBySlug(slug: string): Promise<Product | undefined> {
  return productData.find((p) => p.slug === slug);
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
