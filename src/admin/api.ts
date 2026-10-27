import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../config/supabase';
import { invalidateCatalog } from '../lib/catalog';
import { productToRow, rowToProduct, type AdminProduct, type ProductRow, type ProductStatus } from '../lib/product-mapping';
import { objectPathFromUrl, removeImages, restDelete, restInsert, restSelect, restUpdate, uploadImage } from '../lib/supabase-rest';

/** عمليات لوحة التحكم على جدول المنتجات وصورها */

const parse = (row: ProductRow): AdminProduct => {
  const p = rowToProduct(row);
  if (!p) throw new Error(`بيانات المنتج «${row?.name ?? row?.id}» غير صالحة في قاعدة البيانات.`);
  return p;
};

export async function listAllProducts(token: string): Promise<AdminProduct[]> {
  const rows = await restSelect<ProductRow>('products', 'select=*&order=sort_order.asc,added_at.desc.nullslast,created_at.desc', token);
  return rows.flatMap((r) => {
    const p = rowToProduct(r);
    return p ? [p] : [];
  });
}

export async function getProduct(id: string, token: string): Promise<AdminProduct | null> {
  const rows = await restSelect<ProductRow>('products', `select=*&id=eq.${encodeURIComponent(id)}`, token);
  return rows[0] ? parse(rows[0]) : null;
}

export async function createProduct(p: AdminProduct, token: string): Promise<AdminProduct> {
  const saved = parse(await restInsert<ProductRow>('products', productToRow(p), token));
  invalidateCatalog();
  return saved;
}

export async function updateProduct(p: AdminProduct, token: string): Promise<AdminProduct> {
  const { id: _id, ...patch } = productToRow(p);
  const saved = parse(await restUpdate<ProductRow>('products', p.id, patch, token));
  invalidateCatalog();
  return saved;
}

export async function setProductStatus(id: string, status: ProductStatus, token: string): Promise<AdminProduct> {
  const saved = parse(await restUpdate<ProductRow>('products', id, { status }, token));
  invalidateCatalog();
  return saved;
}

/** يحذف المنتج ثم صوره المرفوعة على Supabase (الصور المحلية /images/... تبقى بالموقع) */
export async function deleteProduct(p: AdminProduct, token: string): Promise<{ imagesLeft: number }> {
  await restDelete('products', p.id, token);
  invalidateCatalog();
  const paths = [...p.images, ...p.colors.flatMap((c) => c.images ?? [])].map(objectPathFromUrl).filter((x): x is string => !!x);
  try {
    await removeImages(paths, token);
    return { imagesLeft: 0 };
  } catch {
    return { imagesLeft: paths.length };
  }
}

export function checkImageFile(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) return `«${file.name}»: الصيغة غير مدعومة. استخدمي JPG أو PNG أو WebP.`;
  if (file.size > MAX_IMAGE_BYTES) return `«${file.name}»: الحجم ${(file.size / 1024 / 1024).toFixed(1)}MB أكبر من الحد (5MB).`;
  return null;
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** يرفع الصورة كما هي بدون إعادة ضغط (حتى تبقى ألوان ونقوش الحجاب بنفس الجودة) */
export async function uploadProductImage(productId: string, file: File, token: string): Promise<string> {
  const err = checkImageFile(file);
  if (err) throw new Error(err);
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `products/${productId}/${Date.now()}-${rand}.${EXT[file.type]}`;
  return uploadImage(path, file, token);
}

/** حذف صورة مرفوعة لم تعد مستخدمة (مثلاً أزيلت قبل الحفظ) — بدون إيقاف العمل لو فشل */
export async function discardUploadedImages(urls: string[], token: string): Promise<void> {
  const paths = urls.map(objectPathFromUrl).filter((x): x is string => !!x);
  if (!paths.length) return;
  try {
    await removeImages(paths, token);
  } catch {
    /* تبقى بالتخزين ولا تظهر بالمتجر */
  }
}
