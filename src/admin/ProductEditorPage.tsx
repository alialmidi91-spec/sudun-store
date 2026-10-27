import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '../components/ui';
import { PageLoader } from '../components/Layout';
import { ALLOWED_IMAGE_TYPES } from '../config/supabase';
import { categories, colorFamilies, materials } from '../data/taxonomy';
import { formatIQD, normalizeDigits } from '../lib/format';
import { productWarnings, validateProduct, type AdminProduct, type ProductErrors, type ProductStatus } from '../lib/product-mapping';
import type { CategoryId, ColorFamily, MaterialId } from '../types';
import { checkImageFile, createProduct, discardUploadedImages, getProduct, updateProduct, uploadProductImage } from './api';
import { useAdmin } from './session';

/* ---------------- حالة النموذج (نصوص كما تكتبها المديرة) ---------------- */

interface ColorDraft {
  key: string;
  name: string;
  hex: string;
  family: ColorFamily;
  available: boolean;
  images?: string[];
}

export interface ProductForm {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  category: CategoryId | '';
  material: MaterialId | '';
  price: string;
  compareAtPrice: string;
  offerOn: boolean;
  offerQty: string;
  offerPrice: string;
  offerFree: boolean;
  sizes: string;
  colors: ColorDraft[];
  images: string[];
  stockQty: string;
  status: ProductStatus;
  isNew: boolean;
  isBestSeller: boolean;
  care: string;
  addedAt: string;
  sortOrder: number;
}

const rid = () => Math.random().toString(36).slice(2, 8);
const today = () => new Date().toISOString().slice(0, 10);

export function emptyForm(): ProductForm {
  const id = `p-${Date.now().toString(36)}${rid()}`;
  return {
    id,
    name: '',
    slug: `item-${rid()}`,
    shortDescription: '',
    description: '',
    category: '',
    material: '',
    price: '',
    compareAtPrice: '',
    offerOn: false,
    offerQty: '3',
    offerPrice: '',
    offerFree: true,
    sizes: '',
    colors: [{ key: rid(), name: '', hex: '#E7DCCB', family: 'neutral', available: true }],
    images: [],
    stockQty: '',
    status: 'hidden',
    isNew: true,
    isBestSeller: false,
    care: '',
    addedAt: today(),
    sortOrder: 0,
  };
}

export function productToForm(p: AdminProduct): ProductForm {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription,
    description: p.description,
    category: p.category,
    material: p.material ?? '',
    price: String(p.price),
    compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : '',
    offerOn: !!p.offer,
    offerQty: p.offer ? String(p.offer.quantity) : '3',
    offerPrice: p.offer ? String(p.offer.price) : '',
    offerFree: p.offer ? p.offer.freeDelivery : true,
    sizes: p.sizes.join('، '),
    colors: p.colors.map((c) => ({ key: rid(), name: c.name, hex: c.hex, family: c.family, available: c.available !== false, images: c.images })),
    images: [...p.images],
    stockQty: p.stockQty === null ? '' : String(p.stockQty),
    status: p.status,
    isNew: !!p.isNew,
    isBestSeller: !!p.isBestSeller,
    care: (p.care ?? []).join('\n'),
    addedAt: p.addedAt,
    sortOrder: p.sortOrder,
  };
}

/** نص → رقم صحيح (يقبل الأرقام العربية والفواصل)، أو NaN */
const toInt = (s: string): number => {
  const clean = normalizeDigits(s).replace(/[,\s٬]/g, '');
  return /^\d+$/.test(clean) ? Number(clean) : NaN;
};

