import { isWhatsappConfigured, siteConfig } from '../config/site';
import type { CartLine, CustomerInfo } from '../types';
import { clampQty, lineTotal, type OrderPricing } from './cart-math';
import { formatIQD, piecesLabel } from './format';

/** يبني نص رسالة الطلب (نص عادي، بدون ترميز) */
export function buildOrderMessage(lines: CartLine[], customer: CustomerInfo, pricing: OrderPricing): string {
  const items = lines.map((line, i) => {
    const details: string[] = [];
    if (line.color) details.push(`اللون: ${line.color}`);
    if (line.size) details.push(`القياس: ${line.size}`);
    const qty = clampQty(line.quantity);
    return [
      `${i + 1}) ${line.name}`,
      details.length ? `   ${details.join(' | ')}` : null,
      `   الكمية: ${qty} × ${formatIQD(line.price)} = ${formatIQD(lineTotal(line))}`,
    ]
      .filter(Boolean)
      .join('\n');
  });

  const offers = pricing.applied.map(
    (a) =>
      `• ${a.name}: ${a.bundles > 1 ? `${a.bundles} × ` : ''}${piecesLabel(a.quantity)} بـ ${formatIQD(a.price)} = ${formatIQD(a.offerTotal)}`,
  );

  const deliveryLine = pricing.freeDelivery
    ? 'أجور التوصيل: مجاني (ضمن العرض)'
    : pricing.deliveryKnown
      ? `أجور التوصيل: ${formatIQD(pricing.deliveryFee ?? 0)}`
      : 'أجور التوصيل: تُؤكَّد مع المتجر';

  const totalLine = pricing.deliveryKnown
    ? `المبلغ الإجمالي النهائي: ${formatIQD(pricing.total)}`
    : `المبلغ الإجمالي: ${formatIQD(pricing.total)} + أجور التوصيل (تُؤكَّد مع المتجر)`;

  const parts = [
    `مرحباً ${siteConfig.nameAr}، أريد تأكيد طلب جديد:`,
    '',
    '— معلومات الزبونة —',
    `الاسم: ${customer.name.trim()}`,
    `رقم الهاتف: ${customer.phone.trim()}`,
    `المحافظة: ${customer.governorate}`,
    `المنطقة: ${customer.area.trim()}`,
    `العنوان بالتفصيل: ${customer.address.trim()}`,
    '',
    '— المنتجات —',
    ...items,
    '',
    '— الحساب —',
    `عدد القطع: ${lines.reduce((n, l) => n + clampQty(l.quantity), 0)}`,
    `مجموع المنتجات: ${formatIQD(pricing.subtotal)}`,
    ...(offers.length ? ['العروض المطبّقة:', ...offers, `المجموع بعد تطبيق العروض: ${formatIQD(pricing.productsTotal)}`] : []),
    deliveryLine,
    totalLine,
    'طريقة الدفع: الدفع عند الاستلام',
  ];

  if (customer.notes.trim()) {
    parts.push('', `ملاحظات: ${customer.notes.trim()}`);
  }

  return parts.join('\n');
}

/** يبني رابط wa.me مع ترميز صحيح للرسالة */
export function buildWhatsappUrl(message: string, phone: string = siteConfig.whatsappNumber): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/** رابط محادثة عامة مع المتجر، أو null إذا لم يُضبط الرقم */
export function storeChatUrl(message = `مرحباً ${siteConfig.nameAr}`): string | null {
  return isWhatsappConfigured() ? buildWhatsappUrl(message) : null;
}
