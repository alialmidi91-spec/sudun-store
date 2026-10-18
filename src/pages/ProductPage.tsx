import { Banknote, ChevronLeft, MapPin, ShoppingBag, Truck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { WhatsappIcon } from '../components/Brand';
import { ProductGrid } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { DemoNotice, ErrorState, Price, ProductBadges, QuantityStepper, SectionHeading } from '../components/ui';
import { PageLoader } from '../components/Layout';
import { siteConfig } from '../config/site';
import { useCart } from '../context/CartContext';
import { products } from '../data/products';
import { categories, materialLabel } from '../data/taxonomy';
import { useAsync } from '../hooks/useAsync';
import { useSeo } from '../hooks/useSeo';
import { fetchProductBySlug } from '../lib/catalog';
import { clampQty } from '../lib/cart-math';
import { formatIQD, piecesLabel } from '../lib/format';
import NotFoundPage from './NotFoundPage';

export default function ProductPage() {
  const { slug = '' } = useParams();
  const { state, retry } = useAsync(() => fetchProductBySlug(slug), [slug]);
  const product = state.status === 'success' ? state.data : undefined;

  useSeo({
    title: product?.name ?? (state.status === 'loading' ? 'جارٍ التحميل' : 'المنتج غير موجود'),
    description: product ? `${product.shortDescription} — ${materialLabel(product.material) ?? categories[product.category].label}. اطلبي عبر واتساب والدفع عند الاستلام.` : undefined,
  });

  if (state.status === 'loading') return <PageLoader />;
  if (state.status === 'error') return <div className="container section"><ErrorState message={state.error.message} onRetry={retry} /></div>;
  if (!product) return <NotFoundPage message="هذا المنتج غير موجود أو تم حذفه." />;

  return <ProductDetail key={product.id} productId={product.id} />;
}

function ProductDetail({ productId }: { productId: string }) {
  const product = products.find((p) => p.id === productId)!;
  const { addItem } = useCart();
  const navigate = useNavigate();

  const firstAvailable = product.colors.find((c) => c.available !== false);
  const [color, setColor] = useState(firstAvailable?.name ?? '');
  const [size, setSize] = useState(product.sizes.length === 1 ? product.sizes[0] : '');
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [error, setError] = useState('');

  const selectedColor = product.colors.find((c) => c.name === color);
  const images = selectedColor?.images?.length ? selectedColor.images : product.images;
  const galleryCount = Math.max(1, images.length);

  useEffect(() => setActiveImage(0), [color]);

  // شريط الشراء الثابت بالموبايل: يظهر لما تختفي أزرار الشراء الأصلية من الشاشة
  const actionsRef = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);
  useEffect(() => {
    // نتابع موضع التمرير مباشرة (وليس فقط لحظة دخول/خروج الأزرار) حتى يظهر الشريط
    // حتى لو قفزت الصفحة فوق الأزرار مرة وحدة، مثل التمرير السريع أو استرجاع موضع الصفحة
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = actionsRef.current;
      if (el) setShowBar(el.getBoundingClientRect().bottom < 0);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  useEffect(() => {
    document.body.classList.add('has-buybar');
    return () => document.body.classList.remove('has-buybar');
  }, []);

  const related = useMemo(
    () =>
      products
        .filter((p) => p.id !== product.id && (p.category === product.category || p.material === product.material))
        .slice(0, 4),
    [product],
  );

  const validate = () => {
    if (!product.inStock) return 'هذا المنتج غير متوفر حالياً.';
    if (product.colors.length && !color) return 'اختاري اللون أولاً.';
    if (selectedColor?.available === false) return 'هذا اللون غير متوفر حالياً، اختاري لون ثاني.';
    if (product.sizes.length > 1 && !size) return 'اختاري القياس أولاً.';
    return '';
  };

  const add = (goToCart: boolean) => {
    const msg = validate();
    setError(msg);
    if (msg) return;
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      color: selectedColor?.name,
      colorHex: selectedColor?.hex,
      size: size || undefined,
      quantity: clampQty(qty),
    });
    if (goToCart) navigate('/cart');
  };

  return (
    <>
      <nav className="container breadcrumbs" aria-label="مسار التصفح">
        <Link to="/">الرئيسية</Link>
        <ChevronLeft size={14} aria-hidden="true" />
        <Link to={`/shop?category=${product.category}`}>{categories[product.category].label}</Link>
        <ChevronLeft size={14} aria-hidden="true" />
        <span aria-current="page">{product.name}</span>
      </nav>

      <section className="container pdp">
        <div className="pdp__gallery">
          <div className="pdp__main-image">
            <ProductImage product={product} colorName={color} index={activeImage} priority />
            <ProductBadges product={product} />
          </div>
          {galleryCount > 1 && (
            <div className="pdp__thumbs" role="tablist" aria-label="صور المنتج">
              {Array.from({ length: galleryCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === activeImage}
                  aria-label={`الصورة ${i + 1}`}
                  className={`pdp__thumb ${i === activeImage ? 'is-active' : ''}`}
                  onClick={() => setActiveImage(i)}
                >
                  <ProductImage product={product} colorName={color} index={i} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pdp__info">
          <p className="eyebrow">
            {categories[product.category].label}
            {product.material ? ` · ${materialLabel(product.material)}` : ''}
          </p>
          <h1 className="pdp__title">{product.name}</h1>
          <Price product={product} size="lg" />
          <p className="pdp__short">{product.shortDescription}</p>
          {product.offer && (
            <p className="offer-note">
              <strong>عرض:</strong> كل {piecesLabel(product.offer.quantity)} بـ {formatIQD(product.offer.price)}
              {product.offer.freeDelivery ? ' مع توصيل مجاني' : ''}. يُحسب تلقائياً في السلة.
            </p>
          )}

          {product.colors.length > 0 && (
            <fieldset className="option">
              <legend>
                اللون: <strong>{color || '—'}</strong>
              </legend>
              <div className="option__swatches">
                {product.colors.map((c) => {
                  const unavailable = c.available === false;
                  return (
                    <label key={c.name} className={`swatch-option ${unavailable ? 'is-unavailable' : ''}`} title={unavailable ? `${c.name} (غير متوفر)` : c.name}>
                      <input
                        type="radio"
                        name="color"
                        value={c.name}
                        checked={color === c.name}
                        disabled={unavailable}
                        onChange={() => { setColor(c.name); setError(''); }}
                      />
                      <span className="swatch-option__dot" style={{ background: c.hex }} aria-hidden="true" />
                      <span className="visually-hidden">{c.name}{unavailable ? ' — غير متوفر' : ''}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {product.sizes.length > 0 && (
            <fieldset className="option">
              <legend>
                القياس{product.sizes.length === 1 ? `: ${product.sizes[0]}` : ''}
              </legend>
              {product.sizes.length > 1 && (
                <div className="option__sizes">
                  {product.sizes.map((s) => (
                    <label key={s} className="size-option">
                      <input type="radio" name="size" value={s} checked={size === s} onChange={() => { setSize(s); setError(''); }} />
                      <span>{s}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          )}

          <div className="option">
            <span className="option__label" id="qty-label">الكمية</span>
            <QuantityStepper value={qty} onChange={(v) => setQty(clampQty(v))} disabled={!product.inStock} />
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="pdp__actions" ref={actionsRef}>
            {product.inStock ? (
              <>
                <button type="button" className="btn btn--dark btn--lg btn--grow" onClick={() => add(false)}>
                  <ShoppingBag size={18} aria-hidden="true" /> أضيفي إلى السلة
                </button>
                <button type="button" className="btn btn--outline btn--lg btn--grow" onClick={() => add(true)}>
                  <WhatsappIcon size={18} /> اطلبي الآن
                </button>
              </>
            ) : (
              <p className="soldout-note">نفد المخزون حالياً. تابعينا حتى تعرفين وقت رجوعه.</p>
            )}
          </div>

          <ul className="pdp__perks">
            <li>
              <Truck size={18} aria-hidden="true" />
              <span>توصيل لجميع المحافظات خلال {siteConfig.deliveryTime}</span>
            </li>
            <li>
              <MapPin size={18} aria-hidden="true" />
              <span>
                كربلاء {formatIQD(siteConfig.deliveryFees['كربلاء'] ?? 0)} · باقي المحافظات {formatIQD(siteConfig.defaultDeliveryFee ?? 0)}
              </span>
            </li>
            <li>
              <Banknote size={18} aria-hidden="true" />
              <span>الدفع عند الاستلام</span>
            </li>
          </ul>

          <div className="pdp__details">
            <h2>الوصف</h2>
            <p>{product.description}</p>
            <dl className="spec">
              {product.material && <div><dt>الخامة</dt><dd>{materialLabel(product.material)}</dd></div>}
              <div><dt>النوع</dt><dd>{categories[product.category].label}</dd></div>
              {product.sizes.length > 0 && <div><dt>القياس</dt><dd>{product.sizes.join(' · ')}</dd></div>}
              <div><dt>الألوان</dt><dd>{product.colors.map((c) => c.name).join('، ')}</dd></div>
            </dl>
            {product.care?.length ? (
              <>
                <h2>العناية</h2>
                <ul className="care-list">
                  {product.care.map((c) => <li key={c}>{c}</li>)}
                </ul>
              </>
            ) : null}
          </div>
          <DemoNotice compact />
        </div>
      </section>

      {product.inStock && (
        <div className={`buybar ${showBar ? 'is-visible' : ''}`} aria-hidden={!showBar}>
          <div className="buybar__info">
            <span className="buybar__name">{product.name}</span>
            <span className="buybar__price">{formatIQD(product.price)}</span>
          </div>
          <button type="button" className="btn btn--dark buybar__btn" onClick={() => add(false)} tabIndex={showBar ? 0 : -1}>
            <ShoppingBag size={17} aria-hidden="true" /> أضيفي للسلة
          </button>
          <button type="button" className="btn btn--whatsapp buybar__icon" onClick={() => add(true)} aria-label="اطلبي الآن" tabIndex={showBar ? 0 : -1}>
            <WhatsappIcon size={19} />
          </button>
        </div>
      )}

      {related.length > 0 && (
        <section className="section">
          <div className="container">
            <SectionHeading eyebrow="قد يعجبچ أيضاً" title="من نفس الذوق" />
            <ProductGrid products={related} />
          </div>
        </section>
      )}
    </>
  );
}
