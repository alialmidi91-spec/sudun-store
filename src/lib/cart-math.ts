import type { CartLine, ProductOffer } from '../types';
import { toIQD } from './format';

export const MAX_QTY_PER_LINE = 20;

export function clampQty(qty: number): number {
  if (!Number.isFinite(qty)) return 1;
  return Math.min(MAX_QTY_PER_LINE, Math.max(1, Math.floor(qty)));
}

export function lineTotal(line: CartLine): number {
  return toIQD(line.price) * clampQty(line.quantity);
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + lineTotal(l), 0);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + clampQty(l.quantity), 0);
}

/** مفتاح فريد لكل سطر: نفس المنتج بلون أو قياس مختلف = سطر مستقل */
export function lineKey(productId: string, color?: string, size?: string): string {
  return [productId, color ?? '-', size ?? '-'].join('|');
}

export interface AppliedOffer {
  productId: string;
  name: string;
  /** عدد مرات تطبيق العرض */
  bundles: number;
  /** عدد القطع في العرض الواحد */
  quantity: number;
  /** سعر العرض الواحد */
  price: number;
  /** سعر نفس القطع بدون العرض */
  regular: number;
  /** سعر القطع ضمن العرض */
  offerTotal: number;
  freeDelivery: boolean;
}

export interface OrderPricing {
  /** مجموع المنتجات بالسعر العادي */
  subtotal: number;
  applied: AppliedOffer[];
  /** مجموع المنتجات بعد تطبيق العروض */
  productsTotal: number;
  freeDelivery: boolean;
  /** أجور التوصيل النهائية (0 إذا كان مجانياً، null إذا لم تُحدَّد المحافظة) */
  deliveryFee: number | null;
  deliveryKnown: boolean;
  total: number;
}

/**
 * يحسب الطلب مع عروض الكمية:
 * - العرض يُطبَّق على نفس المنتج (بأي لون) كلما اكتمل عدد القطع.
 * - القطع الزائدة تُحسب بسعرها العادي.
 * - إذا اكتمل عرض يشمل التوصيل المجاني، يصبح توصيل الطلب كله مجانياً.
 */
export function priceOrder(
  lines: CartLine[],
  getOffer: (productId: string) => ProductOffer | undefined,
  deliveryFee: number | null,
): OrderPricing {
  const subtotal = cartSubtotal(lines);
  const groups = new Map<string, { name: string; unit: number; qty: number }>();
  for (const l of lines) {
    const g = groups.get(l.productId) ?? { name: l.name, unit: toIQD(l.price), qty: 0 };
    g.qty += clampQty(l.quantity);
    groups.set(l.productId, g);
  }

  const applied: AppliedOffer[] = [];
  let adjust = 0;
  groups.forEach((g, productId) => {
    const offer = getOffer(productId);
    if (!offer || offer.quantity < 2 || g.qty < offer.quantity) return;
    const bundles = Math.floor(g.qty / offer.quantity);
    const regular = bundles * offer.quantity * g.unit;
    const offerTotal = bundles * toIQD(offer.price);
    adjust += offerTotal - regular;
    applied.push({ productId, name: g.name, bundles, quantity: offer.quantity, price: toIQD(offer.price), regular, offerTotal, freeDelivery: offer.freeDelivery });
  });

  const freeDelivery = applied.some((a) => a.freeDelivery);
  const productsTotal = subtotal + adjust;
  const fee = freeDelivery ? 0 : deliveryFee;
  return {
    subtotal,
    applied,
    productsTotal,
    freeDelivery,
    deliveryFee: fee,
    deliveryKnown: fee !== null,
    total: productsTotal + (fee ?? 0),
  };
}
