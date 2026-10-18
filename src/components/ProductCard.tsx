import { ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { categories, materialLabel } from '../data/taxonomy';
import { formatIQD } from '../lib/format';
import type { Product } from '../types';
import { ProductImage } from './ProductImage';
import { Price, ProductBadges } from './ui';

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const availableColors = product.colors.filter((c) => c.available !== false);
  const url = `/product/${product.slug}`;

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
  };

  return (
    <article className={`card ${product.inStock ? '' : 'card--soldout'}`}>
      <Link to={url} className="card__media" tabIndex={-1} aria-hidden="true">
        <ProductImage product={product} priority={priority} />
        <ProductBadges product={product} />
      </Link>
      <div className="card__body">
        <p className="card__meta">{materialLabel(product.material) ?? categories[product.category].label}</p>
        <h3 className="card__title">
          <Link to={url}>{product.name}</Link>
        </h3>
        <Price product={product} />
        {product.offer && (
          <p className="card__offer">
            {product.offer.quantity} قطع بـ {formatIQD(product.offer.price)}{product.offer.freeDelivery ? ' + توصيل مجاني' : ''}
          </p>
        )}
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
        <div className="card__actions">
          <Link to={url} className="btn btn--ghost btn--sm">
            التفاصيل
          </Link>
          <button
            type="button"
            className="btn btn--dark btn--sm"
            onClick={handleAdd}
            disabled={!product.inStock}
            aria-label={product.inStock ? `أضيفي ${product.name} إلى السلة` : `${product.name} غير متوفر حالياً`}
          >
            {product.inStock ? (
              <>
                <ShoppingBag size={16} aria-hidden="true" />
                <span className="card__add-text">{needsChoice ? 'اختاري وأضيفي' : 'أضيفي للسلة'}</span>
              </>
            ) : (
              'غير متوفر'
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: Product[]; priorityCount?: number }) {
  return (
    <div className="grid">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
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
