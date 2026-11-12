import { describe, expect, it } from 'vitest';
import { products } from '../data/products';
import { isSecretKey } from '../config/supabase';
import { formToProduct, productToForm } from '../admin/ProductEditorPage';
import { priceOrder } from './cart-math';
import { productToRow, productWarnings, rowToProduct, staticToAdmin, toStoreProduct, validateProduct, type ProductRow } from './product-mapping';

/** مقارنة بدون اعتبار لترتيب المفاتيح */
const canon = (v: unknown): string =>
  JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));

const roundtrip = (i: number) => {
  const row = JSON.parse(JSON.stringify(productToRow(staticToAdmin(products[i], i * 10)))) as ProductRow;
  return rowToProduct({ ...row, created_at: 'x', updated_at: 'y' })!;
};

describe('database mapping', () => {
  it('keeps every real product identical after a database round trip', () => {
    products.forEach((p, i) => {
      const back = roundtrip(i);
      expect(back.status).toBe('published');
      const { updatedAt: _u, ...withoutMeta } = back;
      expect(canon(toStoreProduct({ ...withoutMeta, updatedAt: undefined }))).toBe(canon(p));
    });
  });

  it('keeps every real product identical after the admin form round trip', () => {
    products.forEach((p, i) => {
      const admin = staticToAdmin(p, i * 10);
      expect(canon(toStoreProduct(formToProduct(productToForm(admin))))).toBe(
        canon(toStoreProduct({ ...admin, description: admin.description || admin.shortDescription })),
      );
    });
  });

  it('gives the same order totals with database products', () => {
    const lines = [
      { key: 'a', productId: 'sd-002', slug: 'x', name: 'x', price: 8000, quantity: 3 },
      { key: 'b', productId: 'sd-001', slug: 'x', name: 'x', price: 12000, quantity: 2 },
    ];
    const fromDb = products.map((_, i) => toStoreProduct(roundtrip(i)));
    const a = priceOrder(lines, (id) => products.find((p) => p.id === id)?.offer, 5000, 5000);
    const b = priceOrder(lines, (id) => fromDb.find((p) => p.id === id)?.offer, 5000, 5000);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it('derives stock and hides broken rows instead of crashing the store', () => {
    const row = productToRow(staticToAdmin(products[0])) as ProductRow;
    expect(rowToProduct({ ...row, stock_qty: 0 })!.inStock).toBe(false);
    expect(rowToProduct({ ...row, stock_qty: 4 })!.inStock).toBe(true);
    expect(rowToProduct({ ...row, stock_qty: null })!.inStock).toBe(true);
    expect(rowToProduct({ ...row, status: 'hidden' })!.status).toBe('hidden');
    expect(rowToProduct({ ...row, category: 'hats' })).toBe(null);
    expect(rowToProduct({ ...row, price: 0 })).toBe(null);
    expect(rowToProduct({ ...row, compare_at_price: 5 })!.compareAtPrice).toBe(undefined);
    expect(rowToProduct({ ...row, offer: { quantity: 1, price: 5 } })!.offer).toBe(undefined);
    expect(rowToProduct({ ...row, colors: [{ name: '', hex: 'x' }, { name: 'أسود', hex: 'bad', family: 'zzz' }] })!.colors).toEqual([
      { name: 'أسود', hex: '#E7DCCB', family: 'neutral' },
    ]);
  });
});

describe('admin validation', () => {
  it('accepts all real products as they are', () => {
    products.forEach((p) => expect(JSON.stringify(validateProduct(staticToAdmin(p)))).toBe('{}'));
  });

  it('reports clear errors', () => {
    const base = staticToAdmin(products[0]);
    const e = validateProduct({ ...base, name: ' ', slug: 'Bad Slug', price: 0, colors: [], stockQty: -1 });
    expect(Object.keys(e).sort().join()).toBe('colors,name,price,slug,stockQty');
    expect(validateProduct({ ...base, compareAtPrice: base.price }).compareAtPrice).toBeTruthy();
    expect(validateProduct({ ...base, offer: { quantity: 1, price: 100, freeDelivery: false } }).offer).toBeTruthy();
    expect(validateProduct({ ...base, colors: [{ ...base.colors[0], available: false }] }).colors).toBeTruthy();
  });

  it('warns when an offer does not save money (the chiffon case)', () => {
    const chiffon = staticToAdmin(products.find((p) => p.id === 'sd-002')!);
    expect(productWarnings(chiffon).join()).toContain('التوصيل المجاني');
    expect(productWarnings(staticToAdmin(products.find((p) => p.id === 'sd-003')!)).length).toBe(0);
  });

  it('reads Arabic digits typed in the admin form', () => {
    const f = productToForm(staticToAdmin(products[0]));
    expect(formToProduct({ ...f, price: '١٢٬٥٠٠' }).price).toBe(12500);
    expect(formToProduct({ ...f, price: '12,500' }).price).toBe(12500);
    expect(Number.isNaN(formToProduct({ ...f, price: '12.5' }).price)).toBe(true);
    expect(formToProduct({ ...f, stockQty: '' }).stockQty).toBe(null);
    expect(formToProduct({ ...f, sizes: '150 سم، 180 سم,200' }).sizes).toEqual(['150 سم', '180 سم', '200']);
  });
});

describe('secret key guard', () => {
  const jwt = (role: string) => `x.${btoa(JSON.stringify({ role, iss: 'supabase' }))}.y`;
  it('refuses service_role and sb_secret keys in the frontend', () => {
    expect(isSecretKey(jwt('service_role'))).toBe(true);
    expect(isSecretKey('sb_secret_abc123')).toBe(true);
    expect(isSecretKey(jwt('anon'))).toBe(false);
    expect(isSecretKey('sb_publishable_abc123')).toBe(false);
  });
});
