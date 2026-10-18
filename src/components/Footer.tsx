import { Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { siteConfig } from '../config/site';
import { storeChatUrl } from '../lib/whatsapp';
import { InstagramIcon, Logo, WhatsappIcon } from './Brand';

export function Footer() {
  const wa = storeChatUrl();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <Logo size="lg" tone="light" />
          <p>{siteConfig.tagline}. الطلب عبر واتساب أو إنستغرام، والدفع عند الاستلام، وتوصيل لجميع محافظات العراق.</p>
        </div>

        <nav aria-label="التسوق">
          <h2 className="site-footer__title">تسوّقي</h2>
          <ul>
            <li><Link to="/shop">كل الحجابات</Link></li>
            <li><Link to="/shop?offers=1">العروض</Link></li>
            <li><Link to="/cart">سلة الطلبات</Link></li>
          </ul>
        </nav>

        <nav aria-label="المساعدة والسياسات">
          <h2 className="site-footer__title">المساعدة</h2>
          <ul>
            <li><Link to="/delivery">سياسة التوصيل</Link></li>
            <li><Link to="/returns">الاستبدال والإرجاع</Link></li>
            <li><Link to="/faq">الأسئلة الشائعة</Link></li>
            <li><Link to="/about">قصة سُدَن</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="site-footer__title">تواصلي ويانا</h2>
          <ul className="site-footer__contact">
            <li>
              {wa ? (
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  <WhatsappIcon size={18} /> <span dir="ltr">{siteConfig.whatsappDisplay}</span>
                </a>
              ) : (
                <span className="is-pending">
                  <WhatsappIcon size={18} /> واتساب (يُضاف الرقم قريباً)
                </span>
              )}
            </li>
            <li>
              {siteConfig.instagramUrl ? (
                <a href={siteConfig.instagramUrl} target="_blank" rel="noopener noreferrer">
                  <InstagramIcon size={18} /> <span dir="ltr">{siteConfig.instagramHandle || 'إنستغرام'}</span>
                </a>
              ) : (
                <span className="is-pending">
                  <InstagramIcon size={18} /> إنستغرام (يُضاف الرابط قريباً)
                </span>
              )}
            </li>
            {siteConfig.email && (
              <li>
                <a href={`mailto:${siteConfig.email}`}>
                  <Mail size={18} aria-hidden="true" /> {siteConfig.email}
                </a>
              </li>
            )}
          </ul>
          <Link to="/contact" className="btn btn--outline-light btn--sm">صفحة التواصل</Link>
        </div>
      </div>
      <div className="container site-footer__bottom">
        <p>© {year} {siteConfig.nameAr} | {siteConfig.nameEn}. جميع الحقوق محفوظة.</p>
        <p>الدفع عند الاستلام فقط</p>
      </div>
    </footer>
  );
}
