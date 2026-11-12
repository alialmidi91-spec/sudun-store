import { Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { siteConfig } from '../config/site';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../hooks/useCatalog';
import { matchesQuery } from '../lib/catalog';
import { formatIQD } from '../lib/format';
import { InstagramIcon, Logo, WhatsappIcon } from './Brand';
import { storeChatUrl } from '../lib/whatsapp';

export const navLinks = [
  { to: '/', label: 'الرئيسية', end: true },
  { to: '/shop', label: 'كل الحجابات' },
  { to: '/shop?offers=1', label: 'العروض' },
  { to: '/about', label: 'قصة سُدَن' },
  { to: '/faq', label: 'الأسئلة الشائعة' },
  { to: '/contact', label: 'تواصلي ويانا' },
];

/** روابط فيها ?query تبقى Link عادي حتى لا تظهر "نشطة" مع رابط الصفحة نفسها */
function SmartLink({ to, end, label, onClick }: { to: string; end?: boolean; label: string; onClick?: () => void }) {
  return to.includes('?') ? (
    <Link to={to} onClick={onClick}>{label}</Link>
  ) : (
    <NavLink to={to} end={end} onClick={onClick}>{label}</NavLink>
  );
}

function AnnouncementBar() {
  const { announcement } = siteConfig;
  if (!announcement.enabled) return null;
  return (
    <div className="announcement">
      <p>
        {announcement.text}
        {announcement.linkText && (
          <>
            {' '}
            <Link to={announcement.linkTo}>{announcement.linkText}</Link>
          </>
        )}
      </p>
    </div>
  );
}

/** يحبس التركيز داخل نافذة منبثقة ويغلقها بزر Escape */
function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.classList.add('no-scroll');
    const el = ref.current;
    const focusables = () =>
      el ? Array.from(el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea')) : [];
    (el?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0])?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const list = focusables();
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
      prevFocus?.focus?.();
    };
  }, [open]);
  return ref;
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const ref = useDialog(true, onClose);
  const { products } = useCatalog();
  const results = useMemo(() => (q.trim() ? products.filter((p) => matchesQuery(p, q)).slice(0, 5) : []), [q, products]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onClose();
    navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop');
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="search-dialog" role="dialog" aria-modal="true" aria-label="البحث في المتجر" ref={ref}>
        <form onSubmit={submit} className="search-dialog__form" role="search">
          <Search size={20} aria-hidden="true" />
          <label htmlFor="site-search" className="visually-hidden">
            ابحثي عن حجاب
          </label>
          <input
            id="site-search"
            data-autofocus
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحثي بالاسم، الخامة أو اللون…"
            autoComplete="off"
            enterKeyHint="search"
          />
          <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق البحث">
            <X size={20} />
          </button>
        </form>
        {q.trim() && (
          <div className="search-dialog__results" aria-live="polite">
            {results.length ? (
              <ul className="search-dialog__list">
                {results.map((p) => (
                  <li key={p.id}>
                    <Link to={`/product/${p.slug}`} onClick={onClose}>
                      <span className="swatch-dot" style={{ background: p.colors[0]?.hex }} aria-hidden="true" />
                      <span className="search-dialog__name">{p.name}</span>
                      <span className="search-dialog__price">{formatIQD(p.price)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="search-dialog__empty">ما لگينا نتائج لـ «{q}». جربي كلمة ثانية مثل: شيفون، أسود، مربع.</p>
            )}
            {results.length > 0 && (
              <button type="submit" className="btn btn--link" onClick={submit}>
                عرض كل النتائج
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  const ref = useDialog(true, onClose);
  const wa = storeChatUrl();
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <nav className="drawer" aria-label="القائمة الرئيسية" ref={ref} role="dialog" aria-modal="true">
        <div className="drawer__head">
          <Logo size="sm" />
          <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق القائمة" data-autofocus>
            <X size={22} />
          </button>
        </div>
        <ul className="drawer__links">
          {navLinks.map((l) => (
            <li key={l.to}>
              <SmartLink to={l.to} end={l.end} label={l.label} onClick={onClose} />
            </li>
          ))}
          <li>
            <NavLink to="/cart" onClick={onClose}>
              سلة الطلبات
            </NavLink>
          </li>
        </ul>
        <div className="drawer__foot">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn--outline btn--block">
              <WhatsappIcon size={18} /> راسلينا على واتساب
            </a>
          )}
          {siteConfig.instagramUrl && (
            <a href={siteConfig.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--block">
              <InstagramIcon size={18} /> إنستغرام
            </a>
          )}
        </div>
      </nav>
    </div>
  );
}

export function Header() {
  const { count } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname, search } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // إغلاق القوائم عند تغيّر الصفحة
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname, search]);

  return (
    <>
      <AnnouncementBar />
      <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="container site-header__inner">
          <div className="site-header__start">
            <button type="button" className="icon-btn hide-desktop" onClick={() => setMenuOpen(true)} aria-label="فتح القائمة">
              <Menu size={22} />
            </button>
            <nav className="site-nav hide-mobile" aria-label="الأقسام">
              {navLinks.slice(1, 4).map((l) => (
                <SmartLink key={l.to} to={l.to} end={l.end} label={l.label} />
              ))}
            </nav>
          </div>

          <Logo />

          <div className="site-header__end">
            <nav className="site-nav hide-mobile" aria-label="روابط مساعدة">
              <NavLink to="/contact">تواصلي ويانا</NavLink>
            </nav>
            <button type="button" className="icon-btn" onClick={() => setSearchOpen(true)} aria-label="البحث">
              <Search size={21} />
            </button>
            <Link to="/cart" className="icon-btn cart-btn" aria-label={`سلة الطلبات، ${count} قطعة`}>
              <ShoppingBag size={21} />
              {count > 0 && (
                <span className="cart-btn__count" aria-hidden="true">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>
      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
    </>
  );
}
