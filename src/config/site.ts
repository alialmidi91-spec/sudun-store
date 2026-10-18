/**
 * ملف إعدادات متجر سُدَن
 * ---------------------------------------------------------------
 * كل البيانات القابلة للتغيير موجودة هنا. عدّلي القيم ثم أعيدي بناء الموقع.
 */

/** نص يستخدم كقيمة مؤقتة إذا لم يُضبط رقم المتجر */
export const WHATSAPP_PLACEHOLDER = 'PLACEHOLDER_WHATSAPP_NUMBER';

export const siteConfig = {
  nameAr: 'سُدَن',
  nameEn: 'SUDUN',
  tagline: 'براند عراقي يصنع الأناقة بتفاصيل محسوبة',
  description:
    'سُدَن SUDUN براند عراقي يقدم حجابات تجمع بين الأناقة، الجودة، والراحة. اطلبي عبر واتساب أو إنستغرام، والدفع عند الاستلام، وتوصيل لجميع محافظات العراق.',

  /** رابط الموقع النهائي بعد ربط الدومين (بدون / في النهاية) — يُستخدم في Open Graph */
  siteUrl: 'https://example.com',

  /**
   * رقم واتساب المتجر للطلبات — صيغة دولية: أرقام فقط بدون + أو مسافات.
   * +964 777 779 5064  →  9647777795064
   */
  whatsappNumber: '9647777795064' as string,
  /** الرقم كما يُعرض للزبونة */
  whatsappDisplay: '+964 777 779 5064',

  /** حساب إنستغرام (مخصص للطلبات أيضاً) */
  instagramUrl: 'https://www.instagram.com/sudun_hijab' as string,
  instagramHandle: '@sudun_hijab' as string,

  /** بريد التواصل (اختياري) */
  email: '' as string,

  /** الشريط العلوي للإعلانات — غيّري النص أو عطّليه بـ enabled: false */
  announcement: {
    enabled: true,
    text: 'توصيل لجميع محافظات العراق خلال 24 ساعة · الدفع عند الاستلام',
    linkText: 'تسوّقي الآن',
    linkTo: '/shop',
  },

  currency: 'IQD' as const,
  currencyLabel: 'د.ع',

  /** مدة التوصيل كما يحددها المتجر */
  deliveryTime: '24 ساعة',

  /**
   * أجور التوصيل بالدينار: محافظات لها سعر خاص، والباقي يأخذ defaultDeliveryFee.
   * ضعي defaultDeliveryFee: null إذا أردتِ أن تُؤكَّد الأجور مع الزبونة.
   */
  deliveryFees: { 'كربلاء': 3000 } as Partial<Record<string, number | null>>,
  defaultDeliveryFee: 5000 as number | null,

  /** وضع البيانات التجريبية: يُظهر تنبيهاً بأن المنتجات تجريبية */
  demoMode: false,
};

export function isWhatsappConfigured(): boolean {
  return /^\d{8,15}$/.test(siteConfig.whatsappNumber);
}

export function getDeliveryFee(governorate: string): number | null {
  const specific = siteConfig.deliveryFees[governorate];
  const fee = typeof specific === 'number' ? specific : siteConfig.defaultDeliveryFee;
  return typeof fee === 'number' && Number.isFinite(fee) && fee >= 0 ? Math.round(fee) : null;
}
