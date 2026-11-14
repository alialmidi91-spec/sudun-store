import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from './session';

export default function AdminPasswordPage() {
  const { getToken } = useAdmin();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (password.length < 12) {
      setError('اختاري كلمة مرور لا تقل عن 12 خانة.');
      return;
    }
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    setBusy(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      });
      const result = await response.json() as { error?: string; ok?: boolean };
      if (!response.ok || !result.ok) throw new Error(result.error || 'تعذّر تحديث كلمة المرور.');
      setPassword('');
      setConfirm('');
      setSuccess('تم تحديث كلمة المرور. استخدميها في تسجيل الدخول القادم.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'حدث خطأ غير متوقع.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-card admin-card--narrow">
      <h1 className="admin-title">تغيير كلمة مرور المدير</h1>
      <p>هذا الإجراء متاح فقط للحساب المسجّل كمدير، ولا يحتاج إرسال بريد استعادة.</p>
      <form className="admin-login" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="new-admin-password">كلمة المرور الجديدة</label>
          <input id="new-admin-password" className="input" type="password" dir="ltr" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="confirm-admin-password">تأكيد كلمة المرور</label>
          <input id="confirm-admin-password" className="input" type="password" dir="ltr" autoComplete="new-password" minLength={12} maxLength={128} value={confirm} onChange={event => setConfirm(event.target.value)} required />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {success && <p className="admin-notice" role="status">{success}</p>}
        <button type="submit" className="btn btn--dark btn--lg" disabled={busy}>
          {busy ? 'جارٍ تحديث كلمة المرور…' : 'حفظ كلمة المرور الجديدة'}
        </button>
      </form>
      <p className="admin-muted">استخدمي كلمة مرور فريدة لا تقل عن 12 خانة، ولا تشاركيها مع أحد.</p>
      <Link to="/admin" className="btn btn--link">العودة إلى المنتجات</Link>
    </section>
  );
}
