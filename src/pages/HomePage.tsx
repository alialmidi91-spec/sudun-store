import { ArrowLeft, Banknote, MapPin, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InstagramIcon, WhatsappIcon } from '../components/Brand';
import { offerShort, ProductGrid, ProductGridSkeleton } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { imageSizes, srcSetFor } from '../lib/images';
import { Accordion, ErrorState, SectionHeading } from '../components/ui';
import { siteConfig } from '../config/site';
import { faqs } from '../data/faqs';
import { products } from '../data/products';
import { categories, colorFamilies, materials } from '../data/taxonomy';
import { useAsync } from '../hooks/useAsync';
import { useSeo } from '../hooks/useSeo';
import { applyFilters, emptyFilters, fetchProducts } from '../lib/catalog';
import { formatIQD } from '../lib/format';
import { storeChatUrl } from '../lib/whatsapp';
import type { CategoryId, ColorFamily, MaterialId } from '../types';

/** أول منتج من كل نوع يُستخدم كصورة للتصنيف */
const categoryCover = (id: CategoryId) => products.find((p) => p.category === id && p.images.length);
const productBySlug = (slug: string) => products.find((p) => p.slug === slug);
/** صور الواجهة الرئيسية — غيّري الـ slug لتبديل الصورة */
const HERO_MAIN = productBySlug('silk-lebanese-floral');
const HERO_SMALL = productBySlug('georgette-ninja-shawl');

/** صور منشورات البراند على إنستغرام */
const instagramPosts = [
  { src: '/images/brand/brand-style.webp', alt: 'الحجاب مو بس ستر… هو أسلوب وأناقة' },
  { src: '/images/brand/brand-details.webp', alt: 'الأناقة مو بالملابس الكثيرة… الأناقة بالتفاصيل' },
  { src: '/images/brand/brand-about.webp', alt: 'سُدَن براند عراقي يقدم حجابات' },
];

