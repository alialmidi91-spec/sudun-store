import { ArrowLeft, Banknote, MessageCircle, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductImage } from '../components/ProductImage';
import { ProductGrid, ProductGridSkeleton } from '../components/ProductCard';
import { Accordion, DemoNotice, ErrorState, SectionHeading } from '../components/ui';
import { siteConfig } from '../config/site';
import { faqs } from '../data/faqs';
import { products } from '../data/products';
import { categories, colorFamilies, materials } from '../data/taxonomy';
import { formatIQD } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import { useSeo } from '../hooks/useSeo';
import { applyFilters, emptyFilters, fetchProducts } from '../lib/catalog';
import type { CategoryId, MaterialId, Product } from '../types';

/** أول منتج من كل نوع يُستخدم كصورة للتصنيف */
const categoryCover = (id: CategoryId) => products.find((p) => p.category === id && p.images.length);
const productBySlug = (slug: string) => products.find((p) => p.slug === slug);
/** صور الواجهة الرئيسية — غيّري الـ slug لتبديل الصورة */
const HERO_MAIN = productBySlug('silk-lebanese-floral');
const HERO_SMALL = productBySlug('georgette-ninja-shawl');

function ProductRail({
  eyebrow,
  title,
  link,
  pick,
}: {
  eyebrow: string;
  title: string;
  link: string;
  pick: (all: Product[]) => Product[];
}) {
  const { state, retry } = useAsync(fetchProducts);
  if (state.status === 'success' && pick(state.data).length === 0) return null;
  return (
    <section className="section">
      <div className="container">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          action={
            <Link to={link} className="link-arrow">
              عرض الكل <ArrowLeft size={16} aria-hidden="true" />
            </Link>
          }
        />
        {state.status === 'loading' && <ProductGridSkeleton count={4} />}
        {state.status === 'error' && <ErrorState onRetry={retry} />}
        {state.status === 'success' && <ProductGrid products={pick(state.data).slice(0, 4)} />}
      </div>
    </section>
  );
}

export default function HomePage() {
  useSeo({});

  return (
    <>
      {/* 3. Hero */}
      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__content">
            <p className="eyebrow hero__eyebrow">{siteConfig.nameAr} · {siteConfig.nameEn}</p>
            <h1 className="hero__title">أناقتچ تبدأ من سُدَن</h1>
            <p className="hero__text">
              براند عراقي يقدم حجابات تجمع بين الأناقة، الجودة، والراحة بكل تفاصيلها. توصيل لجميع محافظات العراق خلال {siteConfig.deliveryTime}، والدفع عند الاستلام.
            </p>
            <div className="hero__actions">
              <Link to="/shop" className="btn btn--dark btn--lg">
                تسوّقي الآن
              </Link>
              <Link to="/shop?offers=1" className="btn btn--outline btn--lg">
                شوفي العروض
              </Link>
            </div>
          </div>
          <div className="hero__visual">
            {HERO_MAIN && (
              <Link to={`/product/${HERO_MAIN.slug}`} className="hero__arch" aria-label={HERO_MAIN.name}>
                <ProductImage product={HERO_MAIN} priority />
              </Link>
            )}
            {HERO_SMALL && (
              <Link to={`/product/${HERO_SMALL.slug}`} className="hero__arch hero__arch--small" aria-label={HERO_SMALL.name}>
                <ProductImage product={HERO_SMALL} />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* شريط الثقة */}
      <section className="trust" aria-label="طريقة الطلب">
        <div className="container trust__grid">
          <div className="trust__item">
            <MessageCircle size={22} aria-hidden="true" />
            <div>
              <p className="trust__title">اطلبي عبر واتساب أو إنستغرام</p>
              <p className="trust__text">رسالة جاهزة بكل تفاصيل طلبچ</p>
            </div>
          </div>
          <div className="trust__item">
            <Banknote size={22} aria-hidden="true" />
            <div>
              <p className="trust__title">الدفع عند الاستلام</p>
              <p className="trust__text">بدون دفع إلكتروني أو بطاقات</p>
            </div>
          </div>
          <div className="trust__item">
            <Truck size={22} aria-hidden="true" />
            <div>
              <p className="trust__title">توصيل خلال {siteConfig.deliveryTime}</p>
              <p className="trust__text">
                كربلاء {formatIQD(siteConfig.deliveryFees['كربلاء'] ?? 0)} · باقي المحافظات {formatIQD(siteConfig.defaultDeliveryFee ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container"><DemoNotice /></div>

      {/* 4. الموديلات الجديدة */}
      <ProductRail
        eyebrow="من حسابنا"
        title="أحدث الموديلات"
        link="/shop"
        pick={(all) => applyFilters(all, emptyFilters)}
      />

      {/* 5. الأكثر مبيعاً */}
      <div className="band">
        <ProductRail
          eyebrow="كلما زادت القطع وفّرتي"
          title="عروض سُدَن"
          link="/shop?offers=1"
          pick={(all) => all.filter((p) => p.offer)}
        />
      </div>

      {/* 6. التصنيفات */}
      <section className="section">
        <div className="container">
          <SectionHeading eyebrow="تسوّقي حسب" title="النوع، اللون والخامة" />

          <h3 className="subhead">نوع الحجاب</h3>
          <div className="category-grid">
            {(Object.keys(categories) as CategoryId[]).map((id) => {
              const cover = categoryCover(id);
              return (
              <Link key={id} to={`/shop?category=${id}`} className="category-tile">
                {cover && <ProductImage product={cover} />}
                <span className="category-tile__label">
                  <strong>{categories[id].label}</strong>
                  <small>{categories[id].description}</small>
                </span>
              </Link>
              );
            })}
          </div>

          <div className="split-filters">
            <div>
              <h3 className="subhead">حسب اللون</h3>
              <ul className="color-links">
                {Object.entries(colorFamilies).map(([id, c]) => (
                  <li key={id}>
                    <Link to={`/shop?color=${id}`}>
                      <span className="swatch-dot swatch-dot--lg" style={{ background: c.swatch }} aria-hidden="true" />
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="subhead">حسب الخامة</h3>
              <ul className="chip-links">
                {(Object.keys(materials) as MaterialId[]).map((id) => (
                  <li key={id}>
                    <Link to={`/shop?material=${id}`} className="chip">
                      {materials[id].label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 7. التفاصيل والخامات */}
      <section className="section quality">
        <div className="container quality__grid">
          <div className="quality__photo">
            <img src="/images/brand/brand-details.webp" alt="الأناقة مو بالملابس الكثيرة، الأناقة بالتفاصيل — سُدَن" loading="lazy" decoding="async" width={1189} height={1420} />
          </div>
          <div className="quality__text">
            <p className="eyebrow">الأناقة بالتفاصيل</p>
            <h2 className="section-title">وحجابچ هو أول تفصيلة تبرز حضورچ</h2>
            <p>كل خامة إلها إحساسها. اختاري الخامة اللي تناسبچ:</p>
            <ul className="quality__list">
              {(Object.keys(materials) as MaterialId[]).map((id) => (
                <li key={id}>
                  <Link to={`/shop?material=${id}`}><strong>{materials[id].label}</strong></Link>
                  <span>{materials[id].note}</span>
                </li>
              ))}
            </ul>
            <Link to="/shop" className="link-arrow">
              كل الحجابات <ArrowLeft size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* 8. هوية سُدَن */}
      <section className="brand-story">
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
