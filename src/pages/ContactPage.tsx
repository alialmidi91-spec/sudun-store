import { AlertTriangle, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { InstagramIcon, WhatsappIcon } from '../components/Brand';
import { PageHeader } from '../components/ui';
import { isWhatsappConfigured, siteConfig } from '../config/site';
import { useSeo } from '../hooks/useSeo';
import { buildWhatsappUrl, storeChatUrl } from '../lib/whatsapp';

export default function ContactPage() {
  useSeo({ title: 'تواصلي ويانا', description: 'تواصلي مع سُدَن عبر واتساب أو إنستغرام لأي سؤال عن الموديلات أو الطلبات.' });
  const wa = storeChatUrl();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('اكتبي رسالتچ أولاً.');
      return;
    }
    if (!isWhatsappConfigured()) {
      setError('رقم واتساب المتجر لم يُضبط بعد.');
      return;
    }
    setError('');
    const text = `مرحباً ${siteConfig.nameAr}${name.trim() ? `، معچ ${name.trim()}` : ''}.\n${message.trim()}`;
    window.open(buildWhatsappUrl(text), '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <PageHeader eyebrow="تواصل" title="تواصلي ويانا" intro="عندچ سؤال عن موديل، لون، أو طلب؟ راسلينا ونرد عليچ بأقرب وقت." />
      <section className="container contact">
        <div className="contact__channels">
          <div className="channel">
            <WhatsappIcon size={26} />
            <div>
              <h2>واتساب</h2>
              <p>للطلبات والاستفسارات.</p>
              <p dir="ltr" className="channel__number">{siteConfig.whatsappDisplay}</p>
              {wa ? (
                <a className="btn btn--whatsapp btn--sm" href={wa} target="_blank" rel="noopener noreferrer">ابدئي المحادثة</a>
              ) : (
                <p className="muted">يُضاف رقم المتجر قريباً.</p>
              )}
            </div>
          </div>
          <div className="channel">
            <InstagramIcon size={26} />
            <div>
              <h2>إنستغرام</h2>
              <p>للطلبات ومتابعة الموديلات الجديدة.</p>
              {siteConfig.instagramUrl ? (
                <a className="btn btn--outline btn--sm" href={siteConfig.instagramUrl} target="_blank" rel="noopener noreferrer">
                  {siteConfig.instagramHandle || 'زوري الحساب'}
                </a>
              ) : (
                <p className="muted">يُضاف رابط الحساب قريباً.</p>
              )}
            </div>
          </div>
          {siteConfig.email && (
            <div className="channel">
              <Mail size={26} aria-hidden="true" />
              <div>
                <h2>البريد الإلكتروني</h2>
                <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
              </div>
            </div>
          )}
          <p className="muted small">التوصيل لجميع محافظات العراق خلال {siteConfig.deliveryTime}، والدفع عند الاستلام.</p>
        </div>

        <form className="contact__form checkout" onSubmit={submit} noValidate>
          <h2 className="cart__heading">أرسلي رسالة عبر واتساب</h2>
          <div className="field">
            <label htmlFor="c-name">الاسم (اختياري)</label>
            <input id="c-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div className={`field ${error ? 'has-error' : ''}`}>
            <label htmlFor="c-msg">رسالتچ</label>
            <textarea
              id="c-msg"
              className="input"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? 'c-err' : undefined}
            />
            {error && (
              <small id="c-err" className="field__error" role="alert">
                <AlertTriangle size={14} aria-hidden="true" /> {error}
              </small>
            )}
          </div>
          <button type="submit" className="btn btn--whatsapp btn--block">
            <WhatsappIcon size={18} /> فتح الرسالة في واتساب
          </button>
          <p className="checkout__note">الرسالة تنفتح بواتساب، وتوصلنا بعد ما تضغطين إرسال.</p>
        </form>
      </section>
    </>
  );
}