function Ornament({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  return <img className="ornament" src={`/brand/star-${tone}.png`} alt="" aria-hidden="true" width={259} height={256} />;
}

export default function HomePage() {
  useSeo({});
  const { state, retry } = useAsync(fetchProducts);
  const latest = state.status === 'success' ? applyFilters(state.data, emptyFilters) : [];
  const offers = products.filter((p) => p.offer);
  const wa = storeChatUrl();

  return (
    <>
      {/* 1. Hero بهوية سُدَن */}
      <section className="hero">
        <img className="hero__pattern" src="/brand/star-light.png" alt="" aria-hidden="true" />
        <div className="container hero__grid">
          <div className="hero__visual">
            {HERO_MAIN && (
              <Link to={`/product/${HERO_MAIN.slug}`} className="hero__arch" aria-label={HERO_MAIN.name}>
                <ProductImage product={HERO_MAIN} priority sizes={imageSizes.heroMain} />
              </Link>
            )}
            {HERO_SMALL && (
              <Link to={`/product/${HERO_SMALL.slug}`} className="hero__arch hero__arch--small" aria-label={HERO_SMALL.name}>
                <ProductImage product={HERO_SMALL} sizes={imageSizes.heroSmall} />
              </Link>
            )}
          </div>
          <div className="hero__content">
            <p className="hero__eyebrow">
              <span lang="en">FOR YOU BY SUDUN</span>
            </p>
            <h1 className="hero__title">أناقتچ تبدأ من سُدَن</h1>
            <p className="hero__text">
              براند عراقي يقدم حجابات تجمع بين الأناقة، الجودة، والراحة بكل تفاصيلها.
            </p>
            <div className="hero__actions">
              <Link to="/shop" className="btn btn--light btn--lg">
                تسوّقي الآن
              </Link>
              <Link to="/shop?offers=1" className="btn btn--outline-light btn--lg">
                العروض
              </Link>
            </div>
          </div>
        </div>
        <ul className="container hero__facts" aria-label="التوصيل والدفع">
          <li>
            <Truck size={18} aria-hidden="true" />
            <span>
              <strong>توصيل خلال {siteConfig.deliveryTime}</strong>
              <small>لجميع محافظات العراق</small>
            </span>
          </li>
          <li>
            <MapPin size={18} aria-hidden="true" />
            <span>
              <strong>كربلاء {formatIQD(siteConfig.deliveryFees['كربلاء'] ?? 0)}</strong>
              <small>باقي المحافظات {formatIQD(siteConfig.defaultDeliveryFee ?? 0)}</small>
            </span>
          </li>
          <li>
            <Banknote size={18} aria-hidden="true" />
            <span>
              <strong>الدفع عند الاستلام</strong>
              <small>بدون دفع إلكتروني</small>
            </span>
          </li>
        </ul>
      </section>

      {/* 2. التصنيفات بشكل هايلايت إنستغرام */}
      <nav className="highlights" aria-label="تسوّقي حسب النوع">
        <ul className="container highlights__list">
          <li>
            <Link to="/shop?offers=1" className="highlight highlight--offers">
              <span className="highlight__ring">
                <span className="highlight__img highlight__img--mark">
                  <img src="/brand/star-light.png" alt="" aria-hidden="true" />
                </span>
              </span>
              <span className="highlight__label">العروض</span>
            </Link>
          </li>
          {(Object.keys(categories) as CategoryId[]).map((id) => {
            const cover = categoryCover(id);
            return (
              <li key={id}>
                <Link to={`/shop?category=${id}`} className="highlight">
                  <span className="highlight__ring">
                    <span className="highlight__img">{cover && <ProductImage product={cover} sizes={imageSizes.circle} />}</span>
                  </span>
                  <span className="highlight__label">{categories[id].label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 3. أحدث الموديلات */}
      <section className="section section--tight">
        <div className="container">
          <SectionHeading
            eyebrow="من حسابنا"
            title="أحدث الموديلات"
            action={
              <Link to="/shop" className="link-arrow">
                كل الحجابات <ArrowLeft size={16} aria-hidden="true" />
              </Link>
            }
          />
        </div>
        <div className="container container--bleed">
          {state.status === 'loading' && <ProductGridSkeleton count={4} />}
          {state.status === 'error' && <ErrorState onRetry={retry} />}
          {state.status === 'success' && <ProductGrid products={latest} variant="rail" priorityCount={2} />}
        </div>
      </section>

      {/* 4. العروض */}
      {offers.length > 0 && (
        <section className="section offers-band">
          <div className="container">
            <div className="section-heading section-heading--center">
              <div>
                <Ornament />
                <p className="eyebrow">كلما زادت القطع وفّرتي</p>
                <h2 className="section-title">عروض سُدَن</h2>
              </div>
            </div>
            <ul className="offer-list">
              {offers.map((p) => (
                <li key={p.id}>
                  <Link to={`/product/${p.slug}`} className="offer-card">
                    <span className="offer-card__media">
                      <ProductImage product={p} sizes={imageSizes.offer} />
                    </span>
                    <span className="offer-card__body">
                      <span className="offer-card__deal">{offerShort(p)}</span>
                      <span className="offer-card__name">{p.name}</span>
                      <span className="offer-card__unit">سعر القطعة {formatIQD(p.price)}</span>
                      {p.offer?.freeDelivery && <span className="offer-card__tag">+ توصيل مجاني</span>}
                      <span className="offer-card__cta">
                        اختاري العرض <ArrowLeft size={15} aria-hidden="true" />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="offers-band__note">العرض ينحسب تلقائياً بالسلة لما تكمل عدد القطع.</p>
          </div>
        </section>
      )}

      {/* 5. هوية سُدَن */}
      <section className="brand-story">
        <img className="brand-story__pattern" src="/brand/star-light.png" alt="" aria-hidden="true" />
        <div className="container brand-story__inner">
          <img className="brand-story__logo" src="/brand/logo-light.png" alt={`${siteConfig.nameAr} ${siteConfig.nameEn}`} width={751} height={600} loading="lazy" />
          <h2 className="brand-story__title">الحجاب مو بس ستر… هو أسلوب وأناقة</h2>
          <p className="brand-story__text">
            نؤمن أن الحجاب ليس فقط قطعة قماش، بل هو أسلوب وهوية تعبّر عنك بكل ثقة. كل لفة تعكس ذوقك وتبين شخصيتك.
          </p>
          <Link to="/about" className="btn btn--outline-light">
            تعرّفي على قصتنا
          </Link>
        </div>
      </section>

      {/* 6. الخامة واللون */}
      <section className="section">
        <div className="container">
          <SectionHeading eyebrow="الأناقة بالتفاصيل" title="اختاري حسب الخامة واللون" />
          <div className="refine">
            <div>
              <h3 className="subhead">الخامة</h3>
              <ul className="material-grid">
                {(Object.keys(materials) as MaterialId[]).map((id) => (
                  <li key={id}>
                    <Link to={`/shop?material=${id}`} className="material-tile">
                      <span>{materials[id].label}</span>
                      <ArrowLeft size={15} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="subhead">اللون</h3>
              <ul className="color-links">
                {(Object.keys(colorFamilies) as ColorFamily[]).map((id) => (
                  <li key={id}>
                    <Link to={`/shop?color=${id}`}>
                      <span className="swatch-dot swatch-dot--lg" style={{ background: colorFamilies[id].swatch }} aria-hidden="true" />
                      {colorFamilies[id].label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 7. طريقة الطلب */}
      <section className="section how band">
        <div className="container">
          <SectionHeading eyebrow="سهلة وسريعة" title="شلون تطلبين؟" center />
          <ol className="steps">
            <li className="step">
              <span className="step__num">١</span>
              <h3>اختاري حجابچ</h3>
              <p>أضيفي القطع للسلة، والعروض تنحسب تلقائياً.</p>
            </li>
            <li className="step">
              <span className="step__num">٢</span>
              <h3>أرسلي الطلب</h3>
              <p>رسالة واتساب جاهزة بكل التفاصيل، أو راسلينا على إنستغرام.</p>
            </li>
            <li className="step">
              <span className="step__num">٣</span>
              <h3>استلمي وادفعي</h3>
              <p>يوصلچ خلال {siteConfig.deliveryTime}، والدفع عند الاستلام.</p>
            </li>
          </ol>
          <div className="how__actions">
            <Link to="/shop" className="btn btn--dark">ابدئي التسوق</Link>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn--outline">
                <WhatsappIcon size={18} /> راسلينا
              </a>
            )}
          </div>
        </div>
      </section>

      {/* 8. إنستغرام */}
      <section className="section insta">
        <div className="container">
          <SectionHeading
            eyebrow="تابعي جديدنا"
            title={siteConfig.instagramHandle ? `\u2066${siteConfig.instagramHandle}\u2069` : 'إنستغرام'}
            action={
              siteConfig.instagramUrl ? (
                <a href={siteConfig.instagramUrl} target="_blank" rel="noopener noreferrer" className="link-arrow">
                  <InstagramIcon size={17} /> زوري الحساب
                </a>
              ) : undefined
            }
          />
          <ul className="insta__grid">
            {instagramPosts.map((post) => (
              <li key={post.src}>
                <img src={post.src} srcSet={srcSetFor(post.src)} sizes={imageSizes.insta} alt={post.alt} loading="lazy" decoding="async" width={1189} height={1420} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 9. الأسئلة الشائعة */}
      <section className="section">
        <div className="container container--narrow">
          <SectionHeading eyebrow="عندچ سؤال؟" title="الطلب والتوصيل والعروض" center />
          <Accordion items={faqs.filter((f) => f.group !== 'product').slice(0, 5)} />
          <p className="center-text">
            <Link to="/faq" className="link-arrow">
              كل الأسئلة <ArrowLeft size={16} aria-hidden="true" />
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
