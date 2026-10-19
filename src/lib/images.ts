import { imageVariants } from '../data/image-variants';

/**
 * srcset لصورة محلية: النسخ الأصغر من نفس الصورة (اسم-400.webp …) + الأصلية بعرضها الحقيقي.
 * إذا الصورة ما إلها نسخ (مثلاً صورة جديدة قبل تشغيل scripts/make-image-variants.py) يرجع undefined
 * ويتحمّل الأصل فقط — فما تنكسر أي صورة.
 */
export function srcSetFor(src: string | undefined): string | undefined {
  if (!src) return undefined;
  const info = imageVariants[src];
  if (!info?.variants.length) return undefined;
  const base = src.replace(/\.[a-z0-9]+$/i, '');
  return [...info.variants.map((w) => `${base}-${w}.webp ${w}w`), `${src} ${info.width}w`].join(', ');
}

/** قيم sizes الجاهزة حسب مكان الصورة بالتصميم (تطابق نقاط التوقف في global.css) */
export const imageSizes = {
  /** بطاقة المنتج: عمودين بالموبايل، 3 بالتابلت، 3-4 بالحاسوب (الحاوية أقصاها 1240px) */
  card: '(min-width: 1280px) 300px, (min-width: 900px) 30vw, (min-width: 600px) 32vw, 48vw',
  /** بطاقات «أحدث القطع» تتمرر أفقياً تحت 900px بعرض min(62%, 300px) */
  rail: '(min-width: 1280px) 300px, (min-width: 900px) 30vw, min(62vw, 300px)',
  /** الصورة الرئيسية بصفحة المنتج */
  pdp: '(orientation: landscape) and (max-height: 500px) 45vw, (min-width: 1280px) 640px, (min-width: 768px) 50vw, 100vw',
  thumb: '72px',
  /** قوس الـ Hero الكبير والصغير */
  heroMain: '(min-width: 900px) 440px, min(62vw, 270px)',
  heroSmall: '(min-width: 900px) 180px, min(28vw, 124px)',
  /** دوائر الأقسام وصور العروض الصغيرة */
  circle: '100px',
  offer: '140px',
  cartLine: '110px',
  /** شبكة صور البراند (3 أعمدة) وصورة صفحة «من نحن» */
  insta: '(min-width: 1280px) 400px, 32vw',
  about: '(min-width: 900px) 520px, 100vw',
} as const;
