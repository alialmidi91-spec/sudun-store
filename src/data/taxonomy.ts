import type { CategoryId, ColorFamily, MaterialId } from '../types';

/** أنواع الحجاب — مأخوذة من أسماء منتجات سُدَن */
export const categories: Record<CategoryId, { label: string; description: string }> = {
  rabta: { label: 'ربطات', description: 'ربطات حرير وشيفون' },
  shawl: { label: 'شالات', description: 'شالات بخامات مختلفة' },
  ninja: { label: 'شال متصل بكب نينجا', description: 'يُلبس بدون دبابيس' },
  shash: { label: 'شاش', description: 'شاش خفيف' },
};

/**
 * الخامات — كل خامة مستقلة في التصفية.
 * note: يُكتب فقط ما ذكره المتجر عن الخامة، ويُترك فارغاً إن لم يُذكر شيء.
 */
export const materials: Record<MaterialId, { label: string; note: string }> = {
  'silk-lebanese': { label: 'حرير لبناني', note: '' },
  chiffon: { label: 'شيفون', note: '' },
  georgette: { label: 'جرجيت', note: 'خامة باردة وخفيفة' },
  organza: { label: 'أورگنزا', note: '' },
  cotton: { label: 'قطن', note: '' },
  jafsa: { label: 'جفسة', note: '' },
};

/** اسم الخامة أو null إذا لم تُحدَّد */
export function materialLabel(id?: MaterialId): string | null {
  return id ? materials[id].label : null;
}

export const colorFamilies: Record<ColorFamily, { label: string; swatch: string }> = {
  printed: { label: 'مشجّر ومنقوش', swatch: 'linear-gradient(135deg,#E8B9C9,#C9C3E6 50%,#BFD8E8)' },
  neutral: { label: 'عاجي وبيج', swatch: '#E7DCCB' },
  black: { label: 'أسود', swatch: '#171717' },
  green: { label: 'زيتوني وأخضر', swatch: '#77735F' },
};

export const priceRanges = [
  { id: 'under-10', label: 'أقل من 10,000', min: 0, max: 9999 },
  { id: '10-12', label: '10,000 – 12,000', min: 10000, max: 12000 },
  { id: 'over-12', label: 'أكثر من 12,000', min: 12001, max: Number.MAX_SAFE_INTEGER },
] as const;

export type PriceRangeId = (typeof priceRanges)[number]['id'];

/** محافظات العراق */
export const governorates = [
  'كربلاء',
  'بغداد',
  'البصرة',
  'نينوى',
  'أربيل',
  'السليمانية',
  'دهوك',
  'حلبجة',
  'كركوك',
  'ديالى',
  'الأنبار',
  'بابل',
  'النجف',
  'واسط',
  'صلاح الدين',
  'القادسية',
  'ميسان',
  'ذي قار',
  'المثنى',
];
