import { AlertTriangle, ExternalLink, LogOut, Package, Plus } from 'lucide-react';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Logo } from '../components/Brand';
import { ErrorBoundary, PageLoader } from '../components/Layout';
import { isSupabaseConfigured } from '../config/supabase';
import { AdminProvider, useAdmin } from './session';

/** إطار لوحة التحكم: منفصل عن هيدر وفوتر المتجر، ومخفي عن محركات البحث */
export default function AdminLayout() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'لوحة التحكم — سُدَن';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    meta.setAttribute('data-admin', '');
    document.head.appendChild(meta);
    document.body.classList.add('is-admin');
    return () => {
      document.title = prevTitle;
      meta.remove();
      document.body.classList.remove('is-admin');
    };
  }, []);

  return (
    <AdminProvider>
      <div className="admin" dir="rtl">
        <a href="#admin-main" className="skip-link">
          انتقلي إلى المحتوى
        </a>
        <AdminBar />
        <main id="admin-main" className="admin__main" tabIndex={-1}>
          <AdminGate />
        </main>
      </div>
    </AdminProvider>
  );
}

function AdminBar() {
  const { status, email, signOut } = useAdmin();
  return (
    <header className="admin-bar">
      <div className="admin-bar__inner">
        <Link to="/admin" className="admin-bar__brand" aria-label="لوحة التحكم — الرئيسية">
          <Logo size="sm" asLink={false} tone="light" />
          <span className="admin-bar__label">لوحة التحكم</span>
        </Link>
        {status === 'admin' && (
          <nav className="admin-bar__nav" aria-label="أقسام لوحة التحكم">
            <NavLink to="/admin" end className="admin-bar__link">
              <Package size={18} aria-hidden="true" /> المنتجات
            </NavLink>
            <NavLink to="/admin/products/new" className="admin-bar__link">
              <Plus size={18} aria-hidden="true" /> منتج جديد
            </NavLink>
          </nav>
        )}
        <div className="admin-bar__end">
          <a href="/" target="_blank" rel="noopener noreferrer" className="admin-bar__link">
            <ExternalLink size={17} aria-hidden="true" /> <span className="hide-sm">المتجر</span>
          </a>
          {status !== 'signed-out' && status !== 'checking' && (
            <button type="button" className="admin-bar__link" onClick={() => void signOut()} title={email}>
              <LogOut size={17} aria-hidden="true" /> <span className="hide-sm">خروج</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function AdminGate() {
  const { status, email, signOut } = useAdmin();
  const { pathname } = useLocation();

  if (!isSupabaseConfigured) return <SetupNeeded />;
  if (status === 'checking') return <PageLoader />;
  if (status === 'signed-out') return <LoginForm />;
  if (status === 'not-admin')
    return (
      <div className="admin-card admin-card--narrow" role="alert">
        <h1 className="admin-title">ليس لديك صلاحية</h1>
        <p>
          الحساب <bdi dir="ltr">{email}</bdi> مسجّل، لكنه غير مضاف كمدير لهذا المتجر.
        </p>
        <button type="button" className="btn btn--dark" onClick={() => void signOut()}>
          تسجيل الخروج
        </button>
      </div>
    );
  return (
    <ErrorBoundary resetKey={pathname}>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  );
}

function SetupNeeded() {
  return (
    <div className="admin-card admin-card--narrow">
      <h1 className="admin-title">
        <AlertTriangle size={22} aria-hidden="true" /> قاعدة البيانات غير مربوطة بعد
      </h1>
      <p>لوحة التحكم تحتاج ربط Supabase حتى تُحفظ التعديلات بشكل دائم وتظهر للزبائن.</p>
      <ol className="admin-steps">
        <li>
          شغّلي ملفي <code>supabase/migrations/001_products_admin.sql</code> ثم <code>supabase/seed_products.sql</code> في SQL Editor.
        </li>
        <li>
          في Netlify أضيفي <code dir="ltr">VITE_SUPABASE_URL</code> و<code dir="ltr">VITE_SUPABASE_ANON_KEY</code> (المفتاح العام فقط).
        </li>
        <li>أعيدي النشر (Deploy) ثم افتحي هذه الصفحة.</li>
      </ol>
      <p className="admin-muted">التفاصيل الكاملة في ملف docs/ADMIN_SETUP.md بالمستودع. المتجر يعمل حالياً من البيانات الثابتة.</p>
    </div>
  );
}

function LoginForm() {
  const { signIn } = useAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('اكتبي البريد الإلكتروني وكلمة المرور.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تسجيل الدخول.');
      setBusy(false);
    }
  };

  return (
    <form className="admin-card admin-card--narrow admin-login" onSubmit={submit} noValidate>
      <h1 className="admin-title">تسجيل دخول المدير</h1>
      <div className="field">
        <label htmlFor="admin-email">البريد الإلكتروني</label>
        <input id="admin-email" className="input" type="email" dir="ltr" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="admin-password">كلمة المرور</label>
        <input id="admin-password" className="input" type="password" dir="ltr" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn--dark btn--lg" disabled={busy}>
        {busy ? 'جارٍ الدخول…' : 'دخول'}
      </button>
    </form>
  );
}
