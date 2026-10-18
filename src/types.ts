export type CategoryId = 'rabta' | 'shawl' | 'ninja' | 'shash';
export type MaterialId = 'silk-lebanese' | 'chiffon' | 'georgette' | 'organza' | 'cotton' | 'jafsa';
export type ColorFamily = 'printed' | 'neutral' | 'black' | 'green';

export interface ProductColor {
  /** اسم اللون كما يظهر للزبونة */
  name: string;
  /** لون العرض في الواجهة */
  hex: string;
  /** عائلة اللون للتصفية */
  family: ColorFamily;
  /** هل هذا اللون متوفر؟ (افتراضياً متوفر) */
  available?: boolean;
  /** صور خاصة بهذا اللون (اختياري) */
  images?: string[];
}

export interface ProductOffer {
  /** عدد القطع في العرض */
  quantity: number;
  /** سعر العرض الكامل بالدينار */
  price: number;
  /** هل يشمل العرض توصيلاً مجانياً للطلب */
  freeDelivery: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  category: CategoryId;
  /** الخامة — تُترك فارغة إذا لم يحددها المتجر */
  material?: MaterialId;
  colors: ProductColor[];
  /** القياسات المتوفرة — مصفوفة فارغة إذا كان القياس موحّداً وغير محدد */
  sizes: string[];
  /** السعر بالدينار العراقي (عدد صحيح) */
  price: number;
  /** عرض الكمية: مثلاً كل 3 قطع بـ 25,000 مع توصيل مجاني */
  offer?: ProductOffer;
  /** السعر قبل التخفيض — يُضاف فقط عند وجود تخفيض حقيقي */
  compareAtPrice?: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  inStock: boolean;
  /** مسارات الصور العامة مثل /images/products/x.webp — فارغة = صورة توضيحية */
  images: string[];
  /** تاريخ الإضافة لترتيب "الأحدث" */
  addedAt: string;
  care?: string[];
}

export interface CartLine {
  key: string;
  productId: string;
  slug: string;
  name: string;
  price: number;
  color?: string;
  colorHex?: string;
  size?: string;
  quantity: number;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  governorate: string;
  area: string;
  address: string;
  notes: string;
}
