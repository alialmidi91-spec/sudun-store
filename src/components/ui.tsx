import { AlertCircle, ChevronDown, Minus, Plus, RefreshCw } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
import { siteConfig } from '../config/site';
import { hasRealDiscount } from '../lib/catalog';
import { MAX_QTY_PER_LINE } from '../lib/cart-math';
import { formatIQD } from '../lib/format';
import type { Product } from '../types';

export function Price({ product, size = 'md' }: { product: Product; size?: 'md' | 'lg' }) {
  const discount = hasRealDiscount(product);
  return (
    <p className={`price price--${size}`}>
      <span className="price__now">{formatIQD(product.price)}</span>
      {discount && (
        <>
          <span className="visually-hidden">بدلاً من</span>
          <s className="price__was">{formatIQD(product.compareAtPrice!)}</s>
        </>
      )}
    </p>
  );
}

export function ProductBadges({ product }: { product: Product }) {
  const items: { label: string; tone: string }[] = [];
  if (!product.inStock) items.push({ label: 'نفد المخزون', tone: 'muted' });
  else {
    if (product.isNew) items.push({ label: 'جديد', tone: 'light' });
    if (product.isBestSeller) items.push({ label: 'الأكثر مبيعاً', tone: 'dark' });
    if (hasRealDiscount(product)) items.push({ label: 'تخفيض', tone: 'accent' });
    if (product.offer) items.push({ label: 'عرض', tone: 'accent' });
  }
  if (!items.length) return null;
  return (
    <div className="badges">
      {items.map((b) => (
        <span key={b.label} className={`badge badge--${b.tone}`}>
          {b.label}
        </span>
      ))}
    </div>
  );
}

export function QuantityStepper({
  value,
  onChange,
  label = 'الكمية',
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <div className="qty" role="group" aria-label={label}>
      <button
        type="button"
        className="qty__btn"
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= MAX_QTY_PER_LINE}
        aria-label="زيادة الكمية"
      >
        <Plus size={16} />
      </button>
      <output className="qty__value" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className="qty__btn"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= 1}
        aria-label="إنقاص الكمية"
      >
        <Minus size={16} />
      </button>
    </div>
  );
}

export function Accordion({ items }: { items: { q: string; a: ReactNode }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <div className="accordion">
      {items.map((item, i) => {
        const isOpen = open === i;
        const id = `${base}-${i}`;
        return (
          <div key={item.q} className={`accordion__item ${isOpen ? 'is-open' : ''}`}>
            <h3 className="accordion__heading">
              <button
                type="button"
                className="accordion__trigger"
                aria-expanded={isOpen}
                aria-controls={id}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <span>{item.q}</span>
                <ChevronDown size={18} aria-hidden="true" />
              </button>
            </h3>
            <div id={id} className="accordion__panel" role="region" hidden={!isOpen}>
              <p>{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
  center,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  center?: boolean;
}) {
  return (
    <div className={`section-heading ${center ? 'section-heading--center' : ''}`}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="section-title">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: string }) {
  return (
    <header className="page-header">
      <div className="container">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {intro && <p className="page-intro">{intro}</p>}
      </div>
    </header>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="state state--error" role="alert">
      <AlertCircle size={28} aria-hidden="true" />
      <p className="state__title">صار خطأ أثناء تحميل المنتجات</p>
      <p className="state__text">{message ?? 'تأكدي من اتصال الإنترنت وحاولي مرة ثانية.'}</p>
      {onRetry && (
        <button type="button" className="btn btn--outline" onClick={onRetry}>
          <RefreshCw size={16} aria-hidden="true" /> إعادة المحاولة
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="state">
      {icon}
      <p className="state__title">{title}</p>
      {text && <p className="state__text">{text}</p>}
      {action}
    </div>
  );
}

/** تنبيه بأن البيانات تجريبية — يختفي عند demoMode: false */
export function DemoNotice({ compact }: { compact?: boolean }) {
  if (!siteConfig.demoMode) return null;
  return (
    <p className={`demo-notice ${compact ? 'demo-notice--compact' : ''}`} role="note">
      المنتجات والأسعار المعروضة حالياً بيانات تجريبية لحين إضافة منتجات سُدَن الفعلية.
    </p>
  );
}

/** ملاحظة داخل نصوص السياسات تشير إلى معلومة يجب على المتجر تحديدها */
export function ToConfirm({ children = 'يُحدَّد من المتجر' }: { children?: ReactNode }) {
  return <mark className="to-confirm">{children}</mark>;
}