export function formToProduct(f: ProductForm): AdminProduct {
  const p: AdminProduct = {
    id: f.id,
    slug: f.slug.trim().toLowerCase(),
    name: f.name.trim(),
    shortDescription: f.shortDescription.trim(),
    description: f.description.trim() || f.shortDescription.trim(),
    category: (f.category || 'x') as CategoryId,
    colors: f.colors.map((c) => ({
      name: c.name.trim(),
      hex: c.hex,
      family: c.family,
      ...(c.available ? {} : { available: false }),
      ...(c.images?.length ? { images: c.images } : {}),
    })),
    sizes: f.sizes
      .split(/[,،\n]/)
      .map((s) => s.trim())
      .filter(Boolean),
    price: toInt(f.price),
    inStock: true,
    images: f.images,
    addedAt: f.addedAt,
    status: f.status,
    stockQty: f.stockQty.trim() === '' ? null : toInt(f.stockQty),
    sortOrder: f.sortOrder,
  };
  p.inStock = p.stockQty === null || p.stockQty > 0;
  if (f.material) p.material = f.material;
  if (f.compareAtPrice.trim()) p.compareAtPrice = toInt(f.compareAtPrice);
  if (f.offerOn) p.offer = { quantity: toInt(f.offerQty), price: toInt(f.offerPrice), freeDelivery: f.offerFree };
  if (f.isNew) p.isNew = true;
  if (f.isBestSeller) p.isBestSeller = true;
  const care = f.care.split('\n').map((s) => s.trim()).filter(Boolean);
  if (care.length) p.care = care;
  return p;
}

/* ---------------- الصفحة ---------------- */

export default function ProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const { getToken } = useAdmin();
  const [form, setForm] = useState<ProductForm | null>(() => (isNew ? emptyForm() : null));
  const [original, setOriginal] = useState<AdminProduct | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (isNew) return;
    let active = true;
    (async () => {
      try {
        const p = await getProduct(id!, await getToken());
        if (!active) return;
        if (!p) setLoadError('المنتج غير موجود (ربما انحذف).');
        else {
          setOriginal(p);
          setForm(productToForm(p));
        }
      } catch (e) {
        if (active) setLoadError(e instanceof Error ? e.message : 'تعذّر تحميل المنتج.');
      }
    })();
    return () => {
      active = false;
    };
  }, [id, isNew, getToken]);

  if (loadError)
    return (
      <div className="admin-page">
        <ErrorState message={loadError} />
        <p className="center-text">
          <Link to="/admin" className="btn btn--outline">
            رجوع للمنتجات
          </Link>
        </p>
      </div>
    );
  if (!form) return <PageLoader />;
  return <Editor key={form.id} initial={form} original={original} isNew={isNew} />;
}

