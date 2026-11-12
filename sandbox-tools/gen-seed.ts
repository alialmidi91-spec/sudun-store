// يولّد supabase/seed_products.sql من المنتجات الحقيقية في src/data/products.ts (نفس البيانات بالضبط)
import { writeFileSync } from 'node:fs';
import { products } from '../src/data/products';
import { productToRow, staticToAdmin } from '../src/lib/product-mapping';

const q = (v: unknown): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${String(v).replace(/'/g, "''")}'`;
};
const j = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;
const cols = ['id', 'slug', 'name', 'short_description', 'description', 'category', 'material', 'colors', 'sizes', 'price', 'compare_at_price', 'offer', 'is_new', 'is_best_seller', 'stock_qty', 'images', 'care', 'added_at', 'status', 'sort_order'] as const;
const json = new Set(['colors', 'sizes', 'offer', 'images', 'care']);

const values = products.map((p, i) => {
  const row = productToRow(staticToAdmin(p, i * 10)) as Record<string, unknown>;
  return '  (' + cols.map((c) => (json.has(c) && row[c] !== null ? j(row[c]) : c === 'added_at' && row[c] ? `${q(row[c])}::date` : q(row[c]))).join(', ') + ')';
});

const sql = `-- =====================================================================
-- سُدَن — المنتجات الحالية (${products.length} منتجات حقيقية من src/data/products.ts)
-- مولَّد تلقائياً: node sandbox-tools/build.mjs (gen-seed) — لا تعدّليه يدوياً.
-- يُشغَّل مرة وحدة بعد 001_products_admin.sql. آمن لإعادة التشغيل:
-- on conflict do nothing = ما يكتب فوق أي تعديل سويتيه من لوحة التحكم.
-- =====================================================================
insert into public.products (${cols.join(', ')})
values
${values.join(',\n')}
on conflict (id) do nothing;
`;
writeFileSync(new URL('../supabase/seed_products.sql', import.meta.url), sql);
// نفس الصفوف كـ JSON لخادم Supabase التجريبي بالاختبارات
(globalThis as Record<string, unknown>).__seedRows = products.map((p, i) => productToRow(staticToAdmin(p, i * 10)));
console.log(`seed: ${products.length} products`);
