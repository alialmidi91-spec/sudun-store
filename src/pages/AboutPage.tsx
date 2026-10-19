import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui';
import { siteConfig } from '../config/site';
import { useSeo } from '../hooks/useSeo';
import { imageSizes, srcSetFor } from '../lib/images';

/** صفحة "من نحن" — النصوص مأخوذة من حساب سُدَن على إنستغرام */
export default function AboutPage() {
  useSeo({ title: 'قصة سُدَن', description: siteConfig.description });

  return (
    <>
      <PageHeader eyebrow="من نحن" title="قصة سُدَن" intro={siteConfig.tagline} />
      <section className="container about">
        <div className="about__photo">
          <img src="/images/brand/brand-about.webp" srcSet={srcSetFor('/images/brand/brand-about.webp')} sizes={imageSizes.about} alt="سُدَن SUDUN — براند عراقي للحجابات" width={1189} height={1420} loading="lazy" decoding="async" />
        </div>
        <div className="prose">
          <h2>مو مجرد حجاب</h2>
          <p>
            {siteConfig.nameAr} براند عراقي يقدم حجابات تجمع بين الأناقة، الجودة، والراحة بكل تفاصيلها. نؤمن أن الحجاب ليس فقط قطعة قماش، بل هو أسلوب وهوية تعبّر عنك بكل ثقة.
          </p>
          <blockquote className="quote">
            الحجاب مو بس ستر… هو أسلوب وأناقة.
            <br />
            كل لفة تعكس ذوقك وتبين شخصيتك.
          </blockquote>
          <blockquote className="quote">
            الأناقة مو بالملابس الكثيرة… الأناقة بالتفاصيل.
            <br />
            وحجابك هو أول تفصيلة تبرز حضورك.
          </blockquote>
          <h2 lang="en" dir="ltr" className="about__latin">FOR YOU BY SUDUN</h2>
          <ul>
            <li>نوفر لكِ أجمل وأرقى الحجابات.</li>
            <li>توصيل لجميع أنحاء العراق خلال {siteConfig.deliveryTime}.</li>
            <li>الطلب عبر واتساب أو إنستغرام، والدفع عند الاستلام.</li>
          </ul>
          <div className="prose__actions">
            <Link to="/shop" className="btn btn--dark">تسوّقي المجموعة</Link>
            <Link to="/contact" className="btn btn--outline">تواصلي ويانا</Link>
          </div>
        </div>
      </section>
    </>
  );
}