function Editor({ initial, original, isNew }: { initial: ProductForm; original: AdminProduct | null; isNew: boolean }) {
  const { getToken } = useAdmin();
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<ProductErrors>({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const uploadedNow = useRef<Set<string>>(new Set());
  const saved = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // صور رُفعت بهذي الجلسة وما انحفظ المنتج → نحذفها حتى ما تبقى ملفات يتيمة
  useEffect(
    () => () => {
      if (!saved.current && uploadedNow.current.size) {
        const urls = [...uploadedNow.current];
        void getToken()
          .then((t) => discardUploadedImages(urls, t))
          .catch(() => undefined);
      }
    },
    [getToken],
  );

  const product = useMemo(() => formToProduct(form), [form]);
  const warnings = useMemo(() => productWarnings(product), [product]);

  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaveError('');
  };
  const text = (key: keyof ProductForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(key, e.target.value as never);

  const setColor = (key: string, patch: Partial<ColorDraft>) => set('colors', form.colors.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const moveImage = (i: number, dir: -1 | 1) => {
    const next = [...form.images];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set('images', next);
  };

  const removeImage = (url: string) => {
    set('images', form.images.filter((u) => u !== url));
    if (uploadedNow.current.has(url)) {
      uploadedNow.current.delete(url);
      void getToken()
        .then((t) => discardUploadedImages([url], t))
        .catch(() => undefined);
    }
  };

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    const errs: string[] = [];
    const ok = files.filter((f) => {
      const err = checkImageFile(f);
      if (err) errs.push(err);
      return !err;
    });
    setUploadErrors(errs);
    if (!ok.length) return;
    setUploading((n) => n + ok.length);
    for (const file of ok) {
      try {
        const url = await uploadProductImage(form.id, file, await getToken());
        uploadedNow.current.add(url);
        setForm((f) => ({ ...f, images: [...f.images, url] }));
      } catch (err) {
        setUploadErrors((list) => [...list, `«${file.name}»: ${err instanceof Error ? err.message : 'تعذّر الرفع.'}`]);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateProduct(product);
    if (!form.category) errs.category = 'اختاري نوع الحجاب.';
    setErrors(errs);
    if (Object.keys(errs).length) {
      setSaveError('راجعي الحقول المؤشرة بالأحمر.');
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    if (uploading) {
      setSaveError('انتظري لحد ما يكمل رفع الصور.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const token = await getToken();
      const result = isNew ? await createProduct(product, token) : await updateProduct(product, token);
      saved.current = true;
      // صور قديمة انشالت من المنتج → نحذفها من التخزين
      if (original) {
        const keep = new Set([...result.images, ...result.colors.flatMap((c) => c.images ?? [])]);
        const removed = [...original.images, ...original.colors.flatMap((c) => c.images ?? [])].filter((u) => !keep.has(u));
        await discardUploadedImages(removed, token);
      }
      const where = result.status === 'published' ? 'وصار ظاهراً للزبائن' : 'وهو مخفي عن الزبائن';
      navigate('/admin', { state: { flash: `تم حفظ «${result.name}» ${where}.` } });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'تعذّر الحفظ.');
      setSaving(false);
    }
  };

  const err = (k: keyof ProductErrors) => errors[k];

  return (
    <form ref={formRef} className="admin-page admin-form" onSubmit={submit} noValidate>
      <div className="admin-page__head">
        <div>
          <p className="admin-muted">
            <Link to="/admin">المنتجات</Link> / {isNew ? 'منتج جديد' : 'تعديل'}
          </p>
          <h1 className="admin-title">{isNew ? 'إضافة منتج' : form.name || 'تعديل منتج'}</h1>
        </div>
        {!isNew && original?.status === 'published' && (
          <a href={`/product/${original.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
            <ExternalLink size={16} aria-hidden="true" /> عرض بالمتجر
          </a>
        )}
      </div>

      <Section title="المعلومات الأساسية">
        <Field label="اسم المنتج" error={err('name')} required>
          {(a) => <input {...a} className="input" value={form.name} onChange={text('name')} maxLength={120} />}
        </Field>
        <div className="admin-grid-2">
          <Field label="نوع الحجاب" error={err('category')} required>
            {(a) => (
              <select {...a} className="input" value={form.category} onChange={text('category')}>
                <option value="">اختاري…</option>
                {(Object.keys(categories) as CategoryId[]).map((c) => (
                  <option key={c} value={c}>
                    {categories[c].label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="الخامة" error={err('material')}>
            {(a) => (
              <select {...a} className="input" value={form.material} onChange={text('material')}>
                <option value="">غير محددة</option>
                {(Object.keys(materials) as MaterialId[]).map((m) => (
                  <option key={m} value={m}>
                    {materials[m].label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <Field label="وصف قصير" hint="سطر واحد يظهر تحت الاسم بصفحة المنتج." error={err('shortDescription')} required>
          {(a) => <input {...a} className="input" value={form.shortDescription} onChange={text('shortDescription')} maxLength={200} />}
        </Field>
        <Field label="الوصف الكامل" error={err('description')}>
          {(a) => <textarea {...a} className="input" rows={4} value={form.description} onChange={text('description')} />}
        </Field>
        <Field label="رابط المنتج (slug)" hint={`يظهر بالعنوان: /product/${form.slug || '…'} — بالإنكليزي فقط.`} error={err('slug')} required>
          {(a) => <input {...a} className="input" dir="ltr" value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))} />}
        </Field>
      </Section>

      <Section title="السعر والعروض">
        <div className="admin-grid-2">
          <Field label="السعر (د.ع)" error={err('price')} required>
            {(a) => <input {...a} className="input" inputMode="numeric" dir="ltr" value={form.price} onChange={text('price')} placeholder="12000" />}
          </Field>
          <Field label="السعر قبل الخصم (اختياري)" hint="يظهر مشطوباً فقط إذا كان أعلى من السعر." error={err('compareAtPrice')}>
            {(a) => <input {...a} className="input" inputMode="numeric" dir="ltr" value={form.compareAtPrice} onChange={text('compareAtPrice')} />}
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={form.offerOn} onChange={(e) => set('offerOn', e.target.checked)} />
          <span>عرض كمية (مثلاً 3 قطع بسعر خاص)</span>
        </label>
        {form.offerOn && (
          <div className="admin-subcard">
            <div className="admin-grid-2">
              <Field label="عدد القطع" error={err('offer')}>
                {(a) => <input {...a} className="input" inputMode="numeric" dir="ltr" value={form.offerQty} onChange={text('offerQty')} />}
              </Field>
              <Field label="سعر العرض كاملاً (د.ع)">
                {(a) => <input {...a} className="input" inputMode="numeric" dir="ltr" value={form.offerPrice} onChange={text('offerPrice')} aria-invalid={!!err('offer')} />}
              </Field>
            </div>
            <label className="check">
              <input type="checkbox" checked={form.offerFree} onChange={(e) => set('offerFree', e.target.checked)} />
              <span>يشمل توصيل مجاني</span>
            </label>
            {Number.isFinite(product.offer?.price) && Number.isFinite(product.offer?.quantity) && product.offer && (
              <p className="admin-muted">
                يظهر للزبونة: كل {product.offer.quantity} قطع بـ {formatIQD(product.offer.price)}
                {product.offer.freeDelivery ? ' مع توصيل مجاني' : ''}.
              </p>
            )}
          </div>
        )}
      </Section>

      <Section title="الألوان والقياسات">
        <fieldset className="admin-colors" aria-invalid={!!err('colors')}>
          <legend className="admin-label">الألوان</legend>
          {form.colors.map((c, i) => (
            <div key={c.key} className="admin-color">
              <label className="admin-color__swatch">
                <span className="visually-hidden">لون العرض للون {i + 1}</span>
                <input type="color" value={c.hex} onChange={(e) => setColor(c.key, { hex: e.target.value })} />
              </label>
              <label className="admin-color__name">
                <span className="visually-hidden">اسم اللون {i + 1}</span>
                <input className="input" placeholder="اسم اللون، مثل: بيج" value={c.name} onChange={(e) => setColor(c.key, { name: e.target.value })} aria-invalid={!!err('colors') && !c.name.trim()} />
              </label>
              <label className="admin-color__family">
                <span className="visually-hidden">عائلة اللون {i + 1} (للتصفية)</span>
                <select className="input" value={c.family} onChange={(e) => setColor(c.key, { family: e.target.value as ColorFamily })}>
                  {(Object.keys(colorFamilies) as ColorFamily[]).map((f) => (
                    <option key={f} value={f}>
                      {colorFamilies[f].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="check admin-color__avail">
                <input type="checkbox" checked={c.available} onChange={(e) => setColor(c.key, { available: e.target.checked })} />
                <span>متوفر</span>
              </label>
              <button type="button" className="icon-btn" onClick={() => set('colors', form.colors.filter((x) => x.key !== c.key))} aria-label={`حذف اللون ${c.name || i + 1}`} disabled={form.colors.length === 1}>
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </div>
          ))}
          {err('colors') && (
            <p className="form-error" role="alert">
              {err('colors')}
            </p>
          )}
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => set('colors', [...form.colors, { key: rid(), name: '', hex: '#E7DCCB', family: 'neutral', available: true }])}>
            <Plus size={16} aria-hidden="true" /> إضافة لون
          </button>
        </fieldset>
        <Field label="القياسات" hint="افصلي بينها بفاصلة، مثل: 150 سم، 180 سم. اتركيها فارغة إذا القياس موحّد.">
          {(a) => <input {...a} className="input" value={form.sizes} onChange={text('sizes')} />}
        </Field>
      </Section>

      <Section title="الصور">
        <p className="admin-muted">تنرفع الصورة كما هي بدون ضغط حتى تبقى الألوان والنقوش بنفس الجودة. JPG أو PNG أو WebP، حتى 5MB. أول صورة هي الرئيسية.</p>
        {form.images.length > 0 && (
          <ul className="admin-images" aria-label="صور المنتج">
            {form.images.map((url, i) => (
              <li key={url} className="admin-image">
                <img src={url} alt={`صورة ${i + 1}${i === 0 ? ' (الرئيسية)' : ''}`} loading="lazy" />
                {i === 0 && <span className="admin-image__badge">الرئيسية</span>}
                <div className="admin-image__actions">
                  <button type="button" className="icon-btn" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label={`تقديم الصورة ${i + 1}`}>
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1} aria-label={`تأخير الصورة ${i + 1}`}>
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => removeImage(url)} aria-label={`إزالة الصورة ${i + 1}`}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <label className={`admin-upload ${uploading ? 'is-busy' : ''}`}>
          <input type="file" accept={ALLOWED_IMAGE_TYPES.join(',')} multiple onChange={(e) => void onFiles(e)} disabled={saving} />
          <ImagePlus size={22} aria-hidden="true" />
          <span>{uploading ? `جارٍ رفع ${uploading} صورة…` : 'إضافة صور'}</span>
        </label>
        {uploadErrors.map((m) => (
          <p key={m} className="form-error" role="alert">
            {m}
          </p>
        ))}
      </Section>

      <Section title="المخزون والنشر">
        <div className="admin-grid-2">
          <Field label="الكمية المتوفرة" hint="اتركيها فارغة إذا ما تتابعين الكمية. صفر = نفد المخزون." error={err('stockQty')}>
            {(a) => <input {...a} className="input" inputMode="numeric" dir="ltr" value={form.stockQty} onChange={text('stockQty')} />}
          </Field>
          <Field label="تاريخ الإضافة" hint="يُستخدم لترتيب «الأحدث»." error={err('addedAt')}>
            {(a) => <input {...a} className="input" type="date" dir="ltr" value={form.addedAt} onChange={text('addedAt')} />}
          </Field>
        </div>
        <fieldset className="admin-radios">
          <legend className="admin-label">حالة النشر</legend>
          <label className="check">
            <input type="radio" name="status" checked={form.status === 'published'} onChange={() => set('status', 'published')} />
            <span>منشور — يظهر للزبائن</span>
          </label>
          <label className="check">
            <input type="radio" name="status" checked={form.status === 'hidden'} onChange={() => set('status', 'hidden')} />
            <span>مخفي — محفوظ بس ما يظهر</span>
          </label>
        </fieldset>
        <div className="admin-checks">
          <label className="check">
            <input type="checkbox" checked={form.isNew} onChange={(e) => set('isNew', e.target.checked)} />
            <span>شارة «جديد»</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={form.isBestSeller} onChange={(e) => set('isBestSeller', e.target.checked)} />
            <span>شارة «الأكثر مبيعاً»</span>
          </label>
        </div>
        <Field label="العناية بالقطعة (اختياري)" hint="كل نصيحة بسطر.">
          {(a) => <textarea {...a} className="input" rows={3} value={form.care} onChange={text('care')} />}
        </Field>
      </Section>

      {warnings.length > 0 && (
        <ul className="admin-warnings" aria-label="تنبيهات">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <div className="admin-savebar">
        {saveError && (
          <p className="form-error admin-savebar__error" role="alert">
            {saveError}
          </p>
        )}
        <Link to="/admin" className="btn btn--outline">
          إلغاء
        </Link>
        <button type="submit" className="btn btn--dark btn--grow" disabled={saving || uploading > 0}>
          {saving ? 'جارٍ الحفظ…' : isNew ? 'حفظ المنتج' : 'حفظ التعديلات'}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="admin-card admin-section" aria-label={title}>
      <h2 className="admin-section__title">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (a: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string; 'aria-required'?: boolean }) => ReactNode;
}) {
  const id = useId();
  const describedBy = [hint ? `${id}-h` : '', error ? `${id}-e` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy, ...(required ? { 'aria-required': true } : {}) })}
      {hint && (
        <p id={`${id}-h`} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-e`} className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
