import { categories, colorFamilies, materials } from '../data/taxonomy';
import type { CategoryId, ColorFamily, MaterialId, Product, ProductColor, ProductOffer } from '../types';

/**
 * التحويل بين صف قاعدة البيانات (جدول products في Supabase) وشكل Product المستخدم بالمتجر.
 * أي منتج يمر من هنا يرجع بنفس الشكل الذي تعتمد عليه حسابات الأسعار والعروض والسلة ورسالة واتساب.
 */

export type ProductStatus = 'published' | 'hidden';

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  category: string;
  material: string | null;
  colors: unknown;
  sizes: unknown;
  price: number;
  compare_at_price: number | null;
  offer: unknown;
  is_new: boolean;
  is_best_seller: boolean;
  /** null = الكمية غير محددة (يُعتبر متوفراً) */
  stock_qty: number | null;
  images: unknown;
  care: unknown;
  /** YYYY-MM-DD أو null */
  added_at: string | null;
  status: ProductStatus;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

/** منتج كما تراه لوحة التحكم: نفس Product + حالة النشر والكمية */
export interface AdminProduct extends Product {
  status: ProductStatus;
  stockQty: number | null;
  sortOrder: number;
  updatedAt?: string;
}

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : []);

function parseColors(v: unknown): ProductColor[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((c) => {
    if (!c || typeof c !== 'object') return [];
    const o = c as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name.trim() : '';
    if (!name) return [];
    const family = (typeof o.family === 'string' && o.family in colorFamilies ? o.family : 'neutral') as ColorFamily;
    const hex = typeof o.hex === 'string' && /^#[0-9a-f]{6}$/i.test(o.hex) ? o.hex : '#E7DCCB';
    const color: ProductColor = { name, hex, family };
    if (o.available === false) color.available = false;
    const imgs = strings(o.images);
    if (imgs.length) color.images = imgs;
    return [color];
  });
}

function parseOffer(v: unknown): ProductOffer | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  if (!isInt(o.quantity) || o.quantity < 2 || !isInt(o.price) || o.price <= 0) return undefined;
  return { quantity: o.quantity, price: o.price, freeDelivery: o.freeDelivery === true };
}

/** صف → منتج. يرجع null لأي صف تالف حتى لا يكسر صفحات المتجر */
export function rowToProduct(row: ProductRow): AdminProduct | null {
  if (!row || typeof row.id !== 'string' || typeof row.slug !== 'string' || typeof row.name !== 'string') return null;
  if (!(row.category in categories)) return null;
  if (!isInt(row.price) || row.price <= 0) return null;
  const stockQty = isInt(row.stock_qty) && row.stock_qty >= 0 ? row.stock_qty : null;
  const status: ProductStatus = row.status === 'published' ? 'published' : 'hidden';
  const p: AdminProduct = {
    id: row.id,
    slug: row.slug,
    name: row.name.trim(),
    shortDescription: (row.short_description ?? '').trim(),
    description: (row.description ?? '').trim(),
    category: row.category as CategoryId,
    colors: parseColors(row.colors),
    sizes: strings(row.sizes),
    price: row.price,
    inStock: stockQty === null || stockQty > 0,
    images: strings(row.images),
    addedAt: row.added_at ?? '',
    status,
    stockQty,
    sortOrder: isInt(row.sort_order) ? row.sort_order : 0,
  };
  if (row.material && row.material in materials) p.material = row.material as MaterialId;
  const offer = parseOffer(row.offer);
  if (offer) p.offer = offer;
  if (isInt(row.compare_at_price) && row.compare_at_price > row.price) p.compareAtPrice = row.compare_at_price;
  if (row.is_new) p.isNew = true;
  if (row.is_best_seller) p.isBestSeller = true;
  const care = strings(row.care);
  if (care.length) p.care = care;
  if (row.updated_at) p.updatedAt = row.updated_at;
  return p;
}

/** منتج → صف (للإضافة والتعديل). created_at/updated_at تضبطها قاعدة البيانات */
export function productToRow(p: AdminProduct): Omit<ProductRow, 'created_at' | 'updated_at'> {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    short_description: p.shortDescription,
    description: p.description,
    category: p.category,
    material: p.material ?? null,
    colors: p.colors.map((c) => ({
      name: c.name,
      hex: c.hex,
      family: c.family,
      ...(c.available === false ? { available: false } : {}),
      ...(c.images?.length ? { images: c.images } : {}),
    })),
    sizes: p.sizes,
    price: p.price,
    compare_at_price: p.compareAtPrice ?? null,
    offer: p.offer ? { quantity: p.offer.quantity, price: p.offer.price, freeDelivery: p.offer.freeDelivery } : null,
    is_new: !!p.isNew,
    is_best_seller: !!p.isBestSeller,
    stock_qty: p.stockQty,
    images: p.images,
    care: p.care ?? [],
    added_at: p.addedAt || null,
    status: p.status,
    sort_order: p.sortOrder,
  };
}

