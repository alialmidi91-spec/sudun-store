import { Link } from 'react-router-dom';
import { siteConfig } from '../config/site';

/** عرض الشعار المعروض فعلياً (الارتفاع بـ global.css × نسبة الشعار 390:160) */
const LOGO_SIZES = { sm: '83px', md: '(min-width: 768px) 112px, 98px', lg: '156px' } as const;

/**
 * شعار سُدَن الأصلي (من ملفات المتجر في public/brand/)
 * tone="dark" للخلفيات الفاتحة، tone="light" للخلفيات الداكنة.
 */
export function Logo({ size = 'md', asLink = true, tone = 'dark' }: { size?: 'sm' | 'md' | 'lg'; asLink?: boolean; tone?: 'dark' | 'light' }) {
  const content = (
    <img
      className={`logo-img logo-img--${size}`}
      src={`/brand/wordmark-${tone}.png`}
      // نسخة بدقة مضاعفة من نفس الشعار للشاشات عالية الكثافة (الحجم الكبير بالتذييل)
      srcSet={`/brand/wordmark-${tone}.png 390w, /brand/wordmark-${tone}-2x.png 780w`}
      sizes={LOGO_SIZES[size]}
      alt={`${siteConfig.nameAr} ${siteConfig.nameEn}`}
      width={390}
      height={160}
    />
  );
  if (!asLink) return content;
  return (
    <Link to="/" className="logo-link" aria-label={`${siteConfig.nameAr} — الصفحة الرئيسية`}>
      {content}
    </Link>
  );
}

/* أيقونات العلامات التجارية (غير متوفرة في lucide) */
export function WhatsappIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.9 9.9 0 0 0 12.04 2Zm0 18.15h-.01a8.23 8.23 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.22-.08-.39-.12-.55.13-.16.24-.63.8-.78.97-.14.16-.29.18-.53.06a6.74 6.74 0 0 1-3.36-2.94c-.25-.44.25-.41.72-1.36.08-.16.04-.3-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3c-.22.25-.86.84-.86 2.05 0 1.2.88 2.37 1 2.54.12.16 1.73 2.64 4.2 3.7 1.55.67 2.16.73 2.94.61.47-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}

export function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
