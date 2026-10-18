import { describe, expect, it } from 'vitest';
import { products } from '../data/products';
import type { CartLine, CustomerInfo } from '../types';
import { applyFilters, emptyFilters } from './catalog';
import { cartCount, cartSubtotal, clampQty, lineKey, priceOrder } from './cart-math';
import { formatIQD, normalizeArabic, normalizeDigits } from './format';
import { normalizeIraqiPhone } from './phone';
import { buildOrderMessage, buildWhatsappUrl } from './whatsapp';

const offerOf = (id: string) => products.find((p) => p.id === id)?.offer;

const lines: CartLine[] = [
  { key: lineKey('sd-003', 'عاجي'), productId: 'sd-003', slug: 'georgette-ninja-shawl', name: 'شال جرجيت متصل بكب نينجا', price: 10000, color: 'عاجي', quantity: 2 },
  { key: lineKey('sd-007', 'زيتوني'), productId: 'sd-007', slug: 'jafsa-shash', name: 'شاش جفسة', price: 8000, color: 'زيتوني', quantity: 3 },
];

const customer: CustomerInfo = {
  name: 'زينب علي',
  phone: '07701234567',
  governorate: 'بغداد',
  area: 'الكرادة',
  address: 'شارع 62، قرب الصيدلية & المطعم #3',
  notes: '',
};

describe('formatting', () => {
  it('formats IQD with thousands separators', () => {
    expect(formatIQD(15000)).toBe('15,000 د.ع');
    expect(formatIQD(1234567.6)).toBe('1,234,568 د.ع');
    expect(formatIQD(-5)).toBe('0 د.ع');
    expect(formatIQD(Number.NaN)).toBe('0 د.ع');
  });
  it('normalizes Arabic-Indic digits and letters', () => {
    expect(normalizeDigits('٠٧٧٠١٢٣٤٥٦٧')).toBe('07701234567');
    expect(normalizeArabic('أحمر  ساتان')).toBe(normalizeArabic('احمر ساتان'));
  });
});

describe('phone validation', () => {
  it('accepts common Iraqi formats', () => {
    expect(normalizeIraqiPhone('07701234567')).toBe('07701234567');
    expect(normalizeIraqiPhone('+964 770 123 4567')).toBe('07701234567');
    expect(normalizeIraqiPhone('009647701234567')).toBe('07701234567');
    expect(normalizeIraqiPhone('٠٧٨١٢٣٤٥٦٧٨')).toBe('07812345678');
  });
  it('rejects invalid numbers', () => {
    expect(normalizeIraqiPhone('0770123')).toBe(null);
    expect(normalizeIraqiPhone('06701234567')).toBe(null);
    expect(normalizeIraqiPhone('abc')).toBe(null);
  });
});

describe('cart math', () => {
  it('computes subtotal and count in integer dinars', () => {
    expect(cartSubtotal(lines)).toBe(44000);
    expect(cartCount(lines)).toBe(5);
  });
  it('clamps quantities', () => {
    expect(clampQty(0)).toBe(1);
    expect(clampQty(99)).toBe(20);
    expect(clampQty(2.7)).toBe(2);
  });
  it('adds delivery fee when no offer applies', () => {
    const p = priceOrder(lines, offerOf, 5000);
    expect(p.applied.length).toBe(0);
    expect(p.total).toBe(49000);
    expect(priceOrder(lines, offerOf, null).deliveryKnown).toBe(false);
  });
  it('applies chiffon offer: 3 for 25,000 with free delivery', () => {
    const chiffon: CartLine[] = [{ key: 'c', productId: 'sd-002', slug: 'x', name: 'ربطة شيفون', price: 8000, quantity: 3 }];
    const p = priceOrder(chiffon, offerOf, 5000);
    expect(p.applied[0].offerTotal).toBe(25000);
    expect(p.freeDelivery).toBe(true);
    expect(p.total).toBe(25000);
  });
  it('applies offer per product across colors and charges the remainder normally', () => {
    const ninja: CartLine[] = [
      { key: 'a', productId: 'sd-004', slug: 'x', name: 'شال متصل بكب نينجا', price: 9000, color: 'بيج', quantity: 2 },
      { key: 'b', productId: 'sd-004', slug: 'x', name: 'شال متصل بكب نينجا', price: 9000, color: 'أسود', quantity: 2 },
    ];
    const p = priceOrder(ninja, offerOf, 3000);
    expect(p.applied[0].bundles).toBe(1);
    expect(p.productsTotal).toBe(34000);
    expect(p.total).toBe(34000);
  });
  it('does not apply offer below the quantity', () => {
    const silk: CartLine[] = [{ key: 's', productId: 'sd-001', slug: 'x', name: 'ربطة حرير', price: 12000, quantity: 1 }];
    const p = priceOrder(silk, offerOf, 3000);
    expect(p.applied.length).toBe(0);
    expect(p.total).toBe(15000);
  });
});

describe('whatsapp message', () => {
  const msg = buildOrderMessage(lines, customer, priceOrder(lines, offerOf, 5000));

  it('includes every required field', () => {
    for (const part of [
      'الاسم: زينب علي',
      'رقم الهاتف: 07701234567',
      'المحافظة: بغداد',
      'المنطقة: الكرادة',
      'العنوان بالتفصيل: شارع 62',
      '1) شال جرجيت متصل بكب نينجا',
      'اللون: عاجي',
      'الكمية: 2 × 10,000 د.ع = 20,000 د.ع',
      '2) شاش جفسة',
      'الكمية: 3 × 8,000 د.ع = 24,000 د.ع',
      'مجموع المنتجات: 44,000 د.ع',
      'أجور التوصيل: 5,000 د.ع',
      'المبلغ الإجمالي النهائي: 49,000 د.ع',
      'طريقة الدفع: الدفع عند الاستلام',
    ]) {
      expect(msg).toContain(part);
    }
  });

  it('lists applied offers and free delivery', () => {
    const chiffon: CartLine[] = [{ key: 'c', productId: 'sd-002', slug: 'x', name: 'ربطة شيفون', price: 8000, quantity: 3 }];
    const m = buildOrderMessage(chiffon, customer, priceOrder(chiffon, offerOf, 5000));
    expect(m).toContain('• ربطة شيفون: 3 قطع بـ 25,000 د.ع مع توصيل مجاني');
    expect(m).toContain('أجور التوصيل: مجاني (ضمن العرض)');
    expect(m).toContain('المبلغ الإجمالي النهائي: 25,000 د.ع');
  });

  it('encodes the wa.me URL so it round-trips exactly', () => {
    const url = buildWhatsappUrl(msg, '9647777795064');
    expect(url.startsWith('https://wa.me/9647777795064?text=')).toBe(true);
    expect(url).not.toContain(' ');
    const decoded = decodeURIComponent(url.split('?text=')[1]);
    expect(decoded).toBe(msg);
  });
});

describe('catalog filters', () => {
  it('filters by material and sorts by price', () => {
    const r = applyFilters(products, { ...emptyFilters, materials: ['chiffon', 'cotton'], sort: 'price-asc' });
    expect(r.map((p) => p.price)).toEqual([8000, 13000]);
  });
  it('searches Arabic names loosely', () => {
    expect(applyFilters(products, { ...emptyFilters, q: 'نينجا' }).length).toBe(2);
    expect(applyFilters(products, { ...emptyFilters, q: 'غير موجود اطلاقا' }).length).toBe(0);
  });
  it('sorts newest by post date', () => {
    expect(applyFilters(products, emptyFilters)[0].slug).toBe('ninja-shawl');
  });
});
