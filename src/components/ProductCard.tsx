import { ArrowLeft, Check, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { categories, materialLabel } from '../data/taxonomy';
import { formatIQD, piecesLabel } from '../lib/format';
import type { Product } from '../types';
import { ProductImage } from './ProductImage';
import { imageSizes } from '../lib/images';
import { Price, ProductBadges } from './ui';

/** نص العرض المختصر: "3 قطع بـ 25,000" */
export function offerShort(p: Product): string | null {
  if (!p.offer) return null;
  return `${piecesLabel(p.offer.quantity)} بـ ${formatIQD(p.offer.price)}`;
}

export function ProductCard({ product, priority = false, sizes }: { product: Product; priority?: boolean; sizes?: string }) {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);
  const availableColors = product.colors.filter((c) => c.available !== false);
  const url = `/product/${product.slug}`;
  const offer = offerShort(product);

  // إذا كان للمنتج أكثر من لون أو قياس، نوجّه الزبونة لصفحة المنتج لتختار
  const needsChoice = availableColors.length > 1 || product.sizes.length > 1;

  const handleAdd = () => {
    if (needsChoice) {
      navigate(url, { state: { fromQuickAdd: true } });
      return;
    }
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      color: availableColors[0]?.name,
      colorHex: availableColors[0]?.hex,
      size: product.sizes[0],
      quantity: 1,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <article className={`card ${product.inStock ? '' : 'card--soldout'}`}>
      <Link to={url} className="card__media" tabIndex={-1} aria-hidden="true">
        <ProductImage product={product} priority={priority} sizes={sizes} />
        <ProductBadges product={product} />
        {offer && (
          <span className="card__ribbon">
            {offer}
            {product.offer?.freeDelivery && <small>توصيل مجاني</small>}
          </span>
        )}
      </Link>
      <div className="card__body">
        <p className="card__meta">{materialLabel(product.material) ?? categories[product.category].label}</p>
        <h3 className="card__title">
          <Link to={url}>{product.name}</Link>
        </h3>
        <div className="card__row">
          <Price product={product} />
          <Link to={url} className="card__details" aria-label={`تفاصيل ${product.name}`}>
            التفاصيل <ArrowLeft size={13} aria-hidden="true" />
          </Link>
        </div>
        {product.colors.length > 1 && (
          <ul className="card__swatches" aria-label="الألوان المتوفرة">
            {product.colors.slice(0, 5).map((c) => (
              <li
                key={c.name}
                className={`swatch-dot ${c.available === false ? 'is-unavailable' : ''}`}
                style={{ background: c.hex }}
                title={c.name}
              >
                <span className="visually-hidden">{c.name}</span>
              </li>
            ))}
            {product.colors.length > 5 && <li className="card__more">+{product.colors.length - 5}</li>}
          </ul>
        )}
        <button
          type="button"
          className={`btn btn--sm card__add ${added ? 'is-added' : ''}`}
          onClick={handleAdd}
          disabled={!product.inStock}
          aria-label={product.inStock ? `أضيفي ${product.name} إلى السلة` : `${product.name} غير متوفر حالياً`}
        >
          {!product.inStock ? (
            'غير متوفر'
          ) : added ? (
            <>
              <Check size={16} aria-hidden="true" /> تمت الإضافة
            </>
          ) : (
            <>
              <ShoppingBag size={16} aria-hidden="true" /> {needsChoice ? 'اختاري اللون' : 'أضيفي للسلة'}
            </>
          )}
        </button>
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  priorityCount = 0,
  variant = 'grid',
}: {
  products: Product[];
  priorityCount?: number;
  /** rail: شريط أفقي قابل للسحب في الموبايل، وشبكة في الحاسوب */
  variant?: 'grid' | 'rail';
}) {
  return (
    <div className={variant === 'rail' ? 'grid grid--rail' : 'grid'}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} sizes={variant === 'rail' ? imageSizes.rail : imageSizes.card} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid" aria-busy="true" aria-label="جارٍ تحميل المنتجات">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card card--skeleton" aria-hidden="true">
          <div className="card__media skeleton" />
          <div className="card__body">
            <div className="skeleton skeleton--line" style={{ width: '40%' }} />
            <div className="skeleton skeleton--line" style={{ width: '75%' }} />
            <div className="skeleton skeleton--line" style={{ width: '50%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
