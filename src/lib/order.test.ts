import { describe, expect, it } from 'vitest';
import { products } from '../data/products';
import type { CartLine, CustomerInfo } from '../types';
import { applyFilters, emptyFilters } from './catalog';
import { cartCount, cartSubtotal, clampQty, lineKey, priceOrder } from './cart-math';
import { formatIQD, normalizeArabic, normalizeDigits, piecesLabel } from './format';
import { normalizeIraqiPhone } from './phone';
import { getDeliveryFee, siteConfig } from '../config/site';
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
  it('uses natural Arabic piece counts', () => {
    expect(piecesLabel(1)).toBe('قطعة وحدة');
    expect(piecesLabel(2)).toBe('قطعتين');
    expect(piecesLabel(3)).toBe('3 قطع');
    expect(piecesLabel(11)).toBe('11 قطعة');
  });
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

const L = (productId: string, qty: number, color = 'x'): CartLine => {
  const p = products.find((x) => x.id === productId)!;
  return { key: lineKey(productId, color), productId, slug: p.slug, name: p.name, price: p.price, color, quantity: qty };
};
// sd-001 حرير 12,000 (قطعتين 24,000 + توصيل مجاني) · sd-002 شيفون 8,000 (3 بـ 25,000 + توصيل مجاني)
// sd-004 نينجا 9,000 (3 بـ 25,000 + توصيل مجاني) · sd-003 جرجيت 10,000 (بدون عرض)
const KARBALA = 3000;
const OTHER = 5000;

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
  it('empty cart totals zero', () => {
    const p = priceOrder([], offerOf, null);
    expect(p.subtotal).toBe(0);
    expect(p.total).toBe(0);
    expect(p.applied.length).toBe(0);
  });
  it('adds delivery fee when no offer applies', () => {
    expect(priceOrder(lines, offerOf, OTHER).total).toBe(49000);
    expect(priceOrder([L('sd-004', 1)], offerOf, KARBALA).total).toBe(12000);
    expect(priceOrder(lines, offerOf, null).deliveryKnown).toBe(false);
  });
  it('ninja offer: 3 for 25,000 with free delivery, remainder at normal price', () => {
    expect(priceOrder([L('sd-004', 3)], offerOf, OTHER).total).toBe(25000);
    const four = priceOrder([L('sd-004', 2, 'a'), L('sd-004', 2, 'b')], offerOf, OTHER);
    expect(four.applied[0].bundles).toBe(1);
    expect(four.total).toBe(34000);
    const six = priceOrder([L('sd-004', 6)], offerOf, KARBALA);
    expect(six.applied[0].bundles).toBe(2);
    expect(six.total).toBe(50000);
  });
  it('chiffon offer applies alone because free delivery makes it cheaper', () => {
    const k = priceOrder([L('sd-002', 3)], offerOf, KARBALA);
    expect(k.applied.length).toBe(1);
    expect(k.total).toBe(25000);
    expect(priceOrder([L('sd-002', 3)], offerOf, OTHER).total).toBe(25000);
  });
  it('never charges more for an offer when delivery is already free', () => {
    const p = priceOrder([L('sd-001', 2), L('sd-002', 3)], offerOf, OTHER);
    expect(p.freeDelivery).toBe(true);
    expect(p.applied.map((a) => a.productId)).toEqual(['sd-001']);
    expect(p.total).toBe(48000);
    const six = priceOrder([L('sd-002', 6)], offerOf, OTHER);
    expect(six.applied[0].bundles).toBe(1);
    expect(six.total).toBe(49000);
  });
  it('counts free delivery once with two offers', () => {
    const p = priceOrder([L('sd-001', 2), L('sd-004', 3), L('sd-003', 1)], offerOf, OTHER);
    expect(p.applied.length).toBe(2);
    expect(p.deliveryFee).toBe(0);
    expect(p.total).toBe(24000 + 25000 + 10000);
  });
  it('picks offers before the governorate is chosen using the estimate', () => {
    const p = priceOrder([L('sd-002', 3)], offerOf, null, OTHER);
    expect(p.freeDelivery).toBe(true);
    expect(p.deliveryKnown).toBe(true);
    expect(p.total).toBe(25000);
    expect(priceOrder([L('sd-004', 1)], offerOf, null, OTHER).deliveryKnown).toBe(false);
  });
  it('does not apply offer below the quantity', () => {
    const p = priceOrder([L('sd-001', 1)], offerOf, KARBALA);
    expect(p.applied.length).toBe(0);
    expect(p.total).toBe(15000);
  });
});

describe('store settings', () => {
  it('keeps the business WhatsApp number', () => {
    expect(siteConfig.whatsappNumber).toBe('9647777795064');
    expect(siteConfig.whatsappDisplay.replace(/[^\d]/g, '')).toBe(siteConfig.whatsappNumber);
    expect(normalizeIraqiPhone(siteConfig.whatsappDisplay)).toBe('07777795064');
  });
  it('uses the confirmed delivery fees', () => {
    expect(getDeliveryFee('كربلاء')).toBe(3000);
    expect(getDeliveryFee('بغداد')).toBe(5000);
    expect(getDeliveryFee('البصرة')).toBe(5000);
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
      'عدد القطع: 5',
      'مجموع المنتجات: 44,000 د.ع',
      'أجور التوصيل: 5,000 د.ع',
      'المبلغ الإجمالي النهائي: 49,000 د.ع',
      'طريقة الدفع: الدفع عند الاستلام',
    ]) {
      expect(msg).toContain(part);
    }
  });

  it('lists applied offers and shows free delivery once', () => {
    const cart = [L('sd-001', 2), L('sd-004', 3)];
    const m = buildOrderMessage(cart, customer, priceOrder(cart, offerOf, 5000));
    expect(m).toContain('• ربطة حرير لبناني مشجر: قطعتين بـ 24,000 د.ع = 24,000 د.ع');
    expect(m).toContain('• شال متصل بكب نينجا: 3 قطع بـ 25,000 د.ع = 25,000 د.ع');
    expect(m).toContain('المجموع بعد تطبيق العروض: 49,000 د.ع');
    expect(m).toContain('أجور التوصيل: مجاني (ضمن العرض)');
    expect(m).toContain('المبلغ الإجمالي النهائي: 49,000 د.ع');
    expect(m.split('توصيل مجاني').length - 1).toBe(0);
  });

  it('encodes the wa.me URL so it round-trips exactly', () => {
    const url = buildWhatsappUrl(msg);
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
