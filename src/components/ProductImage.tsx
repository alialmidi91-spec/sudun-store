import { useState } from 'react';
import { imageSizes, srcSetFor } from '../lib/images';
import type { Product } from '../types';
import { FabricArt } from './FabricArt';

interface Props {
  product: Product;
  /** اسم اللون المختار (لعرض صورته أو لونه) */
  colorName?: string;
  index?: number;
  priority?: boolean;
  className?: string;
  /** عرض الصورة الفعلي بالتصميم (لـ sizes) حتى يختار المتصفح النسخة المناسبة؛ الافتراضي بطاقة المنتج */
  sizes?: string;
}

/**
 * يعرض صورة المنتج الحقيقية إن وُجدت (مع تحميل كسول)،
 * وإلا يعرض رسماً توضيحياً بلون المنتج مع إشارة "صورة توضيحية".
 */
export function ProductImage({ product, colorName, index = 0, priority = false, className = '', sizes = imageSizes.card }: Props) {
  const color = product.colors.find((c) => c.name === colorName) ?? product.colors[0];
  const sources = color?.images?.length ? color.images : product.images;
  const src = sources[index] ?? sources[0];
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        className={`product-image ${className}`}
        src={src}
        srcSet={srcSetFor(src)}
        sizes={srcSetFor(src) ? sizes : undefined}
        alt={`${product.name}${color ? ` — ${color.name}` : ''}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        width={800}
        height={1000}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className={`product-image product-image--art ${className}`}>
      <FabricArt
        color={color?.hex ?? '#E7DCCB'}
        seed={product.id + index}
        sheen={product.material === 'satin'}
        title={`${product.name}${color ? ` — ${color.name}` : ''} (صورة توضيحية)`}
      />
      <span className="product-image__tag">صورة توضيحية</span>
    </div>
  );
}