/** منتجات الملف الثابت كمنتجات منشورة (للبذرة الأولى وللمقارنة بالاختبارات) */
export function staticToAdmin(p: Product, sortOrder = 0): AdminProduct {
  return { ...p, status: 'published', stockQty: p.inStock ? null : 0, sortOrder };
}

/** يزيل حقول لوحة التحكم ويرجع Product نظيف للمتجر */
export function toStoreProduct(p: AdminProduct): Product {
  const { status: _s, stockQty: _q, sortOrder: _o, updatedAt: _u, ...rest } = p;
  return rest;
}

/* ---------------- التحقق من بيانات النموذج ---------------- */

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ProductErrors = Partial<Record<'name' | 'slug' | 'shortDescription' | 'description' | 'price' | 'compareAtPrice' | 'offer' | 'colors' | 'stockQty' | 'images' | 'category' | 'material' | 'addedAt', string>>;

export function validateProduct(p: AdminProduct): ProductErrors {
  const e: ProductErrors = {};
  if (!p.name.trim()) e.name = 'اكتبي اسم المنتج.';
  else if (p.name.trim().length > 120) e.name = 'الاسم طويل جداً (أقصى حد 120 حرف).';
  if (!SLUG_RE.test(p.slug)) e.slug = 'الرابط بالإنكليزي فقط: حروف صغيرة وأرقام وشرطة (-)، مثل silk-scarf-pink.';
  else if (p.slug.length > 80) e.slug = 'الرابط طويل جداً.';
  if (!p.shortDescription.trim()) e.shortDescription = 'اكتبي وصفاً قصيراً يظهر تحت الاسم.';
  if (!(p.category in categories)) e.category = 'اختاري نوع الحجاب.';
  if (p.material && !(p.material in materials)) e.material = 'الخامة غير معروفة.';
  if (!isInt(p.price) || p.price <= 0) e.price = 'السعر لازم يكون رقم صحيح أكبر من صفر (بالدينار).';
  else if (p.price > 10_000_000) e.price = 'السعر كبير بشكل غير منطقي، تأكدي منه.';
  if (p.compareAtPrice !== undefined && (!isInt(p.compareAtPrice) || p.compareAtPrice <= p.price))
    e.compareAtPrice = 'السعر قبل الخصم لازم يكون أعلى من السعر الحالي، أو اتركيه فارغاً.';
  if (p.offer) {
    if (!isInt(p.offer.quantity) || p.offer.quantity < 2 || p.offer.quantity > 20) e.offer = 'عدد قطع العرض من 2 إلى 20.';
    else if (!isInt(p.offer.price) || p.offer.price <= 0) e.offer = 'اكتبي سعر العرض بالدينار.';
  }
  if (!p.colors.length) e.colors = 'أضيفي لوناً واحداً على الأقل (يظهر للزبونة ويُستخدم بالتصفية).';
  else if (p.colors.some((c) => !c.name.trim())) e.colors = 'كل لون يحتاج اسم.';
  else if (new Set(p.colors.map((c) => c.name.trim())).size !== p.colors.length) e.colors = 'أسماء الألوان مكررة.';
  else if (p.colors.every((c) => c.available === false)) e.colors = 'لازم يكون لون واحد على الأقل متوفر، أو خلي الكمية صفر.';
  if (p.stockQty !== null && (!isInt(p.stockQty) || p.stockQty < 0)) e.stockQty = 'الكمية رقم صحيح من صفر فما فوق، أو اتركيها فارغة.';
  if (p.addedAt && !/^\d{4}-\d{2}-\d{2}$/.test(p.addedAt)) e.addedAt = 'تاريخ غير صحيح.';
  return e;
}

/** تنبيهات لا تمنع الحفظ لكن تستحق الانتباه */
export function productWarnings(p: AdminProduct): string[] {
  const w: string[] = [];
  if (p.offer && isInt(p.offer.price) && isInt(p.price) && p.offer.price >= p.offer.quantity * p.price)
    w.push(
      p.offer.freeDelivery
        ? 'سعر العرض مو أرخص من شراء القطع بشكل منفصل — الفائدة الوحيدة هي التوصيل المجاني. السلة تحسب تلقائياً الأرخص للزبونة.'
        : 'سعر العرض مو أرخص من شراء القطع بشكل منفصل، ولا يشمل توصيل مجاني — العرض ما راح يفيد الزبونة.',
    );
  if (!p.images.length) w.push('ما أكو صور — راح تظهر رسمة توضيحية بدل الصورة.');
  if (p.status === 'published' && p.stockQty === 0) w.push('الكمية صفر: المنتج يظهر للزبونة كـ «نفد المخزون» ولا يمكن طلبه.');
  return w;
}
