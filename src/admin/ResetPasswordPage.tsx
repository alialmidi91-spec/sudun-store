import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Brand';
import { PageLoader } from '../components/Layout';
import { getRecoverySession, signOut, updateRecoveredPassword, verifyRecoveryToken, type AuthSession } from '../lib/supabase-rest';

function recoveryError(params: URLSearchParams): string {
  const description = params.get('error_description') || params.get('error');
  if (description) return 'رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلبي رسالة استعادة جديدة.';
  return 'ما لقينا بيانات الاستعادة بالرابط. افتحي أحدث رسالة استعادة وصلتك، أو اطلبي رسالة جديدة.';
}

/** صفحة مستقلة عن بوابة المدير حتى لا تمنعها حالة تسجيل الخروج. */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    const query = url.searchParams;
    const tokenHash = query.get('token_hash') || hash.get('token_hash');
    const type = query.get('type') || hash.get('type');
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    const expiresIn = Number(hash.get('expires_in') || 3600);
    const authError = hash.get('error') || query.get('error');

    // امسح الرموز من شريط العنوان بعد قراءتها حتى لا تبقى ظاهرة أو تُنسخ بالخطأ.
    window.history.replaceState({}, document.title, url.pathname);

    (async () => {
      try {
        if (authError) throw new Error(recoveryError(hash.get('error') ? hash : query));
        if (type !== 'recovery') throw new Error(recoveryError(query));
        let next: AuthSession;
        if (tokenHash) {
          next = await verifyRecoveryToken(tokenHash);
        } else if (accessToken && refreshToken) {
          next = await getRecoverySession(accessToken, refreshToken, expiresIn);
        } else {
          throw new Error(recoveryError(query));
        }
        if (active) setSession(next);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : recoveryError(query));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session) return;
    if (password.length < 8) {
      setError('كلمة المرور لازم تكون 8 أحرف على الأقل.');
      return;
    }
    if (password !== confirmation) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await updateRecoveredPassword(password, session.access_token);
      try {
        window.localStorage.removeItem('sudun.admin.session.v1');
      } catch {
        // نكمل إلى تسجيل الدخول حتى لو كان التخزين المحلي غير متاح.
      }
      await signOut(session.access_token);
      navigate('/admin', { replace: true, state: { flash: 'تم تغيير كلمة المرور. سجّلي الدخول بكلمتك الجديدة.' } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر تغيير كلمة المرور. اطلبي رابط استعادة جديداً.');
      setBusy(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <main className="admin-recovery" dir="rtl">
      <section className="admin-card admin-card--narrow admin-recovery__card">
        <div className="admin-recovery__brand"><Logo size="lg" /></div>
        {session ? (
          <>
            <h1 className="admin-title">تعيين كلمة مرور جديدة</h1>
            <p className="admin-muted">اختاري كلمة مرور جديدة لحساب إدارة متجر سُدَنْ.</p>
            <form className="admin-recovery__form" onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="recovery-password">كلمة المرور الجديدة</label>
                <input id="recovery-password" className="input" type="password" dir="ltr" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="recovery-confirm">تأكيد كلمة المرور</label>
                <input id="recovery-confirm" className="input" type="password" dir="ltr" autoComplete="new-password" minLength={8} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required />
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button type="submit" className="btn btn--dark btn--lg btn--block" disabled={busy}>
                {busy ? 'جارٍ حفظ كلمة المرور…' : 'حفظ كلمة المرور'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="admin-title">تعذّر فتح رابط الاستعادة</h1>
            <p className="form-error" role="alert">{error}</p>
            <p className="admin-muted">ارجعي إلى صفحة الدخول واطلبي رسالة استعادة جديدة، ثم افتحي أحدث رسالة وصلتك.</p>
            <Link to="/admin" className="btn btn--dark btn--block">العودة إلى تسجيل الدخول</Link>
          </>
        )}
      </section>
    </main>
  );
}
