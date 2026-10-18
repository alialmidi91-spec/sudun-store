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
 * - العرض يُطبَّق على قطع نفس المنتج (بأي لون)، والقطع الزائدة بسعرها العادي.
 * - التوصيل المجاني يُحسب مرة واحدة فقط للطلب كله، مهما تعددت العروض.
 * - يُختار تلقائياً الجمع الأرخص للزبونة بين العروض، فلا يُطبَّق عرض يرفع السعر
 *   (مثلاً عرض سعره أعلى من سعر القطع العادي وفائدته الوحيدة التوصيل المجاني،
 *   بينما التوصيل مجاني أصلاً من عرض آخر).
 * @param deliveryFee أجور التوصيل للمحافظة المختارة، أو null إذا لم تُختَر بعد
 * @param estimateFee أجور تقديرية تُستخدم فقط لاختيار أفضل عرض قبل اختيار المحافظة
 */
export function priceOrder(
  lines: CartLine[],
  getOffer: (productId: string) => ProductOffer | undefined,
  deliveryFee: number | null,
  estimateFee: number | null = null,
): OrderPricing {
  const subtotal = cartSubtotal(lines);
  const groups = new Map<string, { name: string; unit: number; qty: number }>();
  for (const l of lines) {
    const g = groups.get(l.productId) ?? { name: l.name, unit: toIQD(l.price), qty: 0 };
    g.qty += clampQty(l.quantity);
    groups.set(l.productId, g);
  }

  // المنتجات التي يمكن تطبيق عرض عليها، مع أقصى عدد مرات ممكن
  const candidates: { productId: string; name: string; unit: number; offer: ProductOffer; max: number }[] = [];
  groups.forEach((g, productId) => {
    const offer = getOffer(productId);
    if (!offer || offer.quantity < 2 || offer.price <= 0 || g.qty < offer.quantity) return;
    candidates.push({ productId, name: g.name, unit: g.unit, offer, max: Math.floor(g.qty / offer.quantity) });
  });

  const decisionFee = deliveryFee ?? estimateFee ?? 0;
  let best: { bundles: number[]; cost: number; applied: number } | null = null;
  const choice = candidates.map(() => 0);
  const evaluate = () => {
    let adjust = 0;
    let free = false;
    let applied = 0;
    candidates.forEach((c, i) => {
      const k = choice[i];
      if (!k) return;
      adjust += k * toIQD(c.offer.price) - k * c.offer.quantity * c.unit;
      free = free || c.offer.freeDelivery;
      applied += k;
    });
    const cost = subtotal + adjust + (free ? 0 : decisionFee);
    // الأرخص أولاً، وعند التساوي نفضّل تطبيق العرض حتى يظهر للزبونة
    if (!best || cost < best.cost || (cost === best.cost && applied > best.applied)) {
      best = { bundles: [...choice], cost, applied };
    }
  };
  const walk = (i: number) => {
    if (i === candidates.length) return evaluate();
    for (let k = 0; k <= candidates[i].max; k++) {
      choice[i] = k;
      walk(i + 1);
    }
  };
  walk(0);

  const chosen = (best as { bundles: number[] } | null)?.bundles ?? [];
  const applied: AppliedOffer[] = [];
  candidates.forEach((c, i) => {
    const bundles = chosen[i] ?? 0;
    if (!bundles) return;
    applied.push({
      productId: c.productId,
      name: c.name,
      bundles,
      quantity: c.offer.quantity,
      price: toIQD(c.offer.price),
      regular: bundles * c.offer.quantity * c.unit,
      offerTotal: bundles * toIQD(c.offer.price),
      freeDelivery: c.offer.freeDelivery,
    });
  });

  const freeDelivery = applied.some((a) => a.freeDelivery);
  const productsTotal = subtotal + applied.reduce((sum, a) => sum + a.offerTotal - a.regular, 0);
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
