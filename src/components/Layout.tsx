import { Check, X } from 'lucide-react';
import { Component, Suspense, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Footer } from './Footer';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

function CartToast() {
  const { toast, dismissToast } = useCart();
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {toast && (
        <div className="toast" key={toast.id}>
          <Check size={18} aria-hidden="true" />
          <p>{toast.message}</p>
          <Link to="/cart" className="toast__link" onClick={dismissToast}>
            عرض السلة
          </Link>
          <button type="button" className="icon-btn icon-btn--sm" onClick={dismissToast} aria-label="إغلاق التنبيه">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="page-loader" role="status">
      <span className="page-loader__mark" aria-hidden="true">س</span>
      <span className="visually-hidden">جارٍ التحميل…</span>
    </div>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SUDUN UI error:', error, info.componentStack);
  }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.hasError) this.setState({ hasError: false });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="container state state--error" role="alert" style={{ minHeight: '50vh' }}>
          <p className="state__title">عذراً، صار خطأ غير متوقع</p>
          <p className="state__text">حدّثي الصفحة أو ارجعي للرئيسية.</p>
          <div className="state__actions">
            <button type="button" className="btn btn--dark" onClick={() => window.location.reload()}>
              تحديث الصفحة
            </button>
            <a href="/" className="btn btn--outline">الرئيسية</a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function Layout() {
  const { pathname } = useLocation();
  return (
    <>
      <a href="#main" className="skip-link">
        انتقلي إلى المحتوى
      </a>
      <ScrollToTop />
      <Header />
      <main id="main" tabIndex={-1}>
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <MobileNav />
      <CartToast />
    </>
  );
}
