import { AlertTriangle, CheckCircle2, ShoppingBag, Trash2 } from 'lucide-react';
import { cloneElement, useEffect, useMemo, useRef, useState, type FormEvent, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { WhatsappIcon } from '../components/Brand';
import { EmptyState, PageHeader, QuantityStepper } from '../components/ui';
import { getDeliveryFee, isWhatsappConfigured, siteConfig } from '../config/site';
import { useCart } from '../context/CartContext';
import { products } from '../data/products';
import { governorates } from '../data/taxonomy';
import { useSeo } from '../hooks/useSeo';
import { cartCount, lineTotal, priceOrder } from '../lib/cart-math';
import { formatIQD, piecesLabel } from '../lib/format';
import { normalizeIraqiPhone } from '../lib/phone';
import { readStorage, writeStorage } from '../lib/storage';
import { buildOrderMessage, buildWhatsappUrl } from '../lib/whatsapp';
import { FabricArt } from '../components/FabricArt';
import type { CustomerInfo } from '../types';

const CUSTOMER_KEY = 'sadan.customer.v1';
const emptyCustomer: CustomerInfo = { name: '', phone: '', governorate: '', area: '', address: '', notes: '' };

type Errors = Partial<Record<keyof CustomerInfo, string>>;

function validate(c: CustomerInfo): Errors {
  const e: Errors = {};
  if (c.name.trim().length < 2) e.name = 'اكتبي الاسم الكامل.';
  if (!normalizeIraqiPhone(c.phone)) e.phone = 'اكتبي رقم هاتف عراقي صحيح، مثل 07XXXXXXXXX.';
  if (!c.governorate) e.governorate = 'اختاري المحافظة.';
  if (c.area.trim().length < 2) e.area = 'اكتبي المنطقة أو الحي.';
  if (c.address.trim().length < 5) e.address = 'اكتبي العنوان بالتفصيل مع أقرب نقطة دالة.';
  return e;
}

export default function CartPage() {
  useSeo({ title: 'سلة الطلبات', noindex: true });
  const { lines, setQuantity, removeItem, clear } = useCart();
  const [customer, setCustomer] = useState<CustomerInfo>(() => ({
    ...emptyCustomer,
    ...readStorage<Partial<CustomerInfo>>(CUSTOMER_KEY, {}),
    notes: '',
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const [configError, setConfigError] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // حفظ معلومات الزبونة محلياً على جهازها فقط لتسهيل الطلب القادم
  useEffect(() => {
    const { notes: _notes, ...rest } = customer;
    writeStorage(CUSTOMER_KEY, rest);
  }, [customer]);

  const deliveryFee = customer.governorate ? getDeliveryFee(customer.governorate) : null;
  const thumbs = useMemo(() => new Map(products.map((p) => [p.id, p])), []);
  const totals = priceOrder(lines, (id) => thumbs.get(id)?.offer, deliveryFee, siteConfig.defaultDeliveryFee);
  const pieces = cartCount(lines);
  // تلميح: كم قطعة تبقّت لاكتمال العرض
  const offerHints = Array.from(
    lines.reduce((m, l) => m.set(l.productId, (m.get(l.productId) ?? 0) + l.quantity), new Map<string, number>()),
  ).flatMap(([id, qty]) => {
    const p = thumbs.get(id);
    if (!p?.offer || qty % p.offer.quantity === 0) return [];
    // لا نقترح عرضاً لا يوفّر شيئاً (سعره أعلى من القطع العادية والتوصيل مجاني أصلاً)
    if (p.offer.price >= p.offer.quantity * p.price && totals.freeDelivery) return [];
    const left = p.offer.quantity - (qty % p.offer.quantity);
    return [`أضيفي ${piecesLabel(left)} من «${p.name}» وتحصلين عرض ${piecesLabel(p.offer.quantity)} بـ ${formatIQD(p.offer.price)}${p.offer.freeDelivery ? ' مع توصيل مجاني' : ''}.`];
  });
  const orderMessage = () =>
    buildOrderMessage(lines, { ...customer, phone: normalizeIraqiPhone(customer.phone) ?? customer.phone }, totals);

  const set = (key: keyof CustomerInfo) => (e: { target: { value: string } }) => {
    setCustomer((c) => ({ ...c, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(customer);
    setErrors(errs);
    const firstInvalid = Object.keys(errs)[0];
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    if (!isWhatsappConfigured()) {
      setConfigError(true);
      return;
    }
    window.open(buildWhatsappUrl(orderMessage()), '_blank', 'noopener,noreferrer');
    setSent(true);
  };

  if (!lines.length && !sent) {
    return (
      <>
        <PageHeader title="سلة الطلبات" />
        <div className="container section">
          <EmptyState
            icon={<ShoppingBag size={34} aria-hidden="true" />}
            title="سلتچ فارغة حالياً"
            text="تصفحي الموديلات وأضيفي اللي يعجبچ، وبعدها أرسلي الطلب عبر واتساب."
            action={<Link to="/shop" className="btn btn--dark">تسوّقي الآن</Link>}
          />
        </div>
      </>
    );
  }

  if (sent) {
    return (
      <>
        <PageHeader title="خطوة أخيرة" />
        <div className="container container--narrow section">
          <div className="sent-card">
            <CheckCircle2 size={36} aria-hidden="true" />
            <h2>فتحنا لچ واتساب برسالة الطلب</h2>
            <p>
              <strong>الطلب ما يوصلنا إلا بعد ما تضغطين «إرسال» داخل واتساب.</strong> بعد الإرسال، فريق {siteConfig.nameAr} يراجع الطلب ويتواصل وياچ لتأكيده
              {totals.deliveryKnown ? '.' : ' وتأكيد أجور التوصيل.'}
            </p>
            <p className="muted">إذا ما انفتح واتساب، اضغطي زر «افتحي واتساب» تحت.</p>
            <div className="sent-card__actions">
              {lines.length > 0 && (
                <a className="btn btn--dark" href={buildWhatsappUrl(orderMessage())} target="_blank" rel="noopener noreferrer">
                  <WhatsappIcon size={18} /> افتحي واتساب
                </a>
              )}
              <button type="button" className="btn btn--outline" onClick={() => setSent(false)}>
                الرجوع للسلة
              </button>
            </div>
            <div className="sent-card__foot">
              <p>أرسلتي الرسالة؟ تگدرين تفرّغين السلة:</p>
              <button
                type="button"
                className="btn btn--link"
                onClick={() => {
                  clear();
                  setSent(false);
                }}
              >
                نعم، أرسلت الطلب — فرّغي السلة
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="سلة الطلبات" intro="راجعي طلبچ، اكتبي معلومات التوصيل، وأرسلي الطلب عبر واتساب." />
      <div className="container cart">
        <section className="cart__items" aria-labelledby="cart-items-title">
          <h2 id="cart-items-title" className="cart__heading">
            المنتجات <span className="muted">({piecesLabel(pieces)})</span>
          </h2>
          <ul className="cart-lines">
            {lines.map((line) => {
              const product = thumbs.get(line.productId);
              return (
                <li key={line.key} className="cart-line">
                  <Link to={`/product/${line.slug}`} className="cart-line__media" tabIndex={-1} aria-hidden="true">
                    {product?.images[0] ? (
                      <img src={product.images[0]} alt="" loading="lazy" width={160} height={200} />
                    ) : (
                      <FabricArt color={line.colorHex ?? '#E7DCCB'} seed={line.productId} />
                    )}
                  </Link>
                  <div className="cart-line__info">
                    <h3>
                      <Link to={`/product/${line.slug}`}>{line.name}</Link>
                    </h3>
                    <p className="cart-line__opts">
                      {line.color && <span>اللون: {line.color}</span>}
                      {line.size && <span>القياس: {line.size}</span>}
                    </p>
                    <p className="cart-line__unit">سعر القطعة: {formatIQD(line.price)}</p>
                    <div className="cart-line__controls">
                      <QuantityStepper value={line.quantity} onChange={(v) => setQuantity(line.key, v)} label={`كمية ${line.name}`} />
                      <button type="button" className="btn btn--link btn--danger" onClick={() => removeItem(line.key)} aria-label={`حذف ${line.name} من السلة`}>
                        <Trash2 size={16} aria-hidden="true" /> حذف
                      </button>
                    </div>
                  </div>
                  <p className="cart-line__total">{formatIQD(lineTotal(line))}</p>
                </li>
              );
            })}
          </ul>
          <Link to="/shop" className="btn btn--link">
            كملي التسوق
          </Link>
        </section>

        <aside className="cart__checkout" aria-labelledby="checkout-title">
          <form ref={formRef} onSubmit={submit} noValidate className="checkout" id="checkout">
            <h2 id="checkout-title" className="cart__heading">معلومات التوصيل</h2>

            <Field label="الاسم الكامل" name="name" error={errors.name}>
              <input name="name" className="input" value={customer.name} onChange={set('name')} autoComplete="name" required />
            </Field>
            <Field label="رقم الهاتف" name="phone" error={errors.phone} hint="مثال: 07XXXXXXXXX">
              <input name="phone" className="input" type="tel" inputMode="tel" dir="ltr" value={customer.phone} onChange={set('phone')} autoComplete="tel" required />
            </Field>
            <Field label="المحافظة" name="governorate" error={errors.governorate}>
              <select name="governorate" className="input" value={customer.governorate} onChange={set('governorate')} required>
                <option value="">اختاري المحافظة</option>
                {governorates.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="المنطقة / الحي" name="area" error={errors.area}>
              <input name="area" className="input" value={customer.area} onChange={set('area')} autoComplete="address-level3" required />
            </Field>
            <Field label="العنوان بالتفصيل" name="address" error={errors.address} hint="الشارع، رقم الدار، أقرب نقطة دالة">
              <textarea name="address" className="input" rows={2} value={customer.address} onChange={set('address')} autoComplete="street-address" required />
            </Field>
            <Field label="ملاحظات (اختياري)" name="notes">
              <textarea name="notes" className="input" rows={2} value={customer.notes} onChange={set('notes')} />
            </Field>

            <div className="summary" aria-live="polite">
              <h3 className="summary__title">ملخص الطلب</h3>
              <ul className="summary__lines">
                {lines.map((l) => (
                  <li key={l.key}>
                    <span>
                      {l.name}
                      {l.color ? ` — ${l.color}` : ''}
                      {l.size ? ` (${l.size})` : ''} × {l.quantity}
                    </span>
                    <span>{formatIQD(lineTotal(l))}</span>
                  </li>
                ))}
              </ul>
              {offerHints.length > 0 && (
                <ul className="summary__hints">
                  {offerHints.map((h) => <li key={h}>{h}</li>)}
                </ul>
              )}
              <dl>
                <div><dt>مجموع المنتجات</dt><dd>{formatIQD(totals.subtotal)}</dd></div>
                {totals.applied.map((o) => (
                  <div key={o.productId} className="summary__offer">
                    <dt>
                      عرض {o.name} ({o.bundles > 1 ? `${o.bundles} × ` : ''}{piecesLabel(o.quantity)})
                    </dt>
                    <dd>{formatIQD(o.offerTotal)}</dd>
                  </div>
                ))}
                {totals.applied.length > 0 && (
                  <div><dt>المجموع بعد تطبيق العروض</dt><dd>{formatIQD(totals.productsTotal)}</dd></div>
                )}
                <div>
                  <dt>أجور التوصيل</dt>
                  <dd>
                    {totals.freeDelivery ? (
                      'مجاني ضمن العرض'
                    ) : totals.deliveryKnown ? (
                      formatIQD(totals.deliveryFee ?? 0)
                    ) : (
                      <span className="muted">اختاري المحافظة</span>
                    )}
                  </dd>
                </div>
                <div className="summary__total">
                  <dt>{totals.deliveryKnown ? 'المبلغ الإجمالي' : 'الإجمالي (قبل التوصيل)'}</dt>
                  <dd>{formatIQD(totals.total)}</dd>
                </div>
                <div><dt>طريقة الدفع</dt><dd>الدفع عند الاستلام</dd></div>
              </dl>
            </div>

            {configError && (
              <p className="form-error" role="alert">
                <AlertTriangle size={16} aria-hidden="true" /> رقم واتساب المتجر لم يُضبط بعد. (لصاحبة المتجر: أضيفي الرقم في src/config/site.ts)
              </p>
            )}

            <button type="submit" className="btn btn--whatsapp btn--lg btn--block">
              <WhatsappIcon size={20} /> إتمام الطلب عبر واتساب
            </button>
            <p className="checkout__note">
              راح تنفتح محادثة واتساب برسالة جاهزة. الطلب يتأكد بعد ما ترسلين الرسالة ويتواصل وياچ فريق {siteConfig.nameAr}.
            </p>
          </form>
        </aside>
      </div>
    </>
  );
}

function Field({ label, name, error, hint, children }: { label: string; name: string; error?: string; hint?: string; children: ReactElement<Record<string, unknown>> }) {
  const id = `f-${name}`;
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined;
  const child = cloneElement(children, { id, 'aria-invalid': !!error, 'aria-describedby': describedBy });
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {child}
      {hint && <small id={`${id}-hint`} className="field__hint">{hint}</small>}
      {error && <small id={`${id}-err`} className="field__error">{error}</small>}
    </div>
  );
}
