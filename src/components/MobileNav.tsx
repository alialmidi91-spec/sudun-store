import { Home, LayoutGrid, ShoppingBag, Tag } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { storeChatUrl } from '../lib/whatsapp';
import { WhatsappIcon } from './Brand';

/**
 * شريط تنقل سفلي للموبايل فقط (أقل من 600px)، ويختفي بالتابلت والحاسوب.
 * في صفحة المنتج يُخفى لأن شريط الشراء الثابت يحل محله.
 */
export function MobileNav() {
  const { count } = useCart();
  const { pathname, search } = useLocation();
  const wa = storeChatUrl();
  if (pathname.startsWith('/product/')) return null;

  const offersActive = pathname === '/shop' && search.includes('offers=1');

  return (
    <nav className="mobile-nav" aria-label="التنقل السريع">
      <NavLink to="/" end className="mobile-nav__item">
        <Home size={21} aria-hidden="true" />
        <span>الرئيسية</span>
      </NavLink>
      <NavLink to="/shop" className={() => `mobile-nav__item ${pathname === '/shop' && !offersActive ? 'active' : ''}`}>
        <LayoutGrid size={21} aria-hidden="true" />
        <span>المتجر</span>
      </NavLink>
      <NavLink to="/shop?offers=1" className={() => `mobile-nav__item ${offersActive ? 'active' : ''}`}>
        <Tag size={21} aria-hidden="true" />
        <span>العروض</span>
      </NavLink>
      <NavLink to="/cart" className="mobile-nav__item" aria-label={`السلة، ${count} قطعة`}>
        <span className="mobile-nav__icon">
          <ShoppingBag size={21} aria-hidden="true" />
          {count > 0 && <span className="mobile-nav__badge">{count > 99 ? '99+' : count}</span>}
        </span>
        <span aria-hidden="true">السلة</span>
      </NavLink>
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="mobile-nav__item mobile-nav__item--wa">
          <WhatsappIcon size={21} />
          <span>واتساب</span>
        </a>
      )}
    </nav>
  );
}
